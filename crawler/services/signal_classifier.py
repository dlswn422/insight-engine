"""
Signal Type → Category 자동 매핑
"""

SIGNAL_CATEGORY_MAP = {
    "investment": "growth",
    "capacity_expansion": "growth",
    "hiring": "growth",
    "product_launch": "growth",
    "partnership": "growth",
    "regulation": "risk",
    "quality_issue": "risk",
    "competitor_activity": "competition",
    "risk_event": "risk"
}


def get_signal_category(signal_type: str) -> str:
    return SIGNAL_CATEGORY_MAP.get(signal_type, "risk")