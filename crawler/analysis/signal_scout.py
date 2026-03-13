"""
crawler/analysis/signal_scout.py

LLM 호출 → Signal 추출 (v1.0 후처리 강화)
- openai SDK 의존 제거(HTTP 래퍼 사용)
- 회사명 정규화(간단)
- 값 클램핑 + 하드룰(리콜 등 severity 최소치)
- 비기업 엔티티(경기도, 한국 증시, 코트라 등) 필터링
"""

from __future__ import annotations

import os
import re
from typing import Any, Dict, List

from analysis.signal_prompt import build_signal_prompt
from llm.openai_compat import chat_completions_json


def _normalize_company_name(name: str) -> str:
    s = (name or "").strip()
    s = re.sub(r"\(주\)|㈜|주식회사", "", s).strip()
    s = re.sub(r"\s+", " ", s).strip()
    return s


# 비기업 엔티티 블랙리스트
_NON_COMPANY_BLACKLIST = {
    "경기도",
    "정부",
    "대한민국 정부",
    "보건복지부",
    "식품의약품안전처",
    "식약처",
    "한국 증시",
    "국내 증시",
    "증시",
    "코트라",
    "KOTRA",
    "금융당국",
    "국회",
    "질병청",
    "질병관리청",
    "산업부",
    "중기부",
    "복지부",
    "보건당국",
    "당국",
    "시장",
    "업계",
}

# 이름 안에 포함되면 비기업으로 볼 확률이 높은 토큰
_NON_COMPANY_CONTAINS = [
    "정부",
    "증시",
    "지수",
    "당국",
    "부처",
    "위원회",
    "협회",
    "청",
    "부",
]


_RISK_HARD_KEYWORDS = [
    "리콜",
    "회수",
    "불량",
    "위해",
    "클레임",
    "품질",
    "허가 취소",
    "행정처분",
    "과징금",
    "소송",
    "분쟁",
    "횡령",
    "배임",
    "감사",
    "적자",
    "실적 악화",
    "가이던스 하향",
    "생산 중단",
    "공장",
    "화재",
    "사고",
    "공급망",
]

_OPP_HARD_KEYWORDS = [
    "투자",
    "증설",
    "라인",
    "수주",
    "계약",
    "납품",
    "파트너십",
    "협업",
    "MOU",
    "인증",
    "GMP",
    "ISO",
    "허가",
    "승인",
    "임상 3상",
    "출시",
    "M&A",
    "인수",
    "합병",
]


def _is_valid_company_name(name: str) -> bool:
    n = (name or "").strip()
    if not n:
        return False
    if len(n) <= 1:
        return False
    if n in _NON_COMPANY_BLACKLIST:
        return False
    if any(token in n for token in _NON_COMPANY_CONTAINS):
        return False
    return True


def _apply_hard_rules(sig: Dict[str, Any]) -> Dict[str, Any]:
    et = (sig.get("event_type") or "").strip()

    def has_any(keywords: List[str]) -> bool:
        return any(k in et for k in keywords)

    if has_any(_RISK_HARD_KEYWORDS):
        sig["impact_type"] = "risk"
        sig["severity_level"] = max(int(sig.get("severity_level", 1)), 4)
        sig["impact_strength"] = max(int(sig.get("impact_strength", 0)), 60)
    elif has_any(_OPP_HARD_KEYWORDS):
        sig["impact_type"] = "opportunity"
        sig["severity_level"] = max(int(sig.get("severity_level", 1)), 3)
        sig["impact_strength"] = max(int(sig.get("impact_strength", 0)), 50)

    return sig


def extract_signals(article: dict) -> dict:
    """
    반환(기존 호환):
    {
      "success": bool,
      "signals": [...],
      "prospects": [...],
      "error_message": str|None
    }
    """
    try:
        prompt = build_signal_prompt(article.get("title", ""), article.get("content", ""))

        model = (os.getenv("SIGNAL_MODEL") or "gpt-4o-mini").strip()
        temperature = float(os.getenv("SIGNAL_TEMPERATURE") or "0.2")
        timeout = int(os.getenv("SIGNAL_TIMEOUT") or "60")

        parsed = chat_completions_json(
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

        if "signals" not in parsed:
            return {
                "success": False,
                "signals": [],
                "prospects": [],
                "error_message": "Missing 'signals' key",
            }

        validated: List[Dict[str, Any]] = []

        for sig in (parsed.get("signals") or []):
            required = [
                "company_name",
                "event_type",
                "impact_type",
                "impact_strength",
                "signal_category",
                "industry_tag",
                "trend_bucket",
                "severity_level",
            ]
            if not all(k in sig for k in required):
                continue

            try:
                out = {
                    "company_name": _normalize_company_name(str(sig["company_name"])),
                    "event_type": str(sig["event_type"]).strip(),
                    "impact_type": str(sig["impact_type"]).lower().strip(),
                    "impact_strength": max(0, min(int(sig["impact_strength"]), 100)),
                    "signal_category": str(sig["signal_category"]).strip(),
                    "industry_tag": str(sig["industry_tag"]).strip(),
                    "trend_bucket": str(sig["trend_bucket"]).strip(),
                    "severity_level": max(1, min(int(sig["severity_level"]), 5)),
                    "confidence": max(0.0, min(float(sig.get("confidence", 0.8)), 1.0)),
                }
            except Exception:
                continue

            if not out["event_type"]:
                continue

            if out["impact_type"] not in {"risk", "opportunity"}:
                continue

            if not _is_valid_company_name(out["company_name"]):
                continue

            out = _apply_hard_rules(out)
            validated.append(out)

        prospects = parsed.get("prospects") or []
        cleaned_prospects = []

        for p in prospects:
            try:
                cname = _normalize_company_name(str(p.get("company_name", "")).strip())
                if not cname:
                    continue
                if not _is_valid_company_name(cname):
                    continue

                conf = max(0.0, min(float(p.get("confidence", 0.0)), 1.0))
                cleaned_prospects.append(
                    {
                        "company_name": cname,
                        "reason": str(p.get("reason", "")).strip(),
                        "confidence": conf,
                    }
                )
            except Exception:
                continue

        return {
            "success": True,
            "signals": validated,
            "prospects": cleaned_prospects,
            "error_message": None,
        }

    except Exception as e:
        print("❌ Signal extraction error:", e)
        return {
            "success": False,
            "signals": [],
            "prospects": [],
            "error_message": str(e),
        }