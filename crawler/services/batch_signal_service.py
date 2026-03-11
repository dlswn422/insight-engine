# crawler/services/batch_signal_service.py
"""
뉴스 기사를 Bulk LLM으로 분석하여 signals 테이블에 저장합니다.
뉴스에서 발견된 기업은 companies 테이블에 GENERAL로 등록합니다.
(POTENTIAL 승격은 sync_potential_companies.py가 별도로 담당합니다.)
"""

from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import re
import json

from config import OPENAI_API_KEY
from openai import OpenAI

from repositories.db import supabase

# API 키는 config 패키지(.env) 에서만 로드합니다.
client = OpenAI(api_key=OPENAI_API_KEY)

# -----------------------------
# 저장/승격 기준
# -----------------------------
CONF_SIGNAL_SAVE = 0.70

# 기업 GENERAL 등록 기준 (뉴스 출신 기업은 GENERAL로만 등록)
CONF_REGISTER_GENERAL = 0.85

ALLOWED_INDUSTRY_FOR_GENERAL = {"Pharma", "Bio", "Cosmetic"}

# ✅ 카테고리 축소(Product 제외)
ALLOWED_CATEGORY_FOR_GENERAL = {"Investment", "Partnership", "Expansion"}

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
    """동일 기업의 동일 이벤트가 중복 저장되지 않도록 MD5 해시값을 생성합니다."""
    key = "|".join([
        _collapse_ws(sig.get("company_name", "")),
        _collapse_ws(sig.get("impact_type", "")),
        _collapse_ws(sig.get("signal_category", "")),
        _collapse_ws(sig.get("event_type", "")),
    ])
    return hashlib.md5(key.encode("utf-8")).hexdigest()


def should_register_general(sig: dict) -> bool:
    """
    뉴스 시그널 기반으로 기업을 GENERAL로 등록할지 판단합니다.

    조건 (모두 충족해야 함):
        1) 기업명이 존재하고 노이즈 단어가 없음
        2) 영향 유형이 '기회(opportunity)'
        3) 신뢰도가 CONF_REGISTER_GENERAL 이상
        4) 허용된 업종 또는 카테고리에 해당
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
    if conf < CONF_REGISTER_GENERAL:
        return False

    industry = (sig.get("industry_tag") or "").strip()
    category = (sig.get("signal_category") or "").strip()

    return (industry in ALLOWED_INDUSTRY_FOR_GENERAL) or (category in ALLOWED_CATEGORY_FOR_GENERAL)


# 하위 호환성 유지를 위한 별칭 (dart_llm_worker, dart_scout_worker에서 사용)
should_promote_to_potential = should_register_general



def upsert_general_company(company_name: str) -> None:
    """
    뉴스/공시에서 처음 발견된 기업을 companies 테이블에 GENERAL 등급으로 등록합니다.

    - 이미 companies 테이블에 존재하는 기업이면 아무것도 하지 않습니다.
      (기존 등급이 무엇이든 덮어쓰지 않습니다.)
    - 신규 기업만 GENERAL로 INSERT합니다.
    - 이후 sync_potential_companies.py가 업종 DB와 대조해 POTENTIAL로 승격시킵니다.
    """
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
        # 이미 존재하면 아무것도 건드리지 않습니다. (등급 보호)
        return

    # 신규 기업: GENERAL 등급으로 INSERT하고, DART 코드 매핑 대기 상태로 설정합니다.
    payload = {
        "company_name":    company_name,
        "company_role":    ROLE_GENERAL,
        "dart_sync_status": "PENDING",  # sync_dart_codes.py가 DART 코드를 찾아줄 예정
        "created_at":      now,
        "updated_at":      now,
    }
    try:
        supabase.table("companies").insert(payload).execute()
        print(f"  🏢 신규 기업 GENERAL 등록: {company_name}")
    except Exception:
        # 스키마 제약 오류 등 예외 발생 시 최소 필드만으로 재시도합니다.
        minimal = {
            "company_name": company_name,
            "company_role": ROLE_GENERAL,
            "created_at":   now,
        }
        supabase.table("companies").insert(minimal).execute()


def upsert_signal(
    article_id: str | None,
    sig: dict,
    source: str = "news",
    rcept_no: str | None = None,
) -> None:
    """
    시그널 1건을 signals 테이블에 저장합니다.

    - event_hash가 같은 시그널이 이미 있으면 덮어쓰지 않습니다. (UPSERT)
    - 뉴스 시그널: article_id 채우고, rcept_no = NULL
    - DART 시그널: rcept_no 채우고, article_id = NULL
    """
    event_hash = make_event_hash(sig)

    data = {
        "event_hash":      event_hash,
        "source":          source,
        "company_name":    sig["company_name"],
        "event_type":      sig["event_type"],
        "impact_type":     sig["impact_type"],
        "impact_strength": int(sig["impact_strength"]),
        "signal_category": sig.get("signal_category"),
        "industry_tag":    sig.get("industry_tag"),
        "trend_bucket":    sig.get("trend_bucket"),
        "severity_level":  int(sig.get("severity_level", 2)),
        "confidence":      float(sig.get("confidence", 0.8)),
        "created_at":      datetime.utcnow().isoformat(),
    }

    # 뉴스 시그널: article_id 만 채우고 rcept_no는 NULL
    if article_id:
        data["article_id"] = article_id

    # DART 시그널: rcept_no 만 채우고 article_id는 NULL
    if rcept_no:
        data["rcept_no"] = rcept_no

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

    반환: {"signals_saved": N, "general_registered": M, "articles": len}
    ※ general_registered는 GENERAL로 등록된 기업 수를 의미합니다.
    """
    out = {"signals_saved": 0, "general_registered": 0, "articles": len(items)}

    parsed = extract_signals_batch(items) or {}
    results = parsed.get("results", []) or []

    by_id = {r.get("article_id"): (r.get("signals") or []) for r in results}

    for it in items:
        aid = it["article_id"]
        signals = by_id.get(aid, []) or []

        for sig in signals:
            if float(sig.get("confidence", 1)) < CONF_SIGNAL_SAVE:
                continue

            # 1) signals 저장 (중복은 event_hash로 방지)
            upsert_signal(aid, sig, source="news")
            out["signals_saved"] += 1

            # 2) GENERAL 등록: 1차 필터 (2-hit 룰 제거됨, 긍정이면 즉시 등록)
            #    뉴스 출신 기업은 반드시 GENERAL로만 등록합니다.
            #    POTENTIAL 승격은 sync_potential_companies.py가 담당합니다.
            cname = sig.get("company_name", "")
            if should_register_general(sig):
                upsert_general_company(cname)
                out["general_registered"] += 1

    return out