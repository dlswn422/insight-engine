"""
workers/dart_classifier_worker.py — DART 공시 키워드 분류 워커

역할:
    dart_disclosures 테이블에서 scout_status='PENDING'인 공시 제목을 읽어
    키워드 매칭만으로 아래 세 가지 상태 중 하나로 분류합니다.

    분류 결과:
        SKIPPED        - EXCLUDE_KEYWORDS에 해당 (주주총회/의결권 등 행정 공시)
                         → 분석 불필요. LLM에 보내지 않음.
        READY_FOR_LLM  - TARGET_KEYWORDS에 해당 (계약/합병/소송 등 투자 관련 공시)
                         → dart_llm_worker.py가 여기서 꺼내 Bulk LLM 분석을 수행함.
        UNMATCHED      - 위 두 조건 모두 해당 없음
                         → 분석 생략.

    ※ 이 워커는 LLM을 전혀 호출하지 않으므로 매우 빠르고 가볍습니다.
       스케줄러에서 이 워커를 먼저(짧은 주기로) 돌려 분류를 완료한 후,
       dart_llm_worker.py를 뒤이어 실행하면 됩니다.

실행 방법:
    crawler 폴더에서:  python workers/dart_classifier_worker.py
"""

import sys
import os
import re
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from repositories.db import supabase
from config.dart_keywords import EXCLUDE_KEYWORDS, TARGET_KEYWORDS

# ──────────────────────────────────────────────────────────────────────────────
# ⚙️  운영 파라미터
# ──────────────────────────────────────────────────────────────────────────────

BATCH_SIZE = 200  # 1회 실행 시 처리할 최대 공시 수
             # 이 값을 키우면 한 번에 더 많은 공시를 분류하지만 실행 시간이 늘어납니다.


# ──────────────────────────────────────────────────────────────────────────────
# 1) DB 조회
# ──────────────────────────────────────────────────────────────────────────────

def get_pending_disclosures(limit: int = BATCH_SIZE) -> list[dict]:
    """
    아직 분류되지 않은(PENDING) 공시 목록을 DB에서 가져옵니다.
    fetch_disclosures_dual_track.py가 새 공시를 PENDING으로 INSERT합니다.
    """
    result = (
        supabase
        .table("dart_disclosures")
        .select("rcept_no, report_nm, source_role")
        .eq("scout_status", "PENDING")
        .limit(limit)
        .execute()
    )
    return result.data or []


# ──────────────────────────────────────────────────────────────────────────────
# 2) 상태 업데이트
# ──────────────────────────────────────────────────────────────────────────────

def update_status(rcept_no: str, status: str) -> None:
    """
    공시의 분류 상태를 dart_disclosures 테이블에 업데이트합니다.

    status 값:
        SKIPPED       - 분석 불필요 (EXCLUDE_KEYWORDS 해당)
        READY_FOR_LLM - LLM 분석 대기 (TARGET_KEYWORDS 해당)
                        → dart_llm_worker.py가 이 상태를 읽어 분석을 수행합니다.
        UNMATCHED     - 어떤 키워드도 해당 없음
    """
    supabase.table("dart_disclosures").update({"scout_status": status}).eq("rcept_no", rcept_no).execute()


# ──────────────────────────────────────────────────────────────────────────────
# 3) 제목 전처리
# ──────────────────────────────────────────────────────────────────────────────

def preprocess_title(report_nm: str) -> str:
    """
    공시 제목에서 말머리([기재정정], [발행조건확정] 등)와 공백을 제거합니다.
    키워드 매칭 정확도를 높이기 위해 전처리합니다.
    """
    title = re.sub(r'\[.*?\]', '', report_nm)  # [기재정정] 등 괄호 말머리 제거
    title = re.sub(r'\s+', '', title)           # 공백 전체 제거
    return title


# ──────────────────────────────────────────────────────────────────────────────
# 4) 단건 분류
# ──────────────────────────────────────────────────────────────────────────────

