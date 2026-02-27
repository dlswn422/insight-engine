"""
Daily Opportunity Worker (중복 완전 방어 버전)

역할:
- company_signal_summary 조회
- 상위 opportunity 기업 추출
- LLM 호출
- 하루 1회 리포트 upsert 저장

⚠️ report_date UNIQUE 기반 upsert 사용
"""

import os
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from repositories.db import supabase


# ---------------------------------------------------
# 1️⃣ .env 로드
# ---------------------------------------------------
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ---------------------------------------------------
# 2️⃣ 상위 기업 조회
# ---------------------------------------------------
def get_top_opportunity_companies(limit=5):
    """
    opportunity_score 기준 상위 기업 조회
    """
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
# 3️⃣ LLM 프롬프트 생성
# ---------------------------------------------------
def build_prompt(companies):

    return f"""
당신은 신일팜글래스 영업 전략 AI입니다.

최근 30일 산업 변화 데이터:

{json.dumps(companies, indent=2, ensure_ascii=False)}

각 기업별:
1. 영업 기회 요약
2. 왜 기회인지 설명
3. 추천 액션
4. 우선순위 (High/Medium/Low)

JSON으로만 응답:

{{
  "daily_summary": "",
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
# 4️⃣ LLM 호출
# ---------------------------------------------------
def generate_report(companies):

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Return valid JSON only."},
            {"role": "user", "content": build_prompt(companies)}
        ],
        temperature=0.3,
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)


# ---------------------------------------------------
# 5️⃣ 하루 1회 upsert 저장 (중복 방어 핵심)
# ---------------------------------------------------
def save_daily_report(report_data):

    today = datetime.utcnow().date().isoformat()

    supabase.table("daily_opportunity_reports").upsert(
        {
            "report_date": today,
            "summary": json.dumps(report_data, ensure_ascii=False),
            "created_at": datetime.utcnow().isoformat()
        },
        on_conflict="report_date"
    ).execute()


# ---------------------------------------------------
# 6️⃣ 실행 함수
# ---------------------------------------------------
def run_daily_opportunity_worker():

    print("🚀 Daily Opportunity Worker 시작")

    companies = get_top_opportunity_companies()

    if not companies:
        print("❌ 집계 데이터 없음")
        return

    report = generate_report(companies)

    save_daily_report(report)

    print("✅ Daily Opportunity Worker 종료")