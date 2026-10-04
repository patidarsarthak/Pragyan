"""
Drainage & Waterlogging Planner
-------------------------------
Detects inundation risks on heavy clay Vertisols and low-lying plots:
- Rain > 30 mm in 24h triggers emergency drain opening
- Rain > 50 mm cumulative in 48h triggers broad bed furrow drainage
"""
from typing import Dict, Any, List, Optional

def plan_drainage(
    forecast_days: List[Dict[str, Any]],
    soil_class: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    max_24h_rain = max((float(d.get("rainfall_mm", 0.0)) for d in forecast_days), default=0.0)
    rain_48h = sum(float(d.get("rainfall_mm", 0.0)) for d in forecast_days[:2])

    s = soil_class or {}
    soil_order = s.get("soil_order", "Vertisol")

    # Vertisols have very low saturated hydraulic conductivity once swell-shrink cracks close
    drainage_threshold = 25.0 if soil_order == "Vertisol" else 40.0

    if max_24h_rain >= drainage_threshold or rain_48h >= 45.0:
        return {
            "planner": "drainage",
            "status": "OPEN_DRAINS_ALERT",
            "action": "Open peripheral drainage furrows and clear waterlogging outlets immediately.",
            "why": f"Heavy rainfall forecast ({max_24h_rain:.1f} mm/day) on {soil_order} soil creates rapid water stagnation and root suffocation.",
            "when": "Clear outlets before precipitation commences.",
            "severity": "alert",
            "confidence": {"label": "Likely", "probability": 0.86},
            "inputs_used": {
                "max_24h_rain": max_24h_rain,
                "rain_48h": rain_48h,
                "soil_order": soil_order,
                "threshold_mm": drainage_threshold
            }
        }
    elif max_24h_rain >= 15.0:
        return {
            "planner": "drainage",
            "status": "CHECK_DRAINS",
            "action": "Inspect field boundary bunds and remove silt/weed obstructions from drainage channels.",
            "why": f"Moderate rainfall ({max_24h_rain:.1f} mm) requires unobstructed channels to prevent localized ponding in plot depressions.",
            "when": "Within the next 24 hours.",
            "severity": "watch",
            "confidence": {"label": "Likely", "probability": 0.82},
            "inputs_used": {"max_24h_rain": max_24h_rain, "soil_order": soil_order}
        }
    else:
        return {
            "planner": "drainage",
            "status": "NORMAL",
            "action": "Maintain bund integrity to conserve in-situ rainwater.",
            "why": "No inundation or waterlogging hazard detected over the forecast horizon.",
            "when": "Routine maintenance.",
            "severity": "calm",
            "confidence": {"label": "Likely", "probability": 0.90},
            "inputs_used": {"max_24h_rain": max_24h_rain}
        }
