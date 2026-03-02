"""
파일 경로:
crawler/daily_radar_main.py

역할:
- Daily Radar Report Worker 실행 엔트리 포인트
- 하루 1회 실행용
- cron 스케줄러에서 호출하는 파일
"""

from workers.daily_radar_report_worker import run_daily_radar_report


if __name__ == "__main__":
    run_daily_radar_report()