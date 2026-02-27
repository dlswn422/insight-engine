"""
Signal Prompt (Market Radar 확장 버전)

목적:
- 기사에서 산업 구조 기반 Signal 추출
- 단순 이벤트 → 산업 맥락 포함 구조화
"""

def build_signal_prompt(title: str, content: str):

    return f"""
당신은 제약/화장품 포장 산업 분석 AI입니다.

기사에서 다음 정보를 추출하세요:

1. 기업명
2. 이벤트 유형
3. 산업 카테고리
4. 트렌드 버킷
5. 심각도(1~5)

JSON 형식으로만 응답하세요:

{{
  "signals": [
    {{
      "company_name": "",
      "event_type": "",
      "signal_category": "CAPA / Quality / Regulation / Product / Partnership",
      "industry_tag": "PFS / RTU / Vial / Cosmetic / Bio",
      "trend_bucket": "Expansion / Switching / Risk / Investment",
      "impact_type": "risk / opportunity",
      "impact_strength": 0~100,
      "severity_level": 1~5,
      "confidence": 0.0~1.0
    }}
  ]
}}

기사 제목:
{title}

기사 본문:
{content[:3000]}
"""