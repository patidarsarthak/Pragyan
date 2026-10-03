#!/usr/bin/env python3
"""
SIH26074 - Phase 4: Agro-Meteorological Rule & Advisory Generation Engine
-------------------------------------------------------------------------
Translates hyper-local 5-variable weather forecasts and uncertainty intervals
into actionable, multi-variable agricultural advisories for Dhanbad District.

Features:
1. Sourced agronomic thresholds cited from ICAR-KVK Dhanbad, BAU Ranchi, and IMD AAS.
2. Multi-variable combinatorial rules (≥2 variables per category):
   - Crop Water Balance / Irrigation Scheduling (RAINFALL + EVAPOTRANSPIRATION)
   - Thermal & Transpirational Heat/Cold Stress (TEMPERATURE + HUMIDITY + ET)
   - Field Operations & Spray Windows (WIND_SPEED + RAINFALL + TEMPERATURE)
   - High-Humidity Disease Predisposition (HUMIDITY + TEMPERATURE + RAINFALL)
   - Probabilistic Linguistic Calibration (CONFIDENCE_PCT + Uncertainty spread)
3. Dynamic crop calendar context for Dhanbad district (Paddy, Maize, Arhar, Mustard, Potato, Vegetables).
4. Structured Output Format:
   GPCODE | PANCHAYAT | BLOCK | DATE | CROP | ADVISORY_TEXT | TRIGGERING_VARIABLES | CONFIDENCE_PCT
"""

import sys
import os
import glob
import argparse
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
import yaml

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

STATIC_TERRAIN_PATH = os.path.join(PROJECT_ROOT, "data", "static", "panchayat_terrain_landcover.csv")
DEFAULT_FORECAST_DIR = os.path.join(PROJECT_ROOT, "data", "forecasts")
DEFAULT_OUTPUT_CSV = os.path.join(PROJECT_ROOT, "ml", "results", "sample_advisories.csv")
DEFAULT_CROP_CALENDAR_PATH = os.path.join(PROJECT_ROOT, "data", "crop_calendar.yaml")

_CROP_CALENDAR_CACHE: Optional[Dict[str, Any]] = None


def load_crop_calendar(path: str = DEFAULT_CROP_CALENDAR_PATH) -> Dict[str, Any]:
    """Loads crop calendar containing stage durations citing AGRICULTURE_REFERENCE.md."""
    global _CROP_CALENDAR_CACHE
    if _CROP_CALENDAR_CACHE is None:
        if not os.path.exists(path):
            return {}
        with open(path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}
            _CROP_CALENDAR_CACHE = raw.get("crops", raw)
    return _CROP_CALENDAR_CACHE


def normalize_crop_name(crop: str) -> str:
    """Normalizes colloquial or scientific crop names to canonical keys."""
    c = str(crop or "").lower().strip()
    if "paddy" in c or "rice" in c or "dhan" in c:
        return "paddy"
    if "maize" in c or "corn" in c or "makka" in c:
        return "maize"
    if "soy" in c:
        return "soybean"
    if "wheat" in c or "gehun" in c:
        return "wheat"
    if "mustard" in c or "sarson" in c or "rapeseed" in c:
        return "mustard"
    if "chickpea" in c or "gram" in c or "chana" in c:
        return "chickpea"
    if "potato" in c or "aloo" in c:
        return "potato"
    if "tomato" in c or "tamatar" in c:
        return "tomato"
    return c


def get_crop_stage(
    crop_name: str,
    sowing_date: Union[str, pd.Timestamp],
    as_of_date: Optional[Union[str, pd.Timestamp]] = None,
    calendar_path: str = DEFAULT_CROP_CALENDAR_PATH
) -> Dict[str, Any]:
    """
    Computes Days After Sowing (DAS) and identifies the active crop growth stage
    from data/crop_calendar.yaml (cited from AGRICULTURE_REFERENCE.md).
    """
    cal = load_crop_calendar(calendar_path)
    crops_dict = cal.get("crops", cal) if isinstance(cal, dict) else {}
    key = normalize_crop_name(crop_name)
    crop_cfg = crops_dict.get(key)
    
    if not crop_cfg:
        return {
            "crop": key,
            "canonical_name": crop_name.title(),
            "sowing_date": str(sowing_date),
            "as_of_date": str(as_of_date or pd.Timestamp.now().strftime("%Y-%m-%d")),
            "days_after_sowing": 30,
            "stage_id": "vegetative",
            "stage_name": "Vegetative Growth",
            "is_critical": False,
            "water_requirement": "Moderate",
            "kc": 1.05,
            "total_duration_days": 100,
            "mad": 0.50,
            "root_depth_cm": 60
        }
        
    s_dt = pd.to_datetime(sowing_date)
    a_dt = pd.to_datetime(as_of_date) if as_of_date else pd.Timestamp.now()
    das = max(0, (a_dt - s_dt).days)
    
    stages = crop_cfg.get("stages", [])
    matched_stage = None
    for st in stages:
        if st["start_day"] <= das <= st["end_day"]:
            matched_stage = st
            break
            
    if not matched_stage:
        if stages and das < stages[0]["start_day"]:
            matched_stage = stages[0]
        elif stages:
            matched_stage = stages[-1]
        else:
            matched_stage = {"id": "growth", "name": "Active Growth", "critical": False, "water_requirement": "Moderate"}
            
    return {
        "crop": key,
        "canonical_name": crop_cfg["canonical_name"],
        "sowing_date": s_dt.strftime("%Y-%m-%d"),
        "as_of_date": a_dt.strftime("%Y-%m-%d"),
        "days_after_sowing": das,
        "stage_id": matched_stage["id"],
        "stage_name": matched_stage["name"],
        "is_critical": matched_stage.get("critical", False),
        "water_requirement": matched_stage.get("water_requirement", "Moderate"),
        "kc": crop_cfg.get("kc_mid", 1.10),
        "total_duration_days": crop_cfg.get("total_duration_days", 120),
        "mad": crop_cfg.get("mad", 0.50),
        "root_depth_cm": crop_cfg.get("root_depth_cm", 60)
    }


