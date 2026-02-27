"""
OpenAI 분석 모듈 (2단계 프롬프트 체이닝)
소형 모델 사용 (gpt-4o-mini)

[Step 1] is_relevant_article: 이진 분류기 (True/False)
  → 관련 없는 기사를 무거운 프롬프트로 보내기 전에 사전 차단
[Step 2] analyze_article: 시그널 추출 (Step 1이 True일 때만 실행)
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
# 3️⃣ [Step 1] 이진 분류기 - 관련 기사 여부 판별
# ---------------------------------------------------

RELEVANCE_SYSTEM_PROMPT = (
    "너는 B2B 비즈니스 애널리스트다. "
    "다음 기사 제목과 본문이 제약/화장품 기업의 핵심 비즈니스 이벤트"
    "(시설 증설, M&A, 규제 승인/거절, 리콜, 경영권 변동, 주요 계약 등)를 "
    "포함하고 있는지 판별하라. "
    "부고, 단순 주가 등락, 날씨, 동명이인 기사 등은 제외한다. "
    "오직 'True' 또는 'False'라는 단어 하나로만 대답하라."
)


def is_relevant_article(title: str, content: str) -> bool:
    """
    [Step 1] 기사 관련성 이진 분류기

    - 제약/화장품 핵심 비즈니스 이벤트 포함 여부 판별
    - True  → Step 2 무거운 시그널 추출 프롬프트로 진행
    - False → scout_status를 'irrelevant'로 마킹하고 종료
    - 엣지 케이스: GPT 응답이 'True'도 'False'도 아닐 경우 False 처리 (보수적 기본값)
    """
    try:
        user_message = f"제목: {title}\n\n본문: {content[:1000]}"  # 토큰 절약: 본문 앞 1000자만

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": RELEVANCE_SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.0,   # 분류기는 결정론적으로
            max_tokens=5       # 'True' 또는 'False' 한 단어만 받으면 충분
        )

        answer = response.choices[0].message.content.strip()
        print(f"  🔍 관련성 판별 결과: {answer!r}")

        if answer == "True":
            return True
        elif answer == "False":
            return False
        else:
            # 예상치 못한 응답일 경우 보수적으로 False 처리
            print(f"  ⚠️ 예상치 못한 응답 '{answer}' → False로 처리")
            return False

    except Exception as e:
        print(f"  ❌ 관련성 판별 오류: {e} → False로 처리")
        return False


# ---------------------------------------------------
# 4️⃣ [Step 2] 시그널 추출 (is_relevant가 True일 때만 호출)
# ---------------------------------------------------

def analyze_article(article: dict):
    """
    [Step 2] 기사 1건을 GPT로 심층 분석 → 시그널 추출

    처리 흐름:
    1. 프롬프트 생성
    2. OpenAI 호출 (JSON 강제 반환)
    3. JSON 파싱
    4. 결과 반환

    ⚠️ 이 함수는 is_relevant_article()이 True를 반환한 기사에만 호출해야 한다.
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