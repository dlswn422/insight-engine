"""
services/dart_service.py

역할:
- DART Open API 연동 핵심 비즈니스 로직
- 기업 고유번호 마스터 파일 다운로드 및 파싱
- 공시 목록 검색 API 호출

이 파일은 순수 비즈니스 로직만 담당합니다.
DB 접근(Supabase), 스케줄링, 실행 진입점은 각각 분리된 파일에서 처리합니다.
"""

import io
import re
import time
import zipfile
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta


# ==============================
# 내부 유틸 함수
# ==============================

def _normalize_company_name(name: str) -> str:
    """
    기업명 정규화 함수

    DART 마스터 파일과 DB 기업명 비교 시 표기 차이로 인한 매핑 실패를 방지하기 위해
    법인 표기 및 모든 공백을 제거한 정규화된 이름을 반환합니다.

    제거 대상:
    - 법인 표기: (주), 주식회사, (유), (합), (사), (재), (사단), 유한회사 등
    - 모든 공백 (반각/전각)
    - 마침표
    """
    if not name:
        return ""

    # 법인 표기 제거 (괄호 포함 다양한 형태 대응)
    patterns = [
        r'\(주\)', r'주식회사', r'\(유\)', r'유한회사',
        r'\(합\)', r'합자회사', r'\(합명\)', r'합명회사',
        r'\(사\)', r'사단법인', r'\(재\)', r'재단법인',
        r'\(사단\)', r'\(의료\)', r'농업회사법인',
        r'협동조합', r'사회적협동조합',
    ]
    for p in patterns:
        name = re.sub(p, '', name, flags=re.IGNORECASE)

    # 모든 공백(반각/전각) 및 마침표 제거
    name = re.sub(r'[\s\u3000\.]', '', name)

    return name.strip()


# ==============================
# 기능 1: DART 고유번호 마스터 파일 다운로드 및 파싱
# ==============================

def get_corp_codes_from_dart(api_key: str) -> dict:
    """
    DART 기업 고유번호 마스터 파일을 다운로드하여 딕셔너리로 반환합니다.

    - 디스크에 파일을 쓰지 않고, io.BytesIO를 사용한 메모리 상 파싱 처리
    - 기업명은 정규화(_normalize_company_name)하여 Key로 저장
    - 상장 법인(stock_code가 있는 기업)만 필터링하여 노이즈 감소 (선택 적용)

    Parameters:
        api_key (str): DART OpenAPI 인증키

    Returns:
        dict: { 정규화된_기업명(str): dart_corp_code(str, 8자리) }

    Raises:
        requests.HTTPError: API 호출 실패 시
        Exception: ZIP 파싱 또는 XML 파싱 실패 시
    """
    CORPCODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml"

    print("[dart_service] DART 마스터 파일 다운로드 시작...")

    response = requests.get(
        CORPCODE_URL,
        params={"crtfc_key": api_key},
        timeout=30
    )
    response.raise_for_status()

    # ✅ 메모리 상에서 ZIP 압축 해제 (디스크 I/O 없음)
    zip_buffer = io.BytesIO(response.content)

    with zipfile.ZipFile(zip_buffer, "r") as zf:
        # ZIP 내부의 XML 파일명 확인 후 읽기
        xml_filename = [name for name in zf.namelist() if name.endswith(".xml")]
        if not xml_filename:
            raise Exception("[dart_service] ZIP 내 XML 파일을 찾을 수 없습니다.")

        xml_data = zf.read(xml_filename[0])

    # XML 파싱
    root = ET.fromstring(xml_data)

    corp_code_map: dict = {}
    total: int = 0
    skipped: int = 0

    for item in root.findall("list"):
        corp_code = item.findtext("corp_code", "").strip()
        corp_name = item.findtext("corp_name", "").strip()

        # corp_code는 8자리여야 함
        if not corp_code or len(corp_code) != 8:
            skipped += 1
            continue

        if not corp_name:
            skipped += 1
            continue

        # 기업명 정규화 후 Key로 저장
        normalized_name = _normalize_company_name(corp_name)
        if normalized_name:
            corp_code_map[normalized_name] = corp_code
            total += 1

    print(f"[dart_service] 마스터 파일 파싱 완료 — 총 {total}개 기업 적재 (스킵: {skipped}개)")
    return corp_code_map


