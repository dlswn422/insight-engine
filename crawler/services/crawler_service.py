from __future__ import annotations

from datetime import timezone
from typing import List, Dict, Tuple, Optional

from crawlers.naver_news import NaverNewsCrawler
from services.article_service import process_article
from repositories.keyword_repository import get_monitoring_keywords
from repositories.state_repository import (
    get_last_crawled_at,
    update_last_crawled_at
)

# (선택) 회사명 + 확장 키워드로 검색 범위를 넓힐지 여부
USE_EXPANDED_KEYWORDS = False
EXPAND_TERMS = ["바이알", "앰플", "유리용기", "세척", "탈알칼리", "제약", "화장품"]


def _build_keywords(base_rows: List[Dict]) -> List[Dict]:
    """
    base_rows: [{"keyword": "..."}] 형태
    확장 키워드를 사용할 경우, 회사명 + 확장어 조합을 추가 생성

    ✅ 중복 키워드는 제거하여 API 호출 낭비 방지
    """
    out: List[Dict] = []
    seen = set()

    def _push(k: str):
        k = (k or "").strip()
        if not k:
            return
        if k in seen:
            return
        seen.add(k)
        out.append({"keyword": k})

    for r in base_rows or []:
        kw = (r.get("keyword") or "").strip()
        _push(kw)

        if USE_EXPANDED_KEYWORDS and kw:
            for t in EXPAND_TERMS:
                _push(f"{kw} {t}")

    return out


def _to_utc_naive(dt):
    """
    dt가 tz-aware면 UTC naive로 변환.
    dt가 tz-naive면 그대로 반환.
    """
    if getattr(dt, "tzinfo", None):
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def run_crawler():
    print("🚀 크롤링 시작")

    crawler = NaverNewsCrawler()

    # ✅ (ENV/로컬 파일/DB/기존키워드) 우선순위로 키워드 가져옴
    keywords, source = get_monitoring_keywords(return_source=True)
    keywords = _build_keywords(keywords)

    print(f"📌 키워드 소스: {source}")
    print(f"📌 키워드 개수: {len(keywords)}")

    if not keywords:
        print("⚠️ 수집할 키워드가 없습니다. (ENV/파일/DB/keywords 테이블 확인)")
        print("✅ 크롤링 종료")
        return

    last_crawled_at = get_last_crawled_at()
    print(f"📌 이전 마지막 수집 시간: {last_crawled_at}")

    # ✅ 이번 실행에서 확인한 가장 최신 기사 시간(저장 성공 여부와 무관)
    newest_seen_time = None

    fetched_total = 0
    candidate_total = 0
    saved_total = 0
    skipped_old = 0
    error_total = 0

    for kw in keywords:
        keyword = (kw.get("keyword") or "").strip()
        if not keyword:
            continue

        print(f"🔎 키워드 검색: {keyword}")

        try:
            articles = crawler.fetch_articles(keyword) or []
        except Exception as e:
            error_total += 1
            print(f"❌ fetch_articles 실패: {keyword} / {e}")
            continue

        fetched_total += len(articles)

        for article in articles:
            try:
                article_time = _to_utc_naive(article["published_at"])
            except Exception as e:
                error_total += 1
                print(f"❌ 기사 시간 파싱 실패: {e}")
                continue

            # 이전에 수집한 기사면 skip
            if last_crawled_at and article_time <= last_crawled_at:
                skipped_old += 1
                continue

            candidate_total += 1

            # ✅ 최신 기사 시간 기록 (저장 성공 여부와 무관하게 최신 시각은 갱신)
            if newest_seen_time is None or article_time > newest_seen_time:
                newest_seen_time = article_time

            # (선택) 어떤 키워드로 들어온 기사인지 추적하고 싶으면 주석 해제
            # article["search_keyword"] = keyword

            try:
                saved = process_article(article)
            except Exception as e:
                error_total += 1
                print(f"❌ process_article 실패: {e}")
                continue

            if saved:
                saved_total += 1
                print(f"✅ 저장 완료: {saved.get('title')}")

    # ✅ last_crawled_at 갱신 (이번 실행에서 본 최신 기사 시각 기준)
    if newest_seen_time:
        print(f"🕒 마지막 수집 시간 업데이트: {newest_seen_time}")
        update_last_crawled_at(newest_seen_time)
    else:
        print("ℹ️ 이번 실행에서 신규 기사 없음 (last_crawled_at 업데이트 없음)")

    print("✅ 크롤링 종료")
    print(
        f"📊 통계 | fetched={fetched_total}, "
        f"new_candidates={candidate_total}, saved={saved_total}, "
        f"skipped_old={skipped_old}, errors={error_total}"
    )