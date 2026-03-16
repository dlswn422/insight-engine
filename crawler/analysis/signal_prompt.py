"""
crawler/analysis/signal_prompt.py

Signal Prompt (Market Radar 확장 버전 - v1.0 기준 적용)

- impact_strength(0~100), severity_level(1~5), confidence(0~1) 기준(앵커) 명시
- risk/opportunity 하드 룰 명시
- 본문 입력 상한: 1,200자
"""

from __future__ import annotations


def build_signal_prompt(title: str, content: str) -> str:
    content = (content or "")[:1200]

    return f"""
당신은 산업 전략 분석 AI입니다.

아래 기사 내용을 기반으로, 반드시 모든 필드를 채워 **signals**(구조화 이벤트)와 **prospects**(잠재 고객 후보)를 JSON으로 생성하세요.
- **반드시 JSON 형식으로만** 응답하세요. (설명/마크다운/코드블럭 금지)
- NULL/빈 문자열/필드 누락 금지
- 애매하면 가장 근접한 값을 선택하되 confidence를 낮추세요.

=========================
📌 JSON 스키마 (반드시 준수)
=========================

{{
  "signals": [
    {{
      "company_name": "기업명 (문자열)",
      "event_type": "기사 핵심 이벤트 요약 (간결하게)",

      "signal_category": "Earnings|StockMove|Expansion|Regulation|Investment|Partnership|Product|Risk",
      "industry_tag": "Semiconductor|Automotive|Finance|Pharma|Battery|ETF|Bio|Cosmetic|General",
      "trend_bucket": "Growth|Risk|Momentum|StructuralShift|InvestmentCycle|CompetitiveShift",

      "impact_type": "opportunity 또는 risk",
      "impact_strength": 0~100 사이 정수,
      "severity_level": 1~5 정수,
      "confidence": 0.0~1.0 실수
    }}
  ],

  "prospects": [
    {{
      "company_name": "잠재 후보 회사명(문자열)",
      "reason": "잠재로 판단한 이유(수주/투자/파트너십/확장/성장 등)",
      "confidence": 0.0~1.0 실수
    }}
  ]
}}

=========================
📌 v1.0 분류/점수 기준(앵커)
=========================

[impact_type 하드 룰]
- 항상 risk:
  - 리콜/회수/불량/위해/클레임/품질 문제
  - 허가 취소/행정처분/과징금/규제 위반
  - 소송/분쟁/횡령/배임/감사의견
  - 실적 급감/적자전환/가이던스 하향
  - 생산중단/공장 사고/공급망 붕괴
- 항상 opportunity:
  - 대규모 투자/CAPEX/공장·라인 증설
  - 수주/납품/장기 계약/파트너십 체결
  - 임상 성공/허가/인증 획득(GMP/ISO 등)
  - 성장 방향이 명확한 M&A

[impact_strength(0~100) 앵커]
- 0~19: 미미/노이즈
- 20~39: 약한 영향
- 40~59: 중간 영향
- 60~79: 큰 영향
- 80~100: 구조 변화급

[severity_level(1~5) 앵커]
- 1: 관찰 / 2: 경미 / 3: 주의 / 4: 심각 / 5: 위기
하드 룰: 리콜/허가취소/공장사고/대형 소송이면 severity_level 최소 4

[confidence(0~1) 앵커]
- 0.0~0.39: 루머/해석 의존 큼
- 0.40~0.64: 가능성
- 0.65~0.79: 신뢰 가능
- 0.80~1.0: 매우 확실

=========================
📌 prospects 규칙
=========================
- prospects는 잠재 고객/협업 기회 회사만 포함
- 없다면 [] 가능
- 투자/수주/계약/증설/신제품/파트너십이면 포함 고려
- confidence 0.65 미만이면 제외(가능하면)

=========================
📌 기사 정보
=========================

기사 제목:
{title}

기사 본문:
{content}
"""