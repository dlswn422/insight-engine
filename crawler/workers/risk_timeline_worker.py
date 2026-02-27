"""
계정별 일일 리스크 집계 워커
"""

from repositories.db import supabase
from datetime import date


def aggregate_daily_risk(customer_id):
    """
    해당 고객의 오늘 impact_score 합산
    """
    today = date.today().isoformat()

    result = (
        supabase
        .table("account_signals")
        .select("impact_score")
        .eq("customer_id", customer_id)
        .execute()
    )

    scores = [r["impact_score"] for r in result.data]
    return sum(scores)


def update_risk_timeline(customer_id):
    """
    account_risk_timeline 업데이트
    """
    today = date.today().isoformat()
    daily_score = aggregate_daily_risk(customer_id)

    # 이전 누적 조회
    result = (
        supabase
        .table("account_risk_timeline")
        .select("cumulative_risk_score")
        .eq("customer_id", customer_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
    )

    prev_score = result.data[0]["cumulative_risk_score"] if result.data else 0
    cumulative = prev_score + daily_score

    data = {
        "customer_id": customer_id,
        "date": today,
        "daily_risk_score": daily_score,
        "cumulative_risk_score": cumulative
    }

    (
        supabase
        .table("account_risk_timeline")
        .insert(data)
        .execute()
    )


def run_risk_timeline():
    print("🚀 Risk Timeline 업데이트 시작")

    customers = supabase.table("customers").select("id").execute().data

    for cust in customers:
        update_risk_timeline(cust["id"])

    print("✅ Risk Timeline 완료")