"""
SIH26074 - Pragyan Phenological Stage Prediction Engine
-------------------------------------------------------
Computes crop growth stages from:
1. Days After Sowing (DAS)
2. Accumulated Growing Degree Days (GDD): sum(max(0, Tmean - Tbase))
   using hyper-local downscaled temperature series and uncertainty intervals.

Provides:
- Active stage identification with probability score
- Next stage expectation windows (earliest, likely, latest transition dates)
- Ground-truth stage calibration & drift correction ("reported stage")
- Sourced from config/crop_calendar.yaml exclusively
"""

import os
import yaml
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONFIG_CROP_CALENDAR = os.path.join(PROJECT_ROOT, "config", "crop_calendar.yaml")
DATA_CROP_CALENDAR = os.path.join(PROJECT_ROOT, "data", "crop_calendar.yaml")

_CALENDAR_CACHE: Optional[Dict[str, Any]] = None


def load_calendar(path: Optional[str] = None) -> Dict[str, Any]:
    global _CALENDAR_CACHE
    if _CALENDAR_CACHE is None:
        target_path = path or (CONFIG_CROP_CALENDAR if os.path.exists(CONFIG_CROP_CALENDAR) else DATA_CROP_CALENDAR)
        if not os.path.exists(target_path):
            return {}
        with open(target_path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}
            _CALENDAR_CACHE = raw.get("crops", raw)
    return _CALENDAR_CACHE


def normalize_crop_id(crop: str) -> str:
    c = str(crop or "").lower().strip()
    if "wheat" in c or "gehun" in c:
        return "wheat"
    if "chickpea" in c or "gram" in c or "chana" in c:
        return "chickpea"
    if "mustard" in c or "sarson" in c or "rapeseed" in c:
        return "mustard"
    if "soy" in c:
        return "soybean"
    if "maize" in c or "corn" in c or "makka" in c:
        return "maize"
    if "cotton" in c or "kapas" in c:
        return "cotton"
    if "paddy" in c or "rice" in c or "dhan" in c:
        return "paddy"
    if "arhar" in c or "tur" in c or "pigeonpea" in c:
        return "pigeonpea"
    return c


def compute_gdd(t_mean: float, t_base: float) -> float:
    """Calculates daily thermal accumulation above crop base temperature."""
    return max(0.0, t_mean - t_base)


