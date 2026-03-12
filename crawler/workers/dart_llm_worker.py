"""
workers/dart_llm_worker.py — DART 공시 Bulk LLM 분석 워커

역할:
    dart_disclosures 테이블에서 scout_status='READY_FOR_LLM'인 공시를
    LLM_CHUNK_SIZE 단위로 묶어서 LLM API를 1회만 호출하여 시그널을 추출합니다.

    ※ 이 워커는 dart_classifier_worker.py가 먼저 실행하여 분류를 완료한
       이후에 실행하는 것을 전제로 합니다.
       dart_classifier_worker → (READY_FOR_LLM 생성) → dart_llm_worker

    처리 흐름:
        1) dart_disclosures에서 READY_FOR_LLM 공시를 LLM_CHUNK_SIZE건씩 꺼냄
        2) 각 공시의 원문 ZIP을 DART API에서 병렬 다운로드 + 텍스트 추출
        3) 추출된 텍스트를 하나의 프롬프트로 결합 → LLM API 1회 호출
        4) 결과를 source_id 기준으로 각 공시에 매핑 → signals 테이블에 저장
        5) 처리 완료된 공시 상태를 READY_FOR_ANALYSIS로 업데이트

    ※ DART API 호출 제한(100회/분)을 지키기 위해
       ZIP 다운로드 동시 요청 수를 CONCURRENT_LIMIT으로 제한하고
       각 요청마다 2초씩 대기합니다.

실행 방법:
    crawler 폴더에서:  python workers/dart_llm_worker.py
"""

import sys
import os
import asyncio
import json
import zipfile
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
import warnings

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

from repositories.db import supabase
from config import DART_API_KEY, OPENAI_API_KEY
from services.instant_signal_service import upsert_signal, upsert_general_company, should_promote_to_potential
from llm.openai_compat import chat_completions_json

# ──────────────────────────────────────────────────────────────────────────────
# ⚙️  운영 파라미터 — 이 값들만 조절하면 동작 방식이 달라집니다.
# ──────────────────────────────────────────────────────────────────────────────

API_URL_BASE     = "https://opendart.fss.or.kr/api"
CONCURRENT_LIMIT = 3     # DART API ZIP 다운로드 동시 요청 수 (분당 100회 제한 준수)

# ★ 핵심 파라미터: LLM에 한 번에 묶어서 던질 공시 개수 ★
# - 범위 권장: 3 ~ 10
# - 너무 작으면(1~2): API 호출 절감 효과 미미 (사실상 단건 처리와 동일)
# - 적정값(5~7): LLM 집중력 유지 + API 호출 횟수 대폭 절감 ← 권장
# - 너무 크면(10+): LLM이 중간 공시를 대충 읽거나 출력 JSON이 잘릴 위험
# ▼ 이 숫자 하나만 바꾸면 묶음 크기가 전체에 반영됩니다 ▼
LLM_CHUNK_SIZE   = 5     # 예: 5 → 공시 5건을 ZIP 다운로드 후 LLM 1회에 던짐

# 공시 1건당 LLM에 전달할 최대 텍스트 길이 (단위: 글자)
# LLM_CHUNK_SIZE × TEXT_LIMIT_PER_DOC = 실제 LLM에 전달되는 총 텍스트 길이
# 예) 5 × 2000 = 10,000자 / 5 × 3000 = 15,000자 (gpt-4o-mini: ~12만 토큰 수용 가능)
TEXT_LIMIT_PER_DOC = 2000  # 느리면 줄이고, 분석 정밀도가 부족하면 늘리세요

# confidence 임계값: 이 값 이상인 시그널만 signals 테이블에 저장합니다.
# 공시는 공식 자료이므로 신뢰도를 높게 유지합니다.
# 조절 범위 권장: 0.65 ~ 0.80
CONFIDENCE_THRESHOLD = 0.70

# 1회 실행 시 DB에서 꺼낼 최대 공시 수 (READY_FOR_LLM 상태)
# LLM_CHUNK_SIZE 단위로 쪼개서 처리하므로 항상 쌓인 것보다 크게 잡아도 괜찮습니다.
FETCH_LIMIT = 200


# ──────────────────────────────────────────────────────────────────────────────
# 1) DB 조회 / 상태 업데이트
# ──────────────────────────────────────────────────────────────────────────────

def get_ready_disclosures(limit: int = FETCH_LIMIT) -> list[dict]:
    """
    dart_classifier_worker.py가 분류를 완료하여 READY_FOR_LLM 상태가 된
    공시 목록을 DB에서 가져옵니다.
    """
    result = (
        supabase
        .table("dart_disclosures")
        .select("*")
        .eq("scout_status", "READY_FOR_LLM")
        .limit(limit)
        .execute()
    )
    return result.data or []


