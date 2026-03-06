"""
scripts/sync_dart_codes.py

역할:
- 1일 1회 실행되는 DART 기업 고유번호 매핑 배치 스크립트
- companies 테이블 중 dart_corp_code가 비어 있는 기업에 대해
  DART 마스터 파일을 기반으로 고유번호를 매핑하고 DB를 업데이트합니다.

실행 방법:
    crawler 디렉토리에서:
    python scripts/sync_dart_codes.py

주의사항:
- 이미 매핑 실패('NOT_FOUND')로 처리된 기업은 재시도하지 않습니다.
- DART 마스터 파일은 1회만 다운로드 후 메모리에 유지하여 N+1 호출을 방지합니다.
"""

import sys
import os

# ✅ 프로젝트 루트(crawler/)를 sys.path에 추가하여 절대 임포트 보장
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
from repositories.db import supabase
from services.dart_service import get_corp_codes_from_dart, _normalize_company_name
from config import DART_API_KEY


# ==============================
# Step 1: 매핑 대상 기업 조회
# ==============================

def get_pending_companies() -> list[dict]:
    """
    dart_corp_code가 비어 있고 dart_sync_status가 'PENDING'인 기업만 조회.
    기존에 매핑 실패('NOT_FOUND') 처리된 기업은 제외합니다.
    """
    result = (
        supabase
        .table("companies")
        .select("id, company_name, dart_sync_status")
        .is_("dart_corp_code", "null")
        .eq("dart_sync_status", "PENDING")
        .execute()
    )
    return result.data


# ==============================
# Step 2: DB 업데이트 함수들
# ==============================

def update_dart_code_success(company_id: str, corp_code: str):
    """매핑 성공: dart_corp_code 저장 및 상태를 SUCCESS로 업데이트."""
    supabase.table("companies").update({
        "dart_corp_code": corp_code,
        "dart_sync_status": "SUCCESS"
    }).eq("id", company_id).execute()


def update_dart_code_not_found(company_id: str):
    """매핑 실패: dart_corp_code는 NULL 유지, 상태를 NOT_FOUND로 업데이트."""
    supabase.table("companies").update({
        "dart_sync_status": "NOT_FOUND"
    }).eq("id", company_id).execute()


# ==============================
# 메인 실행
# ==============================

def run():
    print("=" * 50)
    print("[sync_dart_codes] DART 기업 고유번호 동기화 시작")
    print("=" * 50)

    # Step 1: 매핑 대상 기업 조회
    targets = get_pending_companies()

    if not targets:
        print("[sync_dart_codes] 매핑 대상 기업 없음. 종료합니다.")
        return

    print(f"[sync_dart_codes] 매핑 대상 기업 수: {len(targets)}개")

    # Step 2: DART 마스터 파일을 메모리에 1회만 로드 (N+1 호출 방어)
    print("[sync_dart_codes] DART 마스터 파일 로드 중...")
    corp_code_map = get_corp_codes_from_dart(DART_API_KEY)
    print(f"[sync_dart_codes] 마스터 사전 준비 완료 — {len(corp_code_map)}개 기업 보유")

    # Step 3: 기업별 매핑 시도
    success_count = 0
    not_found_count = 0

    for company in targets:
        company_id = company["id"]
        company_name = company["company_name"]

        # ✅ DB의 기업명도 동일한 정규화 함수를 통해 비교
        normalized_name = _normalize_company_name(company_name)

        if not normalized_name:
            print(f"  ⚠️  기업명 정규화 실패 스킵: '{company_name}'")
            update_dart_code_not_found(company_id)
            not_found_count += 1
            continue

        # Step 4: 마스터 사전에서 검색
        corp_code = corp_code_map.get(normalized_name)

        if corp_code:
            # Step 4-a: 매핑 성공
            update_dart_code_success(company_id, corp_code)
            print(f"  ✅ 매핑 성공: '{company_name}' → {corp_code}")
            success_count += 1
        else:
            # Step 4-b: 매핑 실패 (DART에 등록되지 않은 비상장/비법인 등)
            update_dart_code_not_found(company_id)
            print(f"  ❌ 매핑 실패 (NOT_FOUND): '{company_name}' (정규화: '{normalized_name}')")
            not_found_count += 1

    # 최종 결과 요약
    print("=" * 50)
    print(f"[sync_dart_codes] 완료 — 성공: {success_count}개 / 실패(NOT_FOUND): {not_found_count}개")
    print("=" * 50)


if __name__ == "__main__":
    run()
