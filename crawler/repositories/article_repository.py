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
    기사 데이터 upsert (Race Condition 방지)
    URL을 고유 키로 사용하여 중복 시 무시
    
    [경고] DB에 UNIQUE 제약 조건이 없으면 동작하지 않습니다.
    Supabase SQL Editor에서 반드시 다음 쿼리를 실행하세요:
    ALTER TABLE articles ADD CONSTRAINT articles_url_key UNIQUE (url);
    """
    return (
        supabase
        .table("articles")
        .upsert(data, on_conflict="url", ignore_duplicates=True)
        .execute()
    )