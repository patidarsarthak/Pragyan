"""
Harvest & Threshing Window Planner
----------------------------------
Protects matured standing crops and threshed produce from unseasonal rain:
- Detects rain approaching mature crops (Soybean, Wheat, Mustard, Maize)
- Recommends harvesting acceleration, tarpaulin covering, and threshing dry periods
"""
from typing import Dict, Any, List

def plan_harvest_window(
    crop: str,
    stage_id: str,
    forecast_days: List[Dict[str, Any]]
) -> Dict[str, Any]:
    is_mature = "matur" in stage_id.lower() or "ripen" in stage_id.lower() or "grain_fill" in stage_id.lower()

    if not is_mature:
        return {
            "planner": "harvest_window",
            "status": "NOT_MATURE",
            "action": "Crop is in vegetative/reproductive development; harvesting window not yet open.",
            "why": f"Current stage is '{stage_id}'.",
            "when": "Wait for physiological maturity.",
            "severity": "calm",
            "confidence": {"label": "Likely", "probability": 0.95},
            "inputs_used": {"stage_id": stage_id}
        }

    rain_days = [idx + 1 for idx, d in enumerate(forecast_days) if float(d.get("rainfall_mm", 0.0)) >= 5.0]

    if rain_days:
        first_rain_day = rain_days[0]
        return {
            "planner": "harvest_window",
            "status": "ACCELERATE_HARVEST_ALERT",
            "action": f"Accelerate harvesting of matured {crop} crop immediately; cover harvested produce before Day {first_rain_day}.",
            "why": f"Significant rainfall (>= 5 mm) predicted on Day {first_rain_day}. Rain on mature standing crop causes grain discoloration, pod shattering, and fungal growth.",
            "when": f"Complete cutting and transfer to covered threshing floor by Day {max(1, first_rain_day - 1)} evening.",
            "severity": "alert",
            "confidence": {"label": "Likely", "probability": 0.88},
            "inputs_used": {
                "first_rain_day": first_rain_day,
                "crop": crop,
                "stage": stage_id
            }
        }
    else:
        return {
            "planner": "harvest_window",
            "status": "DRY_HARVEST_WINDOW_OPEN",
            "action": f"Dry weather window open for harvesting, threshing, and sun-drying of {crop}.",
            "why": "Clear skies with zero precipitation forecast ensure safe seed moisture reduction to safe storage level (<12%).",
            "when": "Proceed with combine or manual harvesting throughout the 10-day window.",
            "severity": "calm",
            "confidence": {"label": "Likely", "probability": 0.92},
            "inputs_used": {"crop": crop, "stage": stage_id}
        }
