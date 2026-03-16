import sys
import os
import asyncio

# 현재 파일이 있는 crawler 폴더를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

import dart_main
from workers.dart_classifier_worker import run as run_classifier
from workers.dart_llm_worker import run as run_llm

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
    
    print("\n[DART Daily] 모든 공시 분석 완료!")

if __name__ == "__main__":
    try:
        run_all()
    except Exception as e:
        print(f"\n[DART Daily] 오류 발생: {e}")
        sys.exit(1)
