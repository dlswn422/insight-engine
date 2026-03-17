import sys
import os
import asyncio

# 현재 파일이 있는 crawler 폴더를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

import dart_main
from workers.dart_classifier_worker import run as run_classifier
from workers.dart_llm_worker import run as run_llm
from score_main import run as run_scoring
from workers.action_recommendation_worker import run_action_worker

def run_all():
    print("\n" + "="*50)
    print("[DART Daily] 1단계: 공시 수집 시작")
    print("="*50)
    dart_main.main()
    
    print("\n" + "="*50)
    print("[DART Daily] 2단계: 키워드 필터링 시작")
    print("="*50)
    run_classifier()
    
    print("\n" + "="*50)
    print("[DART Daily] 3단계: LLM 분석 시작")
    print("="*50)
    asyncio.run(run_llm())
    
    print("\n" + "="*50)
    print("[DART Daily] 4단계: 기업 점수 산출 시작")
    print("="*50)
    run_scoring()

    print("\n" + "="*50)
    print("[DART Daily] 5단계: 영업 액션 가이드 생성 시작")
    print("="*50)
    run_action_worker()

    print("\n[DART Daily] 모든 분석 및 점수화 완료!")

if __name__ == "__main__":
    try:
        run_all()
    except Exception as e:
        print(f"\n[DART Daily] 오류 발생: {e}")
        sys.exit(1)
