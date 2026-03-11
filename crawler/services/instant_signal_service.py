"""
services/instant_signal_service.py — DART / 구형 단건 분석 호환 레이어

역할:
    - dart_llm_worker, dart_scout_worker 가 사용하는 upsert_signal / upsert_general_company /
      should_promote_to_potential 을 batch_signal_service 에서 re-export 합니다.
    - 중복 구현을 없애고 batch_signal_service 를 단일 진실 공급원으로 사용합니다.

Note:
    뉴스/공시 출신 신규 기업은 모두 GENERAL 로만 등록됩니다.
    POTENTIAL 승격은 sync_potential_companies.py 가 별도로 처리합니다.
"""

# batch_signal_service 를 단일 소스로 사용
from services.batch_signal_service import (
    make_event_hash,
    should_register_general as should_promote_to_potential,  # 하위 호환 별칭
    upsert_signal,
    upsert_general_company,
    BLOCK_COMPANY_SUBSTRINGS,
    CONF_SIGNAL_SAVE,
    CONF_REGISTER_GENERAL as CONF_PROMOTE_POTENTIAL,
)

__all__ = [
    "make_event_hash",
    "should_promote_to_potential",
    "upsert_signal",
    "upsert_general_company",
    "BLOCK_COMPANY_SUBSTRINGS",
    "CONF_SIGNAL_SAVE",
    "CONF_PROMOTE_POTENTIAL",
]