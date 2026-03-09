"""
Signal Prompt (Market Radar 확장 버전 - prospects 강화)

목적:
- 기사에서 산업 구조 기반 Signal 추출
- signals: DB signals 테이블에 저장(항상)
- prospects: companies(company_role=POTENTIAL) 후보(있으면)
- NULL 방지 / 모든 필드 강제 채움 / JSON ONLY
"""

def build_signal_prompt(title: str, content: str):

    return f"""
당신은 산업 전략 분석 AI입니다.

기사 내용을 기반으로 반드시 모든 필드를 채워 구조화하세요.
모든 signals 항목은 아래 JSON 스키마를 완전하게 채워야 합니다.
절대 필드를 누락하지 마세요.

모호한 경우에도 산업 맥락을 추론하여 가장 근접한 카테고리를 선택하세요.
NULL, 빈 문자열, 누락 필드는 허용되지 않습니다.

반드시 JSON 형식으로만 응답하세요. (설명/마크다운/코드블럭 금지)

=========================
📌 JSON 스키마 (반드시 준수)
=========================

{{
  "signals": [
    {{
      "company_name": "기업명 (문자열)",
      "event_type": "기사 핵심 이벤트 요약 (간결하게)",

      "signal_category":
        "Earnings|StockMove|Expansion|Regulation|Investment|Partnership|Product|Risk",

      "industry_tag":
        "Semiconductor|Automotive|Finance|Pharma|Battery|ETF|Bio|Cosmetic|General",

      "trend_bucket":
        "Growth|Risk|Momentum|StructuralShift|InvestmentCycle|CompetitiveShift",

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
📌 분류 규칙
=========================

[signals 규칙]
1) signal_category는 반드시 위 목록 중 하나 선택.
2) industry_tag는 가장 가까운 산업으로 분류.
3) trend_bucket은 성장/위험/구조변화 등 맥락에 맞게 선택.
4) impact_strength는 시장 영향 강도를 0~100 사이로 추정.
5) severity_level은 1(낮음) ~ 5(매우 심각).
6) impact_type:
   - 수주/투자/확장/파트너십/성장 등 긍정 신호 → "opportunity"
   - 리콜/규제/소송/실적악화 등 부정 신호 → "risk"
7) NULL/빈 문자열 금지.

[prospects 규칙 - 중요]
1) prospects는 '잠재 고객/협업 기회'로 등록 가치가 있는 회사만 포함.
2) prospects가 없으면 빈 배열 [] 로 반환해도 되지만,
   아래 조건을 만족하면 prospects를 1~2개는 포함하세요.
3) prospects 후보 선정 조건(아래 중 하나라도 해당):
   - 투자유치/자금조달/시리즈A~C/펀딩 관련 이슈
   - 공급/수주/납품/파트너십/협업/계약 체결
   - 공장 증설/생산라인 확대/해외진출/신제품 출시로 성장 신호
4) prospects는 '우리 사업 도메인'에서 의미 있는 회사 위주로 선택:
   - 제약/바이오/화장품 제조사, 바이오 벤처/스타트업, 원료/소재/패키징/제조 관련 기업
   - 기사에 언급된 회사 중 '고객이 될 수 있는 회사' 또는 '협업 가치 있는 회사'
5) prospects에는 "이미 기사 핵심 주체인 대형 기업"만 반복해서 넣지 말고,
   가능하면 새롭게 등장한 회사(벤처/파트너/투자 대상/협력사)를 우선 포함하세요.
6) prospects는 보수적으로 뽑되, confidence가 낮으면 넣지 마세요(0.65 미만은 제외 권장).

=========================
📌 기사 정보
=========================

기사 제목:
{title}

기사 본문:
{content[:3000]}
"""