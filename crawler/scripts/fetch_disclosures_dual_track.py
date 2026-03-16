"""
scripts/fetch_disclosures_dual_track.py

목적:
- 매일 실행되는 투 트랙 DART 공시 수집 스크립트
- 트랙 A (수비형): managed_clients 기업 공시 → source_role='CLIENT'
- 트랙 B (공격형): companies(role=POTENTIAL) 기업 공시 → source_role='POTENTIAL'
- 두 트랙은 asyncio.gather로 병렬 실행
- 중복 corp_code는 CLIENT 우선으로 트랙 B에서 자동 제거

실행:
    crawler 디렉토리에서:
    python scripts/fetch_disclosures_dual_track.py
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from repositories.db import supabase
from services.dart_service import fetch_recent_disclosures
from config import DART_API_KEY


# ── Step 1: 수집 소스 조회 ───────────────────────────────────────

def load_track_a() -> list[dict]:
    """트랙 A 소스: managed_clients 테이블에서 corp_code 목록 조회"""
    result = (
        supabase
        .table("managed_clients")
        .select("corp_code, company_name")
        .not_.is_("corp_code", "null")
        .execute()
    )
    return result.data or []


def load_track_b() -> list[dict]:
    """트랙 B 소스: companies 테이블에서 company_role='POTENTIAL'인 기업 조회"""
    result = (
        supabase
        .table("companies")
        .select("dart_corp_code, company_name")
        .eq("company_role", "POTENTIAL")
        .not_.is_("dart_corp_code", "null")
        .execute()
    )
    # 필드명을 트랙 A와 통일 (corp_code, company_name)
    return [
        {"corp_code": row["dart_corp_code"], "company_name": row["company_name"]}
        for row in (result.data or [])
    ]


def deduplicate(track_a: list[dict], track_b: list[dict]) -> list[dict]:
    """
    중복 corp_code 제거 (CLIENT 우선).
    트랙 A에 있는 corp_code는 트랙 B에서 제거하여 API 중복 호출을 방지합니다.
    """
    a_codes = {row["corp_code"] for row in track_a}
    original_b_count = len(track_b)
    filtered_b = [row for row in track_b if row["corp_code"] not in a_codes]

    removed = original_b_count - len(filtered_b)
    if removed > 0:
        print(f"[dedup] 트랙 B에서 CLIENT 중복 {removed}개 제거됨 (CLIENT 우선)")

    return filtered_b


# ── Step 2: 공시 적재 ────────────────────────────────────────────

def insert_disclosures_safe(disclosures: list[dict]) -> int:
    """ON CONFLICT (rcept_no) DO NOTHING 방식으로 중복 없이 적재"""
    if not disclosures:
        return 0
    result = (
        supabase
        .table("dart_disclosures")
        .upsert(disclosures, on_conflict="rcept_no", ignore_duplicates=True)
        .execute()
    )
    return len(result.data) if result.data else 0


# ── Step 3: 트랙별 비동기 수집 함수 ──────────────────────────────

async def fetch_track(companies: list[dict], source_role: str) -> tuple[int, int]:
    """
    주어진 기업 목록의 공시를 비동기로 수집하여 dart_disclosures에 적재합니다.

    Returns:
        (수집 총 건수, 적재 건수)
    """
    total_fetched = 0
    total_saved   = 0
    label = f"[트랙 {'A(CLIENT)' if source_role == 'CLIENT' else 'B(POTENTIAL)'}]"

    for company in companies:
        corp_code   = company["corp_code"]
        company_name = company.get("company_name", corp_code)

        # dart_service.fetch_recent_disclosures는 동기 함수 — to_thread로 감쌈
        disclosures = await asyncio.to_thread(
            fetch_recent_disclosures,
            DART_API_KEY,
            corp_code,
        )

        if not disclosures:
            continue

        # source_role 태깅: INSERT 시점에 수집 목적을 명시
        for d in disclosures:
            d["source_role"] = source_role
            d["scout_status"] = "PENDING"

        saved = await asyncio.to_thread(insert_disclosures_safe, disclosures)

        total_fetched += len(disclosures)
        total_saved   += saved

        print(f"  {label} '{company_name}' → {len(disclosures)}건 수집 / {saved}건 신규 적재")

    return total_fetched, total_saved


# ── 메인 실행 ───────────────────────────────────────────────────

async def run_async():
    print("=" * 55)
    print("[fetch_dual_track] 투 트랙 DART 공시 수집 시작")
    print("=" * 55)

    # 소스 로드
    track_a = load_track_a()
    track_b_raw = load_track_b()

    print(f"  트랙 A (CLIENT)  : {len(track_a)}개")
    print(f"  트랙 B (POTENTIAL): {len(track_b_raw)}개 (중복 제거 전)")

    # 중복 제거 — CLIENT 우선
    track_b = deduplicate(track_a, track_b_raw)
    print(f"  트랙 B (POTENTIAL): {len(track_b)}개 (중복 제거 후)\n")

    if not track_a and not track_b:
        print("[fetch_dual_track] 수집 대상 없음. 종료합니다.")
        return

    # 두 트랙 병렬 실행
    (a_fetched, a_saved), (b_fetched, b_saved) = await asyncio.gather(
        fetch_track(track_a, source_role="CLIENT"),
        fetch_track(track_b, source_role="POTENTIAL"),
    )

    print("\n" + "=" * 55)
    print("[fetch_dual_track] 완료")
    print(f"  트랙 A: {a_fetched}건 수집 / {a_saved}건 신규 적재")
    print(f"  트랙 B: {b_fetched}건 수집 / {b_saved}건 신규 적재")
    print(f"  합계  : {a_fetched + b_fetched}건 수집 / {a_saved + b_saved}건 신규 적재")
    print("=" * 55)


def run():
    asyncio.run(run_async())


if __name__ == "__main__":
    run()
