"""
OpenAI 호출 → Signal 추출
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from analysis.signal_prompt import build_signal_prompt

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


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
            return {"signals": []}

        validated = []

        for sig in parsed["signals"]:

            required = [
                "company_name",
                "event_type",
                "impact_type",
                "impact_strength",
                "opportunity_type"
            ]

            if not all(k in sig for k in required):
                continue

            validated.append({
                "company_name": sig["company_name"].strip(),
                "event_type": sig["event_type"],
                "impact_type": sig["impact_type"].lower(),
                "impact_strength": max(0, min(int(sig["impact_strength"]), 100)),
                "opportunity_type": sig["opportunity_type"],
                "confidence": float(sig.get("confidence", 0.8))
            })

        return {"signals": validated}

    except Exception as e:
        print("❌ Signal extraction error:", e)
        return {"signals": []}