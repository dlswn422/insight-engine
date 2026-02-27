"""
keyword_service.py

- 기사 내용 기반 고객사 키워드 매칭
"""

from repositories.keyword_repository import (
    get_keywords,
    insert_article_customer_map
)


def match_keywords(article: dict):
    """
    기사 내용에 등록된 키워드가 포함되어 있으면
    article_customer_map에 저장
    """

    keywords = get_keywords()
    content = article["content"]

    for kw in keywords:
        if kw["keyword"] in content:
            insert_article_customer_map({
                "article_id": article["id"],
                "customer_id": kw["customer_id"],
                "matched_keyword": kw["keyword"]
            })