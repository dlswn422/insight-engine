"""
파일 경로:
crawler/signal_main.py

역할:
- Signal Scout Worker 실행 엔트리 포인트
"""

from workers.signal_scout_worker import run_signal_scout

if __name__ == "__main__":
    run_signal_scout()