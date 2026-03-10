"""
services/instant_signal_service.py — 메모리 기반 즉석 LLM 시그널 분석 서비스

역할:
    - 기사 원문(제목/요약)을 DB에 저장하지 않고 메모리에서 직접 LLM 분석
    - LLM이 추출한 시그널(events)을 signals 테이블에 저장 (event_hash로 중복 방지)
    - 뉴스에서 처음 발견된 기업은 companies 테이블에 GENERAL 등급으로 신규 등록
      (업종 매핑 후 sync_potential_companies.py가 POTENTIAL로 나중에 승격시킴)
"""

from datetime import datetime
import hashlib
import re

from repositories.db import supabase
from analysis.signal_scout import extract_signals

# ─── 시그널 저장 기준 ──────────────────────────────────────
# 이 값 미만의 confidence를 가진 시그널은 저장하지 않습니다.
CONF_SIGNAL_SAVE = 0.70

# 이 값 이상의 confidence를 가진 시그널이어야 GENERAL 등록 조건을 검토합니다.
CONF_PROMOTE_POTENTIAL = 0.75

# ─── GENERAL 등록 허용 조건 ───────────────────────────────
# 아래 업종(industry_tag) 또는 카테고리(signal_category)에 해당하는 시그널만
# 기업을 GENERAL로 등록합니다.
ALLOWED_INDUSTRY_FOR_POTENTIAL  = {"Pharma", "Bio", "Cosmetic"}
ALLOWED_CATEGORY_FOR_POTENTIAL  = {"Investment", "Partnership", "Expansion", "Product"}

# ─── 기업 등록 제외 키워드 ────────────────────────────────
# 이 문자열이 기업명에 포함되면 기업 등록 대상에서 제외합니다. (주식 지수, 금융 용어 등)
BLOCK_COMPANY_SUBSTRINGS = [
    "코스피", "코스닥", "지수", "ETF", "ETN", "선물", "인버스", "레버리지",
    "채권", "원달러", "환율", "금리", "가상자산", "비트코인"
]

# ─── 기업 역할(Role) 상수 ─────────────────────────────────
ROLE_OWN       = "OWN"       # 자사
ROLE_CLIENT    = "CLIENT"    # 기존 고객사
ROLE_POTENTIAL = "POTENTIAL" # 타겟 업종 잠재 고객사
ROLE_GENERAL   = "GENERAL"   # 뉴스에서 언급된 일반 기업 (아직 검증 안 됨)


def _collapse_ws(s: str) -> str:
    """공백을 제거하고 소문자로 정규화합니다. event_hash 생성 시 사용."""
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s).strip()
    return s


def make_event_hash(sig: dict) -> str:
    """
    동일 기업의 동일 이벤트가 중복 저장되지 않도록 해시값을 생성합니다.
    기업명 + 영향유형 + 시그널 카테고리 + 이벤트 유형을 조합하여 MD5로 변환합니다.
    """
    key = "|".join([
        _collapse_ws(sig.get("company_name", "")),
        _collapse_ws(sig.get("impact_type", "")),
        _collapse_ws(sig.get("signal_category", "")),
        _collapse_ws(sig.get("event_type", "")),
    ])
    return hashlib.md5(key.encode("utf-8")).hexdigest()


def should_promote_to_potential(sig: dict) -> bool:
    """
    이 시그널이 기업을 GENERAL 등록할 자격이 있는지 판단합니다.

    조건 (모두 충족해야 함):
        1) 기업명이 존재하고 금융/지수 관련 단어가 없음
        2) 영향 유형이 '기회(opportunity)'
        3) 신뢰도(confidence)가 CONF_PROMOTE_POTENTIAL 이상
        4) 허용된 업종 또는 카테고리에 해당
    """
    cname = (sig.get("company_name") or "").strip()
    if not cname:
        return False

    # 주식 지수, 금융 용어 등 불필요한 기업명 필터링
    for bad in BLOCK_COMPANY_SUBSTRINGS:
        if bad in cname:
            return False

    # 부정적 이벤트(risk)는 새 기업 발굴 대상이 아닙니다.
    if (sig.get("impact_type") or "").lower() != "opportunity":
        return False

    # 신뢰도 기준 미달이면 제외합니다.
    conf = float(sig.get("confidence", 0.0))
    if conf < CONF_PROMOTE_POTENTIAL:
        return False

    industry = (sig.get("industry_tag") or "").strip()
    category = (sig.get("signal_category") or "").strip()
    return (industry in ALLOWED_INDUSTRY_FOR_POTENTIAL) or (category in ALLOWED_CATEGORY_FOR_POTENTIAL)


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

    # 이미 등록된 기업인지 확인합니다.
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
    except Exception:
        # 스키마 제약 오류 등 예외 발생 시 최소 필드만으로 재시도합니다.
        minimal = {
            "company_name": company_name,
            "company_role": ROLE_GENERAL,
            "created_at":   now,
        }
        supabase.table("companies").insert(minimal).execute()


