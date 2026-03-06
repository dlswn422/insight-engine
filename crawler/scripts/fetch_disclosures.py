"""
scripts/fetch_disclosures.py

역할:
- 주기적으로 실행되는 DART 공시 수집 스크립트
- dart_corp_code가 매핑된 기업들을 대상으로 최근 7일치 공시를 가져와
  dart_disclosures 테이블에 적재합니다.

실행 방법:
    crawler 디렉토리에서:
    python scripts/fetch_disclosures.py

중복 적재 방어:
- rcept_no(접수번호) UNIQUE 제약 조건 기반 upsert를 사용하여
  동일한 공시가 이미 DB에 있으면 INSERT를 무시합니다.
  (ON CONFLICT (rcept_no) DO NOTHING 동작)
"""

import sys
import os

# ✅ 프로젝트 루트(crawler/)를 sys.path에 추가하여 절대 임포트 보장
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from repositories.db import supabase
from services.dart_service import fetch_recent_disclosures
from config import DART_API_KEY


# ==============================
# Step 1: 매핑 완료된 기업 조회
# ==============================

def get_mapped_companies() -> list[dict]:
    """
    dart_corp_code가 존재하는(= 매핑 성공된) 기업 목록을 가져옵니다.
    """
    result = (
        supabase
        .table("companies")
        .select("id, company_name, dart_corp_code")
        .not_.is_("dart_corp_code", "null")  # IS NOT NULL
        .execute()
    )
    return result.data


# ==============================
# Step 2: 공시 데이터 DB 적재
# ==============================

def insert_disclosures_safe(disclosures: list[dict]) -> int:
    """
    dart_disclosures 테이블에 공시를 적재합니다.

    ✅ 중복 방어:
    Supabase의 upsert에 ignoreDuplicates=True를 사용하면
    PostgreSQL의 ON CONFLICT (rcept_no) DO NOTHING과 동일하게 동작합니다.
    - rcept_no가 이미 존재하는 행은 조용히 무시(SKIP)됩니다.
    - 오류를 발생시키지 않아 배치 처리가 안정적으로 진행됩니다.

    Parameters:
        disclosures (list[dict]): 적재할 공시 데이터 목록

    Returns:
        int: 실제로 새로 적재된 행 수 (Supabase free tier에서는 정확하지 않을 수 있음)
    """
    if not disclosures:
        return 0

    result = (
        supabase
        .table("dart_disclosures")
        .upsert(
            disclosures,
            on_conflict="rcept_no",  # UNIQUE 컬럼 지정
            ignore_duplicates=True   # DO NOTHING (충돌 시 무시)
        )
        .execute()
    )

    return len(result.data) if result.data else 0


# ==============================
# 메인 실행
# ==============================

def run():
    print("=" * 50)
    print("[fetch_disclosures] DART 공시 수집 시작")
    print("=" * 50)

    # Step 1: dart_corp_code가 매핑된 기업 목록 조회
    companies = get_mapped_companies()

    if not companies:
        print("[fetch_disclosures] 매핑된 기업이 없습니다. 종료합니다.")
        return

    print(f"[fetch_disclosures] 수집 대상 기업 수: {len(companies)}개")

    total_fetched = 0
    total_saved = 0

    # Step 2: 기업별 공시 수집 반복
    for company in companies:
        company_name = company["company_name"]
        corp_code = company["dart_corp_code"]

        print(f"\n  🔍 '{company_name}' ({corp_code}) 공시 수집 중...")

        # ✅ dart_service.fetch_recent_disclosures 호출
        # 함수 내부에서 Rate Limit 방어 time.sleep() 처리됨
        disclosures = fetch_recent_disclosures(
            api_key=DART_API_KEY,
            corp_code=corp_code,
            # bgn_de 미지정 → 내부에서 자동으로 7일 전 날짜 사용
        )

        if not disclosures:
            print(f"     → 최근 7일간 공시 없음")
            continue

        print(f"     → 공시 {len(disclosures)}건 수집됨")
        total_fetched += len(disclosures)

        # Step 3: DB 적재 (중복 방어 포함)
        saved_count = insert_disclosures_safe(disclosures)
        total_saved += saved_count

        for d in disclosures:
            print(f"        [{d['rcept_dt']}] {d['report_nm']}")

    # 최종 결과 요약
    print("\n" + "=" * 50)
    print(f"[fetch_disclosures] 완료")
    print(f"  • 수집된 공시 총계: {total_fetched}건")
    print(f"  • 신규 적재 성공:  {total_saved}건 (중복 건은 자동 스킵)")
    print("=" * 50)


if __name__ == "__main__":
    run()
