from datetime import timezone
from crawlers.naver_news import NaverNewsCrawler
from crawlers.daum_news import DaumNewsCrawler
from services.article_service import process_article
from repositories.keyword_repository import get_keywords
from repositories.state_repository import (
    get_last_crawled_at,
    update_last_crawled_at
)


def get_crawler(source: str):
    """매체 이름에 따라 알맞은 크롤러 객체 반환 (naver / daum 한정)"""
    if source == 'naver':
        return NaverNewsCrawler()
    elif source == 'daum':
        return DaumNewsCrawler()
    else:
        raise ValueError(f"지원하지 않는 소스입니다: {source} (현재 naver / daum 만 지원)")


def run_crawler(source: str = 'naver'):
    print(f"🚀 [{source}] 크롤링 시작")

    crawler = get_crawler(source)
    keywords = get_keywords()

    last_crawled_at = get_last_crawled_at()
    print(f"📌 이전 마지막 수집 시간: {last_crawled_at}")

    newest_article_time = None

    for kw in keywords:
        keyword = kw["keyword"]
        print(f"🔎 키워드 검색: {keyword}")

        articles = crawler.fetch_articles(keyword)

        for article in articles:

            article_time = article["published_at"]

            # timezone 제거
            if article_time.tzinfo:
                article_time = (
                    article_time
                    .astimezone(timezone.utc)
                    .replace(tzinfo=None)
                )

            # 이전에 수집한 기사면 skip
            if last_crawled_at and article_time <= last_crawled_at:
                continue

            saved = process_article(article)

            if saved:
                print(f"✅ 저장 완료: {saved['title']}")

                # 최신 기사 시간 기록
                if newest_article_time is None or article_time > newest_article_time:
                    newest_article_time = article_time

    if newest_article_time:
        print(f"🕒 마지막 수집 시간 업데이트: {newest_article_time}")
        update_last_crawled_at(newest_article_time)

    print("✅ 크롤링 종료")