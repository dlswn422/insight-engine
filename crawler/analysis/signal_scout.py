"""
파일 경로:
crawler/analysis/signal_scout.py

역할:
- OpenAI 호출
- 기사에서 Signal(JSON) 추출
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from analysis.signal_prompt import build_signal_prompt


# ---------------------------------------------------
# .env 파일 로드
# crawler/.env 경로를 명시적으로 지정
# ---------------------------------------------------
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

# OpenAI 클라이언트 생성
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def extract_signals(article: dict):
    """
    기사 1개에서 Signal을 추출하는 함수

    1. 프롬프트 생성
    2. GPT 호출
    3. JSON 파싱
    4. 결과 반환
    """

    try:
        # GPT 프롬프트 생성
        prompt = build_signal_prompt(
            article["title"],
            article["content"]
        )

        # OpenAI 호출
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You detect structured business signals."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        # JSON 변환
        return json.loads(response.choices[0].message.content)

    except Exception as e:
        print("❌ Signal extraction error:", e)
        return None