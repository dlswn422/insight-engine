"""
instant_signal_service.py

- DB에는 기사 텍스트 저장 X
- 크롤링 시점에 메모리(title/description)로 LLM 분석
- signals 저장(event_hash 중복방지) + companies POTENTIAL 승격
"""

from datetime import datetime
import hashlib
import re

from repositories.db import supabase
from analysis.signal_scout import extract_signals

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


def upsert_potential_company(company_name: str) -> None:
    company_name = (company_name or "").strip()
    if not company_name:
        return

    existing = (
        supabase.table("companies")
        .select("id, company_role")
        .eq("company_name", company_name)
        .execute()
    ).data or []

    now = datetime.utcnow().isoformat()

    if existing:
        role = existing[0].get("company_role") or ROLE_GENERAL
        if role in [ROLE_OWN, ROLE_CLIENT]:
            return
        # POTENTIAL 보장
        try:
            supabase.table("companies").update({
                "company_role": ROLE_POTENTIAL,
                "updated_at": now
            }).eq("company_name", company_name).execute()
        except Exception:
            supabase.table("companies").update({
                "company_role": ROLE_POTENTIAL
            }).eq("company_name", company_name).execute()
        return

    # 신규 insert
    payload = {
        "company_name": company_name,
        "company_role": ROLE_POTENTIAL,
        "dart_sync_status": "PENDING",
        "created_at": now,
        "updated_at": now
    }
    try:
        supabase.table("companies").insert(payload).execute()
    except Exception:
        minimal = {
            "company_name": company_name,
            "company_role": ROLE_POTENTIAL,
            "created_at": now
        }
        supabase.table("companies").insert(minimal).execute()


def upsert_signal(article_id: str, sig: dict) -> None:
    """
    event_hash 기반 중복 방지 upsert (너희가 이전에 구축한 B안과 동일)
    """
    event_hash = make_event_hash(sig)

    data = {
        "event_hash": event_hash,
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

    # event_hash UNIQUE 인덱스가 있으면 이게 정상 동작
    supabase.table("signals").upsert(data, on_conflict="event_hash").execute()


def analyze_article_in_memory(article_row: dict, payload: dict) -> dict:
    """
    article_row: DB에 저장된 메타 row (id 포함)
    payload: 네이버 API로 받은 데이터 (title/description/url/published_at) - 메모리 전용
    """
    mem_article = {
        "id": article_row["id"],
        "title": payload.get("title", ""),                 # ✅ DB 저장 X
        "content": payload.get("description", ""),         # ✅ DB 저장 X
        "url": payload.get("url", "")
    }

    result = extract_signals(mem_article) or {}
    signals = result.get("signals", []) or []

    saved = 0
    promoted = 0

    for sig in signals:
        if float(sig.get("confidence", 1)) < CONF_SIGNAL_SAVE:
            continue

        upsert_signal(article_row["id"], sig)
        saved += 1

        if should_promote_to_potential(sig):
            upsert_potential_company(sig.get("company_name", ""))
            promoted += 1

    return {"signals_saved": saved, "potential_promoted": promoted}