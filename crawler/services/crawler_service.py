"""
services/crawler_service.py — 뉴스 수집 & 즉석 분석 서비스

역할:
    1. DB에서 모니터링 키워드 목록을 읽어옵니다.
    2. 키워드마다 네이버 뉴스 API를 호출하여 기사를 수집합니다.
    3. 이전에 수집한 기사는 걸러내고, 새 기사만 DB에 메타(URL, 발행일)를 저장합니다.
       ※ 기사의 제목/본문은 저작권 보호를 위해 DB에 저장하지 않습니다.
    4. 수집된 기사 원문(제목/요약)을 메모리에서 즉시 LLM으로 분석하여
       시그널(signals)과 잠재 기업 정보를 DB에 저장합니다.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import timezone
from crawlers.naver_news import NaverNewsCrawler
from services.article_service import process_article
from services.batch_signal_service import analyze_batch

from repositories.keyword_repository import get_monitoring_keywords
from repositories.state_repository import get_last_crawled_at, update_last_crawled_at

# ─── 키워드 확장 설정 ────────────────────────────────────────────────
# True로 켜면 각 키워드에 EXPAND_TERMS를 조합한 확장 쿼리도 함께 검색합니다.
# 예) 키워드: "한미약품"
#     확장 시: "한미약품 바이알", "한미약품 제약", "한미약품 화장품" 등
#
# ⚠️ 주의: 키워드 N개 × EXPAND_TERMS M개 = 최대 N×(M+1)회 API 호출
#     네이버 뉴스 API 일일 제한(25,000회)을 고려해서 켜세요.
#
# ✅ 추천 사용 시점:
#     - 특정 키워드로 뉴스가 너무 안 잡힐 때
#     - 특수 업종 용어(바이알, 앰플 등)로 매출 기회 탐색이 필요할 때
USE_EXPANDED_KEYWORDS = False
EXPAND_TERMS = ["바이알", "앰플", "유리용기", "세척", "탈알칼리", "제약", "화장품"]


def _build_keywords(base_rows: list[dict]) -> list[dict]:
    """키워드 확장 함수. USE_EXPANDED_KEYWORDS가 False면 원본 그대로 반환합니다."""
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
    """
    뉴스 크롤러 메인 실행 함수.

    실행 흐름:
        1) DB에서 모니터링 키워드 로드
        2) 각 키워드로 네이버 뉴스 API 검색 (최대 30건/키워드)
        3) 이미 수집했던 시각 이전 기사는 건너뜀
        4) 새 기사 → DB에 메타(URL, 발행일)만 저장
        5) 기사 원문(메모리)으로 LLM 즉석 분석 → signals, companies 업데이트
        6) 이번 수집에서 가장 최신 기사 시각을 DB에 기록 (다음 실행 시 기준점)
    """
    print("🚀 크롤링 시작")

    crawler = NaverNewsCrawler()

    # DB (또는 JSON)에서 키워드 목록과 출처를 가져옵니다.
    keywords, source = get_monitoring_keywords(return_source=True)
    keywords = _build_keywords(keywords)

    print(f"📌 키워드 소스: {source}")
    print(f"📌 키워드 개수: {len(keywords)}")

    # 직전 크롤링이 완료된 시각 — 이 시각보다 오래된 기사는 중복이므로 건너뜁니다.
    last_crawled_at = get_last_crawled_at()
    print(f"📌 이전 마지막 수집 시간: {last_crawled_at}")

    newest_article_time = None  # 이번 실행에서 수집된 기사 중 가장 최신 시각

    fetched_total  = 0  # API로 가져온 기사 수 (중복 포함)
    analyzed_total = 0  # 실제 분석 진행한 기사 수 (신규 기사만)
    signals_total  = 0  # LLM이 추출해서 저장한 시그널 수
    promoted_total = 0  # 이번 실행에서 GENERAL로 등록된 신규 기업 수

    # 벌크 처리를 위해 새 기사들을 모아둘 리스트
    pending_articles = []

    for kw in keywords:
        keyword = (kw.get("keyword") or "").strip()
        if not keyword:
            continue

        print(f"🔎 키워드 검색: {keyword}")

        articles = crawler.fetch_articles(keyword)
        fetched_total += len(articles)

        for article in articles:
            article_time = article["published_at"]

            # 모든 시간은 UTC 기준(timezone 없는 naive datetime)으로 통일합니다.
            if article_time.tzinfo:
                article_time = article_time.astimezone(timezone.utc).replace(tzinfo=None)

            # 이전 수집 기준 시각보다 오래된 기사는 이미 처리된 것이므로 건너뜁니다.
            if last_crawled_at and article_time <= last_crawled_at:
                continue

            # DB에 URL, 발행일 등 메타 정보만 저장합니다. (제목/요약은 저장 안 함)
            saved_row = process_article(article)
            if not saved_row:
                # URL이 없거나 이미 DB에 있는 기사면 None 반환 → 건너뜁니다.
                continue

            # 이번 실행에서 처리한 기사 중 가장 최신 발행 시각을 갱신합니다.
            if newest_article_time is None or article_time > newest_article_time:
                newest_article_time = article_time

            # 벌크 처리를 위해 리스트에 적재
            pending_articles.append({
                "article_id": saved_row["id"],
                "title": article.get("title", ""),
                "description": article.get("description", ""),
                "url": article.get("url", "")
            })

    # 모아둔 기사들을 15개 단위(BATCH_SIZE)로 묶어서 LLM Bulk 처리
    BATCH_SIZE = 15
    for i in range(0, len(pending_articles), BATCH_SIZE):
        chunk = pending_articles[i:i + BATCH_SIZE]
        print(f"🧠 기사 묶음(Bulk) LLM 분석 시작: {len(chunk)}건")

        try:
            stats = analyze_batch(chunk)
            analyzed_total += stats.get("articles", 0)
            signals_total  += stats.get("signals_saved", 0)
            promoted_total += stats.get("general_registered", 0)
            print(f"✅ 묶음 분석 완료: signals={stats.get('signals_saved', 0)}, general_registered={stats.get('general_registered', 0)}")
        except Exception as e:
            print(f"❌ 묶음 분석 중 오류 발생: {e}")

    # 마지막 수집 시각을 DB에 저장합니다. 다음 실행 시 이 시각 이후 기사만 수집합니다.
    if newest_article_time:
        print(f"🕒 마지막 수집 시간 업데이트: {newest_article_time}")
        update_last_crawled_at(newest_article_time)

    print("✅ 크롤링 종료")
    print(f"📊 통계 | fetched={fetched_total}, analyzed={analyzed_total}, "
          f"signals_saved={signals_total}, general_registered={promoted_total}")