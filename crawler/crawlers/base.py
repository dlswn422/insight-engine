"""
base.py

- 모든 크롤러의 공통 인터페이스 정의
- 확장 대비용 (Google, Daum 추가 가능)
"""

from abc import ABC, abstractmethod


class BaseCrawler(ABC):
    """
    모든 크롤러는 반드시 fetch_articles를 구현해야 함
    """

    @abstractmethod
    def fetch_articles(self, keyword: str):
        pass