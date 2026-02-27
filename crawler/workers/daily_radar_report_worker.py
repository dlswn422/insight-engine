"""
Daily Radar Intelligence Report Worker (고도화 버전)

역할:
- Industry Radar 집계 조회
- 기업 Risk / Opportunity 집계 조회
- LLM 기반 전략 보고서 생성
- 하루 1회 upsert 저장 (중복 방어)

보고서 구조:
1️⃣ 산업 트렌드 요약
2️⃣ 상승 트렌드 분석
3️⃣ 위험 Watchlist
4️⃣ 기회 Top 기업
5️⃣ 전략 액션 제안
"""

import os
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from repositories.db import supabase


# ---------------------------------------------------
# 1️⃣ 환경 변수 로드
# ---------------------------------------------------
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ---------------------------------------------------
# 2️⃣ Industry Radar 데이터 조회
# ---------------------------------------------------
def get_industry_radar():

    result = (
        supabase
        .table("industry_trend_summary")
        .select("*")
        .execute()
    )

    return result.data


# ---------------------------------------------------
# 3️⃣ 기업 Opportunity 상위 조회
# ---------------------------------------------------
def get_top_opportunities(limit=5):

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
# 4️⃣ 기업 Risk 상위 조회
# ---------------------------------------------------
def get_top_risks(limit=5):

    result = (
        supabase
        .table("company_signal_summary")
        .select("*")
        .order("risk_score", desc=True)
        .limit(limit)
        .execute()
    )

    return result.data


# ---------------------------------------------------
# 5️⃣ LLM 프롬프트 생성
# ---------------------------------------------------
def build_radar_prompt(radar, opportunities, risks):

    return f"""
당신은 신일팜글래스 산업 전략 분석 AI입니다.

다음은 최근 30일 산업 이벤트 데이터입니다.

[Industry Radar]
{json.dumps(radar, indent=2, ensure_ascii=False)}

[Top Opportunity Accounts]
{json.dumps(opportunities, indent=2, ensure_ascii=False)}

[Top Risk Accounts]
{json.dumps(risks, indent=2, ensure_ascii=False)}

다음을 분석하세요:

1️⃣ 현재 산업 트렌드 핵심 요약
2️⃣ 가장 빠르게 증가 중인 트렌드
3️⃣ 위험 계정 주요 원인
4️⃣ 기회 계정 우선 공략 전략
5️⃣ 전체 영업 전략 방향성

JSON으로만 응답:

{{
  "industry_summary": "",
  "rising_trends": "",
  "risk_analysis": "",
  "opportunity_strategy": "",
  "overall_strategy": ""
}}
"""


# ---------------------------------------------------
# 6️⃣ LLM 호출
# ---------------------------------------------------
def generate_radar_report(radar, opportunities, risks):

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Return valid JSON only."},
            {
                "role": "user",
                "content": build_radar_prompt(radar, opportunities, risks)
            }
        ],
        temperature=0.3,
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)


# ---------------------------------------------------
# 7️⃣ 리포트 저장 (하루 1회 upsert)
# ---------------------------------------------------
def save_radar_report(report_data):

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
# 8️⃣ 실행 함수
# ---------------------------------------------------
def run_daily_radar_report():

    print("🚀 Daily Radar Report 시작")

    radar = get_industry_radar()
    opportunities = get_top_opportunities()
    risks = get_top_risks()

    if not radar:
        print("❌ Radar 데이터 없음")
        return

    report = generate_radar_report(radar, opportunities, risks)

    save_radar_report(report)

    print("✅ Daily Radar Report 완료")