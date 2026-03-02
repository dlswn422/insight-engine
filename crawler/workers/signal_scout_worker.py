"""
Signal Scout Worker (Market Radar 확장 버전 - 안정화 개선)

역할:
- pending 기사 조회
- GPT로 구조화된 산업 Signal 추출
- signals 테이블에 upsert (중복 방어)
- companies 존재 보장
- 기사 상태 완료 처리

확장된 필드:
- signal_category
- industry_tag
- trend_bucket
- severity_level
"""

from repositories.db import supabase
from analysis.signal_scout import extract_signals
from datetime import datetime


# ---------------------------------------------------
# 1️⃣ pending 기사 조회
# ---------------------------------------------------
def get_pending_articles(limit=5):
    """
    scout_status = pending 기사 조회
    """
    result = (
        supabase
        .table("articles")
        .select("*")
        .eq("scout_status", "pending")
        .limit(limit)
        .execute()
    )
    return result.data


# ---------------------------------------------------
# 2️⃣ 기사 상태 업데이트
# ---------------------------------------------------
def update_article_status(article_id, status):
    """
    기사 상태 변경
    pending → analyzing → done
    """
    supabase.table("articles") \
        .update({"scout_status": status}) \
        .eq("id", article_id) \
        .execute()


# ---------------------------------------------------
# 3️⃣ 기업 존재 보장
# ---------------------------------------------------
def ensure_company_exists(company_name):
    """
    companies 테이블에 기업이 없으면 생성
    점수는 저장하지 않음 (signals 기반 집계)
    """
    existing = (
        supabase
        .table("companies")
        .select("id")
        .eq("company_name", company_name)
        .execute()
    )

    if not existing.data:
        supabase.table("companies").insert({
            "company_name": company_name,
            "created_at": datetime.utcnow().isoformat()
        }).execute()


# ---------------------------------------------------
# 4️⃣ Signal 저장 (중복 방어 + 확장 필드)
# ---------------------------------------------------
def insert_signal_safe(article_id, sig):
    """
    확장된 signals 저장
    UNIQUE(article_id, company_name, event_type) 기반 upsert
    """

    data = {
        "article_id": article_id,
        "company_name": sig["company_name"],
        "event_type": sig["event_type"],

        # 타입 안정성 보강
        "impact_type": sig["impact_type"].lower(),
        "impact_strength": int(sig["impact_strength"]),

        "signal_category": sig["signal_category"],
        "industry_tag": sig["industry_tag"],
        "trend_bucket": sig["trend_bucket"],
        "severity_level": int(sig["severity_level"]),

        "confidence": float(sig.get("confidence", 0.8)),
        "created_at": datetime.utcnow().isoformat()
    }

    supabase.table("signals").upsert(
        data,
        on_conflict="article_id,company_name,event_type"
    ).execute()


# ---------------------------------------------------
# 5️⃣ 전체 실행
# ---------------------------------------------------
def run_signal_scout():

    print("Signal Scout 시작 (Market Radar 확장)")

    articles = get_pending_articles()

    for article in articles:
        try:
            update_article_status(article["id"], "analyzing")

            result = extract_signals(article)

            if not result or "signals" not in result:
                update_article_status(article["id"], "done")
                continue

            for sig in result["signals"]:

                # confidence 필터
                if sig.get("confidence", 1) < 0.7:
                    continue

                ensure_company_exists(sig["company_name"])
                insert_signal_safe(article["id"], sig)

            update_article_status(article["id"], "done")

        except Exception as e:
            print("❌ 처리 실패:", e)
            update_article_status(article["id"], "pending")

    print("✅ Signal Scout 종료")