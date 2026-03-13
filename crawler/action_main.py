# crawler/action_main.py
from workers.action_recommendation_worker import run_action_worker

if __name__ == "__main__":
    run_action_worker()