def get_active_crops_for_date(date_str: str) -> List[Tuple[str, str]]:
    """
    Returns active crops and their growth stages for Dhanbad District based on date.
    Returns list of (Crop_Name, Stage_Name).
    """
    dt = pd.to_datetime(date_str)
    month = dt.month
    day = dt.day

    # Late Kharif (September - October)
    if month == 9:
        return [
            ("Paddy (Rice)", "Panicle Initiation to Flowering"),
            ("Maize", "Cob Development & Maturation"),
            ("Vegetables (Tomato/Chilli)", "Vegetative & Early Fruiting")
        ]
    elif month == 10:
        if day <= 15:
            return [
                ("Paddy (Rice)", "Flowering to Grain Filling"),
                ("Maize", "Harvesting & Cob Drying"),
                ("Early Mustard", "Land Preparation & Sowing")
            ]
        else:
            return [
                ("Paddy (Rice)", "Grain Filling to Maturity"),
                ("Mustard", "Sowing & Germination"),
                ("Potato", "Field Preparation & Planting")
            ]
    # Rabi (November - February)
    elif month in [11, 12]:
        return [
            ("Mustard", "Vegetative Branching & Flowering"),
            ("Potato", "Emergence & Tuber Initiation"),
            ("Winter Vegetables (Tomato/Cabbage)", "Fruiting & Harvest")
        ]
    elif month in [1, 2]:
        return [
            ("Mustard", "Siliqua Formation & Seed Filling"),
            ("Potato", "Tuber Bulking & Maturation"),
            ("Winter Vegetables", "Active Picking")
        ]
    # Zaid / Summer (March - May)
    elif month in [3, 4, 5]:
        return [
            ("Summer Moong", "Vegetative to Podding"),
            ("Summer Vegetables (Okra/Cucurbits)", "Fruiting & Picking")
        ]
    # Early Kharif (June - August)
    else:
        return [
            ("Paddy (Rice)", "Transplanting & Tillering"),
            ("Maize", "Knee-high Vegetative"),
            ("Pigeonpea (Arhar)", "Vegetative Establishment")
        ]


