"""
Signal Scout Worker (DB 정합성 보장 최종 안정 버전)

역할:
- pending 기사 조회
- GPT로 Signal 추출
- signals 테이블에 upsert (중복 방어)
- companies 테이블은 존재 보장만 함
- 기사 상태 완료 처리

⚠️ 점수는 companies에 직접 누적하지 않음
→ 항상 signals 기반으로 집계(View 사용)
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
    (
        supabase
        .table("articles")
        .update({"scout_status": status})
        .eq("id", article_id)
        .execute()
    )


# ---------------------------------------------------
# 3️⃣ Company 존재 보장
# ---------------------------------------------------
def ensure_company_exists(company_name):
    """
    companies 테이블에 기업이 없으면 생성
    점수는 저장하지 않음 (집계로 계산)
    """

    existing = (
        supabase
        .table("companies")
        .select("id")
        .eq("company_name", company_name)
        .execute()
    )

    if not existing.data:
        (
            supabase
            .table("companies")
            .insert({
                "company_name": company_name,
                "created_at": datetime.utcnow().isoformat()
            })
            .execute()
        )


# ---------------------------------------------------
# 4️⃣ Signal 저장 (중복 완전 방어)
# ---------------------------------------------------
def insert_signal_safe(article_id, sig):
    """
    signals 테이블 저장

    UNIQUE(article_id, company_name, event_type)
    + upsert 사용

    → 같은 기사 + 같은 회사 + 같은 이벤트는
      절대 두 번 저장되지 않음
    """

    data = {
        "article_id": article_id,
        "company_name": sig["company_name"],
        "event_type": sig["event_type"],
        "impact_type": sig["impact_type"],
        "impact_strength": sig["impact_strength"],
        "opportunity_type": sig.get("opportunity_type"),
        "confidence": sig.get("confidence", 0.8),
        "created_at": datetime.utcnow().isoformat()
    }

    (
        supabase
        .table("signals")
        .upsert(
            data,
            on_conflict="article_id,company_name,event_type"
        )
        .execute()
    )


# ---------------------------------------------------
# 5️⃣ 전체 실행 로직
# ---------------------------------------------------
def run_signal_scout():
    """
    Signal Scout 실행 흐름

    1. pending 기사 조회
    2. 상태 → analyzing
    3. GPT 호출
    4. signal upsert
    5. company 존재 보장
    6. 상태 → done

    ⚠️ 점수 누적은 하지 않음
    """

    print("🚀 Signal Scout 시작")

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

                # 1️⃣ 기업 존재 보장
                ensure_company_exists(sig["company_name"])

                # 2️⃣ signal 저장 (중복 방어)
                insert_signal_safe(article["id"], sig)

            update_article_status(article["id"], "done")

        except Exception as e:
            print("❌ 처리 실패:", e)
            update_article_status(article["id"], "pending")

    print("✅ Signal Scout 종료")