def classify_one(disclosure: dict) -> str:
    """
    공시 1건을 키워드 매칭으로 분류하고, 결과를 DB에 즉시 기록합니다.

    반환값:
        "SKIPPED"       - EXCLUDE_KEYWORDS 해당 → 즉시 DB에 SKIPPED 기록
        "READY_FOR_LLM" - TARGET_KEYWORDS 해당  → 즉시 DB에 READY_FOR_LLM 기록
        "UNMATCHED"     - 어느 쪽도 해당 없음  → 즉시 DB에 UNMATCHED 기록
    """
    rcept_no    = disclosure.get("rcept_no", "")
    report_nm   = disclosure.get("report_nm", "")
    source_role = disclosure.get("source_role", "?")
    clean       = preprocess_title(report_nm)
    tag         = f"[{source_role}]"

    # ── 경로 0: 투자 판단과 무관한 행정 공시 → SKIPPED ───────────
    for kw in EXCLUDE_KEYWORDS:
        if kw in clean:
            print(f"  ⏭️  SKIPPED {tag}: [{report_nm}] ('{kw}')")
            update_status(rcept_no, "SKIPPED")
            return "SKIPPED"

    # ── 경로 1: 타겟 키워드 포함 → LLM 분석 대기 큐로 이동 ──────
    for kw in TARGET_KEYWORDS:
        if kw in clean:
            print(f"  🎯 READY_FOR_LLM {tag}: [{report_nm}] ('{kw}')")
            update_status(rcept_no, "READY_FOR_LLM")
            return "READY_FOR_LLM"

    # ── 경로 2: 어느 키워드도 해당 없음 → UNMATCHED ──────────────
    print(f"  ❓ UNMATCHED {tag}: [{report_nm}]")
    update_status(rcept_no, "UNMATCHED")
    return "UNMATCHED"


# ──────────────────────────────────────────────────────────────────────────────
# 5) 메인 실행
# ──────────────────────────────────────────────────────────────────────────────

def run() -> None:
    """
    공시 분류 워커 메인 함수.

    실행 흐름:
        1) dart_disclosures에서 PENDING 공시 최대 BATCH_SIZE건 조회
        2) 각 공시를 키워드 기준으로 분류 → DB 상태 업데이트
        3) PENDING이 남아 있으면 계속 반복

    ※ LLM 호출 없음 — 빠르고 가볍습니다.
    """
    print("=" * 60)
    print("[dart_classifier_worker] 키워드 분류 시작")
    print(f"  배제 키워드: {len(EXCLUDE_KEYWORDS)}개 / 타겟 키워드: {len(TARGET_KEYWORDS)}개")
    print("=" * 60)

    total     = 0
    skipped   = 0
    ready     = 0
    unmatched = 0
    batch_num = 0

    # PENDING이 없을 때까지 반복합니다.
    while True:
        disclosures = get_pending_disclosures()
        if not disclosures:
            if batch_num == 0:
                print("[dart_classifier_worker] PENDING 공시 없음.")
            break

        batch_num += 1
        total     += len(disclosures)
        print(f"\n[배치 {batch_num}] 분류 대상: {len(disclosures)}개 (누적: {total}개)\n")

        for d in disclosures:
            result = classify_one(d)
            if result == "SKIPPED":
                skipped += 1
            elif result == "READY_FOR_LLM":
                ready += 1
            else:
                unmatched += 1

    print("\n" + "=" * 60)
    print("[dart_classifier_worker] 분류 완료")
    if batch_num > 0:
        print(f"  총 {total}건 처리")
        print(f"  SKIPPED={skipped} / READY_FOR_LLM={ready} / UNMATCHED={unmatched}")
        print(f"  → dart_llm_worker.py 실행 시 {ready}건이 LLM 분석 대상입니다.")
    print("=" * 60)


if __name__ == "__main__":
    run()