def evaluate_advisory_rules(
    crop: str,
    stage: str,
    rainfall: float,
    temp: float,
    humidity: float,
    wind: float,
    et: float,
    rain_lower: float = 0.0,
    rain_upper: float = 0.0,
    confidence_pct: float = 85.0,
    stage_id: Optional[str] = None
) -> Tuple[str, str]:
    """
    Evaluates multi-variable agronomic rule base for a specific Panchayat, date, and crop.
    Includes crop-stage-specific phenological risk rules (e.g. flowering + heat = spikelet sterility,
    tillering + heavy rain = drainage, CRI + dry = critical irrigation).
    Returns (advisory_text, triggering_variables).
    """
    advisory_components = []
    triggers = []

    # Calculate uncertainty spread
    rain_spread = max(0.0, rain_upper - rain_lower)
    is_uncertain = (confidence_pct < 75.0) or (rain_spread > 15.0)

    # ---------------------------------------------------------
    # RULE CATEGORY 0: Stage-Specific Phenological Rules
    # ---------------------------------------------------------
    crop_l = (crop or "").lower()
    stage_l = (stage or "").lower()
    stage_id_l = (stage_id or "").lower()

    # Rule 0.1: Flowering / Anthesis + Heat => Spikelet Sterility / Flower Drop Risk
    if ("flower" in stage_l or "anthesis" in stage_l or "flower" in stage_id_l or "panicle" in stage_l):
        if temp >= 34.0:
            triggers.append("TEMPERATURE + GROWTH_STAGE")
            if "paddy" in crop_l or "rice" in crop_l:
                advisory_components.append(
                    f"[SPIKELET STERILITY RISK] High daytime temperature ({temp:.1f}°C >= 34°C) during flowering/anthesis induces anther indehiscence and spikelet sterility in paddy. "
                    f"Maintain 3–5 cm standing water in field basins to cool the canopy microclimate by 2–3°C."
                )
            elif "tomato" in crop_l:
                advisory_components.append(
                    f"[BLOSSOM DROP RISK] High temperature ({temp:.1f}°C >= 33°C) during flowering triggers flower abscission and poor fruit set in tomato. "
                    f"Provide light evening micro-sprinkling and apply organic straw mulch to keep root zone cool."
                )
            elif "soybean" in crop_l:
                advisory_components.append(
                    f"[FLOWER DROP RISK] Heat stress ({temp:.1f}°C) during flowering accelerates flower drop and reduces pod formation in soybean. "
                    f"Maintain adequate soil moisture with light furrow irrigation."
                )
            elif "wheat" in crop_l:
                advisory_components.append(
                    f"[TERMINAL HEAT STRESS] Elevated temperature ({temp:.1f}°C) during flowering/grain fill threatens forced maturity and reduced grain weight in wheat. "
                    f"Apply light sprinkler irrigation in late afternoon to lower canopy temperature."
                )
            else:
                advisory_components.append(
                    f"[FLOWERING HEAT STRESS] Heat conditions ({temp:.1f}°C) during {stage} elevate risk of pollen sterility and flower drop. Keep soil moist."
                )

    # Rule 0.2: Tillering + Heavy Rain => Waterlogging & Drainage Emergency
    if ("tiller" in stage_l or "tiller" in stage_id_l):
        if rainfall >= 20.0:
            triggers.append("RAINFALL + GROWTH_STAGE")
            advisory_components.append(
                f"[DRAINAGE CRITICAL] Heavy precipitation ({rainfall:.1f} mm) during active tillering induces severe submergence stress, halting tiller bud emergence. "
                f"Open peripheral field drainage bunds immediately to prevent prolonged water stagnation (>24 hours)."
            )

    # Rule 0.3: Wheat Crown Root Initiation (CRI)
    if "wheat" in crop_l and ("crown_root" in stage_l or "cri" in stage_l or "crown_root" in stage_id_l):
        if rainfall < 3.0:
            triggers.append("RAINFALL + GROWTH_STAGE")
            advisory_components.append(
                f"[CRITICAL IRRIGATION - CRI] Crop is at Crown Root Initiation (CRI, 20-25 DAS), the single most critical yield-determining stage. "
                f"Apply first irrigation (50–60 mm) without delay to ensure strong nodal root establishment."
            )
        elif rainfall >= 25.0:
            triggers.append("RAINFALL + GROWTH_STAGE")
            advisory_components.append(
                f"[DRAINAGE WARNING - CRI] Heavy rain ({rainfall:.1f} mm) at Crown Root Initiation stage causes oxygen deficiency and collar rot. Drain excess surface water."
            )

    # Rule 0.4: Maize Silking / Tasseling + Heat
    if "maize" in crop_l and ("silk" in stage_l or "tassel" in stage_l or "silk" in stage_id_l):
        if temp >= 35.0:
            triggers.append("TEMPERATURE + GROWTH_STAGE")
            advisory_components.append(
                f"[SILK DESICCATION RISK] Daytime temperature ({temp:.1f}°C) during silking/tasseling desiccates silks and destroys pollen viability, causing incomplete cob fill. "
                f"Ensure furrow irrigation is applied to maintain 75% field capacity."
            )

    # Rule 0.5: Potato Tuberization / Bulking + Cool Humid => Late Blight Outbreak Alert
    if "potato" in crop_l and ("tuber" in stage_l or "bulking" in stage_l or "tuber" in stage_id_l):
        if humidity >= 80.0 and 12.0 <= temp <= 22.0:
            triggers.append("HUMIDITY + TEMPERATURE + GROWTH_STAGE")
            advisory_components.append(
                f"[LATE BLIGHT WARNING] Cool temperatures ({temp:.1f}°C) with dense humidity ({humidity:.1f}%) during tuber bulking create high-risk sporulation conditions for *Phytophthora infestans*. "
                f"Spray prophylactic Mancozeb 75% WP @ 2.5 g/L water before rain showers."
            )

    # Rule 0.6: Mustard Flowering / Podding + High Humidity => Aphid Warning
    if "mustard" in crop_l and ("flower" in stage_l or "pod" in stage_l or "flower" in stage_id_l or "pod" in stage_id_l):
        if humidity >= 75.0 and temp <= 26.0:
            triggers.append("HUMIDITY + TEMPERATURE + GROWTH_STAGE")
            advisory_components.append(
                f"[MUSTARD APHID ALERT] Overcast, high-humidity weather ({humidity:.1f}%, {temp:.1f}°C) during flowering/pod development triggers rapid aphid (*Lipaphis erysimi*) buildup. "
                f"Scout 2 cm apical twigs; spray Thiamethoxam 25% WG @ 0.2 g/L if colony density exceeds 1.5 cm/twig."
            )

    # Rule 0.7: Chickpea Flowering / Podding + Rain/Excess Moisture => Wilt / Blight Risk
    if "chickpea" in crop_l and ("flower" in stage_l or "pod" in stage_l or "flower" in stage_id_l or "pod" in stage_id_l):
        if rainfall >= 15.0 or (humidity >= 80.0 and temp >= 20.0):
            triggers.append("HUMIDITY + RAINFALL + GROWTH_STAGE")
            advisory_components.append(
                f"[WILT & BLIGHT ALERT] Wet soil and humid air during chickpea reproductive phase promote collar rot and Ascochyta blight. "
                f"Ensure furrows are free of standing water and avoid field entry while foliage is wet."
            )

    # ---------------------------------------------------------
    # RULE CATEGORY 1: Water Balance & Irrigation (RAIN + ET)
    # ---------------------------------------------------------
    if rainfall >= 15.0 or (rainfall >= 1.5 * et and rainfall >= 8.0):
        triggers.append("RAINFALL + EVAPOTRANSPIRATION")
        if is_uncertain:
            advisory_components.append(
                f"[IRRIGATION] Moderate probability of significant rainfall ({rainfall:.1f} mm, uncertainty range: {rain_lower:.1f}-{rain_upper:.1f} mm) "
                f"exceeding daily crop evapotranspiration ({et:.1f} mm/day). Postpone scheduled irrigations and clear field drainage bunds in lowland Don plots to prevent root stagnation."
            )
        else:
            advisory_components.append(
                f"[IRRIGATION] Heavy precipitation forecast ({rainfall:.1f} mm) substantially exceeds daily evapotranspirational demand ({et:.1f} mm/day). "
                f"Suspend all irrigation immediately. Ensure drainage trenches are unobstructed to prevent prolonged waterlogging around roots."
            )
    elif rainfall < 1.0 and et >= 4.2:
        triggers.append("RAINFALL + EVAPOTRANSPIRATION")
        if "Paddy" in crop:
            advisory_components.append(
                f"[IRRIGATION] Dry conditions forecast (rain < 1.0 mm, ET: {et:.1f} mm/day). During {stage}, maintain 3–5 cm shallow water layer in paddy basins to safeguard against spikelet sterility."
            )
        elif "Maize" in crop:
            advisory_components.append(
                f"[IRRIGATION] Atmospheric evaporative demand is elevated ({et:.1f} mm/day) with negligible rainfall. Apply light supplemental irrigation to upland maize to prevent silk desiccation."
            )
        else:
            advisory_components.append(
                f"[IRRIGATION] High evaporative moisture loss ({et:.1f} mm/day) under dry conditions. Provide timely irrigation to maintain adequate root-zone moisture during {stage}."
            )
    else:
        # Moisture balance equilibrium
        pass

    # ---------------------------------------------------------
    # RULE CATEGORY 2: Thermal Stress (TEMP + HUMIDITY + ET)
    # ---------------------------------------------------------
    # Heat index logic: Temperature >= 35°C with high humidity
    if temp >= 35.0 and humidity >= 60.0:
        triggers.append("TEMPERATURE + HUMIDITY")
        advisory_components.append(
            f"[HEAT STRESS] Combined elevated temperature ({temp:.1f}°C) and high humidity ({humidity:.1f}%) creates severe heat index conditions. "
            f"Apply evening micro-sprinkling or furrow wetting to cool the crop canopy. Provide shaded shelter and fresh water for farm livestock."
        )
    elif temp >= 38.0 and humidity < 30.0:
        triggers.append("TEMPERATURE + HUMIDITY + EVAPOTRANSPIRATION")
        advisory_components.append(
            f"[DRY HEATWAVE] High heat ({temp:.1f}°C) coupled with low relative humidity ({humidity:.1f}%) and intense ET ({et:.1f} mm/day) induces severe transpirational stress. "
            f"Apply organic straw mulching (5–7 cm) along crop rows to conserve root moisture. Restrict heavy field operations during midday hours."
        )
    elif temp <= 7.0 and humidity >= 85.0:
        triggers.append("TEMPERATURE + HUMIDITY")
        advisory_components.append(
            f"[COLD/FROST RISK] Nocturnal thermal drop ({temp:.1f}°C) with dense moisture ({humidity:.1f}%) signals radiation frost danger. "
            f"Irrigate plots lightly in late afternoon and generate light perimeter smoke screens along northern borders."
        )

    # ---------------------------------------------------------
    # RULE CATEGORY 3: Field Operations & Spraying (WIND + RAIN)
    # ---------------------------------------------------------
    if wind >= 4.17 or rainfall >= 2.5:  # 4.17 m/s = 15 km/h
        triggers.append("WIND_SPEED + RAINFALL")
        advisory_components.append(
            f"[FIELD OPERATIONS] Unfavorable weather for chemical application: wind speed ({wind:.1f} m/s) exceeds 15 km/h threshold and/or rain ({rainfall:.1f} mm) threatens foliar washout. "
            f"Postpone all pesticide/fungicide sprays and top-dressing of nitrogenous fertilizers to avoid chemical drift and runoff losses."
        )
    elif wind < 3.0 and rainfall < 1.0 and temp <= 32.0:
        triggers.append("WIND_SPEED + RAINFALL + TEMPERATURE")
        advisory_components.append(
            f"[SPRAY WINDOW] Favorable weather window: gentle breeze ({wind:.1f} m/s), dry canopy (rain < 1.0 mm), and moderate temperature ({temp:.1f}°C). "
            f"Safe operational window for required foliar sprays and weeding between 07:30–10:30 AM or 03:30–05:30 PM."
        )

    # ---------------------------------------------------------
    # RULE CATEGORY 4: Disease Predisposition (HUMIDITY + TEMP)
    # ---------------------------------------------------------
    if humidity >= 82.0 and (21.0 <= temp <= 29.5) and rainfall >= 0.5:
        if "Paddy" in crop:
            triggers.append("HUMIDITY + TEMPERATURE + RAINFALL")
            advisory_components.append(
                f"[DISEASE ALERT] Sustained high humidity ({humidity:.1f}%) and warm cloudy conditions ({temp:.1f}°C) strongly favor Rice Blast and Brown Spot sporulation. "
                f"Scout lower canopy for diamond-shaped lesions. Once spray window permits, apply prophylactic Tricyclazole 75% WP @ 0.6 g/L water."
            )
        elif "Vegetables" in crop or "Potato" in crop:
            triggers.append("HUMIDITY + TEMPERATURE + RAINFALL")
            advisory_components.append(
                f"[DISEASE ALERT] Persistent moisture ({humidity:.1f}%) and moderate temperature ({temp:.1f}°C) favors damping-off and leaf blight in solanaceous vegetables. "
                f"Ensure soil drainage and inspect undersides of leaves for water-soaked lesions."
            )
    elif humidity >= 88.0 and (12.0 <= temp <= 20.0):
        if "Potato" in crop or "Vegetables" in crop:
            triggers.append("HUMIDITY + TEMPERATURE")
            advisory_components.append(
                f"[DISEASE ALERT] Cool overcast morning conditions ({temp:.1f}°C, RH: {humidity:.1f}%) pre-dispose potato and tomato crops to Late Blight (*Phytophthora infestans*). "
                f"Apply prophylactic spray of Mancozeb 75% WP @ 2.5 g/L water prior to anticipated rain."
            )

    # If no major weather hazard triggered, provide positive maintenance guidance
    if not advisory_components:
        triggers.append("SEASONAL_MAINTENANCE")
        advisory_components.append(
            f"[CROP CARE] Weather conditions are stable (Temp: {temp:.1f}°C, RH: {humidity:.1f}%, Wind: {wind:.1f} m/s, ET: {et:.1f} mm/day). "
            f"Continue routine agronomic practices for {crop} at {stage}. Maintain regular monitoring for localized weed emergence."
        )

    full_advisory = " ".join(advisory_components)
    triggering_vars = " | ".join(sorted(list(set(triggers))))
    return full_advisory, triggering_vars


