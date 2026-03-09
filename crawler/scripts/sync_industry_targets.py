"""
scripts/sync_industry_targets.py

목적:
- 실행할 때마다 DART 전체 기업 중 8,000개씩 순회하며
  config/dart_keywords.py 의 TARGET_KSIC_CODES에 해당하는 기업을
  industry_targets 테이블에 기록합니다.
- 커서(sync_cursor.json)로 마지막 처리 위치를 추적하여 이어서 실행합니다.
- 이 스크립트는 탐색/기록만 담당합니다.
  companies 테이블 업데이트는 sync_potential_companies.py 가 담당합니다.

실행:
    crawler 디렉토리에서:
    python scripts/sync_industry_targets.py

커서 파일:
    scripts/sync_cursor.json — 마지막으로 처리한 기업 인덱스를 저장합니다.
    삭제하면 처음부터 다시 시작합니다.

타겟 산업 코드 변경:
    config/dart_keywords.py 의 TARGET_KSIC_CODES를 수정하세요.
"""

import sys
import os
import time
import json
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from repositories.db import supabase
from services.dart_service import get_corp_codes_from_dart
from config import DART_API_KEY
from config.dart_keywords import TARGET_KSIC_CODES

DART_COMPANY_URL = "https://opendart.fss.or.kr/api/company.json"
RATE_LIMIT_SLEEP  = 0.5   # 초/건 (DART 무료 계정 Rate Limit 방어)
BATCH_SIZE        = 30000  # 1회 실행 시 처리할 기업 수

# 커서 파일 경로 (이 스크립트와 같은 디렉토리에 저장)
CURSOR_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sync_cursor.json")


# ── 커서 유틸 ────────────────────────────────────────────────────

