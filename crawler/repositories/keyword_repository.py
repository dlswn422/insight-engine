"""
keyword_repository.py

- keywords 테이블 접근 (수집용 키워드)
- customers 기반 매핑 조회
- (추가) 자사/고객사 기반 모니터링 키워드 로딩 (ENV/로컬파일/DB/fallback)
"""

from __future__ import annotations

import os
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional

from .db import supabase


# =========================
# 기존 함수들 (유지)
# =========================
def get_keywords() -> List[Dict]:
    """
    수집용 키워드 전체 조회
    (is_active = True 인 것만)
    """
    result = (
        supabase
        .table("keywords")
        .select("keyword")
        .eq("is_active", True)
        .execute()
    )
    return result.data or []


def get_customers() -> List[Dict]:
    """
    고객사 전체 조회
    기사-고객 매핑용
    """
    result = (
        supabase
        .table("customers")
        .select("id, name")
        .execute()
    )
    return result.data or []


# =========================
# 추가: 모니터링 키워드 로딩 로직
# =========================
def _normalize_keywords(raw) -> List[Dict]:
    """
    raw:
      - ["키워드1", "키워드2"]
      - [{"keyword": "키워드"}]
      - 혼합
    return:
      - [{"keyword": "..."}]
    """
    out: List[Dict] = []
    seen = set()

    if not raw:
        return out

    if isinstance(raw, dict):
        raw = [raw]

    for item in raw:
        if isinstance(item, str):
            kw = item.strip()
        elif isinstance(item, dict):
            kw = (item.get("keyword") or "").strip()
        else:
            continue

        if not kw or kw in seen:
            continue

        seen.add(kw)
        out.append({"keyword": kw})

    return out


def _load_keywords_from_env() -> List[Dict]:
    """
    ENV 우선:
      1) MONITORING_KEYWORDS="A,B,C" (콤마 구분)
      2) MONITORING_KEYWORDS_JSON='["A","B"]' 또는 '[{"keyword":"A"}]'
    """
    # 1) comma-separated
    s = os.getenv("MONITORING_KEYWORDS")
    if s and s.strip():
        parts = [p.strip() for p in s.split(",") if p.strip()]
        return _normalize_keywords(parts)

    # 2) json string
    j = os.getenv("MONITORING_KEYWORDS_JSON")
    if j and j.strip():
        try:
            raw = json.loads(j)
            return _normalize_keywords(raw)
        except Exception:
            return []

    return []


def _load_keywords_from_file() -> Tuple[List[Dict], Optional[str]]:
    """
    로컬 파일:
      - 기본: ./monitoring_keywords.json
      - 또는 ENV: MONITORING_KEYWORDS_PATH="/path/to/file.json"

    파일 예시:
      ["신일팜글래스", "고객사A", {"keyword": "고객사B 바이알"}]
    """
    path = os.getenv("MONITORING_KEYWORDS_PATH", "monitoring_keywords.json")
    p = Path(path)

    if not p.exists():
        return [], None

    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
        return _normalize_keywords(raw), str(p)
    except Exception:
        # 파일은 있는데 파싱 실패한 경우 - source는 남겨 디버깅 가능하게
        return [], str(p)


def _load_keywords_from_db() -> List[Dict]:
    """
    (선택) DB가 완성되면 여기에서 자사/고객사 테이블을 조회하도록 구현.

    지금은 customers 테이블을 '고객사 목록'으로 활용할 수 있어서,
    최소 동작을 위해 customers.name을 키워드로 반환하도록 해둠.

    - 향후 자사/고객사 통합 테이블이 생기면 이 부분만 바꾸면 됨.
    """
    try:
        # ✅ 최소 동작(현재 DB에 customers가 있으므로 활용)
        rows = (
            supabase
            .table("customers")
            .select("name")
            .execute()
        ).data or []

        return _normalize_keywords([r.get("name", "") for r in rows])

    except Exception:
        return []


def get_monitoring_keywords(return_source: bool = False):
    """
    모니터링 키워드 로딩 우선순위:

      1) ENV (MONITORING_KEYWORDS / MONITORING_KEYWORDS_JSON)
      2) 로컬 JSON 파일 (MONITORING_KEYWORDS_PATH 또는 monitoring_keywords.json)
      3) DB (현재는 customers.name 기반 / 추후 자사/고객사 테이블로 교체)
      4) 기존 keywords 테이블 fallback

    return_source=True면 (keywords, source) 반환
    """
    # 1) ENV
    env_rows = _load_keywords_from_env()
    if env_rows:
        return (env_rows, "env") if return_source else env_rows

    # 2) FILE
    file_rows, file_path = _load_keywords_from_file()
    if file_rows:
        src = f"file:{file_path}" if file_path else "file"
        return (file_rows, src) if return_source else file_rows

    # 3) DB
    db_rows = _load_keywords_from_db()
    if db_rows:
        return (db_rows, "db:customers") if return_source else db_rows

    # 4) fallback: keywords 테이블
    rows = get_keywords()
    return (rows, "db:keywords") if return_source else rows