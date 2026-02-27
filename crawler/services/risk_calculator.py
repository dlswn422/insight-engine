"""
안정화된 impact_score 계산
"""

import math

DIRECTION_WEIGHT = {
    "positive": -1,
    "neutral": 0,
    "negative": 1
}

CATEGORY_WEIGHT = {
    "growth": -0.5,
    "risk": 1.5,
    "competition": 1
}


def calculate_impact_score(signal: dict):

    strength = signal.get("signal_strength", 0)
    direction = signal.get("impact_direction", "neutral")
    category = signal.get("signal_category", "risk")

    direction_weight = DIRECTION_WEIGHT.get(direction, 0)
    category_weight = CATEGORY_WEIGHT.get(category, 1)

    # 로그 스케일 적용 (폭증 방지)
    scaled_strength = math.log1p(strength) * 10

    impact_score = scaled_strength * direction_weight * category_weight

    return int(impact_score)