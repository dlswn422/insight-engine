import sys
import os

# 현재 파일이 있는 crawler 폴더를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from scripts.sync_industry_targets import run as run_industry_targets

if __name__ == "__main__":
    print("\n" + "="*50)
    print("[Industry Scan] 타겟 기업 업종 탐색 시작 (3개월 주기 순회)")
    print("="*50)
    try:
        run_industry_targets()
        print("\n[Industry Scan] 타겟 기업 탐색 및 업데이트 완료!")
    except Exception as e:
        print(f"\n[Industry Scan] 실행 중 오류 발생: {e}")
        sys.exit(1)
