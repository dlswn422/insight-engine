"""
services/article_service.py — 기사 메타 저장 서비스

역할:
    - URL 중복 검사 후 신규 기사만 articles 테이블에 등록합니다.
    - 저작권/API 약관 준수를 위해 기사 제목과 본문은 DB에 저장하지 않습니다.
      (분석은 메모리에서 즉석으로 처리하며, DB에는 URL과 발행일만 남깁니다.)
    - scout_status를 'done'으로 설정합니다. (크롤링 즉시 분석하므로 pending 단계 없음)
"""

import hashlib
from repositories.article_repository import article_exists, insert_article


def generate_hash(url: str, published_at_iso: str) -> str:
    """
    중복 기사 판별을 위한 해시값을 생성합니다.
    URL과 발행 시각을 결합하여 SHA-256으로 변환합니다.
    """
    base = f"{url}|{published_at_iso}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def process_article(article: dict):
    """
    기사 1건을 처리하여 articles 테이블에 메타 정보만 저장합니다.

    처리 흐름:
        1) URL이 없으면 None 반환 (유효하지 않은 기사)
        2) 이미 수집한 URL이면 None 반환 (중복 기사)
        3) 신규 기사이면 URL, 발행일, content_hash만 INSERT
           - title, content는 빈 문자열로 저장 (DB NOT NULL 제약 대응)
           - 기사 원문은 즉석 분석 후 메모리에서 바로 버립니다.

    반환값:
        성공: DB에 저장된 기사 row dict (id 포함)
        실패 또는 중복: None
    """
    url = article.get("url")
    if not url:
        return None

    # 이미 수집된 URL이면 건너뜁니다.
    if article_exists(url):
        return None

    published_at_iso = article["published_at"].isoformat()
    content_hash = generate_hash(url, published_at_iso)

    data = {
        "title":        "",                      # 제목은 DB에 저장하지 않습니다. (저작권 보호)
        "content":      "",                      # 본문은 DB에 저장하지 않습니다. (저작권 보호)
        "url":          url,
        "published_at": published_at_iso,
        "content_hash": content_hash,
        "scout_status": "done",                  # 크롤링과 동시에 분석이 끝나므로 'done'으로 바로 저장
        "raw_data": {
            "source": "naver_search_api",        # 수집 출처 기록 (추후 확장 가능)
        }
    }

    result = insert_article(data)
    if getattr(result, "data", None):
        return result.data[0]
    return None