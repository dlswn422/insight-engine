"""
Signal Scout Worker (MVP 최적 구조 - RPC 제거 버전)

역할:
- pending 기사 조회
- GPT로 Signal 추출
- signals 저장
- companies 점수 누적 (직접 update)
- 기사 상태 완료 처리
"""

from repositories.db import supabase
from analysis.signal_scout import extract_signals
from datetime import datetime


# ---------------------------------------------------
# 1️⃣ pending 기사 조회
# ---------------------------------------------------
def get_pending_articles(limit=5):

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

    supabase.table("articles") \
        .update({"scout_status": status}) \
        .eq("id", article_id) \
        .execute()


# ---------------------------------------------------
# 3️⃣ Signal 저장
# ---------------------------------------------------
def insert_signal(article_id, sig):

    data = {
        "article_id": article_id,
        "company_name": sig["company_name"],
        "event_type": sig["event_type"],
        "impact_type": sig["impact_type"],
        "impact_strength": sig["impact_strength"],
        "opportunity_type": sig["opportunity_type"],
        "confidence": sig["confidence"],
        "created_at": datetime.utcnow().isoformat()
    }

    result = supabase.table("signals").insert(data).execute()

    return result.data[0] if result.data else None


# ---------------------------------------------------
# 4️⃣ Company 점수 누적 (RPC 제거)
# ---------------------------------------------------
def update_company_score(sig):

    company_name = sig["company_name"]
    impact_type = sig["impact_type"]
    strength = sig["impact_strength"]

    # 1️⃣ 기업 조회
    existing = supabase.table("companies") \
        .select("*") \
        .eq("company_name", company_name) \
        .execute()

    # 2️⃣ 없으면 생성
    if not existing.data:
        supabase.table("companies").insert({
            "company_name": company_name,
            "risk_score": 0,
            "opportunity_score": 0
        }).execute()

        existing = supabase.table("companies") \
            .select("*") \
            .eq("company_name", company_name) \
            .execute()

    company = existing.data[0]

    # 3️⃣ 점수 계산
    if impact_type == "risk":
        new_score = company["risk_score"] + strength

        supabase.table("companies") \
            .update({"risk_score": new_score}) \
            .eq("company_name", company_name) \
            .execute()

    elif impact_type == "opportunity":
        new_score = company["opportunity_score"] + strength

        supabase.table("companies") \
            .update({"opportunity_score": new_score}) \
            .eq("company_name", company_name) \
            .execute()


# ---------------------------------------------------
# 5️⃣ 전체 실행 로직
# ---------------------------------------------------
def run_signal_scout():

    print("🚀 Signal Scout 시작")

    articles = get_pending_articles()

    for article in articles:

        try:
            update_article_status(article["id"], "analyzing")

            result = extract_signals(article)

            for sig in result["signals"]:

                # confidence 필터
                if sig["confidence"] < 0.7:
                    continue

                # 1️⃣ signal 저장
                insert_signal(article["id"], sig)

                # 2️⃣ 기업 점수 누적
                update_company_score(sig)

            update_article_status(article["id"], "done")

        except Exception as e:
            print("❌ 처리 실패:", e)
            update_article_status(article["id"], "pending")

    print("✅ Signal Scout 종료")