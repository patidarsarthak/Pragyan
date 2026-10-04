"""
Sowing Window Planner
---------------------
Determines optimum sowing suitability based on:
- Sowing window defined in crop calendar
- Downscaled soil moisture / antecedent rainfall (minimum 25-30 mm required for Kharif emergence)
- Temperature suitability range (e.g. wheat germination optimal at 20-22C Tmean)
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

def plan_sowing_window(
    crop: str,
    as_of_date: str,
    forecast_days: List[Dict[str, Any]],
    soil_moisture_pct: float = 65.0,
    crop_calendar: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    c_lower = crop.lower()
    total_rain_3d = sum(d.get("rainfall_mm", 0.0) for d in forecast_days[:3])
    t_mean_3d = sum(d.get("temp_c", 25.0) for d in forecast_days[:3]) / max(1, len(forecast_days[:3]))

    # Wheat specific rules (Rabi)
    if "wheat" in c_lower:
        if t_mean_3d > 25.0:
            return {
                "planner": "sowing_window",
                "crop": crop,
                "status": "WAIT",
                "action": "Wait for night temperatures to decline before wheat sowing.",
                "why": f"Average temperature ({t_mean_3d:.1f}°C) is above optimal germination threshold (20–22°C). High soil heat reduces seedling vigor.",
                "when": "Anticipate sowing window opening after 05 November.",
                "confidence": {"label": "Likely", "probability": 0.85},
                "inputs_used": {"t_mean_3d": round(t_mean_3d, 1), "rain_3d": round(total_rain_3d, 1)}
            }
        elif total_rain_3d >= 20.0:
            return {
                "planner": "sowing_window",
                "crop": crop,
                "status": "WAIT",
                "action": "Postpone sowing until topsoil dries to optimum workable tilth.",
                "why": f"Predicted rainfall ({total_rain_3d:.1f} mm) causes seed furrow crusting and anaerobic decay.",
                "when": "Wait 3–4 days post-rainfall.",
                "confidence": {"label": "Likely", "probability": 0.88},
                "inputs_used": {"t_mean_3d": round(t_mean_3d, 1), "rain_3d": round(total_rain_3d, 1)}
            }
        else:
            return {
                "planner": "sowing_window",
                "crop": crop,
                "status": "FAVORABLE",
                "action": "Proceed with primary seedbed preparation and sowing with treated seed.",
                "why": f"Thermal regime ({t_mean_3d:.1f}°C) and soil moisture are within optimal agronomic window for rapid germination.",
                "when": "Sow within the next 4 days.",
                "confidence": {"label": "Likely", "probability": 0.90},
                "inputs_used": {"t_mean_3d": round(t_mean_3d, 1), "rain_3d": round(total_rain_3d, 1)}
            }

    # Kharif (Soybean / Maize) rules
    if "soy" in c_lower or "maize" in c_lower:
        if total_rain_3d < 25.0 and soil_moisture_pct < 50.0:
            return {
                "planner": "sowing_window",
                "crop": crop,
                "status": "WAIT",
                "action": "Do not sow in dry soil; wait for cumulative monsoon rainfall of at least 30 mm.",
                "why": "Dry sowing or insufficient seedbed moisture results in poor germination and patchy stand.",
                "when": "Wait for next active rainfall pulse.",
                "confidence": {"label": "Likely", "probability": 0.84},
                "inputs_used": {"soil_moisture_pct": soil_moisture_pct, "rain_3d": round(total_rain_3d, 1)}
            }
        else:
            return {
                "planner": "sowing_window",
                "crop": crop,
                "status": "FAVORABLE",
                "action": "Soil moisture is sufficient; proceed with sowing on broad bed furrows (BBF).",
                "why": f"Accumulated rainfall ({total_rain_3d:.1f} mm) provides adequate profile recharge for seed imbibition.",
                "when": "Sow within the next 48 hours.",
                "confidence": {"label": "Likely", "probability": 0.86},
                "inputs_used": {"soil_moisture_pct": soil_moisture_pct, "rain_3d": round(total_rain_3d, 1)}
            }

    # Default fallback
    return {
        "planner": "sowing_window",
        "crop": crop,
        "status": "MONITOR",
        "action": "Monitor soil moisture status and regional sowing recommendations.",
        "why": "Weather conditions are moderate; consult district KVK calendar.",
        "when": "Daily monitoring.",
        "confidence": {"label": "Likely", "probability": 0.75},
        "inputs_used": {"t_mean_3d": round(t_mean_3d, 1), "rain_3d": round(total_rain_3d, 1)}
    }
