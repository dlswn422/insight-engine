"""
파일 경로:
crawler/workers/signal_scout_worker.py

역할:
- articles 테이블에서 scout_status = pending 기사 조회
- GPT로 Signal 추출
- signals 테이블에 INSERT (signal_category 자동 세팅)
- articles 상태 업데이트
"""

from repositories.db import supabase
from analysis.signal_scout import extract_signals
from services.signal_classifier import get_signal_category
from datetime import datetime


def get_pending_articles(limit=5):
    """
    아직 Signal 처리되지 않은 기사 조회

    - scout_status = 'pending' 인 기사만 조회
    - limit는 한 번에 처리할 기사 수 (GPT 비용/안정성 고려)
    """
    result = (
        supabase
        .table("articles")
        .select("*")
        .eq("scout_status", "pending")
        .limit(limit)
        .execute()
    )
    return result.data


def update_article_status(article_id, status):
    """
    기사 상태 업데이트

    상태 흐름:
    pending → analyzing → done
    """
    (
        supabase
        .table("articles")
        .update({"scout_status": status})
        .eq("id", article_id)
        .execute()
    )


def insert_signal(article_id, signal):
    """
    signals 테이블에 이벤트 저장

    - signal_type 기반으로 signal_category 자동 분류
    - signal_strength / direction 그대로 저장
    """

    # 🔥 signal_type → category 자동 매핑
    category = get_signal_category(signal["signal_type"])

    data = {
        "article_id": article_id,
        "signal_type": signal["signal_type"],
        "signal_category": category,  # 자동 세팅
        "signal_strength": signal["signal_strength"],
        "impact_direction": signal["impact_direction"],
        "description": signal["description"],
        "event_date": signal.get("event_date"),
        "created_at": datetime.utcnow().isoformat()
    }

    (
        supabase
        .table("signals")
        .insert(data)
        .execute()
    )


def run_signal_scout():
    """
    Signal Scout 전체 실행 로직

    흐름:
    1. pending 기사 조회
    2. 상태 → analyzing
    3. GPT 호출
    4. signals INSERT
    5. 상태 → done
    """

    print("🚀 Signal Scout 시작")

    articles = get_pending_articles()

    for article in articles:

        # 상태 변경 → analyzing
        update_article_status(article["id"], "analyzing")

        # GPT로 Signal 추출
        result = extract_signals(article)

        # Signal 존재 시 DB 저장
        if result and "signals" in result:
            for sig in result["signals"]:
                insert_signal(article["id"], sig)

        # 상태 변경 → done
        update_article_status(article["id"], "done")

    print("✅ Signal Scout 종료")