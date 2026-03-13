"""
workers/dart_scout_worker.py — DART 공시 LLM 분석 워커

역할:
    1. dart_disclosures 테이블에서 scout_status='PENDING'인 공시 목록을 가져옵니다.
    2. 각 공시 제목을 분석하여 아래 3가지 경로로 분류합니다:
       - SKIPPED   : 주주총회, 의결권 등 투자 판단과 무관한 행정 공시 → 분석 없이 건너뜀
       - 원문 분석 : 타겟 키워드(계약, 합병, 소송 등)가 포함된 공시 → DART에서 원문 ZIP 다운로드
                    → 텍스트 추출 → LLM 분석 → signals 테이블에 'dart' 출처로 저장
       - UNMATCHED : 위 조건 모두 해당 없음 → 분석 건너뜀

    ※ DART API 호출 제한(100회/분)을 지키기 위해 동시 실행 수를 3개로 제한하고
       각 요청마다 2초씩 대기합니다. (3개 × 60초 / 2초 = 분당 90회)
"""

import sys
import os
import re
import asyncio
import json
import zipfile
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from bs4 import BeautifulSoup
from openai import OpenAI

from repositories.db import supabase
from config.dart_keywords import EXCLUDE_KEYWORDS, TARGET_KEYWORDS
from config import DART_API_KEY, OPENAI_API_KEY
from services.instant_signal_service import upsert_signal, upsert_general_company, should_promote_to_potential
from analysis.signal_scout import extract_signals

openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

BATCH_SIZE       = 100  # 1회 실행 시 처리할 최대 공시 수
CONCURRENT_LIMIT = 3    # 동시 처리 수 (DART API 분당 100회 제한 준수)
API_URL_BASE     = "https://opendart.fss.or.kr/api"


def preprocess_title(report_nm: str) -> str:
    """
    공시 제목에서 말머리([기재정정], [발행조건확정] 등)와 공백을 제거합니다.
    키워드 매칭 정확도를 높이기 위해 전처리합니다.
    """
    title = re.sub(r'\[.*?\]', '', report_nm)  # [기재정정] 등 괄호 말머리 제거
    title = re.sub(r'\s+', '', title)           # 공백 전체 제거
    return title


async def update_status(rcept_no: str, status: str, scout_result: dict | None = None):
    """
    공시의 처리 상태를 dart_disclosures 테이블에 업데이트합니다.

    status 값:
        SKIPPED          - 분석 불필요 공시 (주주총회 등)
        READY_FOR_ANALYSIS - 원문 파싱 및 LLM 분석 완료 (scout_result에 결과 저장)
        UNMATCHED        - 타겟 키워드에 해당하지 않는 공시
    """
    payload: dict = {"scout_status": status}
    if scout_result is not None:
        payload["scout_result"] = json.dumps(scout_result, ensure_ascii=False)

    def _do_update():
        return supabase.table("dart_disclosures").update(payload).eq("rcept_no", rcept_no).execute()

    # Supabase 요청은 동기 함수이므로 비동기 루프를 블로킹하지 않도록 스레드로 분리합니다.
    await asyncio.to_thread(_do_update)


def get_pending_disclosures(limit: int = BATCH_SIZE) -> list[dict]:
    """
    아직 처리하지 않은(PENDING) 공시 목록을 DB에서 가져옵니다.
    fetch_disclosures_dual_track.py가 새 공시를 PENDING으로 INSERT합니다.
    """
    result = (
        supabase
        .table("dart_disclosures")
        .select("*")
        .eq("scout_status", "PENDING")
        .limit(limit)
        .execute()
    )
    return result.data


