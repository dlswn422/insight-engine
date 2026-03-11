"""
crawler/llm/openai_compat.py

openai SDK(pydantic_core 오류 등) 없이도 동작하도록
HTTP(requests)로 OpenAI Chat Completions를 호출하는 래퍼입니다.

필수 env:
- OPENAI_API_KEY
선택 env:
- OPENAI_BASE_URL (기본: https://api.openai.com/v1)
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

import requests


def chat_completions_json(
    *,
    messages: List[Dict[str, str]],
    model: str,
    temperature: float = 0.2,
    timeout: int = 60,
    # NOTE: Chat Completions는 max_tokens를 사용합니다.
    # 기존 코드 호환을 위해 max_output_tokens도 받고 내부에서 max_tokens로 매핑합니다.
    max_tokens: Optional[int] = None,
    max_output_tokens: Optional[int] = None,
    response_format_json: bool = True,
) -> Dict[str, Any]:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY 가 설정되어 있지 않습니다.")

    base_url = (os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    url = f"{base_url}/chat/completions"

    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": float(temperature),
    }

    # max_tokens 우선, 없으면 max_output_tokens를 max_tokens로 사용
    mt = max_tokens if max_tokens is not None else max_output_tokens
    if mt is not None:
        payload["max_tokens"] = int(mt)

    # response_format은 지원 모델에서만 동작. 미지원이면 400이 날 수 있어 try/fallback 처리.
    if response_format_json:
        payload["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=timeout)

    # response_format 미지원 모델 대비: 400이면 response_format 제거하고 1회 재시도
    if r.status_code == 400 and response_format_json and "response_format" in payload:
        payload.pop("response_format", None)
        r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=timeout)

    if r.status_code >= 400:
        raise RuntimeError(f"OpenAI HTTP error {r.status_code}: {r.text[:700]}")

    data = r.json()
    content = data["choices"][0]["message"]["content"]

    try:
        return json.loads(content)
    except Exception as e:
        raise RuntimeError(
            f"LLM JSON 파싱 실패: {str(e)} / content={content[:400]}"
        ) from e