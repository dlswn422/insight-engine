"""
crawlers/naver_news.py — 네이버 뉴스 API 크롤러

역할:
    - 네이버 검색 API를 이용해 키워드로 뉴스 기사를 검색합니다.
    - API 응답에서 HTML 태그를 제거하고 기사 목록(title, description, url, published_at)을 반환합니다.
    - title과 description은 분석용으로만 메모리에서 사용하며 DB에 저장하지 않습니다.

    ※ 한 번에 최대 30건을 가져오며, 최신순(sort=date)으로 정렬합니다.
"""

import requests
from datetime import datetime
import re

from config import NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
from .base import BaseCrawler


def _clean_html(text: str) -> str:
    """API 응답 텍스트에서 <b>, </b> 등 HTML 태그를 제거하고 공백을 정리합니다."""
    if not text:
        return ""
    text = re.sub(r"<.*?>", "", text)  # HTML 태그 삭제
    return " ".join(text.split())       # 연속 공백 정리


class NaverNewsCrawler(BaseCrawler):
    """네이버 검색 오픈 API를 사용하는 뉴스 크롤러."""

    NAVER_URL = "https://openapi.naver.com/v1/search/news.json"

    def fetch_articles(self, keyword: str) -> list[dict]:
        """
        키워드로 네이버 뉴스를 검색하여 기사 목록을 반환합니다.

        반환 형식 (기사 1건):
            {
                "title"       : 기사 제목 (HTML 태그 제거 후)   ← 메모리에서만 사용
                "description" : 기사 요약 (HTML 태그 제거 후)   ← 메모리에서만 사용
                "url"         : 기사 원문 URL
                "published_at": 발행 시각 (datetime, timezone 포함)
            }
        """
        headers = {
            "X-Naver-Client-Id":     NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
        }

        params = {
            "query":   keyword,
            "display": 30,      # 한 번에 최대 30건 수집 (API 최대값)
            "sort":    "date"   # 최신 기사 우선 정렬
        }

        response = requests.get(self.NAVER_URL, headers=headers, params=params, timeout=10)
        data = response.json()

        articles = []
        for item in data.get("items", []):
            articles.append({
                "title":        _clean_html(item.get("title", "")),        # 메모리 분석용 (DB 저장 안 함)
                "description":  _clean_html(item.get("description", "")),  # 메모리 분석용 (DB 저장 안 함)
                "url":          item.get("link"),
                "published_at": datetime.strptime(item["pubDate"], "%a, %d %b %Y %H:%M:%S %z")
            })

        return articles