"""
workers/dart_scout_worker.py

- PENDING 공시를 4경로(Dual-Track)로 비동기 처리
- 경로: SKIPPED → 구조화 API → HTML+LLM → UNMATCHED

실행: python workers/dart_scout_worker.py
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
from dotenv import load_dotenv

from repositories.db import supabase
from config.dart_keywords import EXCLUDE_KEYWORDS, API_MAPPING_TABLE, PARSE_KEYWORDS
from config import DART_API_KEY

load_dotenv(os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/.env")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

BATCH_SIZE      = 100
CONCURRENT_LIMIT = 3   # 3개 동시 실행 × 2초 대기 = 분당 약 90회 (100회 제한 안전 수준)
API_URL_BASE    = "https://opendart.fss.or.kr/api"


# ── 제목 전처리 ──────────────────────────────────────────
def preprocess_title(report_nm: str) -> str:
    title = re.sub(r'\[.*?\]', '', report_nm)   # [기재정정] 등 말머리 제거
    title = re.sub(r'\s+', '', title)            # 전체 공백 제거
    return title


# ── DB 상태 업데이트 ─────────────────────────────────────
async def update_status(rcept_no: str, status: str, scout_result: dict | None = None):
    payload: dict = {"scout_status": status}
    if scout_result is not None:
        payload["scout_result"] = json.dumps(scout_result, ensure_ascii=False)

    def _do_update():
        return supabase.table("dart_disclosures").update(payload).eq("rcept_no", rcept_no).execute()

    await asyncio.to_thread(_do_update)


# ── PENDING 공시 조회 ────────────────────────────────────
def get_pending_disclosures(limit: int = BATCH_SIZE) -> list[dict]:
    result = (
        supabase
        .table("dart_disclosures")
        .select("*")
        .eq("scout_status", "PENDING")
        .limit(limit)
        .execute()
    )
    return result.data


# ── 경로 1: DART 구조화 API ──────────────────────────────
async def fetch_via_structured_api(
    client: httpx.AsyncClient,
    rcept_no: str,
    corp_code: str,
    api_suffix: str
) -> dict:
    url = f"{API_URL_BASE}/{api_suffix}.json"
    params = {"crtfc_key": DART_API_KEY, "corp_code": corp_code, "rcept_no": rcept_no}

    await asyncio.sleep(2.0)  # 3 workers × (60s / 2s) = 분당 90회

    try:
        response = await client.get(url, params=params, timeout=15.0)
        data = response.json()

        if data.get("status") == "000" and data.get("list"):
            return {"source": "structured_api", "api_suffix": api_suffix, "items": data["list"]}
        return {"source": "structured_api", "api_suffix": api_suffix, "items": [], "status": data.get("status")}

    except Exception as e:
        return {"source": "structured_api_error", "error": str(e)}


# ── 경로 2: HTML 파싱 + LLM ──────────────────────────────
async def fetch_and_parse_html(client: httpx.AsyncClient, rcept_no: str) -> dict:
    await asyncio.sleep(2.0)  # 3 workers × (60s / 2s) = 분당 90회

    # ZIP 다운로드
    try:
        # DART 공시 원문 다운로드 API는 json을 지원하지 않고 document.xml 고정입니다.
        response = await client.get(
            f"{API_URL_BASE}/document.xml",
            params={"crtfc_key": DART_API_KEY, "rcept_no": rcept_no},
            timeout=30.0,
        )
        zip_bytes = response.content
    except Exception as e:
        return {"source": "html_parse_error", "error": f"ZIP 다운로드 실패: {e}"}

    # ZIP (또는 JSON 에러) 파싱
    try:
        # DART API가 에러 시 ZIP 대신 JSON(예: {"status":"013", "message":"조회결과가 없습니다."}) 반환
        try:
            err_data = json.loads(zip_bytes.decode('utf-8'))
            return {"source": "html_parse_error", "error": f"API 에러: {err_data.get('message', err_data)}"}
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass # 정상적인 ZIP 바이너리 파일인 경우 (디코딩 실패)

        # DART ZIP은 한국어 파일명(CP949)을 쓰는 경우가 있어 metadata_encoding 지정 (Python 3.11+)
        with zipfile.ZipFile(io.BytesIO(zip_bytes), metadata_encoding='cp949') as z:
            htm_files = [f for f in z.namelist() if f.endswith(('.htm', '.html', '.xml'))]
            if not htm_files:
                return {"source": "html_parse_error", "error": "ZIP 내 HTML/XML 없음"}
            
            # BeautifulSoup이 인코딩을 자동 분석하도록 bytes 그대로 전달
            raw_bytes = z.read(htm_files[0])
    except zipfile.BadZipFile:
        return {"source": "html_parse_error", "error": "응답이 유효한 ZIP 파일이 아님"}
    except Exception as e:
        return {"source": "html_parse_error", "error": f"ZIP 파싱 실패: {e}"}

    # 첫 번째 table만 추출
    try:
        soup = BeautifulSoup(raw_bytes, 'html.parser')
        table = soup.find('table')
        table_text = table.get_text(separator=' ', strip=True) if table else raw_bytes.decode('utf-8', errors='ignore')[:2000]
    except Exception as e:
        return {"source": "html_parse_error", "error": f"HTML 파싱 실패: {e}"}

    # LLM 추출
    try:
        if not openai_client:
            # LLM API 키가 없으면 추출된 텍스트 일부만 임시 저장
            return {"source": "html_parse_temp", "rcept_no": rcept_no, "table_text_preview": table_text[:500], "note": "LLM 추출 생략됨"}

        prompt = f"""다음 DART 공시 표에서 아래 항목을 JSON으로 추출하세요. 없으면 null.
