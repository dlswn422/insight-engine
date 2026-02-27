"""
Daily Opportunity Worker

역할:
- company_signal_summary 조회
- 상위 opportunity 기업 추출
- LLM 1회 호출
- daily_opportunity_reports 저장
"""

import os
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from repositories.db import supabase

# .env 로드
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ---------------------------------------------------
# 1️⃣ 상위 기회 기업 조회
# ---------------------------------------------------
def get_top_opportunity_companies(limit=5):

    result = (
        supabase
        .table("company_signal_summary")
        .select("*")
        .order("opportunity_score", desc=True)
        .limit(limit)
        .execute()
    )

    return result.data


# ---------------------------------------------------
# 2️⃣ LLM 프롬프트 생성
# ---------------------------------------------------
def build_opportunity_prompt(companies):

    return f"""
당신은 신일팜글래스의 영업 전략 컨설턴트입니다.

다음은 최근 30일간 주요 기업의 산업 변화 데이터입니다:

{json.dumps(companies, indent=2, ensure_ascii=False)}

각 기업별로:

1. 왜 영업 기회가 발생했는지 설명
2. 어떤 유리용기/세척 서비스 니즈가 생길 수 있는지
3. 영업팀이 취해야 할 Next Best Action
4. 우선순위(High/Medium/Low)

형식은 아래 JSON으로만 응답하세요:

{{
  "daily_summary": "...",
  "accounts": [
    {{
      "company": "",
      "reason": "",
      "recommended_action": "",
      "priority": ""
    }}
  ]
}}
"""


# ---------------------------------------------------
# 3️⃣ LLM 호출
# ---------------------------------------------------
def generate_daily_report(companies):

    prompt = build_opportunity_prompt(companies)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Return only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)


# ---------------------------------------------------
# 4️⃣ DB 저장
# ---------------------------------------------------
def save_daily_report(report_data):

    supabase.table("daily_opportunity_reports").insert({
        "report_date": datetime.utcnow().date().isoformat(),
        "summary": json.dumps(report_data, ensure_ascii=False)
    }).execute()


# ---------------------------------------------------
# 5️⃣ 실행 함수
# ---------------------------------------------------
def run_daily_opportunity_worker():

    print("🚀 Daily Opportunity Worker 시작")

    companies = get_top_opportunity_companies()

    if not companies:
        print("❌ 집계 데이터 없음")
        return

    report = generate_daily_report(companies)

    save_daily_report(report)

    print("✅ Daily Opportunity Worker 종료")