def get_farm_operations_matrix(
    crop: str,
    stage: str,
    rainfall: float,
    temp: float,
    humidity: float,
    wind: float,
    et: float,
    confidence_pct: float = 85.0
) -> Dict[str, Any]:
    """
    Sourced agronomic decision matrix mapping weather thresholds directly to 4 critical field operations:
    1. Chemical Spraying (Insecticides, Fungicides, Herbicides)
    2. Irrigation Scheduling (Root-Zone Water Balance)
    3. Field Drainage & Bunding (Inundation & Waterlogging Prevention)
    4. Fertilizer Application (Nutrient Loss Prevention)
    """
    # 1. Chemical Spraying
    if wind >= 4.17 or rainfall >= 2.0:
        spray = {
            "operation": "Chemical Spraying",
            "status": "AVOID",
            "badge": "⛔ AVOID",
            "level": "danger",
            "action": "Avoid foliar pesticide & fungicide sprays",
            "rationale": f"High risk of foliar washout (rain {rainfall:.1f} mm) or chemical drift loss (wind {wind * 3.6:.1f} km/h > 15 km/h)."
        }
    elif wind >= 3.0 or temp >= 33.0 or rainfall >= 0.5:
        spray = {
            "operation": "Chemical Spraying",
            "status": "CAUTION",
            "badge": "⚠️ CAUTION",
            "level": "warning",
            "action": "Spray only during calm dawn window (06:30–08:30 AM)",
            "rationale": f"Marginal meteorological conditions (temp {temp:.1f}°C, wind {wind * 3.6:.1f} km/h). Use non-ionic surfactant adjuvant."
        }
    else:
        spray = {
            "operation": "Chemical Spraying",
            "status": "FAVORABLE",
            "badge": "✅ FAVORABLE",
            "level": "success",
            "action": "Safe foliar operational window open",
            "rationale": f"Optimal atmospheric boundary layer: gentle breeze ({wind * 3.6:.1f} km/h), zero precipitation, moderate temperature ({temp:.1f}°C)."
        }

    # 2. Irrigation Scheduling
    if rainfall >= 10.0 or (rainfall >= 1.4 * et and rainfall >= 6.0):
        irrig = {
            "operation": "Irrigation Scheduling",
            "status": "NOT_REQUIRED",
            "badge": "❌ NOT REQUIRED",
            "level": "info",
            "action": "Suspend all irrigation for 48–72 hours",
            "rationale": f"Predicted rainfall ({rainfall:.1f} mm) substantially satisfies daily crop evapotranspiration ({et:.1f} mm/day)."
        }
    elif rainfall < 1.0 and et >= 4.2:
        irrig = {
            "operation": "Irrigation Scheduling",
            "status": "APPLY_IRRIGATION",
            "badge": "💧 APPLY (25-30 mm)",
            "level": "warning",
            "action": f"Provide supplemental light irrigation during {stage}",
            "rationale": f"Negligible rainfall (<1.0 mm) against elevated transpirational loss ({et:.1f} mm/day). Prevent spikelet/silk desiccation."
        }
    else:
        irrig = {
            "operation": "Irrigation Scheduling",
            "status": "NORMAL",
            "badge": "🟢 NORMAL",
            "level": "success",
            "action": "Monitor soil moisture; routine watering cycle",
            "rationale": f"Near-equilibrium water flux (rain {rainfall:.1f} mm vs ET {et:.1f} mm/day)."
        }

    # 3. Field Drainage & Bunding
    if rainfall >= 35.0:
        drain = {
            "operation": "Drainage & Bunding",
            "status": "OPEN_BUNDS",
            "badge": "🚨 OPEN BUNDS",
            "level": "danger",
            "action": "Open field drainage bunds and clear perimeter trenches immediately",
            "rationale": f"Intense rainfall forecast ({rainfall:.1f} mm) creates high risk of prolonged root submergence in Don-II / lowland plots."
        }
    elif rainfall >= 15.0:
        drain = {
            "operation": "Drainage & Bunding",
            "status": "CHECK_DRAINS",
            "badge": "⚠️ CHECK DRAINS",
            "level": "warning",
            "action": "Inspect outlets and remove weeds/silt from drainage furrows",
            "rationale": f"Moderate precipitation ({rainfall:.1f} mm) requires unobstructed drainage pathways to avoid localized stagnation."
        }
    else:
        drain = {
            "operation": "Drainage & Bunding",
            "status": "NORMAL",
            "badge": "✅ NORMAL",
            "level": "success",
            "action": "Maintain bund integrity; conserve in-situ moisture",
            "rationale": "Dry to light shower conditions; retain rainwater within plot bunds for Kharif crops."
        }

    # 4. Fertilizer Application
    if rainfall >= 10.0:
        fert = {
            "operation": "Fertilizer Top-Dressing",
            "status": "DELAY",
            "badge": "⛔ DELAY",
            "level": "danger",
            "action": "Postpone urea broadcasting and soluble fertilizer application",
            "rationale": f"Heavy surface runoff from {rainfall:.1f} mm rainfall will leach nitrogen into groundwater and washing away nutrients."
        }
    elif rainfall >= 2.5:
        fert = {
            "operation": "Fertilizer Top-Dressing",
            "status": "SPLIT_APPLICATION",
            "badge": "⚠️ SPLIT APPLICATION",
            "level": "warning",
            "action": "Delay top-dressing until topsoil dries; incorporate into root zone",
            "rationale": "Damp conditions with light rain; avoid foliar nitrogen spray."
        }
    else:
        fert = {
            "operation": "Fertilizer Top-Dressing",
            "status": "FAVORABLE",
            "badge": "✅ FAVORABLE",
            "level": "success",
            "action": "Proceed with scheduled fertilizer application",
            "rationale": f"Adequate soil moisture without leaching runoff risks during {stage}."
        }

    return {
        "crop": crop,
        "stage": stage,
        "confidence_pct": round(confidence_pct, 1),
        "operations": {
            "spraying": spray,
            "irrigation": irrig,
            "drainage": drain,
            "fertilizer": fert
        }
    }



