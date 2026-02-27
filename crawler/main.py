"""
main.py

- 1회 실행용
- 테스트용
"""

from services.crawler_service import run_crawler

def main():
    print("--- 테스트: 네이버 크롤링 ---")
    run_crawler("naver")

    print("\n--- 테스트: 다음 크롤링 ---")
    run_crawler("daum")

if __name__ == "__main__":
    main()