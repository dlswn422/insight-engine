"""
Signal Prompt (Market Radar 확장 버전 - NULL 방지 개선)

목적:
- 기사에서 산업 구조 기반 Signal 추출
- 단순 이벤트 → 산업 맥락 포함 구조화
- signal_category / industry_tag / trend_bucket NULL 방지
- 모든 필드 강제 채움
"""

def build_signal_prompt(title: str, content: str):

    return f"""
당신은 산업 전략 분석 AI입니다.

기사 내용을 기반으로 반드시 모든 필드를 채워 구조화하세요.
모든 signals 항목은 아래 JSON 스키마를 완전하게 채워야 합니다.
절대 필드를 누락하지 마세요.

모호한 경우에도 산업 맥락을 추론하여 가장 근접한 카테고리를 선택하세요.
NULL, 빈 문자열, 누락 필드는 허용되지 않습니다.

반드시 JSON 형식으로만 응답하세요.

=========================
📌 JSON 스키마
=========================

{{
  "signals": [
    {{
      "company_name": "기업명 (문자열)",
      "event_type": "기사 핵심 이벤트 요약 (간결하게)",
      
      "signal_category": 
        "Earnings / StockMove / Expansion / Regulation / Investment / Partnership / Product / Risk",

      "industry_tag": 
        "Semiconductor / Automotive / Finance / Pharma / Battery / ETF / Bio / Cosmetic / General",

      "trend_bucket": 
        "Growth / Risk / Momentum / StructuralShift / InvestmentCycle / CompetitiveShift",

      "impact_type": "opportunity 또는 risk",

      "impact_strength": 0~100 사이 정수 (영향력 크기),

      "severity_level": 1~5 정수 (심각도),

      "confidence": 0.0~1.0 실수 (추론 신뢰도)
    }}
  ]
}}

=========================
📌 분류 규칙
=========================

1. signal_category는 반드시 위 목록 중 하나 선택.
2. industry_tag는 가장 가까운 산업으로 분류.
3. trend_bucket은 성장/위험/구조변화 등 맥락에 맞게 선택.
4. impact_strength는 시장 영향 강도를 0~100 사이로 추정.
5. severity_level은 1(낮음) ~ 5(매우 심각).
6. NULL 또는 빈 문자열은 절대 사용하지 말 것.

=========================
📌 기사 정보
=========================

기사 제목:
{title}

기사 본문:
{content[:3000]}
"""