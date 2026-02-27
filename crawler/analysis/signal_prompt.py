"""
파일 경로:
crawler/analysis/signal_prompt.py

역할:
- GPT에게 기사에서 '비즈니스 이벤트(Signal)'를 추출하도록 지시하는 프롬프트 생성
- 기사 → 구조화된 이벤트 JSON으로 변환하기 위한 템플릿
"""

def build_signal_prompt(title: str, content: str):
    """
    기사 제목과 본문을 받아
    GPT가 Signal을 추출하도록 프롬프트 생성
    """

    return f"""
당신은 B2B 시장 신호 탐지 AI입니다.

기사에서 비즈니스 이벤트(Trigger)를 추출하세요.

JSON 형식으로만 응답하세요:

{{
  "signals": [
    {{
      "signal_type": "investment / capacity_expansion / hiring / regulation / quality_issue / competitor_activity / product_launch / partnership / risk_event",
      "signal_strength": 0~100,
      "impact_direction": "positive / negative / neutral",
      "description": "이벤트 설명",
      "event_date": "YYYY-MM-DD"
    }}
  ]
}}

기사 제목:
{title}

기사 본문:
{content[:3000]}
"""