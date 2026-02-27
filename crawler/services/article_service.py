"""
article_service.py

- 기사 처리 로직
- 본문 수집
- 전처리 (HTML 제거, 공백 정리)
- 해시 생성
- DB 저장 호출
"""

import hashlib
import re
import requests
from bs4 import BeautifulSoup
from repositories.article_repository import (
    article_exists,
    insert_article
)


# ==============================
# 유틸 함수
# ==============================

def clean_html_tags(text: str) -> str:
    """
    HTML 태그 제거
    """
    return re.sub(r'<.*?>', '', text)


def normalize_whitespace(text: str) -> str:
    """
    불필요한 공백, 줄바꿈 정리
    """
    return ' '.join(text.split())


def remove_unwanted_sections(soup: BeautifulSoup):
    """
    script, style 등 불필요 태그 제거
    """
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return soup


def generate_hash(content: str) -> str:
    """
    정제된 기사 내용 기반 SHA256 해시 생성
    중복 방지용
    """
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


# ==============================
# 본문 수집
# ==============================

def fetch_article_content(url: str):
    """
    기사 본문 수집
    - HTML 제거
    - script/style 제거
    - 텍스트 정제
    """

    try:
        res = requests.get(
            url,
            timeout=5,
            headers={
                "User-Agent": "Mozilla/5.0"
            }
        )

        soup = BeautifulSoup(res.text, "html.parser")

        # 불필요 태그 제거
        soup = remove_unwanted_sections(soup)

        # 전체 텍스트 추출
        text = soup.get_text(separator=" ")

        # HTML 태그 제거 (이중 안전)
        text = clean_html_tags(text)

        # 공백 정리
        text = normalize_whitespace(text)

        return text

    except Exception as e:
        print(f"본문 수집 실패: {url} / {e}")
        return None


# ==============================
# 메인 처리 함수
# ==============================

def process_article(article: dict):
    """
    1. URL 기준 중복 검사
    2. 본문 수집 + 전처리
    3. 너무 짧은 기사 필터링
    4. 해시 생성
    5. DB 저장
    """

    # 1️⃣ URL 중복 검사
    if article_exists(article["url"]):
        return None

    # 2️⃣ 본문 수집
    content = fetch_article_content(article["url"])
    if not content:
        return None

    # 3️⃣ 너무 짧은 기사 제거 (단신/광고 방지)
    if len(content) < 500:
        print("⚠️ 너무 짧은 기사 스킵")
        return None

    # 4️⃣ 정제된 본문 기준 해시 생성
    content_hash = generate_hash(content)

    # 5️⃣ DB 저장 데이터 구성
    data = {
        "title": clean_html_tags(article["title"]),  # 제목도 정제
        "content": content,
        "url": article["url"],
        "published_at": article["published_at"].isoformat(),
        "content_hash": content_hash
    }

    result = insert_article(data)

    if result.data:
        return result.data[0]

    return None