async def update_status(rcept_no: str, status: str) -> None:
    """
    공시의 처리 상태를 dart_disclosures 테이블에 업데이트합니다.

    status 값:
        READY_FOR_ANALYSIS - LLM 분석 완료
        ERROR              - 처리 중 예외 발생
    """
    payload: dict = {"scout_status": status}

    def _do_update():
        return supabase.table("dart_disclosures").update(payload).eq("rcept_no", rcept_no).execute()

    # Supabase 요청은 동기 함수이므로 비동기 루프를 블로킹하지 않도록 스레드로 분리합니다.
    await asyncio.to_thread(_do_update)


# ──────────────────────────────────────────────────────────────────────────────
# 2) DART API 원문 다운로드 + 텍스트 추출
# ──────────────────────────────────────────────────────────────────────────────

async def download_and_parse_text(client: httpx.AsyncClient, rcept_no: str) -> str | None:
    """
    DART API에서 공시 원문 ZIP을 다운로드하고 핵심 텍스트를 추출합니다.
    LLM 호출 없이 텍스트만 반환하는 순수 파싱 함수입니다.

    반환값:
        성공: 추출된 텍스트 문자열 (TEXT_LIMIT_PER_DOC 글자 이하로 잘림)
        실패: None (호출 측에서 ERROR 처리)
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
        print(f"    ⚠️  ZIP 다운로드 실패 ({rcept_no}): {e}")
        return None

    # ── 2단계: ZIP 압축 해제 및 HTML/XML 파일 추출 ─────────────────
    try:
        # DART API는 에러 발생 시 ZIP 대신 JSON을 반환하는 경우가 있습니다.
        try:
            err_data = json.loads(zip_bytes.decode('utf-8'))
            print(f"    ⚠️  API 에러 응답 ({rcept_no}): {err_data.get('message', '')}")
            return None
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass  # 정상적인 ZIP 바이너리인 경우 예외가 발생하므로 무시합니다.

        # 한국어 파일명 처리를 위해 CP949 인코딩으로 압축 해제합니다. (Python 3.11+)
        with zipfile.ZipFile(io.BytesIO(zip_bytes), metadata_encoding='cp949') as z:
            htm_files = [f for f in z.namelist() if f.endswith(('.htm', '.html', '.xml'))]
            if not htm_files:
                print(f"    ⚠️  ZIP 내 HTML/XML 없음 ({rcept_no})")
                return None
            raw_bytes = z.read(htm_files[0])

    except zipfile.BadZipFile:
        print(f"    ⚠️  유효하지 않은 ZIP ({rcept_no})")
        return None
    except Exception as e:
        print(f"    ⚠️  ZIP 파싱 실패 ({rcept_no}): {e}")
        return None

    # ── 3단계: 표(table) 텍스트 추출 ──────────────────────────────
    try:
        soup  = BeautifulSoup(raw_bytes, 'html.parser')
        table = soup.find('table')
        # 공시 본문의 표가 핵심 내용을 담고 있습니다. 표가 없으면 전체 텍스트를 사용합니다.
        text = (
            table.get_text(separator=' ', strip=True)
            if table
            else raw_bytes.decode('utf-8', errors='ignore')
        )
        # TEXT_LIMIT_PER_DOC 글자까지만 LLM에 전달합니다.
        # 늘리면 정밀도 ↑ 비용 ↑ / 줄이면 비용 ↓ 긴 공시 뒷부분 잘림 ↑
        return text[:TEXT_LIMIT_PER_DOC]
    except Exception as e:
        print(f"    ⚠️  HTML 파싱 실패 ({rcept_no}): {e}")
        return None


# ──────────────────────────────────────────────────────────────────────────────
# 3) Bulk 프롬프트 생성
# ──────────────────────────────────────────────────────────────────────────────

def build_bulk_prompt(items: list[dict]) -> str:
    """
    여러 개의 공시를 하나의 LLM 프롬프트로 묶어서 만듭니다.

    items 형식:
        [{"idx": 1, "corp_name": "...", "title": "...", "text": "..."}, ...]

    LLM에게 각 항목을 독립적으로 분석하고, source_id에 idx를 담아
    하나의 JSON 배열로 반환하도록 지시합니다.
    """
    # 각 공시를 구분선으로 나누어 하나의 텍스트 블록으로 합칩니다.
    docs_block = "\n\n".join([
        f"[공시 #{item['idx']}] 회사: {item['corp_name']} | 제목: {item['title']}\n{item['text']}"
        for item in items
    ])

    return f"""당신은 산업 전략 분석 AI입니다.

