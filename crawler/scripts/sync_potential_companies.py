"""
scripts/sync_potential_companies.py

목적:
- industry_targets 테이블에 기록된 기업 목록과
  companies 테이블을 corp_code 기준으로 대조하여
  일치하는 기업의 company_role을 'POTENTIAL'로 업데이트합니다.
- 주기적으로 실행하여 companies 테이블을 최신 상태로 유지합니다.

역할 분리:
    sync_industry_targets.py  → DART 순회 + industry_targets 기록 (탐색)
    sync_potential_companies.py → companies 대조 + POTENTIAL 업데이트 (동기화)

실행:
    crawler 디렉토리에서:
    python scripts/sync_potential_companies.py

주의사항:
    - OWN, CLIENT 역할의 기업은 POTENTIAL로 강등하지 않습니다.
    - industry_targets에 있어도 companies에 없으면 추가(INSERT)하지 않습니다.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from repositories.db import supabase


# ── Step 1: industry_targets 전체 조회 ──────────────────────────

def load_industry_targets() -> dict[str, str]:
    """
    industry_targets 테이블의 모든 기업을 조회합니다.
    Returns:
        dict: { corp_code: company_name }
    """
    result = supabase.table("industry_targets").select("corp_code, company_name").execute()
    return {row["corp_code"]: row["company_name"] for row in (result.data or [])}


# ── Step 2: companies 대조 및 POTENTIAL 업데이트 ──────────────────

def sync_potential_companies(targets: dict[str, str]) -> tuple[int, int, int]:
    """
    industry_targets 기업 목록과 companies 테이블을 대조하여
    일치하는 기업을 POTENTIAL로 업데이트합니다.

    Returns:
        (updated, skipped_protected, not_found) 건수
    """
    updated           = 0
    skipped_protected = 0  # OWN/CLIENT라 보호된 건수
    not_found         = 0  # companies에 없는 건수

    target_corp_codes = list(targets.keys())

    # companies 테이블에서 타겟 corp_code 목록에 해당하는 기업을 한 번에 조회
    # Supabase는 in() 필터 지원 (최대 수백 건까지 안정적)
    CHUNK_SIZE = 200  # 한 번에 조회할 건수 제한
    all_companies = []

    for i in range(0, len(target_corp_codes), CHUNK_SIZE):
        chunk = target_corp_codes[i:i + CHUNK_SIZE]
        result = (
            supabase
            .table("companies")
            .select("id, dart_corp_code, company_role")
            .in_("dart_corp_code", chunk)
            .execute()
        )
        all_companies.extend(result.data or [])

    # companies 결과를 corp_code 기준으로 인덱싱
    company_map = {row["dart_corp_code"]: row for row in all_companies}

    for corp_code, corp_name in targets.items():
        company = company_map.get(corp_code)

        if not company:
            # companies에 없는 기업 → 추가하지 않음
            not_found += 1
            continue

        current_role = company.get("company_role")

        if current_role in ("OWN", "CLIENT"):
            # 이미 고객사 → 강등하지 않음
            skipped_protected += 1
            print(f"  🛡️  보호 스킵 [{current_role}]: {corp_name} ({corp_code})")
            continue

        if current_role == "POTENTIAL":
            # 이미 POTENTIAL → 건드리지 않음
            continue

        # POTENTIAL로 업데이트
        supabase.table("companies").update({
            "company_role": "POTENTIAL"
        }).eq("id", company["id"]).execute()

        print(f"  ♻️  POTENTIAL 업데이트: {corp_name} ({corp_code})")
        updated += 1

    return updated, skipped_protected, not_found


# ── 메인 실행 ─────────────────────────────────────────────────────

def run():
    print("=" * 55)
    print("[sync_potential_companies] 잠재 기업 동기화 시작")
    print("=" * 55)

    # Step 1: industry_targets 전체 로드
    targets = load_industry_targets()
    print(f"  industry_targets 기업 수: {len(targets)}개\n")

    if not targets:
        print("[sync_potential_companies] industry_targets가 비어있습니다.")
        print("  sync_industry_targets.py를 먼저 실행하세요.")
        return

    # Step 2: companies 대조 및 업데이트
    updated, skipped_protected, not_found = sync_potential_companies(targets)

    print("\n" + "=" * 55)
    print("[sync_potential_companies] 완료")
    print(f"  • POTENTIAL 업데이트 : {updated}개")
    print(f"  • OWN/CLIENT 보호    : {skipped_protected}개 (강등 안 함)")
    print(f"  • companies에 없음   : {not_found}개 (추가 안 함)")
    print("=" * 55)


if __name__ == "__main__":
    run()
