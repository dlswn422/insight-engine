"""
Action Recommendation Worker (조건부 전략 생성 Agent)

목적:
- 산업 레이더 대응
- 고객 이탈 위험 대응
- 영업 전략 자동화

조건 기반 전략 생성
"""

import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from repositories.db import supabase


# ---------------------------------------------------
# 🔐 환경 변수
# ---------------------------------------------------
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ---------------------------------------------------
# 📌 전략 생성 대상 필터
# ---------------------------------------------------
def get_target_companies():

    dashboard = supabase.table("v_main_dashboard") \
        .select("*") \
        .execute().data

    targets = []

    for company in dashboard:

        name = company["company_name"]

        risk_level = company.get("risk_level", "LOW")
        opp_level = company.get("opportunity_level", "LOW")
        risk_delta = company.get("risk_delta", 0)
        opp_delta = company.get("opportunity_delta", 0)

        # 기존 전략 조회
        existing = supabase.table("action_recommendations") \
            .select("generated_at") \
            .eq("company_name", name) \
            .execute().data

        should_generate = False

        # 조건 1,2: 급변 HIGH 기업
        if (
            (risk_level == "HIGH" and risk_delta >= 20)
            or (opp_level == "HIGH" and opp_delta >= 20)
        ):
            should_generate = True

        # 조건 3: HIGH인데 전략 없음
        if risk_level == "HIGH" and not existing:
            should_generate = True

        # 조건 4: 24시간 경과
        if existing:
            last_time = datetime.fromisoformat(
                existing[0]["generated_at"].replace("Z", "")
            )
            if datetime.utcnow() - last_time > timedelta(hours=24):
                should_generate = True

        if should_generate:
            targets.append(company)

    return targets


# ---------------------------------------------------
# 🧠 GPT 전략 생성
# ---------------------------------------------------
def generate_strategy(company):

    breakdown = supabase.table("signals") \
        .select("event_type, impact_type, impact_strength") \
        .eq("company_name", company["company_name"]) \
        .limit(5) \
        .execute().data

    prompt = f"""
    기업: {company['company_name']}
    Risk Score: {company['risk_score']}
    Opportunity Score: {company['opportunity_score']}
    Risk Delta: {company['risk_delta']}
    Opportunity Delta: {company['opportunity_delta']}

    최근 이벤트:
    {json.dumps(breakdown, ensure_ascii=False)}

    신일팜글래스 임원 및 영업팀을 위한 전략 3개 작성.
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
            "actions": json.dumps(strategy["actions"], ensure_ascii=False),
            "risk_score": company["risk_score"],
            "opportunity_score": company["opportunity_score"],
            "risk_delta": company["risk_delta"],
            "opportunity_delta": company["opportunity_delta"],
            "generated_at": datetime.utcnow().isoformat()
        },
        on_conflict="company_name"
    ).execute()


# ---------------------------------------------------
# 🚀 실행 함수
# ---------------------------------------------------
def run_action_worker():

    print("🚀 Action Recommendation Worker 시작")

    targets = get_target_companies()

    print(f"🎯 전략 생성 대상 기업 수: {len(targets)}")

    for company in targets:
        try:
            strategy = generate_strategy(company)
            save_strategy(company, strategy)
            print(f"✅ {company['company_name']} 전략 생성 완료")

        except Exception as e:
            print(f"❌ {company['company_name']} 처리 실패:", e)

    print("🏁 Action Recommendation Worker 종료")