async def fetch_and_extract_signals(client: httpx.AsyncClient, rcept_no: str, corp_name: str, report_nm: str) -> dict:
    """
    DART 공시 원문을 다운로드하고 LLM으로 시그널을 추출합니다.

    처리 흐름:
        1) DART API에서 ZIP 파일로 공시 원문 다운로드
        2) ZIP 압축 해제 후 HTML/XML 파일 추출
        3) BeautifulSoup으로 표(table) 텍스트 추출 (표 없으면 전체 텍스트)
        4) 텍스트 앞 3000자를 뉴스 분석기(extract_signals)에 전달
        5) 추출된 시그널을 signals 테이블에 'dart' 출처로 저장

    반환값:
        성공: {"source": "html_parse_llm", "signals_saved": N, "potential_promoted": M}
        실패: {"source": "html_parse_error", "error": "오류 메시지"}
    """
    # DART API 호출 제한(100회/분)을 지키기 위해 요청마다 2초 대기합니다.
    await asyncio.sleep(2.0)

    # ── 1단계: 공시 원문 ZIP 다운로드 ──────────────────────────────
    try:
        response = await client.get(
            f"{API_URL_BASE}/document.xml",
            params={"crtfc_key": DART_API_KEY, "rcept_no": rcept_no},
            timeout=30.0,
        )
        zip_bytes = response.content
    except Exception as e:
        return {"source": "html_parse_error", "error": f"ZIP 다운로드 실패: {e}"}

    # ── 2단계: ZIP 압축 해제 및 HTML 파일 추출 ─────────────────────
    try:
        # DART API는 에러 발생 시 ZIP 대신 JSON을 반환하는 경우가 있습니다.
        try:
            err_data = json.loads(zip_bytes.decode('utf-8'))
            return {"source": "html_parse_error", "error": f"API 에러: {err_data.get('message', err_data)}"}
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass  # 정상적인 ZIP 바이너리인 경우 예외가 발생하므로 무시합니다.

        # 한국어 파일명 처리를 위해 CP949 인코딩으로 압축 해제합니다. (Python 3.11+)
        with zipfile.ZipFile(io.BytesIO(zip_bytes), metadata_encoding='cp949') as z:
            htm_files = [f for f in z.namelist() if f.endswith(('.htm', '.html', '.xml'))]
            if not htm_files:
                return {"source": "html_parse_error", "error": "ZIP 내 HTML/XML 없음"}

            raw_bytes = z.read(htm_files[0])
    except zipfile.BadZipFile:
        return {"source": "html_parse_error", "error": "응답이 유효한 ZIP 파일이 아님"}
    except Exception as e:
        return {"source": "html_parse_error", "error": f"ZIP 파싱 실패: {e}"}

    # ── 3단계: 표(table) 텍스트 추출 ──────────────────────────────
    try:
        soup  = BeautifulSoup(raw_bytes, 'html.parser')
        table = soup.find('table')
        # 공시 본문의 표가 핵심 내용을 담고 있습니다. 표가 없으면 전체 텍스트를 사용합니다.
        table_text = (
            table.get_text(separator=' ', strip=True)
            if table
            else raw_bytes.decode('utf-8', errors='ignore')[:3000]
        )
    except Exception as e:
        return {"source": "html_parse_error", "error": f"HTML 파싱 실패: {e}"}

    # ── 4단계: LLM 통합 시그널 추출 ────────────────────────────────
    try:
        if not openai_client:
            # OpenAI API 키가 없을 경우 텍스트 미리보기만 저장하고 분석은 생략합니다.
            return {"source": "html_parse_temp", "rcept_no": rcept_no,
                    "table_text_preview": table_text[:500], "note": "LLM 추출 생략됨"}

        # 뉴스 분석기와 동일한 입력 형식으로 공시 내용을 전달합니다.
        # title에 공시명을, content에 원문 텍스트를 담아 뉴스 분석기가 그대로 해석합니다.
        mock_article = {
            "title":   f"[DART 공시] {report_nm}",
            "content": f"공시 본문 내용:\n{table_text[:3000]}"
        }

        # extract_signals는 동기 함수이므로 비동기 루프를 블로킹하지 않도록 스레드로 분리합니다.
        def _do_extract():
            return extract_signals(mock_article)

        result = await asyncio.to_thread(_do_extract)

        if result and result.get("success"):
            signals  = result.get("signals", [])
            saved    = 0
            promoted = 0

            for sig in signals:
                # LLM이 엉뚱한 회사명을 추출할 수 있으므로, DART에서 가져온 정확한 회사명으로 강제 덮어씁니다.
                sig["company_name"] = corp_name

                # 공시 데이터는 공식 자료이므로 신뢰도 0.70 이상인 시그널만 저장합니다.
                if float(sig.get("confidence", 1.0)) >= 0.70:
                    upsert_signal(None, sig, source="dart", rcept_no=rcept_no)
                    saved += 1

                    # 잠재 기업 발굴 조건을 충족하면 companies에 GENERAL로 등록합니다.
                    if should_promote_to_potential(sig):
                        upsert_general_company(sig.get("company_name", ""))
                        promoted += 1

            return {
                "source":             "html_parse_llm",
                "rcept_no":           rcept_no,
                "signals_saved":      saved,
                "potential_promoted": promoted
            }

        return {"source": "html_parse_error", "error": result.get("error_message")}

    except Exception as e:
        return {"source": "html_parse_error", "error": str(e)}