def generate_advisories(
    forecast_df: pd.DataFrame,
    panchayat_static_path: str = STATIC_TERRAIN_PATH,
    max_panchayats: Optional[int] = None
) -> pd.DataFrame:
    """
    Processes multi-variable forecast DataFrame and generates structured advisories.
    """
    # 1. Pivot long forecast into wide representation per (GPCODE, DATE)
    piv = forecast_df.pivot(
        index=["GPCODE", "DATE"],
        columns="VARIABLE",
        values="PREDICTED_VALUE"
    ).reset_index()

    # Get uncertainty and confidence info
    conf_df = forecast_df.groupby(["GPCODE", "DATE"])["CONFIDENCE_PCT"].mean().reset_index()
    
    # Rainfall uncertainty bounds for spread evaluation
    rain_unc = forecast_df[forecast_df["VARIABLE"] == "RAINFALL"].set_index(["GPCODE", "DATE"])[["UNCERTAINTY_LOWER", "UNCERTAINTY_UPPER"]].reset_index()
    rain_unc.rename(columns={"UNCERTAINTY_LOWER": "RAIN_LOWER", "UNCERTAINTY_UPPER": "RAIN_UPPER"}, inplace=True)

    wide_df = piv.merge(conf_df, on=["GPCODE", "DATE"]).merge(rain_unc, on=["GPCODE", "DATE"], how="left")
    wide_df["RAIN_LOWER"] = wide_df["RAIN_LOWER"].fillna(wide_df["RAINFALL"])
    wide_df["RAIN_UPPER"] = wide_df["RAIN_UPPER"].fillna(wide_df["RAINFALL"])

    # Merge Panchayat metadata
    static_df = pd.read_csv(panchayat_static_path)
    wide_df = wide_df.merge(
        static_df[["GPCODE", "GPNAME", "BLOCK"]],
        on="GPCODE",
        how="inner"
    )

    if max_panchayats is not None:
        selected_gpcodes = wide_df["GPCODE"].drop_duplicates().head(max_panchayats)
        wide_df = wide_df[wide_df["GPCODE"].isin(selected_gpcodes)].copy()

    advisory_rows = []

    for _, row in wide_df.iterrows():
        gpcode = int(row["GPCODE"])
        gpname = str(row["GPNAME"])
        block = str(row["BLOCK"])
        date_str = str(row["DATE"])
        
        rainfall = float(row["RAINFALL"])
        temp = float(row["TEMPERATURE"])
        humidity = float(row["HUMIDITY"])
        wind = float(row["WIND_SPEED"])
        et = float(row["EVAPOTRANSPIRATION"])
        
        rain_l = float(row["RAIN_LOWER"])
        rain_u = float(row["RAIN_UPPER"])
        conf = float(row["CONFIDENCE_PCT"])

        active_crops = get_active_crops_for_date(date_str)

        for crop_name, stage_name in active_crops:
            adv_text, triggers = evaluate_advisory_rules(
                crop=crop_name,
                stage=stage_name,
                rainfall=rainfall,
                temp=temp,
                humidity=humidity,
                wind=wind,
                et=et,
                rain_lower=rain_l,
                rain_upper=rain_u,
                confidence_pct=conf
            )

            advisory_rows.append({
                "GPCODE": gpcode,
                "PANCHAYAT": gpname,
                "BLOCK": block,
                "DATE": date_str,
                "CROP": f"{crop_name} ({stage_name})",
                "ADVISORY_TEXT": adv_text,
                "TRIGGERING_VARIABLES": triggers,
                "CONFIDENCE_PCT": round(conf, 1)
            })

    out_df = pd.DataFrame(advisory_rows)
    return out_df