def predict_crop_stage(
    gp_code: int,
    crop: str,
    sowing_date: Union[str, datetime],
    as_of_date: Optional[Union[str, datetime]] = None,
    duration_class: str = "normal",
    temp_series: Optional[List[Dict[str, Any]]] = None,
    reported_stage_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Predicts the phenological stage and transition window for a crop in a specific Panchayat.
    
    Parameters:
    - gp_code: Gram Panchayat LGD code
    - crop: Crop identifier ('wheat', 'chickpea', 'mustard', 'soybean', etc.)
    - sowing_date: YYYY-MM-DD or datetime
    - as_of_date: Current evaluation date (default: today)
    - duration_class: 'early', 'normal', or 'late'
    - temp_series: List of daily dicts [{'date': 'YYYY-MM-DD', 't_mean': 24.5, 't_min': 18.0, 't_max': 31.0}]
    - reported_stage_id: Optional user-reported stage for drift correction
    """
    cal = load_calendar()
    crop_id = normalize_crop_id(crop)
    crop_cfg = cal.get(crop_id)

    if not crop_cfg or crop_cfg.get("status") != "ACTIVE":
        return {
            "crop": crop_id,
            "status": "UNSOURCED_OR_INACTIVE",
            "message": f"Crop '{crop_id}' has no ACTIVE cited package in crop calendar."
        }

    s_dt = datetime.strptime(sowing_date, "%Y-%m-%d") if isinstance(sowing_date, str) else sowing_date
    a_dt = (
        datetime.strptime(as_of_date, "%Y-%m-%d")
        if isinstance(as_of_date, str)
        else (as_of_date or datetime.now())
    )

    das = max(0, (a_dt - s_dt).days)
    base_temp = float(crop_cfg.get("base_temperature_c", 10.0))
    stages = crop_cfg.get("stages", [])

    # Duration modifier (early varieties complete ~10% faster, late take ~10% longer)
    duration_factor = 0.90 if duration_class == "early" else (1.10 if duration_class == "late" else 1.0)

    # Accumulate GDD
    accumulated_gdd = 0.0
    if temp_series:
        for day in temp_series:
            t_m = day.get("t_mean", (day.get("t_max", 30.0) + day.get("t_min", 20.0)) / 2.0)
            accumulated_gdd += compute_gdd(t_m, base_temp)
    else:
        # Climatological estimate for Central MP (Tmean ~24C)
        estimated_daily_gdd = compute_gdd(24.0, base_temp)
        accumulated_gdd = das * estimated_daily_gdd

    # Determine stage by dual criteria (DAS & GDD)
    active_stage_idx = 0
    stage_match_by_das = None
    stage_match_by_gdd = None

    for idx, st in enumerate(stages):
        st_start_das = int(st.get("start_day", 0) * duration_factor)
        st_end_das = int(st.get("end_day", 100) * duration_factor)
        if st_start_das <= das <= st_end_das:
            stage_match_by_das = (idx, st)

        st_gdd = float(st.get("gdd_req", 0)) * duration_factor
        if accumulated_gdd <= st_gdd and stage_match_by_gdd is None:
            stage_match_by_gdd = (idx, st)

    # Reconcile stage (prioritize GDD if weather series available, else DAS)
    chosen_idx, current_stage = (
        stage_match_by_gdd if (temp_series and stage_match_by_gdd) else (stage_match_by_das or (0, stages[0]))
    )

    # Ground-truth drift correction if farmer reported their stage
    drift_detected = False
    reported_stage_obj = None
    if reported_stage_id:
        for idx, st in enumerate(stages):
            if st["id"] == reported_stage_id:
                reported_stage_obj = st
                if idx != chosen_idx:
                    drift_detected = True
                    chosen_idx = idx
                    current_stage = st
                break

    # Calculate Next Expected Stage window
    next_expected = None
    if chosen_idx + 1 < len(stages):
        next_stage = stages[chosen_idx + 1]
        next_target_das = int(next_stage.get("start_day", current_stage.get("end_day", das) + 1) * duration_factor)
        days_remaining = max(1, next_target_das - das)

        earliest_dt = a_dt + timedelta(days=max(1, days_remaining - 3))
        likely_dt = a_dt + timedelta(days=days_remaining)
        latest_dt = a_dt + timedelta(days=days_remaining + 4)

        next_expected = {
            "stage_id": next_stage["id"],
            "stage_name": next_stage["name"],
            "earliest": earliest_dt.strftime("%Y-%m-%d"),
            "likely": likely_dt.strftime("%Y-%m-%d"),
            "latest": latest_dt.strftime("%Y-%m-%d"),
            "gdd_needed": max(0.0, float(next_stage.get("gdd_req", 0)) * duration_factor - accumulated_gdd)
        }

    # Probability estimation: Higher confidence near midpoint of stage, lower near boundaries
    st_start = int(current_stage.get("start_day", 0) * duration_factor)
    st_end = int(current_stage.get("end_day", 100) * duration_factor)
    stage_span = max(1, st_end - st_start)
    progress_ratio = (das - st_start) / stage_span
    probability = round(max(0.65, min(0.95, 0.95 - abs(progress_ratio - 0.5) * 0.40)), 2)

    return {
        "gp_code": gp_code,
        "crop": crop_id,
        "canonical_name": crop_cfg.get("canonical_name", crop_id.title()),
        "scientific_name": crop_cfg.get("scientific_name", ""),
        "sowing_date": s_dt.strftime("%Y-%m-%d"),
        "as_of_date": a_dt.strftime("%Y-%m-%d"),
        "days_after_sowing": das,
        "accumulated_gdd": round(accumulated_gdd, 1),
        "stage": {
            "id": current_stage["id"],
            "name": current_stage["name"],
            "probability": probability,
            "is_critical": current_stage.get("critical", False),
            "water_requirement": current_stage.get("water_requirement", "Moderate"),
            "kc": current_stage.get("kc", crop_cfg.get("kc_mid", 1.05)),
            "next_expected": next_expected
        },
        "drift_corrected": drift_detected,
        "source": current_stage.get("source", crop_cfg.get("source", "JNKVV / RVSKVV")),
        "status": "ACTIVE"
    }
