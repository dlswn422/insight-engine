"""
Signal Scout Worker (Option2 + B안: event_hash 중복 방지)

역할:
- pending 기사 조회(최신부터)
- LLM으로 signals 추출
- signals 테이블 upsert (event_hash 기준으로 중복 방지)
- signals 기반 opportunity 신호로 companies에 POTENTIAL 자동 생성
  - OWN/CLIENT는 절대 덮어쓰기 X
- 기사 상태: pending -> analyzing -> done
"""

from __future__ import annotations

from datetime import datetime
import hashlib
import re

from repositories.db import supabase
from analysis.signal_scout import extract_signals

# -----------------------------
# 튜닝 파라미터
# -----------------------------
CONF_SIGNAL_SAVE = 0.70
CONF_PROMOTE_POTENTIAL = 0.75

ALLOWED_INDUSTRY_FOR_POTENTIAL = {"Pharma", "Bio", "Cosmetic"}
ALLOWED_CATEGORY_FOR_POTENTIAL = {"Investment", "Partnership", "Expansion", "Product"}

BLOCK_COMPANY_SUBSTRINGS = [
    "코스피", "코스닥", "지수", "ETF", "ETN", "선물", "인버스", "레버리지",
    "채권", "원달러", "환율", "금리", "가상자산", "비트코인"
]

ROLE_OWN = "OWN"
ROLE_CLIENT = "CLIENT"
ROLE_POTENTIAL = "POTENTIAL"
ROLE_GENERAL = "GENERAL"


# ---------------------------------------------------
# (B안) event_hash 생성 (DB 백필 방식과 최대한 유사)
# ---------------------------------------------------
def _collapse_ws(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s).strip()
    return s


def make_event_hash(sig: dict) -> str:
    key = "|".join([
        _collapse_ws(sig.get("company_name", "")),
        _collapse_ws(sig.get("impact_type", "")),
        _collapse_ws(sig.get("signal_category", "")),
        _collapse_ws(sig.get("event_type", "")),
    ])
    return hashlib.md5(key.encode("utf-8")).hexdigest()


# ---------------------------------------------------
# 1) pending 기사 조회 (최신부터)
# ---------------------------------------------------
def get_pending_articles(limit: int = 20) -> list[dict]:
    result = (
        supabase
        .table("articles")
        .select("id,title,content,created_at")
        .eq("scout_status", "pending")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ---------------------------------------------------
# 2) 기사 상태 업데이트
# ---------------------------------------------------
def update_article_status(article_id: str, status: str) -> None:
    (
        supabase
        .table("articles")
        .update({"scout_status": status})
        .eq("id", article_id)
        .execute()
    )


# ---------------------------------------------------
# 3) Signal 저장 (event_hash 기반 upsert)
# ---------------------------------------------------
def insert_signal_safe(article_id: str, sig: dict) -> None:
    """
    동일 이벤트(event_hash 동일)는 기사/매체가 달라도 1건만 유지
    """
    event_hash = make_event_hash(sig)

    data = {
        "event_hash": event_hash,  # ✅ 중복 방지 키
        "article_id": article_id,
        "company_name": sig["company_name"],
        "event_type": sig["event_type"],
        "impact_type": sig["impact_type"],
        "impact_strength": int(sig["impact_strength"]),
        "signal_category": sig.get("signal_category"),
        "industry_tag": sig.get("industry_tag"),
        "trend_bucket": sig.get("trend_bucket"),
        "severity_level": int(sig.get("severity_level", 2)),
        "confidence": float(sig.get("confidence", 0.8)),
        "created_at": datetime.utcnow().isoformat(),
    }

    supabase.table("signals").upsert(
        data,
        on_conflict="event_hash"
    ).execute()


# ---------------------------------------------------
# 4) POTENTIAL 승격 판단(옵션2)
# ---------------------------------------------------
def should_promote_to_potential(sig: dict) -> bool:
    cname = (sig.get("company_name") or "").strip()
    if not cname:
        return False

    for bad in BLOCK_COMPANY_SUBSTRINGS:
        if bad in cname:
            return False

    if (sig.get("impact_type") or "").lower() != "opportunity":
        return False

    conf = float(sig.get("confidence", 0.0))
    if conf < CONF_PROMOTE_POTENTIAL:
        return False

    industry = (sig.get("industry_tag") or "").strip()
    category = (sig.get("signal_category") or "").strip()

    return (industry in ALLOWED_INDUSTRY_FOR_POTENTIAL) or (category in ALLOWED_CATEGORY_FOR_POTENTIAL)


# ---------------------------------------------------
# 5) companies: POTENTIAL upsert (OWN/CLIENT 보호)
# ---------------------------------------------------
def upsert_potential_company(company_name: str) -> None:
    company_name = (company_name or "").strip()
    if not company_name:
        return

    existing = (
        supabase
        .table("companies")
        .select("id, company_role")
        .eq("company_name", company_name)
        .execute()
    ).data or []

    now = datetime.utcnow().isoformat()

    if existing:
        role = existing[0].get("company_role") or ROLE_GENERAL
        if role in [ROLE_OWN, ROLE_CLIENT]:
            return

        # GENERAL/POTENTIAL/기타 → POTENTIAL 승격
        try:
            (
                supabase.table("companies")
                .update({"company_role": ROLE_POTENTIAL, "updated_at": now})
                .eq("company_name", company_name)
                .execute()
            )
        except Exception:
            (
                supabase.table("companies")
                .update({"company_role": ROLE_POTENTIAL})
                .eq("company_name", company_name)
                .execute()
            )
        return

    # 신규 insert (스키마 제약 대비 안전 삽입)
    payload = {
        "company_name": company_name,
        "company_role": ROLE_POTENTIAL,
        "dart_sync_status": "PENDING",
        "created_at": now,
        "updated_at": now,
    }
    try:
        supabase.table("companies").insert(payload).execute()
    except Exception:
        minimal = {
            "company_name": company_name,
            "company_role": ROLE_POTENTIAL,
            "created_at": now,
        }
        supabase.table("companies").insert(minimal).execute()


# ---------------------------------------------------
# 6) 전체 실행
# ---------------------------------------------------
def run_signal_scout(limit: int = 20) -> None:
    print("🚀 Signal Scout 시작 (Option2 + event_hash dedupe)")

    articles = get_pending_articles(limit=limit)
    if not articles:
        print("✅ pending 기사 없음")
        return

    for article in articles:
        aid = article["id"]

        try:
            update_article_status(aid, "analyzing")

            result = extract_signals(article) or {}
            signals = result.get("signals", []) or []

            saved_cnt = 0
            promoted_cnt = 0

            for sig in signals:
                if float(sig.get("confidence", 1)) < CONF_SIGNAL_SAVE:
                    continue

                insert_signal_safe(aid, sig)
                saved_cnt += 1

                if should_promote_to_potential(sig):
                    upsert_potential_company(sig.get("company_name", ""))
                    promoted_cnt += 1

            update_article_status(aid, "done")
            print(f"✅ done: {aid} (signals saved: {saved_cnt}, potential promoted: {promoted_cnt})")

        except Exception as e:
            print("❌ 처리 실패:", aid, e)
            update_article_status(aid, "pending")

    print("✅ Signal Scout 종료")