async def process_disclosure(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    disclosure: dict,
):
    """
    공시 1건을 분류하고 처리합니다.

    처리 경로:
        경로 0 (SKIPPED)    : EXCLUDE_KEYWORDS에 해당 → 즉시 SKIPPED 처리
        통합 경로 (원문 분석): TARGET_KEYWORDS에 해당  → 원문 다운로드 후 LLM 분석
        경로 3 (UNMATCHED)  : 위 어디도 해당 없음     → 분석 생략
    """
    try:
        # semaphore로 동시 처리 수를 제한하여 DART API 호출 초과를 방지합니다.
        async with semaphore:
            disclosure_id = disclosure.get("id", "")
            rcept_no    = disclosure.get("rcept_no", "")
            corp_name   = disclosure.get("corp_name", "")  # DART에 기록된 실제 회사명
            report_nm   = disclosure.get("report_nm", "")
            source_role = disclosure.get("source_role", "?")
            clean       = preprocess_title(report_nm)  # 말머리·공백 제거된 제목
            tag         = f"[{source_role}]"           # 로그 출력용 역할 태그

            # ── 경로 0: 투자 판단과 무관한 행정 공시 → 바로 제외 ──────
            for kw in EXCLUDE_KEYWORDS:
                if kw in clean:
                    print(f"  ⏭️  SKIPPED {tag}: [{report_nm}] ('{kw}')")
                    await update_status(rcept_no, "SKIPPED")
                    return

            # ── 통합 경로: 타겟 키워드 포함 → 원문 파싱 + LLM 분석 ───
            for kw in TARGET_KEYWORDS:
                if kw in clean:
                    print(f"  🧠 원문분석 {tag}: [{report_nm}] ('{kw}')")
                    result = await fetch_and_extract_signals(client, rcept_no, corp_name, report_nm)
                    await update_status(rcept_no, "READY_FOR_ANALYSIS", scout_result=result)

                    saved_str = (
                        f"| 신호 저장: {result.get('signals_saved', 0)}개"
                        if result.get('source') == 'html_parse_llm'
                        else f"| 에러: {result.get('error')}"
                    )
                    print(f"  ✅ READY {tag}: [{report_nm}] {saved_str}")
                    return

            # ── 경로 3: 어느 키워드도 해당 없음 → UNMATCHED 처리 ─────
            print(f"  ❓ UNMATCHED {tag}: [{report_nm}]")
            await update_status(rcept_no, "UNMATCHED")

    except Exception as e:
        print(f"  ❌ 오류 [{disclosure.get('report_nm', '?')}]: {e}")


async def run():
    """
    DART 공시 워커 메인 함수.

    실행 흐름:
        1) dart_disclosures에서 PENDING 공시 최대 100건 조회
        2) asyncio.gather로 최대 3건 동시 처리 (semaphore 제한)
        3) PENDING이 남아 있으면 계속 반복 처리 (100건 초과 대비)
    """
    print("=" * 55)
    print("[dart_scout_worker] LLM-Unified Scout 시작")
    print(f"  배제: {len(EXCLUDE_KEYWORDS)}개 / 타겟: {len(TARGET_KEYWORDS)}개")
    print("=" * 55)

    total_processed = 0
    batch_num = 0

    # PENDING이 남아있지 않을 때까지 반복합니다.
    # BATCH_SIZE(100)보다 많은 공시가 쌓여 있어도 전부 처리합니다.
    while True:
        disclosures = get_pending_disclosures()
        if not disclosures:
            if batch_num == 0:
                print("[dart_scout_worker] PENDING 공시 없음.")
            break

        batch_num += 1
        total_processed += len(disclosures)
        print(f"\n[배치 {batch_num}] 처리 대상: {len(disclosures)}개 (누적: {total_processed}개)\n")

        semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)
        async with httpx.AsyncClient() as client:
            tasks = [process_disclosure(client, semaphore, d) for d in disclosures]
            await asyncio.gather(*tasks, return_exceptions=True)

    print("\n" + "=" * 55)
    print("[dart_scout_worker] 완료")
    if batch_num > 0:
        print(f"  총 {batch_num}배치 / {total_processed}건 처리")
    print("=" * 55)


if __name__ == "__main__":
    asyncio.run(run())
