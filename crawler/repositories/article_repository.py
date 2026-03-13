"""
article_repository.py

- articles 테이블 관련 DB 작업 전용 파일
- 서비스 레이어에서는 직접 DB를 호출하지 않고
  반드시 이 파일을 통해 접근해야 함
"""

from .db import supabase


def article_exists(url: str) -> bool:
    """
    동일 URL 기사 존재 여부 확인
    중복 저장 방지 목적
    """
    result = (
        supabase
        .table("articles")
        .select("id")
        .eq("url", url)
        .execute()
    )

    return len(result.data) > 0


def insert_article(data: dict):
    """
    기사 데이터 insert
    data는 딕셔너리 형태
    """
    return (
        supabase
        .table("articles")
        .insert(data)
        .execute()
    )