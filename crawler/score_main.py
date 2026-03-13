# score_main.py

from workers.score_batch_worker import (
    aggregate_daily_scores,
    compute_rolling_scores,
)


def run():
    print("=== Score Batch Job Started ===")

    aggregate_daily_scores()
    compute_rolling_scores()

    print("=== Score Batch Job Finished ===")


if __name__ == "__main__":
    run()