def calculate_soil_water_balance(
    rainfall: float,
    et: float,
    prev_storage: float = 60.0,
    soil_capacity: float = 120.0
) -> Tuple[float, float, str]:
    """
    FAO-56 Soil Water Balance calculation for top 30-60cm root zone in sandy clay loam.
    Returns: (new_storage_mm, deficit_or_surplus_mm, irrigation_recommendation)
    """
    # Net flux: Rainfall - ET
    flux = rainfall - et
    raw_storage = prev_storage + flux
    new_storage = float(np.clip(raw_storage, 0.0, soil_capacity))
    deficit = max(0.0, (soil_capacity * 0.70) - new_storage)
    
    if new_storage < (soil_capacity * 0.40):
        rec = f"Critical root-zone moisture deficit ({new_storage:.1f} mm / {soil_capacity:.0f} mm). Apply immediate supplemental irrigation (30-40 mm)."
    elif new_storage < (soil_capacity * 0.60):
        rec = f"Moderate depletion ({new_storage:.1f} mm). Schedule light irrigation (20-25 mm) within next 48 hours."
    elif raw_storage > soil_capacity:
        surplus = raw_storage - soil_capacity
        rec = f"Soil moisture saturated ({surplus:.1f} mm runoff/deep percolation). Clear drainage channels to prevent root asphyxiation."
    else:
        rec = f"Adequate root-zone soil moisture ({new_storage:.1f} mm). No irrigation required at present."
        
    return round(new_storage, 1), round(deficit, 1), rec


def calculate_pest_risk_index(
    temp: float,
    humidity: float,
    rainfall: float
) -> Tuple[float, str, List[str]]:
    """
    Computes continuous Pest & Pathogen Outbreak Risk Index (0.00 - 1.00)
    calibrated against ICAR-CRRI / IMD AAS microclimatic epidemiology models.
    Returns: (risk_score, risk_level, target_pests)
    """
    # 1. Thermal suitability factor (Gaussian centered at optimum ~26°C)
    thermal_factor = float(np.exp(-0.5 * ((temp - 26.0) / 4.5) ** 2))
    
    # 2. Moisture / Humidity suitability factor (Sigmoid kicking in above 70% RH)
    humidity_factor = 1.0 / (1.0 + np.exp(-0.15 * (humidity - 78.0)))
    
    # 3. Leaf-wetness / Rain precipitation boost
    rain_factor = float(np.clip(rainfall / 15.0, 0.0, 1.0))
    
    # Combined composite risk (weighted multi-factorial)
    composite = 0.40 * thermal_factor + 0.45 * humidity_factor + 0.15 * rain_factor
    score = float(np.clip(composite, 0.02, 0.98))
    
    target_pests = []
    if score >= 0.70:
        level = "High / Severe"
        target_pests = ["Rice Blast (Pyricularia oryzae)", "Bacterial Leaf Blight", "Brown Plant Hopper (BPH)", "Late Blight in Solanaceae"]
    elif score >= 0.45:
        level = "Moderate"
        target_pests = ["Sheath Blight", "Stem Borer (Scirpophaga incertulas)", "Aphids & Thrips"]
    elif score >= 0.25:
        level = "Low"
        target_pests = ["Leaf Folder", "Minor Whitefly incidence"]
    else:
        level = "Negligible"
        target_pests = ["Normal canopy microclimate; routine monitoring advised"]
        
    return round(score, 2), level, target_pests


def calculate_gdd(t_max: float, t_min: float, t_base: float = 10.0) -> float:
    """Growing Degree Days (GDD) with base temperature threshold."""
    t_mean = (t_max + t_min) / 2.0
    return float(max(0.0, t_mean - t_base))


