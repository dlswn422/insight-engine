"""
OpenAI 호출 → Signal 추출 (확장 필드 반영 버전)

- signal_category / industry_tag / trend_bucket / severity_level 포함
- NULL 방지
- 안전한 타입 정규화
- success / no-signal / failure 구분
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from analysis.signal_prompt import build_signal_prompt

# ---------------------------------------------------
# 🔐 환경 변수 로드
# ---------------------------------------------------
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ---------------------------------------------------
# 📡 Signal 추출
# ---------------------------------------------------
def extract_signals(article: dict):
    try:
        prompt = build_signal_prompt(
            article.get("title", ""),
            article.get("content", "")
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        parsed = json.loads(response.choices[0].message.content)

        if "signals" not in parsed:
            return {
                "success": False,
                "signals": [],
                "error_message": "Missing 'signals' key in LLM response"
            }

        validated = []

        for sig in parsed["signals"]:
            # ---------------------------------------------------
            # 🔎 필수 필드 체크 (확장 버전)
            # ---------------------------------------------------
            required = [
                "company_name",
                "event_type",
                "impact_type",
                "impact_strength",
                "signal_category",
                "industry_tag",
                "trend_bucket",
                "severity_level"
            ]

            if not all(k in sig for k in required):
                continue

            try:
                confidence = max(0.0, min(float(sig.get("confidence", 0.8)), 1.0))

                validated.append({
                    "company_name": str(sig["company_name"]).strip(),
                    "event_type": str(sig["event_type"]).strip(),
                    "impact_type": str(sig["impact_type"]).lower(),
                    "impact_strength": max(0, min(int(sig["impact_strength"]), 100)),
                    "signal_category": sig["signal_category"],
                    "industry_tag": sig["industry_tag"],
                    "trend_bucket": sig["trend_bucket"],
                    "severity_level": int(sig["severity_level"]),
                    "confidence": confidence
                })

            except Exception:
                continue

        return {
            "success": True,
            "signals": validated,
            "error_message": None
        }

    except Exception as e:
        print("❌ Signal extraction error:", e)
        return {
            "success": False,
            "signals": [],
            "error_message": str(e)
        }