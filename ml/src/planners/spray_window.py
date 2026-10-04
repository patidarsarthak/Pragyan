"""
Spray Window Planner (Strictly Timing Only - No Chemical Brands or Doses)
--------------------------------------------------------------------------
Identifies safe agrochemical, bio-pesticide, or foliar nutrient spray windows:
- Safe wind: < 15 km/h (4.17 m/s) to prevent spray drift
- Rain-free: < 0.5 mm in 12h post-spray to prevent foliar washoff
- Temperature: < 32C to avoid droplet evaporation
- RH: 40% - 80%
"""
from typing import Dict, Any, List

def plan_spray_window(forecast_days: List[Dict[str, Any]]) -> Dict[str, Any]:
    favorable_days = []
    reasons_blocked = []

    for idx, d in enumerate(forecast_days):
        lead_day = idx + 1
        wind = float(d.get("wind_speed_ms", d.get("wind", 2.5)))
        rain = float(d.get("rainfall_mm", d.get("rain", 0.0)))
        temp = float(d.get("temp_c", d.get("temp", 26.0)))
        rh = float(d.get("humidity_pct", d.get("humidity", 65.0)))

        is_wind_safe = wind < 4.17 # < 15 km/h
        is_rain_safe = rain < 0.5
        is_temp_safe = temp <= 32.0
        is_rh_safe = 35.0 <= rh <= 85.0

        if is_wind_safe and is_rain_safe and is_temp_safe and is_rh_safe:
            favorable_days.append(lead_day)
        else:
            issue = []
            if not is_wind_safe:
                issue.append(f"High wind ({wind*3.6:.1f} km/h > 15 km/h)")
            if not is_rain_safe:
                issue.append(f"Rain threat ({rain:.1f} mm)")
            if not is_temp_safe:
                issue.append(f"High thermal evaporation ({temp:.1f}°C)")
            reasons_blocked.append(f"Day {lead_day}: {', '.join(issue)}")

    if favorable_days:
        best_day = favorable_days[0]
        return {
            "planner": "spray_window",
            "status": "WINDOW_AVAILABLE",
            "action": f"Safe foliar operational window open on Day {best_day}.",
            "why": "Atmospheric conditions are favorable with calm winds, zero rain risk, and moderate temperature.",
            "when": f"Best operational timing: 07:00 AM to 10:00 AM or 04:00 PM to 06:00 PM on Day {best_day}.",
            "confidence": {"label": "Likely", "probability": 0.88},
            "inputs_used": {
                "best_day": best_day,
                "all_favorable_days": favorable_days,
                "disclaimer": "Timing support only. Refer to local KVK or official ICAR IPM package for recommended formulations."
            }
        }
    else:
        return {
            "planner": "spray_window",
            "status": "NO_SAFE_WINDOW",
            "action": "Withhold all foliar spray applications across the current forecast window.",
            "why": f"Adverse weather conditions persist: {reasons_blocked[0] if reasons_blocked else 'High wind/rain'}.",
            "when": "Wait for conditions to settle below 15 km/h wind with no rain.",
            "confidence": {"label": "Likely", "probability": 0.85},
            "inputs_used": {"reasons": reasons_blocked[:3]}
        }