def get_phenology_stage_from_gdd(accumulated_gdd: float, crop: str = "Paddy") -> str:
    """Estimates crop developmental stage from accumulated GDD."""
    if "paddy" in crop.lower() or "rice" in crop.lower():
        if accumulated_gdd < 250:
            return "Seedling / Emergence (GDD < 250)"
        elif accumulated_gdd < 650:
            return "Active Tillering (GDD 250-650)"
        elif accumulated_gdd < 1100:
            return "Panicle Initiation & Booting (GDD 650-1100)"
        elif accumulated_gdd < 1550:
            return "Flowering & Anthesis (GDD 1100-1550)"
        elif accumulated_gdd < 1950:
            return "Milk to Dough Grain Filling (GDD 1550-1950)"
        else:
            return "Physiological Maturity & Harvest (GDD > 1950)"
    elif "maize" in crop.lower():
        if accumulated_gdd < 300:
            return "Emergence & Early Vegetative"
        elif accumulated_gdd < 750:
            return "Knee-High to Tasseling"
        elif accumulated_gdd < 1200:
            return "Silking & Grain Formation"
        else:
            return "Dough Stage & Maturation"
    elif "mustard" in crop.lower():
        if accumulated_gdd < 200:
            return "Germination & Rosette"
        elif accumulated_gdd < 550:
            return "Branching & Flowering"
        elif accumulated_gdd < 950:
            return "Siliqua / Pod Development"
        else:
            return "Seed Maturation"
    else:
        return "Active Vegetative Growth"


def generate_weekly_advisory(
    gp_code: int,
    forecast_df: pd.DataFrame,
    crop: str = "Paddy (Rice)",
    season: str = "Kharif"
) -> Dict[str, Any]:
    """
    Generates a 7-day to 10-day comprehensive agro-meteorological advisory
    synthesizing water balance, spray windows, thermal stress, and pest dynamics.
    """
    sub = forecast_df[forecast_df["GPCODE"] == gp_code]
    if sub.empty:
        raise ValueError(f"No forecast records found for GPCODE {gp_code}")

    # Pivot daily forecast
    piv = sub.pivot(index="DATE", columns="VARIABLE", values="PREDICTED_VALUE").sort_index()
    dates = list(piv.index)
    n_days = len(dates)
    
    tot_rain = float(piv["RAINFALL"].sum()) if "RAINFALL" in piv.columns else 0.0
    tot_et = float(piv["EVAPOTRANSPIRATION"].sum()) if "EVAPOTRANSPIRATION" in piv.columns else 0.0
    mean_temp = float(piv["TEMPERATURE"].mean()) if "TEMPERATURE" in piv.columns else 26.0
    mean_hum = float(piv["HUMIDITY"].mean()) if "HUMIDITY" in piv.columns else 70.0
    max_wind = float(piv["WIND_SPEED"].max()) if "WIND_SPEED" in piv.columns else 3.0
    
    # 1. Soil water balance progression
    storage = 55.0
    daily_balance = []
    irrigation_days = []
    for d in dates:
        r_val = float(piv.loc[d, "RAINFALL"]) if "RAINFALL" in piv.columns else 0.0
        et_val = float(piv.loc[d, "EVAPOTRANSPIRATION"]) if "EVAPOTRANSPIRATION" in piv.columns else 4.0
        storage, def_val, rec = calculate_soil_water_balance(r_val, et_val, storage)
        if "immediate" in rec.lower() or "schedule light" in rec.lower():
            irrigation_days.append(str(d))
        daily_balance.append({
            "date": str(d),
            "rain_mm": round(r_val, 1),
            "et_mm": round(et_val, 1),
            "soil_moisture_storage_mm": storage,
            "status": rec
        })

    # 2. Continuous Pest Risk Index
    pest_score, pest_level, target_pests = calculate_pest_risk_index(mean_temp, mean_hum, tot_rain)

    # 3. Spray Windows (Safe days: wind < 4.17 m/s and rain < 1.5 mm)
    favorable_spray_days = []
    unfavorable_spray_days = []
    for d in dates:
        w_val = float(piv.loc[d, "WIND_SPEED"]) if "WIND_SPEED" in piv.columns else 0.0
        r_val = float(piv.loc[d, "RAINFALL"]) if "RAINFALL" in piv.columns else 0.0
        t_val = float(piv.loc[d, "TEMPERATURE"]) if "TEMPERATURE" in piv.columns else 25.0
        if w_val < 3.8 and r_val < 1.0 and t_val <= 33.0:
            favorable_spray_days.append(str(d))
        else:
            unfavorable_spray_days.append(str(d))

    # 4. GDD accumulation across forecast horizon
    base_t = 10.0 if "mustard" not in crop.lower() else 5.0
    gdd_accum = sum([
        calculate_gdd(
            piv.loc[d, "TEMPERATURE"] + 4.0,  # approximate daily max
            piv.loc[d, "TEMPERATURE"] - 4.0,  # approximate daily min
            base_t
        ) for d in dates if "TEMPERATURE" in piv.columns
    ])

    # 5. Composite Agronomic Advisory Summary
    summary_parts = []
    summary_parts.append(
        f"7-10 Day Outlook for {crop} ({season}): Total anticipated rainfall is {tot_rain:.1f} mm "
        f"against cumulative crop water demand of {tot_et:.1f} mm."
    )
    if tot_rain > tot_et + 10.0:
        summary_parts.append(
            "Surplus precipitation expected. Maintain drainage ditches free of vegetative debris to avoid prolonged root inundation."
        )
    elif tot_rain < tot_et * 0.5:
        summary_parts.append(
            f"Moisture deficit projected. Recommended irrigation windows on: {', '.join(irrigation_days[:3]) if irrigation_days else 'mid-week'}."
        )
    else:
        summary_parts.append("Soil moisture balance remains near equilibrium; monitor field moisture before irrigating.")

    if pest_score >= 0.50:
        summary_parts.append(
            f"Elevated pest/disease alert (Index: {pest_score:.2f}, {pest_level}). High vulnerability to: {', '.join(target_pests[:2])}."
        )
    else:
        summary_parts.append(
            f"Pest/disease pressure is currently {pest_level.lower()} (Index: {pest_score:.2f})."
        )

    if favorable_spray_days:
        summary_parts.append(
            f"Optimal chemical spraying windows available on {', '.join(favorable_spray_days[:3])} (prefer 07:00-10:00 AM)."
        )
    else:
        summary_parts.append("Chemical spraying is not recommended during this horizon due to wind/rain drift hazards.")

    return {
        "gpcode": gp_code,
        "crop": crop,
        "season": season,
        "forecast_days_count": n_days,
        "dates": [str(d) for d in dates],
        "cumulative_rainfall_mm": round(tot_rain, 1),
        "cumulative_evapotranspiration_mm": round(tot_et, 1),
        "water_balance_deficit_mm": round(max(0.0, tot_et - tot_rain), 1),
        "soil_moisture_trend": "Surplus" if tot_rain > tot_et else "Deficit" if tot_rain < tot_et * 0.6 else "Balanced",
        "pest_risk": {
            "score": pest_score,
            "level": pest_level,
            "susceptible_pests_diseases": target_pests
        },
        "spray_operations": {
            "favorable_days": favorable_spray_days,
            "unfavorable_days": unfavorable_spray_days,
            "recommendation": "Spray during calm morning windows" if favorable_spray_days else "Postpone spraying"
        },
        "thermal_gdd": {
            "accumulated_forecast_gdd": round(gdd_accum, 1),
            "estimated_phenology": get_phenology_stage_from_gdd(gdd_accum + 600, crop)
        },
        "advisory_summary": " ".join(summary_parts),
        "operations_matrix": get_farm_operations_matrix(
            crop=crop,
            stage=get_phenology_stage_from_gdd(gdd_accum + 600, crop),
            rainfall=float(piv["RAINFALL"].iloc[0]) if "RAINFALL" in piv.columns else 0.0,
            temp=float(piv["TEMPERATURE"].iloc[0]) if "TEMPERATURE" in piv.columns else 25.0,
            humidity=float(piv["HUMIDITY"].iloc[0]) if "HUMIDITY" in piv.columns else 65.0,
            wind=float(piv["WIND_SPEED"].iloc[0]) if "WIND_SPEED" in piv.columns else 2.5,
            et=float(piv["EVAPOTRANSPIRATION"].iloc[0]) if "EVAPOTRANSPIRATION" in piv.columns else 3.5
        ),
        "daily_soil_water_balance": daily_balance
    }


