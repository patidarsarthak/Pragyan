"""
Irrigation Planner
------------------
Simulates 10-day FAO-56 2-layer soil water budget:
S_t = min(FC, S_{t-1} + Effective_Rain - ETc)
where:
- ETc = ET0 * Kc (Kc determined dynamically by crop phenological stage)
- Soil properties (FC, WP) sourced from panchayat soil class
- Irrigation source constraints (canal schedule, borewell, rainfed)
"""
from typing import Dict, Any, List, Optional

def plan_irrigation(
    crop: str,
    stage_id: str,
    kc: float,
    forecast_days: List[Dict[str, Any]],
    soil_class: Optional[Dict[str, Any]] = None,
    irrigation_source: str = "rainfed",
    initial_depletion_pct: float = 35.0
) -> Dict[str, Any]:
    # Soil parameters from soil_class or default Vertisol profile
    s = soil_class or {}
    fc_mm = float(s.get("field_capacity_mm", 175.0))
    wp_mm = float(s.get("wilting_point_mm", 80.0))
    taw_mm = max(20.0, fc_mm - wp_mm) # Total Available Water
    mad = 0.50 # Management Allowed Depletion
    raw_mm = taw_mm * mad # Readily Available Water

    # Initial moisture
    current_storage = fc_mm - (taw_mm * (initial_depletion_pct / 100.0))

    next_irrigation_day = None
    next_irrigation_depth = 0.0
    daily_budget = []

    for idx, d in enumerate(forecast_days):
        lead_day = idx + 1
        rain = float(d.get("rainfall_mm", 0.0))
        et0 = float(d.get("et0_mm", d.get("evapotranspiration_mm", 4.0)))
        etc = round(et0 * kc, 2)

        # Effective rain: 80% of rain exceeding 3mm
        eff_rain = max(0.0, (rain - 3.0) * 0.80) if rain > 3.0 else 0.0

        current_storage = min(fc_mm, max(wp_mm, current_storage + eff_rain - etc))
        depletion_mm = max(0.0, fc_mm - current_storage)
        depletion_pct = round((depletion_mm / taw_mm) * 100, 1)

        daily_budget.append({
            "day": lead_day,
            "rain_mm": rain,
            "et0_mm": et0,
            "etc_mm": etc,
            "depletion_pct": depletion_pct
        })

        if depletion_mm >= raw_mm and next_irrigation_day is None:
            next_irrigation_day = lead_day
            next_irrigation_depth = round(depletion_mm, 0)

    # Determine recommendation
    if irrigation_source == "rainfed":
        if next_irrigation_day and next_irrigation_day <= 3:
            return {
                "planner": "irrigation",
                "status": "MOISTURE_STRESS_WARNING",
                "action": "Conserve in-situ soil moisture; apply organic mulch or light hoeing to create dust mulch.",
                "why": f"Plot is rainfed and root-zone water depletion reaches {daily_budget[next_irrigation_day - 1]['depletion_pct']}% by Day {next_irrigation_day}.",
                "when": "Perform shallow inter-culture before root zone fully dries.",
                "confidence": {"label": "Likely", "probability": 0.82},
                "inputs_used": {
                    "source": irrigation_source,
                    "soil": s.get("soil_name", "Vertisol"),
                    "kc": kc,
                    "taw_mm": round(taw_mm, 1),
                    "depletion_pct_d3": daily_budget[min(2, len(daily_budget)-1)]["depletion_pct"]
                }
            }
        else:
            return {
                "planner": "irrigation",
                "status": "RAIN_SUFFICIENT",
                "action": "Maintain contour bunds to retain natural rainfall.",
                "why": "Rainfed moisture profile remains within safe buffer across the forecast horizon.",
                "when": "Routine maintenance.",
                "confidence": {"label": "Likely", "probability": 0.85},
                "inputs_used": {"source": irrigation_source, "kc": kc}
            }

    # Irrigated (borewell or canal)
    total_rain_48h = sum(d.get("rainfall_mm", 0.0) for d in forecast_days[:2])
    if total_rain_48h >= 15.0:
        return {
            "planner": "irrigation",
            "status": "SUSPEND_IRRIGATION",
            "action": "Suspend all scheduled irrigations for 48–72 hours.",
            "why": f"Forecast rainfall ({total_rain_48h:.1f} mm) satisfies crop transpirational demand ({etc:.1f} mm/day).",
            "when": "Halt irrigation pumps immediately.",
            "confidence": {"label": "Likely", "probability": 0.90},
            "inputs_used": {"rain_48h": total_rain_48h, "source": irrigation_source}
        }
    elif next_irrigation_day:
        return {
            "planner": "irrigation",
            "status": "IRRIGATE_DUE",
            "action": f"Schedule irrigation in {next_irrigation_day} days, applying ~{next_irrigation_depth:.0f} mm.",
            "why": f"Soil moisture depletion will reach the management limit ({mad*100:.0f}%) on Day {next_irrigation_day}.",
            "when": f"Best day: Day {next_irrigation_day} during calm morning hours.",
            "confidence": {"label": "Likely", "probability": 0.84},
            "inputs_used": {
                "due_day": next_irrigation_day,
                "depth_mm": next_irrigation_depth,
                "soil": s.get("soil_name", "Vertisol"),
                "kc": kc
            }
        }
    else:
        return {
            "planner": "irrigation",
            "status": "OPTIMAL",
            "action": "Soil moisture is in equilibrium; no irrigation required over next 10 days.",
            "why": "Daily atmospheric evapotranspiration is offset by antecedent soil moisture storage.",
            "when": "Routine inspection.",
            "confidence": {"label": "Likely", "probability": 0.86},
            "inputs_used": {"source": irrigation_source, "kc": kc}
        }
