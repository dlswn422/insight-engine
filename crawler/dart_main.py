"""
dart_main.py

DART 공시 파이프라인 전체 순서 실행 (1회용 / 수동 실행)

▶ 실행 순서:
    1단계) sync_potential        - industry_targets ↔ companies 대조, POTENTIAL 승격 + corp_code 복사
    2단계) fetch_disclosures     - CLIENT + POTENTIAL 기업 공시 수집 (투 트랙)

▶ industry_targets 누적 (scheduler에서 별도 실행):
    - sync_industry_targets.py 가 DART 전체 10만 기업을 커서 방식으로 조금씩 순회합니다.
    - scheduler_main.py 에 하루 1회 등록되어 있습니다.
    - companies 기업명 → DART corp_code 매핑(sync_dart_codes)은 더 이상 사용하지 않습니다.
      industry_targets 테이블에 이미 corp_code가 있으므로, sync_potential이 승격 시 복사합니다.

▶ 실행 방법:
    crawler 폴더에서:  python dart_main.py
    프로젝트 루트에서: python crawler/dart_main.py
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# from scripts.sync_industry_targets  import run as run_sync_industry_targets  # ← 필요시 주석 해제
from scripts.sync_potential_companies  import run as run_sync_potential
from scripts.fetch_disclosures_dual_track import run_async as run_fetch_disclosures


def main():
    print("=" * 60)
    print("  DART 파이프라인 시작")
    print("=" * 60)

    # ────────────────────────────────────────────────────────────
    # 1단계: industry_targets ↔ companies 대조 → POTENTIAL 승격
    #
    # 역할: industry_targets(타겟 업종 창고)에 있는 기업 corp_code와
    #       companies 테이블을 대조합니다.
    #       일치하는 기업의 company_role을 POTENTIAL로 승격하고,
    #       industry_targets.corp_code를 companies.dart_corp_code에 복사합니다.
    #       OWN / CLIENT 역할 기업은 보호하여 절대 강등시키지 않습니다.
    #
    # 입력: industry_targets, companies
    # 출력: companies.company_role = 'POTENTIAL', companies.dart_corp_code 업데이트
    # ────────────────────────────────────────────────────────────
    print("\n[1단계] industry_targets ↔ companies POTENTIAL 승격 + corp_code 복사")
    print("-" * 60)
    run_sync_potential()

    # ────────────────────────────────────────────────────────────
    # 2단계: CLIENT + POTENTIAL 기업 공시 수집 (투 트랙 병렬)
    #
    # 역할: 두 그룹의 기업에 대해 최근 7일치 공시 목록을 DART API에서 수집합니다.
    #       트랙 A (CLIENT)    → managed_clients 테이블 기준 자사/고객사 공시
    #       트랙 B (POTENTIAL) → companies.company_role='POTENTIAL' 잠재 고객사 공시
    #       두 트랙은 asyncio.gather()로 동시 실행되며, 동일 기업은 CLIENT 우선 처리됩니다.
    #
    # 입력: managed_clients, companies (POTENTIAL + dart_corp_code IS NOT NULL)
    # 출력: dart_disclosures 테이블 INSERT (scout_status='PENDING', source_role 태깅)
    # ────────────────────────────────────────────────────────────
    print("\n[2단계] CLIENT + POTENTIAL 기업 공시 수집 (투 트랙)")
    print("-" * 60)
    asyncio.run(run_fetch_disclosures())

    print("\n" + "=" * 60)
    print("  DART 파이프라인 완료")
    print("=" * 60)


if __name__ == "__main__":
    main()
