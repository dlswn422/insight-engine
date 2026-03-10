"""
article_service.py (B안 강화: title/description DB 저장 X)

- URL 중복 검사
- DB에는 메타만 저장 (title/content는 빈 문자열)
- content_hash는 url+published_at 기반으로 생성
- scout_status는 즉시 분석 전제로 done 처리
"""

import hashlib
from repositories.article_repository import article_exists, insert_article


def generate_hash(url: str, published_at_iso: str) -> str:
    base = f"{url}|{published_at_iso}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def process_article(article: dict):
    """
    1) URL 중복 검사
    2) 메타-only row를 articles에 insert
       - title/content는 "" (DB NOT NULL 대응)
       - raw_data에는 텍스트(title/description) 넣지 않음
       - scout_status='done' (즉시 분석 파이프라인)
    """
    url = article.get("url")
    if not url:
        return None

    if article_exists(url):
        return None

    published_at_iso = article["published_at"].isoformat()
    content_hash = generate_hash(url, published_at_iso)

    data = {
        "title": "",                      # ✅ DB에 제목 저장 X (NOT NULL 대응)
        "content": "",                    # ✅ DB에 요약/원문 저장 X (NOT NULL 대응)
        "url": url,
        "published_at": published_at_iso,
        "content_hash": content_hash,
        "scout_status": "done",           # ✅ 즉시 분석 전제로 done
        "raw_data": {                     # ✅ 메타만(텍스트 금지)
            "source": "naver_search_api",
            # 필요하면 키워드/언론사 같은 메타만 추가 가능
        }
    }

    result = insert_article(data)
    if getattr(result, "data", None):
        return result.data[0]
    return None