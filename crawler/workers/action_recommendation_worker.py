"""
action_recommendation_worker.py

- company_scores 기반으로 대상 회사 선정(HIGH 우선, 없으면 fallback TOP N)
- 최근 signals(근거) + 점수 요약을 LLM에 전달해 actions 3개 생성
- action_recommendations에 upsert

요구 env:
- OPENAI_API_KEY

선택 env:
- ACTION_MODEL (기본 gpt-4o-mini)
- ACTION_TEMPERATURE (기본 0.4)
- ACTION_TIMEOUT (기본 60)
- ACTION_FALLBACK_TOPN (기본 10)
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from repositories.db import supabase
from llm.openai_compat import chat_completions_json


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _safe_upsert(table: str, key_cols: List[str], row: Dict[str, Any]) -> None:
    q = supabase.table(table).select(",".join(key_cols))
    for k in key_cols:
        q = q.eq(k, row[k])
    existing = q.limit(1).execute().data or []

    if existing:
        uq = supabase.table(table).update(row)
        for k in key_cols:
            uq = uq.eq(k, row[k])
        uq.execute()
    else:
        supabase.table(table).insert(row).execute()


def _get_target_companies() -> List[Dict[str, Any]]:
    # 1) HIGH 우선
    high = (
        supabase.table("company_scores")
        .select("company_name,risk_score,opportunity_score,risk_level,opportunity_level,risk_delta,opportunity_delta,momentum_score,updated_at")
        .or_("risk_level.eq.HIGH,opportunity_level.eq.HIGH")
        .order("momentum_score", desc=True)
        .limit(50)
        .execute()
        .data
        or []
    )
    if high:
        return [{"mode": "HIGH", **r} for r in high]

    # 2) fallback: TOP N by max(risk_score, opportunity_score, momentum_score)
    topn = int(os.getenv("ACTION_FALLBACK_TOPN") or "10")
    rows = (
        supabase.table("company_scores")
        .select("company_name,risk_score,opportunity_score,risk_level,opportunity_level,risk_delta,opportunity_delta,momentum_score,updated_at")
        .order("momentum_score", desc=True)
        .limit(topn)
        .execute()
        .data
        or []
    )
    return [{"mode": "FALLBACK_TOP", **r} for r in rows]


def _get_drivers(company_name: str, days: int = 14, limit: int = 15) -> List[Dict[str, Any]]:
    # 최근 N일 signals 근거(중요도: impact*severity*confidence)
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    rows = (
        supabase.table("signals")
        .select("article_id,event_type,impact_type,impact_strength,severity_level,confidence,signal_category,industry_tag,trend_bucket,created_at")
        .eq("company_name", company_name)
        .gte("created_at", since)
        .execute()
        .data
        or []
    )

    def contrib(r: Dict[str, Any]) -> float:
        try:
            return float(r.get("impact_strength") or 0) * float(r.get("severity_level") or 0) * float(r.get("confidence") or 0)
        except Exception:
            return 0.0

    rows.sort(key=contrib, reverse=True)
    drivers = []
    for r in rows[:limit]:
        drivers.append(
            {
                "event_type": r.get("event_type"),
                "impact_type": r.get("impact_type"),
                "impact_strength": r.get("impact_strength"),
                "severity_level": r.get("severity_level"),
                "confidence": r.get("confidence"),
                "signal_category": r.get("signal_category"),
                "industry_tag": r.get("industry_tag"),
                "trend_bucket": r.get("trend_bucket"),
                "created_at": r.get("created_at"),
                "article_id": r.get("article_id"),
            }
        )
    return drivers


def _should_regenerate(company_name: str, mode: str) -> bool:
    # 최근 전략이 있으면 48시간 내 재생성 제한(스파이크는 예외로 하고 싶으면 여기에 조건 추가)
    existing = (
        supabase.table("action_recommendations")
        .select("updated_at")
        .eq("company_name", company_name)
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not existing:
        return True

    try:
        updated_at = existing[0]["updated_at"]
        dt = datetime.fromisoformat(str(updated_at).replace("Z", "+00:00"))
        if datetime.utcnow() - dt.replace(tzinfo=None) < timedelta(hours=48):
            # HIGH가 아닌 fallback일 경우엔 더 엄격하게 재생성 안 함
            if mode != "HIGH":
                return False
            # HIGH라도 48시간 내면 기본적으로 재생성 안 함
            return False
    except Exception:
        return True

    return True


def _build_prompt(company: Dict[str, Any], drivers: List[Dict[str, Any]]) -> str:
    cname = company["company_name"]
    risk_score = float(company.get("risk_score") or 0)
    opp_score = float(company.get("opportunity_score") or 0)
    risk_delta = float(company.get("risk_delta") or 0)
    opp_delta = float(company.get("opportunity_delta") or 0)
    momentum = float(company.get("momentum_score") or 0)

    return f"""
