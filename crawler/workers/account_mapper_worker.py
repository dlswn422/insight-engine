"""
Signal → Account 매핑
"""

from repositories.db import supabase
from services.risk_calculator import calculate_impact_score


def get_unmapped_signals():
    """
    account_signals에 아직 매핑되지 않은 signal만 조회
    """
    result = supabase.rpc(
        "get_unmapped_signals"
    ).execute()

    return result.data


def get_related_customers(article_id):
    return (
        supabase
        .table("article_customer_map")
        .select("customer_id")
        .eq("article_id", article_id)
        .execute()
        .data
    )


def insert_account_signal(customer_id, signal_id, impact_score):
    try:
        supabase.table("account_signals").insert({
            "customer_id": customer_id,
            "signal_id": signal_id,
            "impact_score": impact_score
        }).execute()
    except:
        pass  # UNIQUE index가 중복 방지


def run_account_mapper():
    print("🚀 Account Mapper 시작")

    signals = supabase.table("signals").select("*").execute().data

    for signal in signals:

        customers = get_related_customers(signal["article_id"])

        if not customers:
            continue

        impact_score = calculate_impact_score(signal)

        for cust in customers:
            insert_account_signal(
                cust["customer_id"],
                signal["id"],
                impact_score
            )

    print("✅ Account Mapper 종료")