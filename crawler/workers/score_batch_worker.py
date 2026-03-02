# workers/score_batch_worker.py

from datetime import datetime, timedelta
from services.supabase_client import get_supabase_client

supabase = get_supabase_client()


def aggregate_daily_scores():
    today = datetime.utcnow().date()
    target_date = today - timedelta(days=1)

    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())

    print(f"[ScoreWorker] Aggregating signals for {target_date}")

    response = supabase.table("signals") \
        .select("company_name, impact_type, impact_strength, severity_level, confidence, created_at") \
        .gte("created_at", start.isoformat()) \
        .lte("created_at", end.isoformat()) \
        .execute()

    signals = response.data or []

    daily_scores = {}

    for s in signals:
        company = s["company_name"]

        score = (
            s["impact_strength"]
            * s["severity_level"]
            * s["confidence"]
        )

        if company not in daily_scores:
            daily_scores[company] = {"risk": 0, "opp": 0}

        if s["impact_type"] == "risk":
            daily_scores[company]["risk"] += score
        else:
            daily_scores[company]["opp"] += score

    for company, values in daily_scores.items():
        supabase.table("company_signal_daily").upsert({
            "company_name": company,
            "date": target_date.isoformat(),
            "risk_score_raw": values["risk"],
            "opp_score_raw": values["opp"]
        }).execute()

    print("[ScoreWorker] Daily aggregation complete.")


def compute_rolling_scores():
    today = datetime.utcnow().date()
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)

    response = supabase.table("company_signal_daily") \
        .select("*") \
        .gte("date", thirty_days_ago.isoformat()) \
        .execute()

    rows = response.data or []

    company_data = {}

    for row in rows:
        company = row["company_name"]
        row_date = datetime.fromisoformat(row["date"]).date()

        if company not in company_data:
            company_data[company] = {
                "risk_7d": 0,
                "risk_30d": 0,
                "opp_7d": 0,
                "opp_30d": 0,
            }

        company_data[company]["risk_30d"] += row["risk_score_raw"]
        company_data[company]["opp_30d"] += row["opp_score_raw"]

        if row_date >= seven_days_ago:
            company_data[company]["risk_7d"] += row["risk_score_raw"]
            company_data[company]["opp_7d"] += row["opp_score_raw"]

    for company, values in company_data.items():
        supabase.table("company_scores").upsert({
            "company_name": company,
            "risk_7d": values["risk_7d"],
            "risk_30d": values["risk_30d"],
            "opp_7d": values["opp_7d"],
            "opp_30d": values["opp_30d"],
            "risk_delta": values["risk_7d"],
            "opp_delta": values["opp_7d"],
            "updated_at": datetime.utcnow().isoformat()
        }).execute()

    print("[ScoreWorker] Rolling computation complete.")