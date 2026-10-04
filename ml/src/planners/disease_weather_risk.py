"""
Disease-Weather Environmental Risk Planner
------------------------------------------
STRICT GUARDRAIL 2 COMPLIANCE:
Evaluates environmental pre-conditions for fungal, bacterial, and pest outbreaks.
DOES NOT prescribe chemical brands, trade names, or dosages.
Provides weather risk classification and links to official ICAR-NCIPM / KVK packages.
"""
from typing import Dict, Any, List

def plan_disease_weather_risk(
    crop: str,
    stage_id: str,
    forecast_days: List[Dict[str, Any]]
) -> Dict[str, Any]:
    c_lower = crop.lower()
    high_rh_days = sum(1 for d in forecast_days if float(d.get("humidity_pct", 60.0)) >= 80.0)
    rain_days = sum(1 for d in forecast_days if float(d.get("rainfall_mm", 0.0)) >= 1.0)
    avg_temp = sum(float(d.get("temp_c", 25.0)) for d in forecast_days) / max(1, len(forecast_days))

    # 1. Mustard Aphid / Alternaria Blight risk
    if "mustard" in c_lower and high_rh_days >= 3 and avg_temp <= 25.0:
        return {
            "planner": "disease_weather_risk",
            "crop": crop,
            "status": "ELEVATED_PEST_RISK",
            "action": "Inspect apical twigs and under-leaf surface daily for aphid colony initiation.",
            "why": f"Overcast skies, dense humidity ({high_rh_days} days > 80% RH), and mild temperatures ({avg_temp:.1f}°C) accelerate sucking pest multiplication.",
            "when": "Scout during morning hours (08:00–11:00 AM).",
            "severity": "watch",
            "confidence": {"label": "Likely", "probability": 0.85},
            "ipm_reference": {
                "title": "ICAR-DRMR Integrated Pest Management Protocol for Mustard",
                "authority": "ICAR-DRMR Bharatpur & RVSKVV KVK Extension",
                "recommended_action": "Use yellow sticky traps (15-20/ha) and neem-based bio-formulations on boundary rows. Consult district KVK for economic threshold intervention."
            }
        }

    # 2. Chickpea Collar Rot / Wilt risk
    if "chickpea" in c_lower and rain_days >= 2 and high_rh_days >= 2:
        return {
            "planner": "disease_weather_risk",
            "crop": crop,
            "status": "ELEVATED_DISEASE_RISK",
            "action": "Ensure surface drainage and avoid human or equipment traffic while foliage is damp.",
            "why": f"Prolonged canopy wetness and wet root-zone conditions promote collar rot and fungal spore transmission.",
            "when": "Immediately inspect drainage furrows.",
            "severity": "watch",
            "confidence": {"label": "Likely", "probability": 0.83},
            "ipm_reference": {
                "title": "ICAR-IIPR Integrated Disease Management in Chickpea",
                "authority": "ICAR-IIPR Kanpur / JNKVV Jabalpur",
                "recommended_action": "Avoid water stagnation. For localized symptoms, consult nearest KVK plant pathologist."
            }
        }

    # 3. Solanaceous Blight risk (Potato/Tomato)
    if ("potato" in c_lower or "tomato" in c_lower) and high_rh_days >= 3 and 12.0 <= avg_temp <= 22.0:
        return {
            "planner": "disease_weather_risk",
            "crop": crop,
            "status": "HIGH_BLIGHT_RISK",
            "action": "Scout lower canopy for dark water-soaked leaf margins; ensure air circulation.",
            "why": f"Cool temperatures ({avg_temp:.1f}°C) coupled with persistent overcast humidity create high-risk sporulation conditions for blight pathogens.",
            "when": "Morning inspections.",
            "severity": "alert",
            "confidence": {"label": "Likely", "probability": 0.86},
            "ipm_reference": {
                "title": "ICAR-CPRI / NCIPM Blight Forewarning Protocol",
                "authority": "ICAR-Central Potato Research Institute",
                "recommended_action": "Prepare preventative bio-control cultural practices. Refer to KVK bulletin for registered eco-friendly protectants."
            }
        }

    # Low disease pressure
    return {
        "planner": "disease_weather_risk",
        "crop": crop,
        "status": "LOW_RISK",
        "action": "Continue regular agronomic scouting; environmental disease predisposition is currently low.",
        "why": f"Dry atmospheric conditions with low rainfall ({rain_days} rain days) do not favor fungal sporulation.",
        "when": "Routine weekly scouting.",
        "severity": "calm",
        "confidence": {"label": "Likely", "probability": 0.90},
        "ipm_reference": {
            "title": "Standard ICAR Good Agricultural Practices (GAP)",
            "authority": "Ministry of Agriculture & Farmers Welfare",
            "recommended_action": "Maintain clean field sanitation."
        }
    }
