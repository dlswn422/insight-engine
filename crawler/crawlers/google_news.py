"""
google_news.py

- 구글 뉴스 RSS 검색 API 사용
- 키워드 기반 기사 리스트 수집
"""

import feedparser
import requests
import random
from email.utils import parsedate_to_datetime
from .base import BaseCrawler

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
]

class GoogleNewsCrawler(BaseCrawler):
    def fetch_articles(self, keyword: str):
        """
        구글 뉴스 RSS 검색 API 호출
        """
        url = f"https://news.google.com/rss/search?q={keyword}&hl=ko&gl=KR&ceid=KR:ko"
        headers = {"User-Agent": random.choice(USER_AGENTS)}
        
        try:
            # 봇 차단 방지 (타임아웃 및 무작위 User-Agent 적용)
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            feed = feedparser.parse(response.content)
            articles = []
            
            for entry in feed.entries:
                # Naver 뉴스 구조와 100% 동일하게 정규화
                pub_date = parsedate_to_datetime(entry.published)
                
                articles.append({
                    "title": entry.title,
                    "url": entry.link,
                    "content": entry.get("summary", ""),
                    "published_at": pub_date.isoformat(),
                    "scout_status": "pending"
                })
                
            return articles
            
        except Exception as e:
            print(f"Google News 크롤링 에러 ({keyword}): {e}")
            return []