def upsert_signal(article_id: str | None, sig: dict, source: str = "news", rcept_no: str | None = None) -> None:
    """
    시그널 1건을 signals 테이블에 저장합니다.

    - event_hash가 같은 시그널이 이미 있으면 덮어쓰지 않습니다. (UPSERT)
    - 뉴스 시그널: article_id 체우고, rcept_no = NULL
    - DART 시그널: rcept_no 체우고, article_id = NULL
    """
    event_hash = make_event_hash(sig)

    data = {
        "event_hash":     event_hash,
        "source":         source,           # 출처: 'news' 또는 'dart'
        "company_name":   sig["company_name"],
        "event_type":     sig["event_type"],
        "impact_type":    sig["impact_type"],
        "impact_strength": int(sig["impact_strength"]),
        "signal_category": sig.get("signal_category"),
        "industry_tag":   sig.get("industry_tag"),
        "trend_bucket":   sig.get("trend_bucket"),
        "severity_level": int(sig.get("severity_level", 2)),
        "confidence":     float(sig.get("confidence", 0.8)),
        "created_at":     datetime.utcnow().isoformat(),
    }

    # 뉴스 시그널: article_id 만 체우고 rcept_no는 NULL
    if article_id:
        data["article_id"] = article_id

    # DART 시그널: rcept_no 만 체우고 article_id는 NULL
    if rcept_no:
        data["rcept_no"] = rcept_no

    # event_hash 컨럼에 UNIQUE 인덱스가 있으면 중복 시 자동으로 무시됩니다.
    supabase.table("signals").upsert(data, on_conflict="event_hash").execute()


def analyze_article_in_memory(article_row: dict, payload: dict) -> dict:
    """
    기사를 DB에서 다시 읽지 않고 메모리(API 응답 데이터)로 바로 LLM 분석합니다.

    매개변수:
        article_row : DB에 저장된 기사 메타 row (id 포함)
        payload     : 네이버 API로 받은 원본 기사 데이터 (title, description 포함)
                      ※ 이 데이터는 DB에 저장하지 않고 메모리에서만 사용합니다.

    반환값:
        {"signals_saved": 저장된 시그널 수, "potential_promoted": 등록된 신규 기업 수}
    """
    # LLM에 전달할 가상 기사 객체를 메모리에서 생성합니다. (DB 저장 안 함)
    mem_article = {
        "id":      article_row["id"],
        "title":   payload.get("title", ""),        # 제목: 메모리에서만 사용
        "content": payload.get("description", ""),  # 요약: 메모리에서만 사용
        "url":     payload.get("url", "")
    }

    result  = extract_signals(mem_article) or {}
    signals = result.get("signals", []) or []

    saved    = 0  # 저장된 시그널 수
    promoted = 0  # GENERAL로 등록된 신규 기업 수

    for sig in signals:
        # 신뢰도 기준 미달인 시그널은 무시합니다.
        if float(sig.get("confidence", 1)) < CONF_SIGNAL_SAVE:
            continue

        upsert_signal(article_row["id"], sig, source="news")
        saved += 1

        # 시그널이 특정 조건을 충족하면 해당 기업을 GENERAL로 등록합니다.
        if should_promote_to_potential(sig):
            upsert_general_company(sig.get("company_name", ""))
            promoted += 1

    return {"signals_saved": saved, "potential_promoted": promoted}