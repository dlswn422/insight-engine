import requests
from datetime import datetime
import re

from config import NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
from .base import BaseCrawler


def _clean_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<.*?>", "", text)
    return " ".join(text.split())


class NaverNewsCrawler(BaseCrawler):
    NAVER_URL = "https://openapi.naver.com/v1/search/news.json"

    def fetch_articles(self, keyword: str):
        headers = {
            "X-Naver-Client-Id": NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
        }

        params = {
            "query": keyword,
            "display": 30,
            "sort": "date"
        }

        response = requests.get(self.NAVER_URL, headers=headers, params=params, timeout=10)
        data = response.json()

        articles = []
        for item in data.get("items", []):
            articles.append({
                "title": _clean_html(item.get("title", "")),                 # 메모리에서만 사용
                "description": _clean_html(item.get("description", "")),     # 메모리에서만 사용
                "url": item.get("link"),
                "published_at": datetime.strptime(item["pubDate"], "%a, %d %b %Y %H:%M:%S %z")
            })

        return articles