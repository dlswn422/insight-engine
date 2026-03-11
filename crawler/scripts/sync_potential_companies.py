"""
scripts/sync_potential_companies.py

목적:
- industry_targets 테이블에 기록된 기업 목록과
  companies 테이블을 corp_code 기준으로 대조하여
  일치하는 기업의 company_role을 'POTENTIAL'로 업데이트합니다.
- 동시에 industry_targets.corp_code를 companies.dart_corp_code에 복사합니다.
  (sync_dart_codes.py를 사용하지 않으므로, corp_code 복사는 여기서 담당합니다.)
- 주기적으로 실행하여 companies 테이블을 최신 상태로 유지합니다.

역할 분리:
    sync_industry_targets.py  → DART 순회 + industry_targets 기록 (탐색)
    sync_potential_companies.py → companies 대조 + POTENTIAL 업데이트 + corp_code 복사 (동기화)

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


import re

# ── Step 0: 유틸 ────────────────────────────────────────────────

def _normalize_company_name(name: str) -> str:
    """
    DART 기업명에서 불필요한 (주), 주식회사 등을 제거하고
    공백을 없애고 소문자로 변환하여 비교용 정규화 문자열을 만듭니다.
    """
    if not name:
        return ""
    n = name.lower()
    n = re.sub(r"\(주\)|주식회사|\(유\)|유한회사", "", n)
    n = re.sub(r"\s+", "", n)
    return n


# ── Step 1: industry_targets 전체 조회 ──────────────────────────

def load_industry_targets() -> dict[str, dict]:
    """
    industry_targets 테이블의 모든 기업을 조회합니다.
    Returns:
        dict: { corp_code: {"company_name": str, "corp_code": str} }
    """
    result = supabase.table("industry_targets").select("corp_code, company_name").execute()
    return {
        row["corp_code"]: {"company_name": row["company_name"], "corp_code": row["corp_code"]}
        for row in (result.data or [])
    }


# ── Step 2: companies 대조 및 POTENTIAL 업데이트 ──────────────────

def sync_potential_companies(targets: dict[str, dict]) -> tuple[int, int, int]:
    """
    industry_targets 기업 목록과 companies 테이블을 대조하여
    일치하는 기업을 POTENTIAL로 업데이트하고,
    industry_targets의 corp_code를 dart_corp_code에 복사합니다.

    Returns:
        (updated, skipped_protected, not_found) 건수
    """
    updated           = 0
    skipped_protected = 0  # OWN/CLIENT라 보호된 건수
    not_found         = 0  # companies에 없는 건수

    # 비교를 위해 원본 타겟 딕셔너리에 정규화된 이름 추가
    # DB 조회는 원본 회사명 그대로 검색하지만, 매칭 검사 시에는 정규화된 이름을 사용합니다.
    target_company_names = [info["company_name"] for info in targets.values()]

    # companies 테이블에서 타겟 company_name 목록에 해당하는 기업을 한 번에 조회
    # (부분 일치 검색을 위해 전체 companies를 가져와서 정규화 기반 매핑 시도)
    print("  DB에서 companies 전체 목록 로드 및 정규화 매핑 준비 중...")
    result = supabase.table("companies").select("id, company_name, dart_corp_code, company_role").execute()
    all_companies = result.data or []

    # companies 결과를 정규화된 company_name 기준으로 인덱싱
    company_map = {_normalize_company_name(row["company_name"]): row for row in all_companies}

    for corp_code, target_info in targets.items():
        corp_name = target_info["company_name"]
        norm_corp_name = _normalize_company_name(corp_name)
        company = company_map.get(norm_corp_name)

        if not company:
            # companies에 없는 기업 → 추가하지 않음
            not_found += 1
            continue

        current_role = company.get("company_role")

        if current_role in ("OWN", "CLIENT"):
            # 이미 고객사 → 강등하지 않음
            skipped_protected += 1
            continue

        if current_role == "POTENTIAL":
            # 이미 POTENTIAL → company_role은 건드리지 않음
            # 단, dart_corp_code가 없으면 복사해둠
            if not company.get("dart_corp_code"):
                supabase.table("companies").update({
                    "dart_corp_code": corp_code
                }).eq("id", company["id"]).execute()
            continue

        # POTENTIAL로 업데이트 + dart_corp_code 복사
        supabase.table("companies").update({
            "company_role":   "POTENTIAL",
            "dart_corp_code": corp_code,  # industry_targets 의 corp_code 를 복사
        }).eq("id", company["id"]).execute()

        print(f"  ♻️  POTENTIAL 업데이트 + corp_code 복사: {corp_name} ({corp_code})")
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
    print(f"  • POTENTIAL 업데이트 + corp_code 복사 : {updated}개")
    print(f"  • OWN/CLIENT 보호                    : {skipped_protected}개 (강등 안 함)")
    print(f"  • companies에 없음                   : {not_found}개 (추가 안 함)")
    print("=" * 55)


if __name__ == "__main__":
    run()
