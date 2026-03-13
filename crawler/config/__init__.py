"""
config/__init__.py

역할:
- 환경변수 로드 및 전역 설정 값 정의
- 기존 config.py를 config 패키지(__init__.py)로 이전

"""

import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# ==============================
# Supabase 설정
# ==============================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# ==============================
# Naver API 설정
# ==============================

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

# ==============================
# DART Open API 설정
# ==============================

DART_API_KEY = os.getenv("DART_API_KEY")

# ==============================
# OpenAI 설정
# ==============================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# ==============================
# 스케줄링 설정
# ==============================

CRAWL_INTERVAL = 60 * 60  # 1시간 (초 단위)
