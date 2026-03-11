from datetime import timezone
from crawlers.naver_news import NaverNewsCrawler
from services.article_service import process_article
from services.batch_signal_service import analyze_batch  # ✅ 변경

from repositories.keyword_repository import get_monitoring_keywords
from repositories.state_repository import get_last_crawled_at, update_last_crawled_at

USE_EXPANDED_KEYWORDS = False
EXPAND_TERMS = ["바이알", "앰플", "유리용기", "세척", "탈알칼리", "제약", "화장품"]

BATCH_SIZE = 15  # ✅ 15건 묶음


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
    saved_total = 0
    batch_calls = 0
    signals_total = 0
    promoted_total = 0

    # ✅ 15건 배치 버퍼: DB에는 저장하지 않는 title/description을 메모리로만 유지
    batch_buf: list[dict] = []

    def flush_batch(force: bool = False):
        """
        batch_buf가 BATCH_SIZE 이상이면 15건 단위로 처리
        force=True면 남은 전부 처리(마지막 flush)
        """
        nonlocal batch_buf, batch_calls, signals_total, promoted_total

        while len(batch_buf) >= BATCH_SIZE or (force and len(batch_buf) > 0):
            chunk = batch_buf[:BATCH_SIZE] if len(batch_buf) >= BATCH_SIZE else batch_buf[:]
            batch_buf = batch_buf[len(chunk):]

            stats = analyze_batch(chunk)
            batch_calls += 1
            signals_total += stats["signals_saved"]
            promoted_total += stats["potential_promoted"]

            print(
                f"🧠 batch analyzed: {stats['articles']} "
                f"(signals={stats['signals_saved']}, potential={stats['potential_promoted']})"
            )

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

            saved_total += 1

            # ✅ 배치 버퍼에 메모리로만 저장
            batch_buf.append({
                "article_id": saved_row["id"],
                "title": article.get("title", ""),
                "description": article.get("description", ""),
                "url": article.get("url", "")
            })

            # ✅ 15개 모이면 LLM 1회 호출
            flush_batch(force=False)

            # 최신 기사 시간 기록
            if newest_article_time is None or article_time > newest_article_time:
                newest_article_time = article_time

    # ✅ 남은 것까지 처리(마지막 flush)
    flush_batch(force=True)

    if newest_article_time:
        print(f"🕒 마지막 수집 시간 업데이트: {newest_article_time}")
        update_last_crawled_at(newest_article_time)

    print("✅ 크롤링 종료")
    print(
        f"📊 통계 | fetched={fetched_total}, saved_meta={saved_total}, "
        f"batch_calls={batch_calls}, signals_saved={signals_total}, potential_promoted={promoted_total}"
    )