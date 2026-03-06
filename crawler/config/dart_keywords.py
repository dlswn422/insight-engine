"""
config/dart_keywords.py

역할:
- DART 공시 Scout 워커의 모든 분류 규칙을 한 파일에 정의
- 이 파일만 수정하면 분류 기준이 즉시 반영됩니다

---
[EXCLUDE_KEYWORDS] 배제 키워드
  - 해당 키워드가 공시 제목에 포함되면 분석 없이 SKIPPED 처리
  - 정기공시, 형식공시, 투자판단 무관 공시 포함

[API_MAPPING_TABLE] DART 구조화 API 대응표
  - key: 공시 제목에 포함되는 한글 패턴
  - value: DART API endpoint suffix
  - 해당 API가 계약금액, 주식수 등을 정형 JSON으로 반환하므로
    별도 HTML 파싱 없이 바로 구조화 데이터를 획득 가능

[PARSE_KEYWORDS] HTML 파싱 대상 키워드
  - DART 구조화 API가 없고, 공시 HTML을 직접 파싱해야 하는 공시 유형
  - BeautifulSoup으로 첫 번째 table을 추출 → LLM에 전달
"""

# ==============================
# 경로 0: 배제 키워드
# ==============================

EXCLUDE_KEYWORDS: list[str] = [
    '주주총회',
    '의결권',
    '기업집단현황',
    '임원ㆍ주요주주',
    '상품ㆍ용역거래',
    '지배구조',
    '보고서제출',
    '동일인등출자',
    '풍문또는보도',
    '소송등의판결',
    'IR',
]


# ==============================
# 경로 1: DART 구조화 API 대응표
# ==============================
# key   → 공시 제목(report_nm)의 부분 일치 패턴
# value → DART API endpoint suffix
#         호출 URL: https://opendart.fss.or.kr/api/{value}.json

API_MAPPING_TABLE: dict[str, str] = {
    # 자산 양수도
    '유형자산양수결정':              'tgastInhDecsn',
    '유형자산양도결정':              'tgastPsnDecsn',
    '타법인주식및출자증권양수결정':  'otcorpStkInhDecsn',
    '타법인주식및출자증권양도결정':  'otcorpStkPsnDecsn',
    '영업양수결정':                  'bsnsInhDecsn',
    '영업양도결정':                  'bsnsPsnDecsn',
    '자산양수도관련기타':            'astInhPsnEtc',

    # 증자 / 감자 / 사채
    '유상증자결정':                  'piicDecsn',
    '무상증자결정':                  'fricDecsn',
    '유무상증자결정':                'pifricDecsn',
    '감자결정':                      'redcDecsn',
    '전환사채권발행결정':            'cvbdIssuDecsn',
    '신주인수권부사채권발행결정':    'bwIssuDecsn',
    '교환사채권발행결정':            'exbdIssuDecsn',

    # 합병 / 분할
    '회사합병결정':                  'corpMergDecsn',
    '회사분할결정':                  'corpDivDecsn',
    '회사분할합병결정':              'corpDivMergDecsn',
    '주식교환ㆍ이전결정':           'stkExchgTrnsfDecsn',

    # 부정적 이벤트
    '영업정지':                      'bsnsStp',
    '부도발생':                      'bnkr',
    '회생절차개시신청':              'rehabPrcedBegnAppl',
    '소송등의제기':                  'lwstPrsnt',
    '채권은행등의관리절차개시':      'bnkMngPrcedBegn',
    '해산사유발생':                  'dsslCusOccr',
}


# ==============================
# 경로 2: HTML 파싱 대상 키워드
# ==============================
# DART 구조화 API가 없어 공시 HTML을 직접 파싱해야 하는 공시 유형
# BeautifulSoup으로 첫 번째 table 추출 → LLM에 전달

PARSE_KEYWORDS: list[str] = [
    '단일판매',
    '공급계약',
    '신규시설투자',
]
