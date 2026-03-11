"""
db.py

- Supabase 연결 전용 파일
- DB 연결 객체를 한 곳에서만 생성

우선 supabase SDK(create_client)를 사용하려 시도하고,
pydantic_core 등으로 SDK import가 깨져 있으면 Supabase REST(PostgREST)로 폴백합니다.

외부에서 사용할 것은 `supabase` 객체 하나입니다.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

from config import SUPABASE_URL, SUPABASE_KEY


def _require_requests():
    try:
        import requests  # type: ignore
        return requests
    except Exception as e:
        raise RuntimeError("requests가 필요합니다. `pip install requests` 후 다시 실행하세요.") from e


@dataclass
class _ExecResult:
    data: Any
    count: Optional[int] = None


class _NotProxy:
    def __init__(self, q: "_TableQuery"):
        self._q = q

    def is_(self, col: str, val: str) -> "_TableQuery":
        self._q._params[col] = f"not.is.{val}"
        return self._q


class _TableQuery:
    def __init__(self, client: "_RestSupabaseClient", table: str):
        self._c = client
        self._table = table
        self._method = "GET"
        self._params: Dict[str, str] = {}
        self._payload: Any = None
        self._prefer: List[str] = []
        self._on_conflict: Optional[str] = None
        self.not_ = _NotProxy(self)

    def select(self, columns: str = "*") -> "_TableQuery":
        self._method = "GET"
        self._params["select"] = columns
        return self

    def eq(self, col: str, val: Any) -> "_TableQuery":
        self._params[col] = f"eq.{val}"
        return self

    def gte(self, col: str, val: Any) -> "_TableQuery":
        self._params[col] = f"gte.{val}"
        return self

    def lte(self, col: str, val: Any) -> "_TableQuery":
        self._params[col] = f"lte.{val}"
        return self

    def lt(self, col: str, val: Any) -> "_TableQuery":
        self._params[col] = f"lt.{val}"
        return self

    def gt(self, col: str, val: Any) -> "_TableQuery":
        self._params[col] = f"gt.{val}"
        return self

    def is_(self, col: str, val: str) -> "_TableQuery":
        self._params[col] = f"is.{val}"
        return self

    def in_(self, col: str, values: List[Any]) -> "_TableQuery":
        def _fmt(v: Any) -> str:
            if isinstance(v, str):
                return f'"{v}"'
            return str(v)

        inner = ",".join(_fmt(v) for v in values)
        self._params[col] = f"in.({inner})"
        return self

    def or_(self, expr: str) -> "_TableQuery":
        e = expr.strip()
        if not (e.startswith("(") and e.endswith(")")):
            e = f"({e})"
        self._params["or"] = e
        return self

    def order(self, col: str, desc: bool = False) -> "_TableQuery":
        self._params["order"] = f"{col}.{'desc' if desc else 'asc'}"
        return self

    def limit(self, n: int) -> "_TableQuery":
        self._params["limit"] = str(int(n))
        return self

    def insert(self, payload: Union[Dict[str, Any], List[Dict[str, Any]]]) -> "_TableQuery":
        self._method = "POST"
        self._payload = payload
        self._prefer = ["return=representation"]
        return self

    def update(self, payload: Dict[str, Any]) -> "_TableQuery":
        self._method = "PATCH"
        self._payload = payload
        self._prefer = ["return=representation"]
        return self

    def upsert(
        self,
        payload: Union[Dict[str, Any], List[Dict[str, Any]]],
        on_conflict: Optional[str] = None,
        ignore_duplicates: bool = False,
    ) -> "_TableQuery":
        self._method = "POST"
        self._payload = payload
        resolution = "ignore-duplicates" if ignore_duplicates else "merge-duplicates"
        self._prefer = ["return=representation", f"resolution={resolution}"]
        self._on_conflict = on_conflict
        return self

    def delete(self) -> "_TableQuery":
        self._method = "DELETE"
        self._prefer = ["return=representation"]
        return self

    def execute(self) -> _ExecResult:
        return self._c._execute(
            table=self._table,
            method=self._method,
            params=self._params,
            payload=self._payload,
            prefer=self._prefer,
            on_conflict=self._on_conflict,
        )


class _RestSupabaseClient:
    def __init__(self, url: str, key: str):
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_KEY 환경변수가 필요합니다.")
        self._url = url.rstrip("/")
        self._key = key
        self._requests = _require_requests()

    def table(self, name: str) -> _TableQuery:
        return _TableQuery(self, name)

    def _execute(
        self,
        table: str,
        method: str,
        params: Dict[str, str],
        payload: Any,
        prefer: List[str],
        on_conflict: Optional[str],
    ) -> _ExecResult:
        url = f"{self._url}/rest/v1/{table}"

        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Accept": "application/json",
        }
        if prefer:
            headers["Prefer"] = ",".join(prefer)
        if method in ("POST", "PATCH"):
            headers["Content-Type"] = "application/json"

        qparams = dict(params) if params else {}
        if on_conflict:
            qparams["on_conflict"] = on_conflict

        r = self._requests.request(
            method=method,
            url=url,
            headers=headers,
            params=qparams if qparams else None,
            json=payload,
            timeout=60,
        )

        if r.status_code >= 400:
            raise RuntimeError(f"Supabase REST error {r.status_code}: {r.text[:500]}")

        if not r.text:
            return _ExecResult(data=[])

        try:
            data = r.json()
        except Exception:
            data = r.text

        return _ExecResult(data=data)


def _create_supabase_client():
    try:
        from supabase import create_client  # type: ignore
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        return _RestSupabaseClient(SUPABASE_URL, SUPABASE_KEY)


supabase = _create_supabase_client()