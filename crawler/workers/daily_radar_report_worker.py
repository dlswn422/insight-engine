"""
daily_radar_report_worker.py

- company_scores 기반 Top Risk / Top Opportunity 요약
- signals(최근 30일) 기반 트렌드 집계(파이썬에서)
- LLM(JSON)로 데일리 리포트 생성
- daily_opportunity_reports(report_date)로 upsert

필수 env:
- OPENAI_API_KEY

선택 env:
- REPORT_MODEL (기본 gpt-4o-mini)
- REPORT_TEMPERATURE (기본 0.4)
- REPORT_TIMEOUT (기본 60)
- REPORT_SIGNALS_LOOKBACK_DAYS (기본 30)
- REPORT_TRENDS_TOPN (기본 10)
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Tuple

from repositories.db import supabase
from llm.openai_compat import chat_completions_json


# ---- helpers ----
def _kst_today() -> date:
    return (datetime.utcnow() + timedelta(hours=9)).date()


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


def _raw_score(sig: Dict[str, Any]) -> float:
    try:
        return float(sig.get("impact_strength") or 0) * float(sig.get("severity_level") or 0) * float(sig.get("confidence") or 0)
    except Exception:
        return 0.0


def _get_top_companies() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    top_risk = (
        supabase.table("company_scores")
        .select("company_name,risk_score,risk_delta,risk_level,momentum_score,updated_at")
        .order("risk_score", desc=True)
        .limit(5)
        .execute()
        .data
        or []
    )
    top_opp = (
        supabase.table("company_scores")
        .select("company_name,opportunity_score,opportunity_delta,opportunity_level,momentum_score,updated_at")
        .order("opportunity_score", desc=True)
        .limit(5)
        .execute()
        .data
        or []
    )
    return top_risk, top_opp


def _get_trends() -> List[Dict[str, Any]]:
    lookback_days = int(os.getenv("REPORT_SIGNALS_LOOKBACK_DAYS") or "30")
    topn = int(os.getenv("REPORT_TRENDS_TOPN") or "10")
    since = (datetime.utcnow() - timedelta(days=lookback_days)).isoformat()

    # NOTE: group by가 없으니 파이썬에서 집계
    rows = (
        supabase.table("signals")
        .select("company_name,impact_type,impact_strength,severity_level,confidence,signal_category,industry_tag,trend_bucket,created_at,event_type")
        .gte("created_at", since)
        .limit(5000)
        .execute()
        .data
        or []
    )

    agg: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
    for s in rows:
        key = (
            str(s.get("industry_tag") or "General"),
            str(s.get("trend_bucket") or "Momentum"),
            str(s.get("signal_category") or "Risk"),
        )
        a = agg.setdefault(
            key,
            {
                "industry_tag": key[0],
                "trend_bucket": key[1],
                "signal_category": key[2],
                "count": 0,
                "risk_raw_sum": 0.0,
                "opp_raw_sum": 0.0,
                "examples": [],
            },
        )
        a["count"] += 1
        raw = _raw_score(s)
        if (s.get("impact_type") or "").lower() == "risk":
            a["risk_raw_sum"] += raw
        else:
            a["opp_raw_sum"] += raw

        # 예시(중복 너무 많으면 2개까지만)
        if len(a["examples"]) < 2:
            et = str(s.get("event_type") or "").strip()
            cname = str(s.get("company_name") or "").strip()
            if et:
                a["examples"].append(f"{cname}: {et}")

    # 정렬 기준: (risk+opp) raw 총합 + count
    trends = list(agg.values())
    trends.sort(key=lambda x: (x["risk_raw_sum"] + x["opp_raw_sum"], x["count"]), reverse=True)
    return trends[:topn]


def _build_prompt(report_date: str, top_risk: List[Dict[str, Any]], top_opp: List[Dict[str, Any]], trends: List[Dict[str, Any]]) -> str:
    return f"""
너는 B2B 인텔리전스 데일리 리포트 작성자다.
오늘({report_date}) 기준으로 아래 데이터를 바탕으로 데일리 리포트를 JSON으로 작성하라.

[Top Risk Companies]
{top_risk}

[Top Opportunity Companies]
{top_opp}

[Top Trends (last {os.getenv("REPORT_SIGNALS_LOOKBACK_DAYS") or "30"} days)]
{trends}

요구사항:
- 반드시 JSON만 반환 (설명/마크다운 금지)
- 아래 스키마를 정확히 지켜라
- 문장은 과장하지 말고 근거 기반으로 작성

출력 스키마:
{{
  "report_date": "{report_date}",
  "industry_summary": "오늘 시장/산업 요약 4~6문장",
  "top_trends": [
    {{
      "industry_tag": "...",
      "trend_bucket": "...",
      "signal_category": "...",
      "why_it_matters": "왜 중요한지 1~2문장",
      "examples": ["회사: 이벤트", "회사: 이벤트"]
    }}
  ],
  "risk_watchlist": [
    {{
      "company_name": "...",
      "risk_score": 0~100,
      "risk_delta": -100~100,
      "key_risks": ["리스크 요약 1", "리스크 요약 2"],
      "recommended_action": "이번주 권고 액션 1문장"
    }}
  ],
  "opportunity_moves": [
    {{
      "company_name": "...",
      "opportunity_score": 0~100,
      "opportunity_delta": -100~100,
      "key_opportunities": ["기회 요약 1", "기회 요약 2"],
      "recommended_action": "이번주 권고 액션 1문장"
    }}
  ],
  "overall_strategy": "전체적으로 우리가 취해야 할 우선순위/방향 3~5문장"
}}
""".strip()


def run_daily_radar_report() -> None:
    print("🚀 Daily Radar Report 시작")

    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        print("⚠️ OPENAI_API_KEY가 없어 리포트 생성 스킵")
        return

    report_date = _kst_today().isoformat()
    top_risk, top_opp = _get_top_companies()
    trends = _get_trends()

    model = (os.getenv("REPORT_MODEL") or "gpt-4o-mini").strip()
    temperature = float(os.getenv("REPORT_TEMPERATURE") or "0.4")
    timeout = int(os.getenv("REPORT_TIMEOUT") or "60")

    prompt = _build_prompt(report_date, top_risk, top_opp, trends)

    try:
        report_json = chat_completions_json(
            messages=[
                {"role": "system", "content": "Return only valid JSON. No markdown."},
                {"role": "user", "content": prompt},
            ],
            model=model,
            temperature=temperature,
            timeout=timeout,
            max_output_tokens=1600,  # openai_compat에서 max_tokens로 매핑됨
            response_format_json=True,
        )
    except Exception as e:
        print("❌ Report 생성 실패:", e)
        return

    # DB 저장(하루 1개 upsert)
    row = {
        "report_date": report_date,
        "summary": report_json,  # jsonb 컬럼이면 그대로 / text면 자동 stringify될 수 있음(환경에 따라)
    }

    try:
        _safe_upsert("daily_opportunity_reports", ["report_date"], row)
        print("✅ Daily Radar Report 완료")
    except Exception as e:
        print("❌ DB 저장 실패:", e)