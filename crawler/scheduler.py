"""
scheduler.py

- 1시간 간격 무한 반복 실행
"""

import time
from config import CRAWL_INTERVAL
from services.crawler_service import run_crawler

if __name__ == "__main__":
    while True:
        run_crawler()
        print(f"⏳ {CRAWL_INTERVAL}초 대기 중...")
        time.sleep(CRAWL_INTERVAL)