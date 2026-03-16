"""
crawler/config/__init__.py

역할:
- crawler 전체 환경설정의 단일 진실 원천(Single Source of Truth)
- crawler/.env를 명시적으로 로드
- 외부 서비스 키 및 공통 설정 상수 제공

주의:
- 다른 설정 파일로 분산하지 말고, 공통 환경변수는 이 파일에서만 관리합니다.
- 하위 세부 설정(예: DART 키워드)은 config/dart_keywords.py에서 관리합니다.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# crawler/.env를 현재 파일 위치 기준으로 명시적으로 로드
_BASE_DIR = Path(__file__).resolve().parent.parent
_ENV_PATH = _BASE_DIR / ".env"
load_dotenv(dotenv_path=_ENV_PATH)


# =============================================================================
# Supabase
# =============================================================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


# =============================================================================
# Naver API
# =============================================================================
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")


# =============================================================================
# DART Open API
# =============================================================================
DART_API_KEY = os.getenv("DART_API_KEY")


# =============================================================================
# OpenAI
# =============================================================================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


# =============================================================================
# Scheduler / Common Runtime
# =============================================================================
CRAWL_INTERVAL = 60 * 60  # 1시간 (초 단위)


__all__ = [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "NAVER_CLIENT_ID",
    "NAVER_CLIENT_SECRET",
    "DART_API_KEY",
    "OPENAI_API_KEY",
    "CRAWL_INTERVAL",
]