아래에 DART 공시 {len(items)}건이 제공됩니다.
각 공시를 독립적으로 읽고 분석하여, 반드시 모든 공시에 대해 signals를 추출하세요.

=========================
📌 출력 JSON 스키마 (반드시 준수)
=========================

{{
  "results": [
    {{
      "source_id": 1,
      "signals": [
        {{
          "company_name": "기업명 (DART에 명시된 회사명 그대로)",
          "event_type": "기사 핵심 이벤트 요약 (한 줄)",
          "signal_category": "Earnings|StockMove|Expansion|Regulation|Investment|Partnership|Product|Risk",
          "industry_tag": "Semiconductor|Automotive|Finance|Pharma|Battery|ETF|Bio|Cosmetic|General",
          "trend_bucket": "Growth|Risk|Momentum|StructuralShift|InvestmentCycle|CompetitiveShift",
          "impact_type": "opportunity 또는 risk",
          "impact_strength": 0,
          "severity_level": 1,
          "confidence": 0.0
        }}
      ]
    }}
  ]
}}

=========================
📌 분류 규칙
=========================

[강제 impact_type 규칙]
- 항상 risk      : 리콜/불량/위해/클레임, 규제(허가취소/과징금), 소송/분쟁/횡령/배임,
                   실적급감/적자전환, 생산중단/공장사고
- 항상 opportunity: 대규모 투자/증설, 수주/납품/장기계약/파트너십,
                    임상성공/허가/GMP인증, 성장 방향이 명확한 M&A

[impact_strength 0~100 산정]
- 0~19  : 미미 (단순 언급, 행사, 인터뷰)
- 20~39 : 약함 (소규모 계약, 제한적 이슈)
- 40~59 : 중간 (중형 계약/투자, 의미 있는 변화)
- 60~79 : 큼   (대형 투자/증설, 핵심 인증/허가, 큰 실적 변화)
- 80~100: 구조 변화급 (리콜/허가취소/대형소송 또는 초대형 투자·수주·M&A)

[severity_level 1~5 산정]
- 1: 관찰  2: 경미  3: 주의  4: 심각(액션필요)  5: 위기(즉시 에스컬레이션)
- 하드룰: 리콜/허가취소/공장사고/대형소송 → 최소 4

[confidence 0~1 산정]
- 0.80~1.0 : 공시/정부/교차검증된 확실한 사실
- 0.65~0.79: 운영 반영 가능 수준
- 0.40~0.64: 추가 확인 필요
- 공시는 공식 자료이므로 기본 confidence를 0.75 이상으로 설정하세요.

