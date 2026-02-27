"""
Signal Scout Worker (Market Radar 확장 버전)

역할:
<<<<<<< HEAD
- articles 테이블에서 scout_status = pending 기사 조회
- [Step 1] is_relevant_article: 이진 분류기로 관련성 먼저 판별
  → False: scout_status = 'irrelevant' 로 마킹 후 종료 (무한 루프 방지)
  → True : [Step 2] extract_signals 로 무거운 시그널 추출 진행
- signals 테이블에 INSERT
- articles 상태 업데이트
=======
- pending 기사 조회
- GPT로 구조화된 산업 Signal 추출
- signals 테이블에 upsert (중복 방어)
- companies 존재 보장
- 기사 상태 완료 처리

확장된 필드:
- signal_category
- industry_tag
- trend_bucket
- severity_level
>>>>>>> main
"""

from repositories.db import supabase
from analysis.analyzer import is_relevant_article
from analysis.signal_scout import extract_signals
from datetime import datetime


# ---------------------------------------------------
# 1️⃣ pending 기사 조회
# ---------------------------------------------------
def get_pending_articles(limit=5):
    """
    scout_status = pending 기사 조회
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


# ---------------------------------------------------
# 2️⃣ 기사 상태 업데이트
# ---------------------------------------------------
def update_article_status(article_id, status):
    """
<<<<<<< HEAD
    기사 상태 업데이트

    상태 흐름:
    pending → analyzing → done         (관련 기사 정상 처리)
    pending → irrelevant                (Step 1 이진 분류기에서 탈락)
=======
    기사 상태 변경
    pending → analyzing → done
>>>>>>> main
    """
    supabase.table("articles") \
        .update({"scout_status": status}) \
        .eq("id", article_id) \
        .execute()


# ---------------------------------------------------
# 3️⃣ 기업 존재 보장
# ---------------------------------------------------
def ensure_company_exists(company_name):
    """
    companies 테이블에 기업이 없으면 생성
    점수는 저장하지 않음 (signals 기반 집계)
    """
    existing = (
        supabase
        .table("companies")
        .select("id")
        .eq("company_name", company_name)
        .execute()
    )

    if not existing.data:
        supabase.table("companies").insert({
            "company_name": company_name,
            "created_at": datetime.utcnow().isoformat()
        }).execute()


# ---------------------------------------------------
# 4️⃣ Signal 저장 (중복 방어 + 확장 필드)
# ---------------------------------------------------
def insert_signal_safe(article_id, sig):
    """
    확장된 signals 저장
    UNIQUE(article_id, company_name, event_type) 기반 upsert
    """

    data = {
        "article_id": article_id,
        "company_name": sig["company_name"],
        "event_type": sig["event_type"],
        "impact_type": sig["impact_type"],
        "impact_strength": sig["impact_strength"],
        "signal_category": sig.get("signal_category"),
        "industry_tag": sig.get("industry_tag"),
        "trend_bucket": sig.get("trend_bucket"),
        "severity_level": sig.get("severity_level"),
        "confidence": sig.get("confidence", 0.8),
        "created_at": datetime.utcnow().isoformat()
    }

    supabase.table("signals").upsert(
        data,
        on_conflict="article_id,company_name,event_type"
    ).execute()


# ---------------------------------------------------
# 5️⃣ 전체 실행
# ---------------------------------------------------
def run_signal_scout():
<<<<<<< HEAD
    """
    Signal Scout 전체 실행 로직 (2단계 프롬프트 체이닝)

    [Step 1] is_relevant_article: 이진 분류기
      → False → scout_status = 'irrelevant' 마킹 후 SKIP
               (pending 그대로 두면 다음 루프에서 무한 재분석 치명적 에러 발생!)
      → True  → Step 2 진행

    [Step 2] extract_signals: 무거운 시그널 추출 프롬프트
      → signals 테이블에 저장
      → scout_status = 'done' 으로 마킹
    """

    print("🚀 Signal Scout 시작")
=======

    print("🚀 Signal Scout 시작 (Market Radar 확장)")
>>>>>>> main

    articles = get_pending_articles()

    if not articles:
        print("📭 처리할 pending 기사 없음")
        return

    for article in articles:
<<<<<<< HEAD
        article_id = article["id"]
        title = article.get("title", "")
        content = article.get("content", "")

        print(f"\n📰 처리 중: {title[:50]}...")

        # ============================================================
        # [Step 1] 이진 분류기 - 관련 기사 여부 먼저 판별
        # ============================================================
        relevant = is_relevant_article(title, content)

        if not relevant:
            # ❌ 관련 없는 기사 → 'irrelevant' 마킹 후 SKIP
            # ⚠️ 이 업데이트를 빠뜨리면 pending 상태가 유지되어
            #    다음 루프에서 동일 기사를 무한히 재분석하는 버그 발생!
            print(f"  ⏭️ 관련 없는 기사 → scout_status = 'irrelevant' 마킹")
            update_article_status(article_id, "irrelevant")
            continue

        # ============================================================
        # [Step 2] 관련 기사 → 무거운 시그널 추출 프롬프트 실행
        # ============================================================
        print(f"  ✅ 관련 기사 확인 → 시그널 추출 시작")

        # 상태 변경 → analyzing
        update_article_status(article_id, "analyzing")
=======
        try:
            update_article_status(article["id"], "analyzing")

            result = extract_signals(article)
>>>>>>> main

            if not result or "signals" not in result:
                update_article_status(article["id"], "done")
                continue

            for sig in result["signals"]:
<<<<<<< HEAD
                insert_signal(article_id, sig)
            print(f"  💡 시그널 {len(result['signals'])}건 저장 완료")
        else:
            print(f"  ℹ️ 시그널 없음 (GPT 결과 비어있음)")

        # 상태 변경 → done
        update_article_status(article_id, "done")
=======

                if sig.get("confidence", 1) < 0.7:
                    continue

                ensure_company_exists(sig["company_name"])
                insert_signal_safe(article["id"], sig)

            update_article_status(article["id"], "done")

        except Exception as e:
            print("❌ 처리 실패:", e)
            update_article_status(article["id"], "pending")
>>>>>>> main

    print("\n✅ Signal Scout 종료")