from datetime import timezone
from crawlers.naver_news import NaverNewsCrawler
from services.article_service import process_article
from services.instant_signal_service import analyze_article_in_memory

from repositories.keyword_repository import get_monitoring_keywords
from repositories.state_repository import get_last_crawled_at, update_last_crawled_at

USE_EXPANDED_KEYWORDS = False
EXPAND_TERMS = ["바이알", "앰플", "유리용기", "세척", "탈알칼리", "제약", "화장품"]


def _build_keywords(base_rows: list[dict]) -> list[dict]:
    if not USE_EXPANDED_KEYWORDS:
        return base_rows
    out = []
    for r in base_rows:
        kw = (r.get("keyword") or "").strip()
        if not kw:
            continue
        out.append({"keyword": kw})
        for t in EXPAND_TERMS:
            out.append({"keyword": f"{kw} {t}"})
    return out


def run_crawler():
    print("🚀 크롤링 시작")

    crawler = NaverNewsCrawler()

    keywords, source = get_monitoring_keywords(return_source=True)
    keywords = _build_keywords(keywords)

    print(f"📌 키워드 소스: {source}")
    print(f"📌 키워드 개수: {len(keywords)}")

    last_crawled_at = get_last_crawled_at()
    print(f"📌 이전 마지막 수집 시간: {last_crawled_at}")

    newest_article_time = None

    fetched_total = 0
    analyzed_total = 0
    signals_total = 0
    promoted_total = 0

    for kw in keywords:
        keyword = (kw.get("keyword") or "").strip()
        if not keyword:
            continue

        print(f"🔎 키워드 검색: {keyword}")

        articles = crawler.fetch_articles(keyword)
        fetched_total += len(articles)

        for article in articles:
            article_time = article["published_at"]

            # timezone 제거(UTC naive로 통일)
            if article_time.tzinfo:
                article_time = article_time.astimezone(timezone.utc).replace(tzinfo=None)

            # 이전에 수집한 기사면 skip
            if last_crawled_at and article_time <= last_crawled_at:
                continue

            # ✅ DB에는 메타만 저장 (title/description은 저장하지 않음)
            saved_row = process_article(article)
            if not saved_row:
                continue

            analyzed_total += 1

            # ✅ 즉시 분석: 메모리(title/description)로만 LLM 호출 → signals 저장
            stats = analyze_article_in_memory(saved_row, article)
            signals_total += stats["signals_saved"]
            promoted_total += stats["potential_promoted"]

            # 로그는 메모리 title로 출력
            print(f"✅ 처리 완료: {article.get('title','')[:60]}... "
                  f"(signals={stats['signals_saved']}, potential={stats['potential_promoted']})")

            if newest_article_time is None or article_time > newest_article_time:
                newest_article_time = article_time

    if newest_article_time:
        print(f"🕒 마지막 수집 시간 업데이트: {newest_article_time}")
        update_last_crawled_at(newest_article_time)

    print("✅ 크롤링 종료")
    print(f"📊 통계 | fetched={fetched_total}, analyzed={analyzed_total}, "
          f"signals_saved={signals_total}, potential_promoted={promoted_total}")