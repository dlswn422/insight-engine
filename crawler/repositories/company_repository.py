"""
파일 경로:
crawler/repositories/company_repository.py

역할:
- companies 테이블 접근 전용 Repository
- company 조회
- company 생성
- risk / opportunity 점수 누적
- signal_count 증가
"""

from .db import supabase
from datetime import datetime


def get_company(company_name: str):
    """
    회사 이름으로 companies 테이블 조회

    Parameters:
        company_name (str): 기업명

    Returns:
        dict | None:
            회사 레코드 (존재 시)
            None (없으면)
    """

    result = (
        supabase
        .table("companies")
        .select("*")
        .eq("company_name", company_name)
        .execute()
    )

    return result.data[0] if result.data else None


def create_company(company_name: str):
    """
    companies 테이블에 신규 기업 생성

    초기 점수는 기본값 (0)으로 설정됨

    Parameters:
        company_name (str): 기업명

    Returns:
        dict: 생성된 company 레코드
    """

    result = (
        supabase
        .table("companies")
        .insert({
            "company_name": company_name
        })
        .execute()
    )

    return result.data[0]


def update_company_score(company_id: str, impact_type: str, strength: int):
    """
    기업 점수 누적 로직

    - impact_type = "risk" → total_risk_score 증가
    - impact_type = "opportunity" → total_opportunity_score 증가
    - signal_count +1
    - updated_at 갱신

    Parameters:
        company_id (str): companies.id
        impact_type (str): "risk" or "opportunity"
        strength (int): 0~100 영향 강도
    """

    # 1️⃣ 현재 회사 데이터 조회
    result = (
        supabase
        .table("companies")
        .select("*")
        .eq("id", company_id)
        .execute()
    )

    if not result.data:
        return  # 안전 처리

    company = result.data[0]

    # 2️⃣ 현재 점수 가져오기
    current_risk = company.get("total_risk_score", 0)
    current_opportunity = company.get("total_opportunity_score", 0)
    current_signal_count = company.get("signal_count", 0)

    # 3️⃣ impact_type에 따라 점수 누적
    if impact_type == "risk":
        new_risk = current_risk + strength
        new_opportunity = current_opportunity
    else:
        new_risk = current_risk
        new_opportunity = current_opportunity + strength

    # 4️⃣ DB 업데이트
    (
        supabase
        .table("companies")
        .update({
            "total_risk_score": new_risk,
            "total_opportunity_score": new_opportunity,
            "signal_count": current_signal_count + 1,
            "updated_at": datetime.utcnow().isoformat()
        })
        .eq("id", company_id)
        .execute()
    )