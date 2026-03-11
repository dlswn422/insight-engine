"""
scheduler_main.py — 메인 스케줄러

실행해두면 무한히 돌면서 아래 3가지 작업을 자동으로 실행합니다.

┌─────────────────────────────────────────────────────────────
│  작업                           주기                         
│  뉴스 크롤링 + LLM 분석         1시간마다                     
│  DART 공시 수집/분류/LLM 분석   1일마다 (새벽 02:00 이후)     
│  타겟 기업 탐색 (3개월 순회)    1일마다 (새벽 03:00 이후)     
└─────────────────────────────────────────────────────────────

실행 방법:
    crawler 폴더에서:  python scheduler_main.py

종료 방법:
    Ctrl+C 로 안전하게 종료합니다.

주의:
    - 각 작업은 순차 실행입니다. 한 작업이 길어지면 다음 작업 시작이 늦어질 수 있습니다.
    - 작업 중 오류가 발생해도 스케줄러는 멈추지 않고 계속 실행됩니다.
    - DART 공시와 타겟 탐색은 하루에 한 번만 실행됩니다.
"""

import sys
import os
import time
import asyncio
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ──────────────────────────────────────────────────────────────────────────────
# ⚙️  실행 주기 설정
# ──────────────────────────────────────────────────────────────────────────────

# 뉴스 크롤링 주기 (초 단위)
# 3600 = 1시간 / 1800 = 30분 / 7200 = 2시간
NEWS_INTERVAL_SEC = 3600

# DART 공시 파이프라인이 하루에 실행될 시각 (24시 기준 시간, 0~23)
# 예: 2 → 새벽 02:00 이후 첫 스케줄 루프에서 실행
DART_PIPELINE_HOUR = 2

# 타겟 기업 탐색이 하루에 실행될 시각 (24시 기준 시간, 0~23)
# DART 파이프라인보다 1시간 이후를 권장 (API 부하 분산)
INDUSTRY_SCAN_HOUR = 3

# 메인 루프 대기 간격 (초)
# 너무 짧으면 CPU 낭비 / 5~30초 권장
LOOP_SLEEP_SEC = 10


# ──────────────────────────────────────────────────────────────────────────────
# 내부 상태 추적 (프로세스 재시작 시 초기화됨)
# ──────────────────────────────────────────────────────────────────────────────

_last_news_run: datetime | None = None       # 뉴스 마지막 실행 시각
_last_dart_run_date: str | None  = None      # DART 파이프라인 마지막 실행 날짜 (YYYY-MM-DD)
_last_industry_run_date: str | None = None   # 타겟 탐색 마지막 실행 날짜 (YYYY-MM-DD)


# ──────────────────────────────────────────────────────────────────────────────
# 1) 뉴스 크롤링 + LLM 분석
# ──────────────────────────────────────────────────────────────────────────────

def run_news_pipeline() -> None:
    """
    네이버 뉴스 크롤링 후 기사를 즉시 LLM으로 분석하여 signals 테이블에 저장합니다.
    crawler_service.py 의 run_crawler()가 전체 흐름을 담당합니다.

    흐름:
        크롤링(naver_news.py) → DB 저장(articles) → LLM 분석 → signals 저장
    """
    from services.crawler_service import run_crawler
    run_crawler()


# ──────────────────────────────────────────────────────────────────────────────
# 2) DART 공시 파이프라인 (하루 1회)
# ──────────────────────────────────────────────────────────────────────────────

def run_dart_pipeline() -> None:
    """
    DART 공시 파이프라인을 순서대로 실행합니다. (하루 1회)

    실행 순서:
        1) dart_main.main()
               ├─ sync_potential_companies: industry_targets → POTENTIAL 승격 (+ corp_code 복사)
               └─ fetch_disclosures_dual_track: CLIENT+POTENTIAL 공시 수집 → PENDING 상태로 INSERT

        2) dart_classifier_worker.run()
               PENDING → SKIPPED / READY_FOR_LLM / UNMATCHED 분류

        3) dart_llm_worker.run()      (비동기)
               READY_FOR_LLM → DART ZIP 다운로드 → Bulk LLM → signals 저장 → READY_FOR_ANALYSIS
    """
    import dart_main
    from workers.dart_classifier_worker import run as run_classifier
    from workers.dart_llm_worker import run as run_llm

    print("\n[스케줄러] DART 파이프라인 시작")

    # 1단계: 공시 수집 (dart_main 내부에서 sync_dart_codes → sync_potential → fetch 순으로 진행)
    print("[스케줄러] DART 1단계: 공시 수집")
    dart_main.main()

    # 2단계: 키워드 분류 (LLM 없음, 빠름)
    print("[스케줄러] DART 2단계: 키워드 분류")
    run_classifier()

    # 3단계: Bulk LLM 분석 (비동기 함수이므로 asyncio.run으로 실행)
    print("[스케줄러] DART 3단계: Bulk LLM 분석")
    asyncio.run(run_llm())

    print("[스케줄러] DART 파이프라인 완료")


# ──────────────────────────────────────────────────────────────────────────────
# 3) 타겟 기업 탐색 (하루 1회, 3개월에 전체 순회 완료)
# ──────────────────────────────────────────────────────────────────────────────