너는 B2B 영업/전략 컨설턴트다.
아래 회사의 최근 뉴스/신호 기반으로 "이번주 실행 액션" 3개를 제안하라.

[회사]
- company_name: {cname}
- risk_score: {risk_score:.1f} / risk_delta: {risk_delta:.1f}
- opportunity_score: {opp_score:.1f} / opportunity_delta: {opp_delta:.1f}
- momentum_score: {momentum:.1f}

[근거 신호 Top]
{drivers}

요구사항:
- 반드시 JSON만 반환
- actions는 3개
- 각 action은 다음 필드를 포함:
  - title: 한 줄
  - owner: "영업"|"품질"|"CS"|"마케팅"|"경영"
  - timeline: "즉시"|"1주"|"1개월"
  - expected_impact: 한 줄
  - evidence: 근거 signal의 event_type 1~2개

출력 스키마:
{{
  "actions":[
    {{
      "title":"...",
      "owner":"영업",
      "timeline":"1주",
      "expected_impact":"...",
      "evidence":["...","..."]
    }}
  ]
}}
""".strip()


def _generate_actions(company: Dict[str, Any], drivers: List[Dict[str, Any]]) -> Dict[str, Any]:
    model = (os.getenv("ACTION_MODEL") or "gpt-4o-mini").strip()
    temperature = float(os.getenv("ACTION_TEMPERATURE") or "0.4")
    timeout = int(os.getenv("ACTION_TIMEOUT") or "60")

    prompt = _build_prompt(company, drivers)
    return chat_completions_json(
        messages=[
            {"role": "system", "content": "Return only valid JSON. No markdown."},
            {"role": "user", "content": prompt},
        ],
        model=model,
        temperature=temperature,
        timeout=timeout,
        max_output_tokens=1200,
        response_format_json=True,
    )


def run_action_worker() -> None:
    print("🚀 Action Worker 시작")

    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        print("⚠️ OPENAI_API_KEY가 없어 Action 생성 스킵")
        print("🏁 Action Worker 종료")
        return

    targets = _get_target_companies()
    if not targets:
        print("📊 대상 기업 수: 0 (company_scores 비어있음)")
        print("🏁 Action Worker 종료")
        return

    mode = targets[0].get("mode", "UNKNOWN")
    print(f"📊 대상 기업 수: {len(targets)} (mode={mode})")

    for c in targets:
        cname = c["company_name"]
        mode = c.get("mode", "UNKNOWN")

        if not _should_regenerate(cname, mode):
            continue

        drivers = _get_drivers(cname, days=14, limit=15)
        if not drivers:
            # 근거 없으면 전략 생성 의미가 낮아서 skip (원하면 fallback 문구 생성도 가능)
            continue

        try:
            out = _generate_actions(c, drivers)
            actions = out.get("actions") or []
            if not isinstance(actions, list) or len(actions) == 0:
                continue

            # rolling 값도 같이 저장(프론트 카드에 재사용)
            rolling = (
                supabase.table("company_signal_rolling")
                .select("risk_7d,risk_30d,opp_7d,opp_30d,momentum_score")
                .eq("company_name", cname)
                .limit(1)
                .execute()
                .data
                or []
            )
            rolling0 = rolling[0] if rolling else {}

            row = {
                "company_name": cname,
                "actions": {"actions": actions},  # jsonb
                "updated_at": _now_iso(),
                "strategy_type": "news_signal",
                "trigger_type": "high_or_fallback",
                "confidence_score": float(sum(float(d.get("confidence") or 0) for d in drivers) / max(len(drivers), 1)),
                "momentum_score": float(c.get("momentum_score") or rolling0.get("momentum_score") or 0),
                "risk_7d": rolling0.get("risk_7d"),
                "risk_30d": rolling0.get("risk_30d"),
                "opp_7d": rolling0.get("opp_7d"),
                "opp_30d": rolling0.get("opp_30d"),
            }

            _safe_upsert("action_recommendations", ["company_name"], row)

        except Exception as e:
            print(f"❌ Action 생성 실패: {cname} / {e}")

    print("🏁 Action Worker 종료")