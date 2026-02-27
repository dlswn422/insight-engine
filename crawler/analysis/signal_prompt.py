"""
파일 경로:
crawler/analysis/signal_prompt.py

역할:
- GPT에게 기사에서 "영업 관점의 비즈니스 이벤트(Signal)"를 추출하도록 지시
- 기사 → 구조화된 산업 특화 Signal JSON으로 변환하기 위한 프롬프트 생성

목표:
단순 기사 요약이 아니라,
"우리 영업팀이 행동할 수 있는 이벤트"를 추출하도록 유도
"""
"""
기사 → 영업 중심 Signal 추출 프롬프트
"""

def build_signal_prompt(title: str, content: str):

    return f"""
당신은 B2B 영업 신호 탐지 AI입니다.

기사에서 기업의 '비즈니스 변화 이벤트'를 감지하세요.

요약하지 마세요.
설명하지 마세요.
JSON만 반환하세요.

다음 필드를 반드시 포함하세요:

- company_name
- event_type
- impact_type (risk / opportunity)
- impact_strength (0~100)
- opportunity_type (growth / replacement / risk_response / none)
- confidence (0.0~1.0)

기준:

growth:
- 투자, 증설, 신규 공장, 해외 진출, 대규모 채용

replacement:
- 협력사 변경, 계약 종료, 품질 문제

risk_response:
- 리콜, 규제 이슈, 재무 위기

none:
- 영업 의미 없는 일반 기사

반드시 다음 JSON 형식으로 응답하세요:

{{
  "signals": [
    {{
      "company_name": "",
      "event_type": "",
      "impact_type": "",
      "impact_strength": 0,
      "opportunity_type": "",
      "confidence": 0.0
    }}
  ]
}}

기사 제목:
{title}

기사 본문:
{content[:3000]}
"""