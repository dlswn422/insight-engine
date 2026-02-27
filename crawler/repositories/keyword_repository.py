"""
keyword_repository.py

- keywords 테이블 접근 (수집용 키워드)
- article_customer_map 테이블 접근
- customers 기반 매핑 조회
"""

from .db import supabase


def get_keywords():
    """
    수집용 키워드 전체 조회
    (is_active = True 인 것만)
    """

    result = (
        supabase
        .table("keywords")
        .select("keyword")
        .eq("is_active", True)
        .execute()
    )

    return result.data


def get_customers():
    """
    고객사 전체 조회
    기사-고객 매핑용
    """

    result = (
        supabase
        .table("customers")
        .select("id, name")
        .execute()
    )

    return result.data