규칙:
- source_id는 반드시 공시 번호(#1, #2 ...)와 1:1 매핑
- NULL/빈 문자열/필드 누락 금지
- 반드시 JSON만 출력 (마크다운/코드블럭 금지)

=========================
📌 공시 목록 ({len(items)}건)
=========================

{docs_block}
"""


# ──────────────────────────────────────────────────────────────────────────────
# 4) Bulk LLM 호출
# ──────────────────────────────────────────────────────────────────────────────

async def bulk_llm_analyze(items: list[dict]) -> dict[int, list]:
    """
    공시 여러 건을 하나의 LLM 호출로 분석합니다. (핵심 Bulk 처리 함수)

    처리 흐름:
        1) items에 idx(1부터 시작)를 부여합니다.
        2) build_bulk_prompt()로 N건을 하나의 프롬프트로 결합합니다.
        3) LLM API를 단 1회 호출합니다.
        4) 반환된 JSON의 results 배열을 source_id 기준으로 파싱합니다.

    반환값:
        {1: [signal, ...], 2: [signal, ...], ...}  ← source_id(idx)별 signals 매핑
        실패 시: {}
    """
    if not OPENAI_API_KEY:
        print("    ⚠️  OpenAI API 키가 없습니다. .env 파일의 OPENAI_API_KEY를 확인해 주세요.")
        return {}

    # idx는 1부터 시작하여 LLM 프롬프트의 #1, #2 ... 와 일치시킵니다.
    indexed = [{"idx": i + 1, **item} for i, item in enumerate(items)]
    prompt  = build_bulk_prompt(indexed)

    try:
        def _call_llm():
            return chat_completions_json(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Return only valid JSON. No markdown, no code block."},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.2,
                response_format_json=True,
            )

        # LLM 동기 호출을 스레드로 분리하여 비동기 루프를 블로킹하지 않습니다.
        parsed = await asyncio.to_thread(_call_llm)

        result_map: dict[int, list] = {}
        for r in parsed.get("results", []):
            sid     = int(r.get("source_id", 0))
            signals = r.get("signals", [])
            if sid > 0:
                result_map[sid] = signals

        return result_map

    except json.JSONDecodeError as e:
        print(f"    ❌ LLM 응답 JSON 파싱 실패: {e}")
        return {}
    except Exception as e:
        print(f"    ❌ LLM API 호출 실패: {e}")
        return {}


# ──────────────────────────────────────────────────────────────────────────────
# 5) 청크 단위 처리
# ──────────────────────────────────────────────────────────────────────────────

async def process_chunk(client: httpx.AsyncClient, semaphore: asyncio.Semaphore, chunk: list[dict]) -> int:
    """
    LLM_CHUNK_SIZE 단위의 공시 묶음(chunk)을 처리합니다.

    처리 흐름:
        1) chunk 내 공시들의 ZIP을 병렬 다운로드 + 텍스트 추출
        2) 텍스트 추출 실패 건 → ERROR 처리
        3) 성공 건을 bulk_llm_analyze()에 묶어서 LLM 1회 호출
        4) LLM 결과를 각 공시에 매핑하여 signals 저장 + 상태 업데이트

    반환값:
        이번 청크에서 저장된 시그널 총 개수
    """
    if not chunk:
        return 0

    # ── 1단계: ZIP 병렬 다운로드 + 텍스트 추출 ──────────────────
    async def _safe_download(disclosure: dict) -> tuple[dict, str | None]:
        """semaphore 제한 아래에서 단건 다운로드를 실행합니다."""
        async with semaphore:
            text = await download_and_parse_text(client, disclosure["rcept_no"])
        return disclosure, text

    results     = await asyncio.gather(*[_safe_download(d) for d in chunk], return_exceptions=True)
    llm_items   = []
    failed_list = []

    for i, res in enumerate(results):
        if isinstance(res, Exception):
            failed_list.append((chunk[i], str(res)))
            continue
        disclosure, text = res
        if text is None:
            failed_list.append((disclosure, "텍스트 추출 실패"))
            continue
        llm_items.append({
            "disclosure": disclosure,
            "corp_name":  disclosure.get("corp_name", ""),
            "title":      disclosure.get("report_nm", ""),
            "text":       text,
        })

    # 텍스트 추출 실패 건 → ERROR 상태로 기록
    for disclosure, err_msg in failed_list:
        rcept_no = disclosure.get("rcept_no", "")
        print(f"    ❌ 원문 추출 실패 → 오류 처리: [{disclosure.get('report_nm', '')}] 사유: {err_msg}")
        await update_status(rcept_no, "ERROR")

    if not llm_items:
        print("    ⚠️  분석 가능한 공시가 없습니다. (모두 원문 추출 실패)")
        return 0

    # ── 2단계: 성공한 공시를 LLM에 묶어서 1회 호출 ───────────────
    result_map = await bulk_llm_analyze(llm_items)

    # ── 3단계: LLM 결과를 각 공시에 매핑 → DB 저장 ─────────────
    total_saved = 0

    for idx, item in enumerate(llm_items):
        source_id  = idx + 1  # LLM 프롬프트에서 사용한 #번호 (1부터 시작)
        disclosure = item["disclosure"]
        corp_name  = item["corp_name"]
        rcept_no   = disclosure.get("rcept_no", "")
        report_nm  = disclosure.get("report_nm", "")
        signals    = result_map.get(source_id, [])

        if not signals:
            print(f"    ⚠️  추출된 시그널 없음 (#{source_id}): [{report_nm}]")
            await update_status(rcept_no, "READY_FOR_ANALYSIS")
            continue

        saved    = 0
        promoted = 0

        # 공시 수집 시 이미 붙여둔 꼬리표(source_role)를 company_role로 재활용합니다.
        # CLIENT → 고객사 공시, POTENTIAL → 잠재사 공시 (별도 DB 조회 불필요)
        source_role = disclosure.get("source_role") or "GENERAL"

        for sig in signals:
            # LLM이 엉뚱한 회사명을 추출할 수 있으므로, DART에서 가져온 정확한 회사명으로 덮어씁니다.
            sig["company_name"] = corp_name

            # confidence 임계값 미만의 시그널은 저장하지 않습니다.
            # 임계값 조절: 상단 CONFIDENCE_THRESHOLD 상수를 변경하세요.
            if float(sig.get("confidence", 1.0)) >= CONFIDENCE_THRESHOLD:
                upsert_signal(None, sig, source="dart", rcept_no=rcept_no, company_role=source_role)
                saved += 1

                # 잠재 기업 발굴 조건을 충족하면 companies에 GENERAL로 등록합니다.
                if should_promote_to_potential(sig):
                    upsert_general_company(sig.get("company_name", ""))
                    promoted += 1

        total_saved += saved
        await update_status(rcept_no, "READY_FOR_ANALYSIS")
        print(f"    ✅ 처리 완료 (#{source_id}): [{report_nm}] | 시그널 저장={saved}개, 잠재기업 등록={promoted}개")

    return total_saved


# ──────────────────────────────────────────────────────────────────────────────
# 6) 메인 실행
# ──────────────────────────────────────────────────────────────────────────────

async def run() -> None:
    """
    DART Bulk LLM 분석 워커 메인 함수.

    실행 흐름:
        1) dart_disclosures에서 READY_FOR_LLM 공시 최대 FETCH_LIMIT건 조회
        2) LLM_CHUNK_SIZE 단위로 잘라 Bulk LLM 분석 실행
           예) READY_FOR_LLM 15건, LLM_CHUNK_SIZE=5 → LLM 3회 호출
        3) READY_FOR_LLM이 남아 있으면 계속 반복

    ─────────────────────────────────────────────────────────────────
    ⚙️  묶음 개수 조절 방법:
        이 파일 상단의 LLM_CHUNK_SIZE 값을 변경하세요.
        - LLM_CHUNK_SIZE = 3  → 보수적, LLM 부담 적음
        - LLM_CHUNK_SIZE = 5  → 권장값 (기본)
        - LLM_CHUNK_SIZE = 7  → 더 적은 API 호출, 집중도 약간 감소
        - LLM_CHUNK_SIZE = 10 → 최대 절감, 긴 공시에서 잘림 위험
    ─────────────────────────────────────────────────────────────────
    """
    print("=" * 60)
    print("[dart_llm_worker] Bulk LLM 분석 워커 시작")
    print(f"  LLM 묶음 크기      : {LLM_CHUNK_SIZE}건  (조절: LLM_CHUNK_SIZE)")
    print(f"  건당 최대 텍스트   : {TEXT_LIMIT_PER_DOC}자  (조절: TEXT_LIMIT_PER_DOC)")
    print(f"  신뢰도 저장 기준   : {CONFIDENCE_THRESHOLD} 이상  (조절: CONFIDENCE_THRESHOLD)")
    print("=" * 60)

    total_ready     = 0
    total_signals   = 0
    total_llm_calls = 0
    batch_num       = 0

    # READY_FOR_LLM이 없을 때까지 반복합니다.
    while True:
        disclosures = get_ready_disclosures()
        if not disclosures:
            if batch_num == 0:
                print("[dart_llm_worker] READY_FOR_LLM 상태의 공시가 없습니다.")
                print("  → dart_classifier_worker.py를 먼저 실행하여 분류를 완료해 주세요.")
            break

        batch_num   += 1
        total_ready += len(disclosures)
        est_calls    = (len(disclosures) + LLM_CHUNK_SIZE - 1) // LLM_CHUNK_SIZE
        print(f"\n[배치 {batch_num}] 분석 대상: {len(disclosures)}건  /  예상 LLM 호출 횟수: {est_calls}회\n")

        semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)

        async with httpx.AsyncClient() as client:
            for i in range(0, len(disclosures), LLM_CHUNK_SIZE):
                # ★ LLM_CHUNK_SIZE 단위로 공시를 잘라서 하나씩 Bulk 처리합니다.
                # LLM_CHUNK_SIZE를 바꾸면 이 슬라이싱 크기가 달라집니다.
                chunk     = disclosures[i: i + LLM_CHUNK_SIZE]
                chunk_num = i // LLM_CHUNK_SIZE + 1
                print(f"  [청크 {chunk_num}/{est_calls}] {len(chunk)}건 묶음 처리 시작...")
                saved  = await process_chunk(client, semaphore, chunk)
                total_signals   += saved
                total_llm_calls += 1

    print("\n" + "=" * 60)
    print("[dart_llm_worker] 분석 완료")
    if batch_num > 0:
        print(f"  처리한 공시 수  : {total_ready}건")
        print(f"  저장된 시그널   : {total_signals}개")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run())