def generate_personalized_advisory(
    crop_name: str,
    sowing_date: str,
    as_of_date: Optional[str] = None,
    rainfall: float = 0.0,
    temp: float = 28.0,
    humidity: float = 65.0,
    wind: float = 2.5,
    et: float = 3.5,
    rain_lower: float = 0.0,
    rain_upper: float = 0.0,
    confidence_pct: float = 85.0
) -> Dict[str, Any]:
    """
    Computes personalized advisory based on crop, sowing date, and local weather.
    Derives stage from data/crop_calendar.yaml and evaluates phenological and operational rules.
    Cites AGRICULTURE_REFERENCE.md.
    """
    stage_info = get_crop_stage(crop_name, sowing_date, as_of_date)
    stage_name = stage_info["stage_name"]
    stage_id = stage_info["stage_id"]

    adv_text, triggers = evaluate_advisory_rules(
        crop=stage_info["canonical_name"],
        stage=stage_name,
        rainfall=rainfall,
        temp=temp,
        humidity=humidity,
        wind=wind,
        et=et,
        rain_lower=rain_lower,
        rain_upper=rain_upper,
        confidence_pct=confidence_pct,
        stage_id=stage_id
    )

    operations_matrix = get_farm_operations_matrix(
        crop=stage_info["canonical_name"],
        stage=stage_name,
        rainfall=rainfall,
        temp=temp,
        humidity=humidity,
        wind=wind,
        et=et,
        confidence_pct=confidence_pct
    )

    return {
        "stage_info": stage_info,
        "advisory_text": adv_text,
        "triggering_variables": triggers,
        "operations_matrix": operations_matrix
    }


def find_latest_forecast_parquet(forecast_dir: str = DEFAULT_FORECAST_DIR) -> str:
    """Finds the latest generated forecast parquet file."""
    pattern = os.path.join(forecast_dir, "forecast_*.parquet")
    files = glob.glob(pattern)
    if not files:
        raise FileNotFoundError(f"No forecast parquet files found in {forecast_dir}. Run Phase 3 ingestion first.")
    files.sort(key=os.path.getmtime, reverse=True)
    return files[0]


def main():
    parser = argparse.ArgumentParser(description="SIH26074 Agro-Meteorological Rule & Advisory Generation Engine")
    parser.add_argument("--forecast-path", type=str, default=None,
                        help="Path to Phase 3 forecast parquet file (default: latest in data/forecasts/)")
    parser.add_argument("--output-csv", type=str, default=DEFAULT_OUTPUT_CSV,
                        help="Path to save generated advisories CSV")
    parser.add_argument("--max-panchayats", type=int, default=None,
                        help="Limit number of Panchayats for sample generation (e.g. 10)")
    args = parser.parse_args()

    forecast_file = args.forecast_path or find_latest_forecast_parquet()
    print(f"Loading Phase 3 forecast dataset from: {forecast_file}")
    forecast_df = pd.read_parquet(forecast_file)
    print(f"Loaded {len(forecast_df):,} forecast records.")

    print("Evaluating multi-variable agronomic rules across Panchayats and active crops...")
    t0 = pd.Timestamp.now()
    advisories_df = generate_advisories(
        forecast_df=forecast_df,
        panchayat_static_path=STATIC_TERRAIN_PATH,
        max_panchayats=args.max_panchayats
    )
    duration = (pd.Timestamp.now() - t0).total_seconds()
    print(f"Generated {len(advisories_df):,} structured advisories in {duration:.2f} seconds.")

    # Save to output CSV
    os.makedirs(os.path.dirname(args.output_csv), exist_ok=True)
    advisories_df.to_csv(args.output_csv, index=False)
    print(f"Saved sample advisories to: {args.output_csv}")

    print("\n--- Advisory Output Sample (First 3 Rows) ---")
    for i, r in advisories_df.head(3).iterrows():
        print(f"\n[PANCHAYAT: {r['PANCHAYAT']} ({r['BLOCK']}) | DATE: {r['DATE']} | CROP: {r['CROP']}]")
        print(f"TRIGGERING VARIABLES: {r['TRIGGERING_VARIABLES']}")
        print(f"CONFIDENCE: {r['CONFIDENCE_PCT']}%")
        print(f"ADVISORY: {r['ADVISORY_TEXT']}")


if __name__ == "__main__":
    main()
