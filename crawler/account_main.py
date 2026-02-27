"""
Signal → Account → Risk Timeline 전체 실행
"""

from workers.account_mapper_worker import run_account_mapper
from workers.risk_timeline_worker import run_risk_timeline


if __name__ == "__main__":
    run_account_mapper()
    run_risk_timeline()