- contract_amount: 계약금액
- counterparty: 계약 상대방
- contract_period: 계약 기간

표:
{table_text[:3000]}

JSON만 반환: {{"contract_amount": ..., "counterparty": ..., "contract_period": ...}}"""

        res = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        extracted = json.loads(res.choices[0].message.content)
        return {"source": "html_parse_llm", "rcept_no": rcept_no, "items": extracted}

    except Exception as e:
        return {"source": "html_parse_table_only", "table_text": table_text[:2000], "error": str(e)}


# ── 공시 1건 처리 (라우터) ────────────────────────────────
async def process_disclosure(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    disclosure: dict,
):
    try:
        # ✅ Supabase 및 DART API 모두 동시 실행 수를 제한하여 'Server disconnected' 아웃바운드 에러를 방지합니다.
        async with semaphore:
            rcept_no    = disclosure.get("rcept_no", "")
            report_nm   = disclosure.get("report_nm", "")
            corp_code   = disclosure.get("corp_code", "")
            source_role = disclosure.get("source_role", "?")
            clean       = preprocess_title(report_nm)
            tag         = f"[{source_role}]"
    
            # 경로 0: 배제
            for kw in EXCLUDE_KEYWORDS:
                if kw in clean:
                    print(f"  ⏭️  SKIPPED {tag}: [{report_nm}] ('{kw}')")
                    await update_status(rcept_no, "SKIPPED")
                    return
    
            # 경로 1: 구조화 API
            for keyword, suffix in API_MAPPING_TABLE.items():
                if keyword in clean:
                    print(f"  📡 경로1 {tag}: [{report_nm}]")
                    result = await fetch_via_structured_api(client, rcept_no, corp_code, suffix)
                    await update_status(rcept_no, "READY_FOR_ANALYSIS", scout_result=result)
                    print(f"  ✅ READY {tag}: [{report_nm}]")
                    return
    
            # 경로 2: HTML + LLM
            for kw in PARSE_KEYWORDS:
                if kw in clean:
                    print(f"  🧠 경로2 {tag}: [{report_nm}]")
                    result = await fetch_and_parse_html(client, rcept_no)
                    await update_status(rcept_no, "READY_FOR_ANALYSIS", scout_result=result)
                    print(f"  ✅ READY {tag}: [{report_nm}]")
                    return
    
            # 경로 3: UNMATCHED
            print(f"  ❓ UNMATCHED {tag}: [{report_nm}]")
            await update_status(rcept_no, "UNMATCHED")

    except Exception as e:
        print(f"  ❌ 오류 [{disclosure.get('report_nm', '?')}]: {e}")


# ── 메인 ─────────────────────────────────────────────────
async def run():
    print("=" * 55)
    print("[dart_scout_worker] Dual-Track Scout 시작")
    print(f"  배제: {len(EXCLUDE_KEYWORDS)}개 / API: {len(API_MAPPING_TABLE)}개 / 파싱: {len(PARSE_KEYWORDS)}개")
    print("=" * 55)

    disclosures = get_pending_disclosures()
    if not disclosures:
        print("[dart_scout_worker] PENDING 공시 없음.")
        return

    print(f"처리 대상: {len(disclosures)}개\n")
    semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)

    async with httpx.AsyncClient() as client:
        tasks = [process_disclosure(client, semaphore, d) for d in disclosures]
        await asyncio.gather(*tasks, return_exceptions=True)

    print("\n" + "=" * 55)
    print("[dart_scout_worker] 완료")
    print("=" * 55)


if __name__ == "__main__":
    asyncio.run(run())