# ==============================
# 기능 2: 공시 목록 검색 API 호출
# ==============================

def fetch_recent_disclosures(
    api_key: str,
    corp_code: str,
    bgn_de: str | None = None
) -> list[dict]:
    """
    특정 기업의 최근 공시 목록을 DART 공시검색 API에서 가져옵니다.

    - API Rate Limit 방어를 위해 호출 전후로 time.sleep() 지연 적용
    - API 응답 status 코드가 '000'(정상)이 아닌 경우 빈 리스트 반환 (에러 전파 방지)

    Parameters:
        api_key (str): DART OpenAPI 인증키
        corp_code (str): DART 기업 고유번호 (8자리)
        bgn_de (str, optional): 시작일 (YYYYMMDD 형식). 기본값은 7일 전.

    Returns:
        list[dict]: 공시 목록
            각 항목: {
                "rcept_no": str,      # 접수번호 (Unique Key)
                "corp_code": str,     # DART 기업 고유번호
                "corp_name": str,     # 기업명
                "report_nm": str,     # 보고서명 (예: 단일판매·공급계약체결, 신규시설투자)
                "rcept_dt": str,      # 접수일 (YYYYMMDD)
                "url": str            # 공시 원문 URL
            }
    """
    DISCLOSURE_LIST_URL = "https://opendart.fss.or.kr/api/list.json"

    # ⚙️ 수집 기간 기본값: 7일 전
    # 더 넓은 기간이 필요하면 이 숫자를 조정하거나,
    # 호출 시 bgn_de 파라미터를 직접 넘기세요.
    # 예) fetch_recent_disclosures(api_key, corp_code, bgn_de="20250101")
    # 예) timedelta(days=30) 으로 변경하면 30일치 수집
    if not bgn_de:
        bgn_de = (datetime.today() - timedelta(days=180)).strftime("%Y%m%d")

    end_de = datetime.today().strftime("%Y%m%d")

    params = {
        "crtfc_key": api_key,
        "corp_code": corp_code,
        "bgn_de": bgn_de,
        "end_de": end_de,
        "sort": "date",
        "sort_mth": "desc",
        "page_no": 1,
        "page_count": 100,  # 7일치 공시는 100개면 충분
    }

    # ✅ API Rate Limit 방어 — 호출 전 지연
    time.sleep(0.3)

    try:
        response = requests.get(
            DISCLOSURE_LIST_URL,
            params=params,
            timeout=15
        )
        response.raise_for_status()
        data = response.json()

    except requests.RequestException as e:
        print(f"[dart_service] API 호출 실패 (corp_code={corp_code}): {e}")
        return []

    finally:
        # ✅ API Rate Limit 방어 — 호출 후 지연 (성공/실패 무관하게 항상 대기)
        time.sleep(0.2)

    # 응답 상태 코드 확인 ('000' = 정상, '013' = 조회 결과 없음)
    status = data.get("status", "")
    if status == "013":
        # 해당 기간 내 공시 없음 — 정상 케이스, 빈 리스트 반환
        return []
    if status != "000":
        message = data.get("message", "알 수 없는 오류")
        print(f"[dart_service] API 응답 오류 (corp_code={corp_code}, status={status}): {message}")
        return []

    disclosures = []
    for item in data.get("list", []):
        rcept_no = item.get("rcept_no", "").strip()
        if not rcept_no:
            continue  # 접수번호 없는 항목 스킵

        # DART 공시 원문 뷰어 URL 조립
        url = f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"

        disclosures.append({
            "rcept_no": rcept_no,
            "corp_code": item.get("corp_code", "").strip(),
            "corp_name": item.get("corp_name", "").strip(),
            "report_nm": item.get("report_nm", "").strip(),
            "rcept_dt": item.get("rcept_dt", "").strip(),
            "url": url,
        })

    return disclosures
