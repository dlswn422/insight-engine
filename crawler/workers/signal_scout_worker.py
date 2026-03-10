"""
workers/signal_scout_worker.py — 미처리 뉴스 기사 LLM 재분석 워커

역할:
    - articles 테이블에서 scout_status='pending'인 기사를 꺼내서 시그널을 추출합니다.
    - crawler_service.py는 뉴스 수집과 동시에 메모리에서 LLM 분석을 즉시 처리합니다.
      이 워커는 어떤 이유로 분석이 누락된 기사를 사후에 재처리하기 위한 보조 도구입니다.

⚠️ 주의: articles 테이블에 title/content가 저장되지 않으므로 (저작권 정책)
    이 워커를 실행해도 분석할 내용이 없는 경우가 대부분입니다.
    현재는 legacy 용도로 남겨두며, crawler_service.py의 즉석 분석이 주 경로입니다.

함수 재사용:
    중복 코드 방지를 위해 instant_signal_service.py의 공통 함수를 사용합니다.
    (make_event_hash, should_promote_to_potential, upsert_signal, upsert_general_company)
"""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from repositories.db import supabase
from analysis.signal_scout import extract_signals
from services.instant_signal_service import (
    CONF_SIGNAL_SAVE,
    upsert_signal,
    upsert_general_company,
    should_promote_to_potential,
)


# ---------------------------------------------------
# 1) pending 기사 조회 (최신부터)
# ---------------------------------------------------
def get_pending_articles(limit: int = 20) -> list[dict]:
    """
    아직 시그널 분석이 완료되지 않은 기사를 가져옵니다.
    ⚠️  articles.title / content가 비어있으면 LLM에 전달할 내용이 없습니다.
    """
    result = (
        supabase
        .table("articles")
        .select("id,title,content,created_at")
        .eq("scout_status", "pending")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ---------------------------------------------------
# 2) 기사 상태 업데이트
# ---------------------------------------------------
def update_article_status(article_id: str, status: str) -> None:
    (
        supabase
        .table("articles")
        .update({"scout_status": status})
        .eq("id", article_id)
        .execute()
    )


# ---------------------------------------------------
# 3) 전체 실행
# ---------------------------------------------------
def run_signal_scout(limit: int = 20) -> None:
    print("🚀 Signal Scout 시작")
    print("⚠️  참고: articles 테이블에 title/content가 없으면 분석 대상이 없을 수 있습니다.")
    print("   주 분석 경로는 crawler_service.py의 즉석(메모리) 분석입니다.\n")

    articles = get_pending_articles(limit=limit)
    if not articles:
        print("✅ pending 기사 없음")
        return

    for article in articles:
        aid = article["id"]

        # title/content가 비어 있으면 스킵합니다.
        if not article.get("title") and not article.get("content"):
            print(f"⏭️  스킵 (내용 없음): {aid}")
            update_article_status(aid, "done")
            continue

        try:
            update_article_status(aid, "analyzing")

            result = extract_signals(article) or {}
            signals = result.get("signals", []) or []

            saved_cnt    = 0
            promoted_cnt = 0

            for sig in signals:
                if float(sig.get("confidence", 1)) < CONF_SIGNAL_SAVE:
                    continue

                # instant_signal_service의 공통 함수 사용 (중복 코드 제거)
                upsert_signal(aid, sig, source="news")
                saved_cnt += 1

                if should_promote_to_potential(sig):
                    upsert_general_company(sig.get("company_name", ""))
                    promoted_cnt += 1

            update_article_status(aid, "done")
            print(f"✅ done: {aid} (signals={saved_cnt}, general_added={promoted_cnt})")

        except Exception as e:
            print("❌ 처리 실패:", aid, e)
            update_article_status(aid, "pending")

    print("✅ Signal Scout 종료")


if __name__ == "__main__":
    run_signal_scout()