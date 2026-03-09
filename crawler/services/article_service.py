"""
article_service.py (저작권 리스크 완화 버전)

- 기사 처리 로직
- ❌ 원문(본문) URL 접속/스크래핑 저장 제거
- ✅ 네이버 뉴스 API의 description/snippet(요약) + title만 저장
- 해시 생성(중복 방지)
- DB 저장 호출

주의:
- 이 버전은 DB에 "원문 전체 텍스트"를 저장하지 않습니다.
- LLM 분석은 title + content(요약)만으로 수행(정확도는 다소 낮아질 수 있음).
"""

import hashlib
import re
from repositories.article_repository import (
    article_exists,
    insert_article
)

# ==============================
# 유틸 함수
# ==============================

def clean_html_tags(text: str) -> str:
    """HTML 태그 제거"""
    if not text:
        return ""
    return re.sub(r"<.*?>", "", text)


def normalize_whitespace(text: str) -> str:
    """불필요한 공백, 줄바꿈 정리"""
    if not text:
        return ""
    return " ".join(text.split())


def generate_hash(content: str) -> str:
    """
    정제된 기사 내용 기반 SHA256 해시 생성 (중복 방지용)
    """
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def build_safe_content(article: dict) -> str:
    """
    원문 대신 저장할 '안전한 본문' 구성:
    - 네이버 검색 API의 description(요약) 우선 사용
    - 없으면 title만 사용
    """
    title = normalize_whitespace(clean_html_tags(article.get("title", "")))
    desc = normalize_whitespace(clean_html_tags(article.get("description", "")))  # ✅ 네이버 API 요약

    # description이 비어있으면 title로 대체
    if desc:
        # 너무 길면 과도 저장 방지(필요하면 숫자 조절)
        desc = desc[:600]
        return f"{title}\n\n{desc}".strip()

    return title.strip()


# ==============================
# 메인 처리 함수
# ==============================

def process_article(article: dict):
    """
    1. URL 기준 중복 검사
    2. (원문 스크래핑 X) description/snippet 기반 content 구성
    3. 너무 짧은 기사 필터링(요약이 너무 빈약한 것)
    4. 해시 생성
    5. DB 저장
    """

    url = article.get("url")
    if not url:
        return None

    # 1️⃣ URL 중복 검사
    if article_exists(url):
        return None

    # 2️⃣ (원문 수집 제거) 안전한 content 구성
    content = build_safe_content(article)
    if not content:
        return None

    # 3️⃣ 너무 짧은 기사 제거(요약이 거의 없는 경우)
    # - 원문을 저장하지 않으니 기준을 낮춤(기존 500 -> 80 정도)
    if len(content) < 80:
        print("⚠️ 요약이 너무 짧은 기사 스킵")
        return None

    # 4️⃣ 해시 생성: title+desc 기반 (중복 방지)
    content_hash = generate_hash(content)

    # 5️⃣ DB 저장 데이터 구성
    data = {
        "title": normalize_whitespace(clean_html_tags(article.get("title", ""))),
        "content": content,  # ✅ 원문이 아니라 요약/스니펫
        "url": url,
        "published_at": article["published_at"].isoformat(),
        "content_hash": content_hash,
    }

    result = insert_article(data)

    if getattr(result, "data", None):
        return result.data[0]

    return None