def load_cursor() -> int:
    """마지막으로 처리한 인덱스를 커서 파일에서 읽습니다. 파일이 없으면 0 반환."""  
    if os.path.exists(CURSOR_FILE):
        with open(CURSOR_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("next_index", 0)
    return 0


def save_cursor(next_index: int):
    """다음 시작 인덱스를 커서 파일에 저장합니다."""
    with open(CURSOR_FILE, "w", encoding="utf-8") as f:
        json.dump(
            {
                "next_index": next_index,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            f,
            ensure_ascii=False,
            indent=2,
        )


def reset_cursor():
    """커서를 초기화합니다 (전체 순회 완료 후 재시작용)."""
    save_cursor(0)
    print("[cursor] 커서 초기화 완료 → 다음 실행 시 처음부터 시작합니다.")


# ── DART API ─────────────────────────────────────────────────────

def get_company_info(corp_code: str) -> dict | None:
    """DART 기업개황 API로 해당 기업의 상세정보(KSIC 포함) 조회"""
    try:
        response = requests.get(
            DART_COMPANY_URL,
            params={"crtfc_key": DART_API_KEY, "corp_code": corp_code},
            timeout=10,
        )
        data = response.json()
        if data.get("status") == "000":
            return data
        return None
    except Exception as e:
        print(f"  ⚠️  기업개황 API 오류 ({corp_code}): {e}")
        return None


# ── industry_targets 기록 ────────────────────────────────────────

def record_to_industry_targets(corp_code: str, corp_name: str, ksic_code: str):
    """
    발견된 잠재 기업을 industry_targets 테이블에 기록합니다.
    이 테이블은 스크립트의 탐색 결과를 쌓아두는 저장소입니다.
    corp_code 기준 중복 시 무시(DO NOTHING).
    """
    supabase.table("industry_targets").upsert(
        {
            "corp_code":     corp_code,
            "company_name":  corp_name,
            "industry_code": ksic_code,
            "updated_at":    datetime.now(timezone.utc).isoformat(), # updated_at 필드를 갱신 시점으로 기록
        },
        on_conflict="corp_code",
        ignore_duplicates=False,  # 기존 데이터 업데이트를 위해 False로 변경
    ).execute()


def cleanup_stale_targets():
    """
    전체 순회가 끝난 후 호출되어, DB 내의 업종이 변경되거나 DART 목록에서 지워진
    만료된 기업 데이터를 삭제합니다. (기준: updated_at 이 최근 7일 이상 갱신되지 않은 경우)
    """
    try:
        threshold_date = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        res = supabase.table("industry_targets").delete().lt("updated_at", threshold_date).execute()
        
        # supabase client response handling logic for postgrest-py
        deleted_count = len(res.data) if hasattr(res, 'data') and res.data else 0
        print(f"[cleanup] 오랫동안 갱신되지 않은 더미 기업 {deleted_count}개를 DB에서 삭제했습니다.")
    except Exception as e:
        print(f"  ⚠️  [cleanup] 만료 데이터 삭제 중 오류 발생: {e}")


# ── 메인 실행 ─────────────────────────────────────────────────────

def run():
    print("=" * 55)
    print("[sync_industry_targets] 산업 타겟 탐색 시작")
    print(f"  타겟 KSIC 코드: {TARGET_KSIC_CODES}")
    print("=" * 55)

    if not TARGET_KSIC_CODES:
        print("[sync_industry_targets] TARGET_KSIC_CODES가 비어있습니다.")
        print("  → config/dart_keywords.py 에 코드를 추가하세요.")
        return

    # DART 마스터 파일에서 전체 기업 목록 로드 (1회 API 호출)
    print("\n[sync_industry_targets] DART 마스터 파일 다운로드 중...")
    corp_code_map  = get_corp_codes_from_dart(DART_API_KEY)
    all_corp_codes = list(corp_code_map.values())
    total_count    = len(all_corp_codes)
    print(f"[sync_industry_targets] 전체 기업 수: {total_count}개\n")

    # 커서로 시작 위치 결정
    start_idx = load_cursor()
    end_idx   = min(start_idx + BATCH_SIZE, total_count)

    if start_idx >= total_count:
        print("[sync_industry_targets] 전체 순회 완료 상태입니다. 커서를 초기화하고 다음 실행에서 처음부터 시작합니다.")
        cleanup_stale_targets()
        reset_cursor()
        return

    print(f"[sync_industry_targets] 이번 처리 범위: {start_idx + 1} ~ {end_idx} / {total_count}개")
    print(f"  (커서 파일: {CURSOR_FILE})\n")

    batch = all_corp_codes[start_idx:end_idx]

    matched = 0
    skipped = 0
    errors  = 0

    for idx, corp_code in enumerate(batch, start=1):
        time.sleep(RATE_LIMIT_SLEEP)

        info = get_company_info(corp_code)
        if not info:
            errors += 1
            continue

        corp_name   = info.get("corp_name",   "").strip()
        induty_code = info.get("induty_code", "").strip()  # DART의 KSIC 코드 필드명

        # TARGET_KSIC_CODES 앞자리 일치 여부 확인
        is_target = any(induty_code.startswith(tc) for tc in TARGET_KSIC_CODES)

        if is_target:
            record_to_industry_targets(corp_code, corp_name, induty_code)
            print(f"  ✅ 발견: {corp_name} ({corp_code}) KSIC={induty_code}")
            matched += 1
        else:
            skipped += 1

        # 500건마다 진행률 출력
        if idx % 500 == 0:
            print(f"  ... {idx}/{len(batch)}건 처리 중 (발견: {matched}, 스킵: {skipped})")

    # 커서 저장: 다음 실행 시 이어서 시작
    next_start = end_idx
    if next_start >= total_count:
        print("\n[sync_industry_targets] 전체 순회 완료! 과거 더미 데이터 청소를 시작합니다...")
        cleanup_stale_targets()
        reset_cursor()
    else:
        save_cursor(next_start)
        remaining = total_count - next_start
        print(f"\n[cursor] 다음 시작 위치 저장: {next_start} (남은 기업: {remaining}개)")

    print("\n" + "=" * 55)
    print(f"[sync_industry_targets] 이번 배치 완료")
    print(f"  • 처리 범위     : {start_idx + 1} ~ {end_idx}")
    print(f"  • 잠재 기업 발견: {matched}개 → industry_targets 기록 완료")
    print(f"  • 산업 불일치   : {skipped}개")
    print(f"  • API 오류      : {errors}개")
    print("=" * 55)


if __name__ == "__main__":
    run()
