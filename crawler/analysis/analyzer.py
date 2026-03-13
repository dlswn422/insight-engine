"""
OpenAI 분석 모듈
소형 모델 사용 (gpt-4o-mini)

- .env 안전 로딩
- JSON 강제 반환
- 예외 처리 강화
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from analysis.prompt import build_prompt


# ---------------------------------------------------
# 1️⃣ .env 파일 로드 (crawler/.env 명시적 지정)
# ---------------------------------------------------

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)


# ---------------------------------------------------
# 2️⃣ OpenAI API 키 확인
# ---------------------------------------------------

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise ValueError("❌ OPENAI_API_KEY가 .env에서 로드되지 않았습니다.")

client = OpenAI(api_key=api_key)


# ---------------------------------------------------
# 3️⃣ 기사 분석 함수
# ---------------------------------------------------

def analyze_article(article: dict):
    """
    기사 1건을 GPT로 분석

    처리 흐름:
    1. 프롬프트 생성
    2. OpenAI 호출 (JSON 강제 반환)
    3. JSON 파싱
    4. 결과 반환
    """

    try:
        # 🔹 프롬프트 생성
        prompt = build_prompt(
            article["title"],
            article["content"]
        )

        # 🔹 OpenAI 호출
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # 🔥 저비용 소형 모델
            messages=[
                {
                    "role": "system",
                    "content": "You are a business intelligence analyst."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
            response_format={"type": "json_object"}  # 🔥 JSON 강제 반환
        )

        # 🔹 응답 텍스트 추출
        content = response.choices[0].message.content

        # 🔹 JSON 변환
        result = json.loads(content)

        return result

    except json.JSONDecodeError:
        print("❌ JSON 파싱 실패")
        print("모델 응답:", content)
        return None

    except Exception as e:
        print(f"❌ OpenAI 호출 오류: {e}")
        return None