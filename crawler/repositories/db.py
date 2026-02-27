"""
db.py

- Supabase 연결 전용 파일
- DB 연결 객체를 한 곳에서만 생성

나중에 Supabase를 제거하고
직접 Postgres로 변경해도 이 파일만 수정하면 됩니다.
"""

from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

# Supabase 클라이언트 생성
# REST API 방식으로 DB 접근
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)