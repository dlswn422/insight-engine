import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from repositories.db import supabase


# ---------------------------------------------------
# 🔐 환경 변수 로드
# ---------------------------------------------------
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ---------------------------------------------------
# 🎯 대시보드 HIGH 기업 전체 조회
# ---------------------------------------------------
def get_dashboard_high_companies():

    dashboard = (
        supabase
        .table("v_main_dashboard")
        .select("*")
        .or_("risk_level.eq.HIGH,opportunity_level.eq.HIGH")
        .execute()
        .data
    ) or []

    scores = (
        supabase
        .table("company_scores")
        .select("*")
        .execute()
        .data
    ) or []

    score_map = {s["company_name"]: s for s in scores}

    enriched = []

    for company in dashboard:
        name = company["company_name"]
        score_info = score_map.get(name, {})

        company["risk_delta"] = score_info.get("risk_delta", 0)
        company["opp_delta"] = score_info.get("opp_delta", 0)
        company["momentum_score"] = score_info.get("momentum_score", 0)

        enriched.append(company)

    return enriched


# ---------------------------------------------------
# 🔍 재생성 필요 여부 판단
# ---------------------------------------------------
def should_regenerate(company):

    existing = (
        supabase
        .table("action_recommendations")
        .select("risk_score, opportunity_score, generated_at")
        .eq("company_name", company["company_name"])
        .execute()
        .data
    ) or []

    # 전략 없으면 무조건 생성
    if not existing:
        return True

    existing = existing[0]

    # 점수 변화 감지 (10 이상 변화)
    score_change = (
        abs(company["risk_score"] - existing.get("risk_score", 0)) >= 10
        or abs(company["opportunity_score"] - existing.get("opportunity_score", 0)) >= 10
    )

    # delta 급증 감지
    delta_spike = (
        company.get("risk_delta", 0) >= 15
        or company.get("opp_delta", 0) >= 15
    )

    # 48시간 경과 여부
    last_time = datetime.fromisoformat(
        existing["generated_at"].replace("Z", "")
    )
    time_passed = datetime.utcnow() - last_time > timedelta(hours=48)

    if delta_spike:
        return True

    if score_change and time_passed:
        return True

    return False


# ---------------------------------------------------
# 🧠 GPT 전략 생성
# ---------------------------------------------------
def generate_strategy(company):

    breakdown = (
        supabase
        .table("signals")
        .select("event_type, impact_type, impact_strength")
        .eq("company_name", company["company_name"])
        .limit(7)
        .execute()
        .data
    ) or []

    prompt = f"""
기업: {company['company_name']}
Risk Score: {company['risk_score']}
Opportunity Score: {company['opportunity_score']}
Risk Delta: {company.get('risk_delta', 0)}
Opportunity Delta: {company.get('opp_delta', 0)}
Momentum Score: {company.get('momentum_score', 0)}

최근 이벤트:
{json.dumps(breakdown, ensure_ascii=False)}

임원 및 전략팀을 위한 실행 전략 3개 작성.
JSON 형식:
{{
  "actions": ["전략1", "전략2", "전략3"]
}}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Return JSON only."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)


# ---------------------------------------------------
# 💾 전략 저장
# ---------------------------------------------------
def save_strategy(company, strategy):

    supabase.table("action_recommendations").upsert(
        {
            "company_name": company["company_name"],
            "actions": strategy["actions"],
            "risk_score": company["risk_score"],
            "opportunity_score": company["opportunity_score"],
            "risk_delta": company.get("risk_delta", 0),
            "opportunity_delta": company.get("opp_delta", 0),
            "momentum_score": company.get("momentum_score", 0),
            "generated_at": datetime.utcnow().isoformat()
        },
        on_conflict="company_name"
    ).execute()


# ---------------------------------------------------
# 🚀 실행 함수
# ---------------------------------------------------
def run_action_worker():

    print("🚀 Action Worker 3.0 시작")

    companies = get_dashboard_high_companies()

    print(f"📊 HIGH 기업 수: {len(companies)}")

    for company in companies:

        try:
            if should_regenerate(company):
                strategy = generate_strategy(company)
                save_strategy(company, strategy)
                print(f"✅ {company['company_name']} 전략 생성/업데이트 완료")
            else:
                print(f"⏸ {company['company_name']} 변화 없음 - 기존 전략 유지")

        except Exception as e:
            print(f"❌ {company['company_name']} 실패:", e)

    print("🏁 Action Worker 3.0 종료")