def run_industry_scan() -> None:
    """
    DART 전체 10만 기업 중 타겟 업종(제약/바이오/화장품 등) 기업을 조금씩 탐색합니다.

    커서(sync_cursor.json) 방식으로 위치를 기억하여 하루에 30,000건씩 이어서 처리합니다.
    전체 ~100,000건 기준 약 3~4일에 한 바퀴 완료됩니다.
    (sync_industry_targets.py의 BATCH_SIZE = 30,000 기준)

    전체 순회 완료 시 커서가 자동으로 초기화되어 처음부터 다시 시작합니다.

    탐색된 기업은 industry_targets 테이블에 기록되고,
    다음 DART 파이프라인 실행 시 sync_potential_companies.py가 POTENTIAL로 승격합니다.
    """
    from scripts.sync_industry_targets import run as run_industry_targets

    print("\n[스케줄러] 타겟 기업 탐색 시작")
    run_industry_targets()
    print("[스케줄러] 타겟 기업 탐색 완료")


# ──────────────────────────────────────────────────────────────────────────────
# 실행 조건 판단 헬퍼
# ──────────────────────────────────────────────────────────────────────────────

def _should_run_news() -> bool:
    """
    뉴스 크롤링 실행 여부를 판단합니다.
    한 번도 실행하지 않았거나, 마지막 실행 후 NEWS_INTERVAL_SEC 이상 지났으면 True.
    """
    global _last_news_run
    if _last_news_run is None:
        return True
    return (datetime.now() - _last_news_run).total_seconds() >= NEWS_INTERVAL_SEC


def _should_run_daily(last_date: str | None, target_hour: int) -> bool:
    """
    하루 1회 작업의 실행 여부를 판단합니다.
    오늘 날짜에 아직 실행하지 않았고, 현재 시각이 target_hour 이후이면 True.
    """
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    if last_date == today:
        return False  # 오늘 이미 실행함
    if now.hour < target_hour:
        return False  # 아직 지정 시각이 되지 않음
    return True


# ──────────────────────────────────────────────────────────────────────────────
# 안전 실행 래퍼 (에러가 발생해도 스케줄러가 멈추지 않도록)
# ──────────────────────────────────────────────────────────────────────────────

def _safe_run(name: str, fn) -> bool:
    """
    fn()을 실행하고 예외 발생 시 에러를 출력하고 False를 반환합니다.
    스케줄러가 한 작업의 에러로 인해 멈추지 않도록 보호합니다.
    """
    try:
        fn()
        return True
    except Exception as e:
        print(f"\n[스케줄러] '{name}' 실행 중 오류 발생: {e}")
        print(f"[스케줄러] 오류를 무시하고 계속 실행합니다.\n")
        return False


# ──────────────────────────────────────────────────────────────────────────────
# 메인 루프
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    global _last_news_run, _last_dart_run_date, _last_industry_run_date

    print("=" * 60)
    print("[스케줄러] 메인 스케줄러 시작")
    print(f"  뉴스 크롤링    : {NEWS_INTERVAL_SEC // 60}분마다")
    print(f"  DART 파이프라인: 매일 {DART_PIPELINE_HOUR:02d}:00 이후")
    print(f"  타겟 기업 탐색 : 매일 {INDUSTRY_SCAN_HOUR:02d}:00 이후")
    print("  종료: Ctrl+C")
    print("=" * 60)

    while True:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # ── 뉴스 크롤링 ───────────────────────────────────────────
        if _should_run_news():
            print(f"\n[스케줄러] {now_str} — 뉴스 크롤링 시작")
            # 에러 발생 시 10초 무한 재시도 폭탄을 방지하기 위해 성공 여부와 무관하게 마지막 실행 시각을 즉시 기록
            _last_news_run = datetime.now()
            success = _safe_run("뉴스 크롤링", run_news_pipeline)
            if success:
                print(f"[스케줄러] 뉴스 크롤링 완료. 다음 실행: {NEWS_INTERVAL_SEC // 60}분 후")

        # ── DART 공시 파이프라인 (하루 1회) ──────────────────────
        if _should_run_daily(_last_dart_run_date, DART_PIPELINE_HOUR):
            print(f"\n[스케줄러] {now_str} — DART 공시 파이프라인 시작")
            _last_dart_run_date = datetime.now().strftime("%Y-%m-%d")
            success = _safe_run("DART 파이프라인", run_dart_pipeline)
            if success:
                print(f"[스케줄러] DART 파이프라인 완료. 다음 실행: 내일 {DART_PIPELINE_HOUR:02d}:00 이후")

        # ── 타겟 기업 탐색 (하루 1회) ────────────────────────────
        if _should_run_daily(_last_industry_run_date, INDUSTRY_SCAN_HOUR):
            print(f"\n[스케줄러] {now_str} — 타겟 기업 탐색 시작")
            _last_industry_run_date = datetime.now().strftime("%Y-%m-%d")
            success = _safe_run("타겟 기업 탐색", run_industry_scan)
            if success:
                print(f"[스케줄러] 타겟 기업 탐색 완료. 다음 실행: 내일 {INDUSTRY_SCAN_HOUR:02d}:00 이후")

        # ── 대기 ─────────────────────────────────────────────────
        # 다음 루프 체크까지 LOOP_SLEEP_SEC 초 대기합니다.
        # 이 값을 너무 짧게 하면 CPU를 낭비하고, 너무 길게 하면 작업 시작이 늦어집니다.
        time.sleep(LOOP_SLEEP_SEC)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[스케줄러] Ctrl+C 감지 — 스케줄러를 안전하게 종료합니다.")
