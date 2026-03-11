# crawler/services/batch_signal_service.py

from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import re
import json
import os

from dotenv import load_dotenv
from openai import OpenAI

from repositories.db import supabase

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -----------------------------
# 저장/승격 기준
# -----------------------------
CONF_SIGNAL_SAVE = 0.70

# ✅ 승격 기준 강화 (0.75 -> 0.85)
CONF_PROMOTE_POTENTIAL = 0.85

ALLOWED_INDUSTRY_FOR_POTENTIAL = {"Pharma", "Bio", "Cosmetic"}

# ✅ 카테고리 축소(Product 제외)
ALLOWED_CATEGORY_FOR_POTENTIAL = {"Investment", "Partnership", "Expansion"}

# ✅ 노이즈 문자열 필터 강화
BLOCK_COMPANY_SUBSTRINGS = [
    "코스피", "코스닥", "지수", "ETF", "ETN", "선물", "인버스", "레버리지",
    "채권", "원달러", "환율", "금리", "가상자산", "비트코인",

    # 공공/기관/일반명사 노이즈
    "시장", "시청", "구청", "군청", "도청",
    "은행", "증권", "보험", "카드",
    "협회", "재단", "공사", "공단",
    "대학교", "병원",
]

ROLE_OWN = "OWN"
ROLE_CLIENT = "CLIENT"
ROLE_POTENTIAL = "POTENTIAL"
ROLE_GENERAL = "GENERAL"

# ✅ 2-hit 룰 캐시(동일 회사 반복 조회 최소화)
_2hit_cache: dict[str, bool] = {}


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
    """
    1차 승격 필터:
    - 노이즈 문자열 제외
    - opportunity
    - confidence >= CONF_PROMOTE_POTENTIAL
    - (industry_tag 허용) OR (signal_category 허용)
    """
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


def has_two_opportunity_hits_last_24h(company_name: str) -> bool:
    """
    ✅ 2-hit 룰(핵심):
    - 최근 24시간 내
    - opportunity 신호
    - confidence >= 0.85
    - 2개 이상이면 True
    """
    company_name = (company_name or "").strip()
    if not company_name:
        return False

    if company_name in _2hit_cache:
        return _2hit_cache[company_name]

    cutoff = (datetime.utcnow() - timedelta(days=1)).isoformat()

    # 최소 2개만 확인하면 되니 limit(2)
    rows = (
        supabase.table("signals")
        .select("id")
        .eq("company_name", company_name)
        .eq("impact_type", "opportunity")
        .gte("confidence", 0.85)
        .gte("created_at", cutoff)
        .limit(2)
        .execute()
    ).data or []

    ok = (len(rows) >= 2)
    _2hit_cache[company_name] = ok
    return ok


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
    # ✅ event_hash 중복 방지 기반 업서트 (signals에 event_hash unique 필요)
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

    supabase.table("signals").upsert(data, on_conflict="event_hash").execute()


def _build_batch_prompt(items: list[dict]) -> str:
    # items: [{"article_id","title","description","url"}]
    trimmed = []
    for it in items:
        trimmed.append({
            "article_id": it["article_id"],
            "title": (it.get("title") or "")[:200],
            "description": (it.get("description") or "")[:450],
            "url": it.get("url") or ""
        })

    schema = {
        "results": [
            {
                "article_id": "uuid",
                "signals": [
                    {
                        "company_name": "string",
                        "event_type": "string",
                        "signal_category": "Earnings|StockMove|Expansion|Regulation|Investment|Partnership|Product|Risk",
                        "industry_tag": "Semiconductor|Automotive|Finance|Pharma|Battery|ETF|Bio|Cosmetic|General",
                        "trend_bucket": "Growth|Risk|Momentum|StructuralShift|InvestmentCycle|CompetitiveShift",
                        "impact_type": "opportunity|risk",
                        "impact_strength": 0,
                        "severity_level": 1,
                        "confidence": 0.0
                    }
                ]
            }
        ]
    }

    return f"""
너는 산업 전략 분석 AI다. 아래 기사 목록(최대 15개)을 기사별로 분석해서 JSON만 반환하라.
설명/마크다운/코드블럭 금지. JSON만.

반환 스키마(반드시 준수):
{json.dumps(schema, ensure_ascii=False)}

규칙:
- results는 입력 기사 개수와 동일한 article_id를 포함해야 함.
- signals가 없으면 signals: [] 로 반환.
- impact_type은 opportunity 또는 risk만.
- impact_strength 0~100 정수, severity_level 1~5 정수, confidence 0~1.
- NULL/빈 문자열 금지(모호하면 General/Risk 등으로 채움).

기사 목록:
{json.dumps(trimmed, ensure_ascii=False)}
""".strip()


def extract_signals_batch(items: list[dict]) -> dict:
    """
    returns: {"results":[{"article_id":..., "signals":[...]} ...]}
    """
    prompt = _build_batch_prompt(items)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Return ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)


def analyze_batch(items: list[dict]) -> dict:
    """
    items: [{"article_id","title","description","url"}] (<=15개)
    DB에 텍스트 저장 X. 여기서만 사용하고 버림.
    """
    out = {"signals_saved": 0, "potential_promoted": 0, "articles": len(items)}

    parsed = extract_signals_batch(items) or {}
    results = parsed.get("results", []) or []

    by_id = {r.get("article_id"): (r.get("signals") or []) for r in results}

    for it in items:
        aid = it["article_id"]
        signals = by_id.get(aid, []) or []

        for sig in signals:
            if float(sig.get("confidence", 1)) < CONF_SIGNAL_SAVE:
                continue

            # 1) signals 저장(중복은 event_hash로 방지)
            upsert_signal(aid, sig)
            out["signals_saved"] += 1

            # 2) POTENTIAL 승격: 1차 필터 + 2-hit 룰
            cname = sig.get("company_name", "")
            if should_promote_to_potential(sig) and has_two_opportunity_hits_last_24h(cname):
                upsert_potential_company(cname)
                out["potential_promoted"] += 1

    return out