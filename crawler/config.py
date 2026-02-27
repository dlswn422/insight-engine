"""
config.py

- 환경변수 로드
- 외부 서비스 키 관리
- 전역 설정 값 정의

이 파일은 '환경 설정 전용' 파일입니다.
다른 로직을 넣지 마세요.
"""

import os
from dotenv import load_dotenv
from pathlib import Path

# .env 파일 로드
# 반드시 crawler 폴더 바로 아래에 .env 위치해야 함
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# ==============================
# Supabase 설정
# ==============================

# Supabase REST API URL
SUPABASE_URL = os.getenv("SUPABASE_URL")

# Supabase publishable key
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# ==============================
# Naver API 설정
# ==============================

# (네이버 API 키는 사용하는 곳에서 직접 확인하거나, 필요 시에만 사용할 수 있도록 처리 권장)
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

# ==============================
# 스케줄링 설정
# ==============================

# 1시간 (초 단위)
CRAWL_INTERVAL = 60 * 60