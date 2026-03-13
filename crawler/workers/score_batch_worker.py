# crawler/workers/score_batch_worker.py
"""
signals -> company_signal_daily -> company_signal_rolling -> company_scores

v1.0:
- 단건 raw = impact_strength * severity_level * confidence
- rolling: 7d/30d, delta(최근7 - 이전7), momentum
- scores: 0~100 + level(HIGH/MED/LOW) + delta(스코어 단위)

env(선택):
- SCORE_K (기본 300)
- SCORE_HIGH_THRESHOLD (기본 70)
- SCORE_MED_THRESHOLD (기본 40)
- SCORE_TARGET_DATE=YYYY-MM-DD (테스트용)
- SCORE_TARGET_DAYS_AGO (기본 1)
"""

from __future__ import annotations

from datetime import datetime, timedelta, date
import math
import os
from typing import Any, Dict, List, Tuple

from repositories.db import supabase


def _kst_today() -> date:
    return (datetime.utcnow() + timedelta(hours=9)).date()


def _parse_iso_date(s: Any) -> date:
    if isinstance(s, date) and not isinstance(s, datetime):
        return s
    if isinstance(s, datetime):
        return s.date()
    st = str(s)
    return datetime.fromisoformat(st.replace("Z", "+00:00")).date()


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


def aggregate_daily_scores() -> None:
    kst_today = _kst_today()
    days_ago = int(os.getenv("SCORE_TARGET_DAYS_AGO") or "1")
    target_date_str = (os.getenv("SCORE_TARGET_DATE") or "").strip()
    if target_date_str:
        target_date = datetime.fromisoformat(target_date_str).date()
    else:
        target_date = kst_today - timedelta(days=days_ago)

    print(f"[ScoreWorker] Aggregating signals for {target_date}")

    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())

    signals = (
        supabase.table("signals")
        .select("company_name, impact_type, impact_strength, severity_level, confidence, created_at")
        .gte("created_at", start.isoformat())
        .lte("created_at", end.isoformat())
        .execute()
        .data
        or []
    )

    # 테스트 편의: 지정 날짜에 없으면 최신 날짜로 fallback
    if not signals:
        latest = (
            supabase.table("signals")
            .select("created_at")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )
        if latest:
            latest_date = _parse_iso_date(latest[0]["created_at"])
            if latest_date != target_date:
                target_date = latest_date
                print(f"[ScoreWorker] No signals on requested date. Fallback to latest date: {target_date}")
                start = datetime.combine(target_date, datetime.min.time())
                end = datetime.combine(target_date, datetime.max.time())
                signals = (
                    supabase.table("signals")
                    .select("company_name, impact_type, impact_strength, severity_level, confidence, created_at")
                    .gte("created_at", start.isoformat())
                    .lte("created_at", end.isoformat())
                    .execute()
                    .data
                    or []
                )

    daily_scores: Dict[str, Dict[str, float]] = {}

    for s in signals:
        company = (s.get("company_name") or "").strip()
        if not company:
            continue

        try:
            raw = float(s["impact_strength"]) * float(s["severity_level"]) * float(s["confidence"])
        except Exception:
            continue

        daily_scores.setdefault(company, {"risk": 0.0, "opp": 0.0})

        if (s.get("impact_type") or "").lower() == "risk":
            daily_scores[company]["risk"] += raw
        else:
            daily_scores[company]["opp"] += raw

    for company, values in daily_scores.items():
        row = {
            "company_name": company,
            "date": target_date.isoformat(),
            "risk_score_raw": values["risk"],
            "opp_score_raw": values["opp"],
        }
        _safe_upsert("company_signal_daily", ["company_name", "date"], row)

    print("[ScoreWorker] Daily aggregation complete.")


def _scale_to_100(x: float, k: float) -> float:
    if x <= 0:
        return 0.0
    return 100.0 * (1.0 - math.exp(-x / max(k, 1.0)))


def compute_rolling_scores() -> None:
    kst_today = _kst_today()
    thirty_days_ago = kst_today - timedelta(days=30)
    fourteen_days_ago = kst_today - timedelta(days=14)
    seven_days_ago = kst_today - timedelta(days=7)

    rows = (
        supabase.table("company_signal_daily")
        .select("company_name,date,risk_score_raw,opp_score_raw")
        .gte("date", thirty_days_ago.isoformat())
        .execute()
        .data
        or []
    )

    by_company: Dict[str, List[Tuple[date, float, float]]] = {}
    for r in rows:
        try:
            cname = (r.get("company_name") or "").strip()
            if not cname:
                continue
            d = _parse_iso_date(r["date"])
            risk_raw = float(r.get("risk_score_raw") or 0.0)
            opp_raw = float(r.get("opp_score_raw") or 0.0)
            by_company.setdefault(cname, []).append((d, risk_raw, opp_raw))
        except Exception:
            continue

    K = float(os.getenv("SCORE_K") or "300")
    HIGH = float(os.getenv("SCORE_HIGH_THRESHOLD") or "70")
    MED = float(os.getenv("SCORE_MED_THRESHOLD") or "40")

    def level(v: float) -> str:
        if v >= HIGH:
            return "HIGH"
        if v >= MED:
            return "MED"
        return "LOW"

    for company, items in by_company.items():
        risk_7d = risk_30d = opp_7d = opp_30d = 0.0
        risk_prev7 = opp_prev7 = 0.0

        for d, risk_raw, opp_raw in items:
            if d >= thirty_days_ago:
                risk_30d += risk_raw
                opp_30d += opp_raw
            if d >= seven_days_ago:
                risk_7d += risk_raw
                opp_7d += opp_raw
            elif d >= fourteen_days_ago:
                risk_prev7 += risk_raw
                opp_prev7 += opp_raw

        risk_score = _scale_to_100(risk_7d, K)
        opp_score = _scale_to_100(opp_7d, K)
        risk_prev_score = _scale_to_100(risk_prev7, K)
        opp_prev_score = _scale_to_100(opp_prev7, K)

        risk_delta = risk_score - risk_prev_score
        opp_delta = opp_score - opp_prev_score
        momentum_score = max(abs(risk_delta), abs(opp_delta))

        rolling_row = {
            "company_name": company,
            "risk_7d": risk_7d,
            "risk_30d": risk_30d,
            "opp_7d": opp_7d,
            "opp_30d": opp_30d,
            "momentum_score": momentum_score,
        }
        _safe_upsert("company_signal_rolling", ["company_name"], rolling_row)

        scores_row = {
            "company_name": company,
            "risk_score": risk_score,
            "opportunity_score": opp_score,
            "risk_level": level(risk_score),
            "opportunity_level": level(opp_score),
            "risk_delta": risk_delta,
            "opportunity_delta": opp_delta,
            "momentum_score": momentum_score,
            "updated_at": datetime.utcnow().isoformat(),
        }
        _safe_upsert("company_scores", ["company_name"], scores_row)

    print("[ScoreWorker] Rolling + final score computation complete.")