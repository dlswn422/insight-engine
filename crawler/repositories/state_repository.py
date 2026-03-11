from .db import supabase
from datetime import datetime, timezone


def get_last_crawled_at():
    result = (
        supabase
        .table("crawler_state")
        .select("last_crawled_at")
        .limit(1)
        .execute()
    )

    if result.data:
        dt = datetime.fromisoformat(result.data[0]["last_crawled_at"])

        # 🔥 timezone 제거 (naive로 통일)
        if dt.tzinfo:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)

        return dt

    return None


def update_last_crawled_at(timestamp: datetime):

    # 🔥 timestamp도 UTC naive로 저장
    if timestamp.tzinfo:
        timestamp = timestamp.astimezone(timezone.utc).replace(tzinfo=None)

    (
        supabase
        .table("crawler_state")
        .update({"last_crawled_at": timestamp.isoformat()})
        .eq("id", 1)
        .execute()
    )