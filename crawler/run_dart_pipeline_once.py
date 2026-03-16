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
    print("[DART Pipeline] 1단계: 공시 수집 및 동기화 시작 (dart_main.py)")
    print("="*50)
    # 1단계: 공시 수집 (sync_dart_codes -> sync_potential -> fetch_disclosures)
    dart_main.main()
    
    print("\n" + "="*50)
    print("[DART Pipeline] 2단계: 키워드 기반 필터링 시작 (dart_classifier_worker.py)")
    print("="*50)
    # 2단계: PENDING 상태 공시들을 분류 (LLM 사용 안 함)
    run_classifier()
    
    print("\n" + "="*50)
    print("[DART Pipeline] 3단계: LLM 심층 분석 시작 (dart_llm_worker.py)")
    print("="*50)
    # 3단계: READY_FOR_LLM 공시들을 LLM으로 분석 (비동기)
    asyncio.run(run_llm())
    
    print("\n" + "="*50)
    print("[DART Pipeline] 모든 작업이 성공적으로 완료되었습니다!")
    print("="*50 + "\n")

if __name__ == "__main__":
    try:
        run_all()
    except Exception as e:
        print(f"\n[DART Pipeline] 실행 중 치명적 오류 발생: {e}")
        sys.exit(1)
