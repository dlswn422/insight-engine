"""
customer_matcher.py

- 기사 내용 기반 고객사 자동 매핑
- customers 테이블 기준으로 매칭
"""

from repositories.keyword_repository import (
    get_customers,
    insert_article_customer_map,
    article_customer_map_exists
)


def match_customers(article: dict):
    """
    기사 내용에 고객사명이 포함되어 있으면
    article_customer_map에 저장
    """

    customers = get_customers()
    content = article["content"]

    for customer in customers:

        company_name = customer["name"]

        # 단순 포함 매칭 (나중에 정규식/NER 가능)
        if company_name in content:

            # 중복 매핑 방지
            if not article_customer_map_exists(
                article["id"],
                customer["id"]
            ):

                insert_article_customer_map({
                    "article_id": article["id"],
                    "customer_id": customer["id"]
                })

                print(f"🔗 고객 매핑 완료: {company_name}")