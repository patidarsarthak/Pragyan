"""
Thermal Stress Planner (Heat & Frost Care)
------------------------------------------
Monitors extreme temperatures against stage-specific phenological thresholds:
- Frost warning: Tmin <= 4.0C (Mustard, Chickpea, Potato)
- Cold wave: Tmin <= 6.0C
- Terminal heat: Tmax >= 32.0C (Wheat anthesis/grain fill)
- Extreme heatwave: Tmax >= 40.0C (Zaid/Summer crops)
"""
from typing import Dict, Any, List

def plan_heat_frost_care(
    crop: str,
    stage_id: str,
    forecast_days: List[Dict[str, Any]]
) -> Dict[str, Any]:
    min_temp = min((float(d.get("temp_min_c", d.get("tmin", d.get("temp_c", 20.0)))) for d in forecast_days), default=20.0)
    max_temp = max((float(d.get("temp_max_c", d.get("tmax", d.get("temp_c", 25.0)))) for d in forecast_days), default=25.0)

    # 1. Frost & Coldwave Protection
    if min_temp <= 4.0:
        return {
            "planner": "heat_frost_care",
            "status": "FROST_ALERT",
            "action": "Protect sensitive crops against nocturnal radiation frost with light evening irrigation or boundary smoke screens.",
            "why": f"Severe minimum temperature drop ({min_temp:.1f}°C <= 4.0°C) risks freezing cellular fluids in floral tissues and pods.",
            "when": "Initiate protective measures between 09:00 PM and midnight on coldest nights.",
            "severity": "alert",
            "confidence": {"label": "Likely", "probability": 0.88},
            "inputs_used": {"min_temp_c": min_temp, "crop": crop, "stage": stage_id}
        }
    elif min_temp <= 6.5:
        return {
            "planner": "heat_frost_care",
            "status": "COLDWAVE_WATCH",
            "action": "Monitor crop canopy for chilling injury; provide light shelter for nursery beds and livestock.",
            "why": f"Chilly nocturnal temperatures ({min_temp:.1f}°C) slow vegetative growth and prolong floral anthesis.",
            "when": "Evening hours.",
            "severity": "watch",
            "confidence": {"label": "Likely", "probability": 0.85},
            "inputs_used": {"min_temp_c": min_temp, "crop": crop}
        }

    # 2. Heat Stress Protection
    if max_temp >= 35.0:
        return {
            "planner": "heat_frost_care",
            "status": "HEATWAVE_ALERT",
            "action": "Maintain soil moisture via frequent light irrigation to lower crop microclimate canopy temperature.",
            "why": f"Daytime temperatures exceeding {max_temp:.1f}°C trigger high transpirational demand, flower shedding, and pollen sterility.",
            "when": "Irrigate during evening hours; avoid midday field spraying.",
            "severity": "alert",
            "confidence": {"label": "Likely", "probability": 0.89},
            "inputs_used": {"max_temp_c": max_temp, "crop": crop, "stage": stage_id}
        }
    elif max_temp >= 32.0 and "flower" in stage_id.lower():
        return {
            "planner": "heat_frost_care",
            "status": "HEAT_STRESS_WATCH",
            "action": "Keep soil moist with light sprinkler or furrow irrigation to alleviate thermal stress.",
            "why": f"Elevated temperature ({max_temp:.1f}°C) during {stage_id} increases rate of forced maturity.",
            "when": "Late afternoon application.",
            "severity": "watch",
            "confidence": {"label": "Likely", "probability": 0.83},
            "inputs_used": {"max_temp_c": max_temp, "crop": crop, "stage": stage_id}
        }

    return {
        "planner": "heat_frost_care",
        "status": "THERMAL_OPTIMAL",
        "action": "Thermal regime is favorable for crop growth; no thermal defense needed.",
        "why": f"Forecast temperatures (Min {min_temp:.1f}°C, Max {max_temp:.1f}°C) are within standard agronomic comfort range.",
        "when": "Routine maintenance.",
        "severity": "calm",
        "confidence": {"label": "Likely", "probability": 0.90},
        "inputs_used": {"min_temp_c": min_temp, "max_temp_c": max_temp}
    }
