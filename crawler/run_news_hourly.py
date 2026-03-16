import sys
import os

# 현재 파일이 있는 crawler 폴더를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from services.crawler_service import run_crawler

if __name__ == "__main__":
    print("\n" + "="*50)
    print("[News Pipeline] 네이버 뉴스 크롤링 및 LLM 분석 시작")
    print("="*50)
    try:
        run_crawler()
        print("\n[News Pipeline] 뉴스 크롤링 작업 완료!")
    except Exception as e:
        print(f"\n[News Pipeline] 실행 중 오류 발생: {e}")
        sys.exit(1)
