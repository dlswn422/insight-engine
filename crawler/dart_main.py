"""
dart_main.py

DART 공시 파이프라인 전체 순서 실행 (1회용 / 수동 실행)

▶ 실행 순서:
    1단계) sync_dart_codes       - companies 기업명 ↔ DART XML 고유번호 매핑
    2단계) sync_industry_targets - DART 전체 순회, 타겟 업종 기업 추출   ← 현재 주석 처리됨
    3단계) sync_potential        - industry_targets ↔ companies 대조, POTENTIAL 승격
    4단계) fetch_disclosures     - CLIENT + POTENTIAL 기업 공시 수집 (투 트랙)

▶ 2단계 주석 해제 시점:
    - sync_industry_targets.py 는 DART 전체 10만 기업을 커서 방식으로 조금씩 순회합니다.
    - 한 번에 완료되지 않으며, 3개월에 걸쳐 배치로 누적 실행해야 완전한 탐색이 완료됩니다.
    - 정기 스케줄러(scheduler_main.py)에 등록해서 하루 1회씩 돌리는 것을 권장합니다.
    - 지금 당장 필요한 것은 이미 companies에 등록된 기업의 공시 수집이므로 주석 처리합니다.

▶ 실행 방법:
    crawler 폴더에서:  python dart_main.py
    프로젝트 루트에서: python crawler/dart_main.py
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scripts.sync_dart_codes          import run as run_sync_dart_codes
# from scripts.sync_industry_targets  import run as run_sync_industry_targets  # ← 2단계: 필요시 주석 해제
from scripts.sync_potential_companies  import run as run_sync_potential
from scripts.fetch_disclosures_dual_track import run_async as run_fetch_disclosures


def main():
    print("=" * 60)
    print("  DART 파이프라인 시작")
    print("=" * 60)

    # ────────────────────────────────────────────────────────────
    # 1단계: companies 기업명 → DART 고유번호 매핑
    #
    # 역할: companies 테이블 중 dart_corp_code가 비어 있는 기업에 대해
    #       DART 마스터 XML을 내려받아 기업명 정규화 후 1:1 매핑합니다.
    #       ("한미약품" ↔ "한미약품(주)" 처럼 문자 차이가 있어도 정규화로 처리)
    #
    # 입력: companies (dart_sync_status='PENDING')
    # 출력: companies.dart_corp_code 업데이트 → SUCCESS / NOT_FOUND
    # ────────────────────────────────────────────────────────────
    print("\n[1단계] companies ↔ DART XML 고유번호 매핑")
    print("-" * 60)
    run_sync_dart_codes()

    # ────────────────────────────────────────────────────────────
    # 2단계: DART 전체 기업 순회 → 타겟 업종 추출 (현재 비활성)
    #
    # 역할: DART 전체 10만 기업을 커서(sync_cursor.json)를 이용해 배치로 순회하며
    #       TARGET_KSIC_CODES에 해당하는 제약/바이오/화장품 업종 기업을
    #       industry_targets 테이블에 누적 기록합니다.
    #       한 바퀴 순회가 완료되면 7일 이상 미갱신 기업을 자동 삭제(cleanup)합니다.
    #
    # ⚠️  이 단계는 3개월에 걸쳐 하루 1회씩 점진적으로 실행해야 완전 순회가 됩니다.
    #     정기 스케줄러 등록 후 활성화하는 것을 권장합니다.
    #
    # 입력: DART 마스터 XML (10만 기업)
    # 출력: industry_targets 테이블 upsert (updated_at 갱신)
    # ────────────────────────────────────────────────────────────
    # print("\n[2단계] DART 전체 순회 → industry_targets 기록")
    # print("-" * 60)
    # run_sync_industry_targets()

    # ────────────────────────────────────────────────────────────
    # 3단계: industry_targets ↔ companies 대조 → POTENTIAL 승격
    #
    # 역할: industry_targets(타겟 업종 창고)에 있는 기업 고유번호와
    #       companies(메인 기업 목록)의 dart_corp_code를 1:1 대조합니다.
    #       양쪽에 동일한 고유번호가 있으면 company_role을 POTENTIAL로 승격합니다.
    #       OWN / CLIENT 역할 기업은 보호하여 절대 강등시키지 않습니다.
    #
    # 입력: industry_targets, companies
    # 출력: companies.company_role = 'POTENTIAL' 업데이트
    # ────────────────────────────────────────────────────────────
    print("\n[3단계] industry_targets ↔ companies POTENTIAL 승격 매핑")
    print("-" * 60)
    run_sync_potential()

    # ────────────────────────────────────────────────────────────
    # 4단계: CLIENT + POTENTIAL 기업 공시 수집 (투 트랙 병렬)
    #
    # 역할: 두 그룹의 기업에 대해 최근 7일치 공시 목록을 DART API에서 수집합니다.
    #       트랙 A (CLIENT)  → managed_clients 테이블 기준 자사/고객사 공시
    #       트랙 B (POTENTIAL) → companies.company_role='POTENTIAL' 잠재 고객사 공시
    #       두 트랙은 asyncio.gather()로 동시 실행되며, 동일 기업은 CLIENT 우선 처리됩니다.
    #
    # 입력: managed_clients, companies (POTENTIAL + dart_corp_code IS NOT NULL)
    # 출력: dart_disclosures 테이블 INSERT (scout_status='PENDING', source_role 태깅)
    # ────────────────────────────────────────────────────────────
    print("\n[4단계] CLIENT + POTENTIAL 기업 공시 수집 (투 트랙)")
    print("-" * 60)
    asyncio.run(run_fetch_disclosures())

    print("\n" + "=" * 60)
    print("  DART 파이프라인 완료")
    print("=" * 60)


if __name__ == "__main__":
    main()

