"""
영업 인사이트 분석 프롬프트
"""

def build_prompt(title: str, content: str):

    return f"""
당신은 B2B 영업 전략 분석가입니다.

아래 기사 기반으로 JSON 형식으로만 응답하세요:

{{
  "summary": "3줄 요약",
  "sentiment": "positive/neutral/negative",
  "risk_score": 0~100 숫자,
  "risk_keywords": ["리스크 키워드1", "리스크 키워드2"],
  "main_topics": ["핵심 주제1", "핵심 주제2"],
  "sales_opportunity": true/false
}}

기사 제목:
{title}

기사 본문:
{content[:2500]}
"""