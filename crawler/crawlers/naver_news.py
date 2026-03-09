"""
naver_news.py

- 네이버 뉴스 검색 API 사용
- 키워드 기반 기사 리스트 수집
- (저작권 대응) description(요약) 포함 반환
"""

import requests
from datetime import datetime
import re

from config import NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
from .base import BaseCrawler


def _clean_html(text: str) -> str:
    """네이버 응답 title/description에 들어있는 <b> 태그 등 제거"""
    if not text:
        return ""
    text = re.sub(r"<.*?>", "", text)
    return " ".join(text.split())


class NaverNewsCrawler(BaseCrawler):
    NAVER_URL = "https://openapi.naver.com/v1/search/news.json"

    def fetch_articles(self, keyword: str):
        """
        네이버 뉴스 검색 API 호출
        keyword 기반 기사 리스트 반환
        """

        headers = {
            "X-Naver-Client-Id": NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
        }

        params = {
            "query": keyword,
            "display": 30,   # 최대 100 가능
            "sort": "date"
        }

        response = requests.get(
            self.NAVER_URL,
            headers=headers,
            params=params,
            timeout=10
        )

        data = response.json()
        articles = []

        for item in data.get("items", []):
            articles.append({
                "title": _clean_html(item.get("title", "")),
                "description": _clean_html(item.get("description", "")),  # ✅ 추가
                "url": item.get("link"),
                "published_at": datetime.strptime(
                    item["pubDate"],
                    "%a, %d %b %Y %H:%M:%S %z"
                )
            })

        return articles