#!/usr/bin/env python3
"""
SIH26074 - Agricultural Indices & Irrigation Scheduler Engine
--------------------------------------------------------------
Provides:
1. compute_heat_index(temp_c, humidity_pct): Rothfusz heat index equation.
2. compute_dry_spell_length(rain_series, threshold_mm): Consecutive dry days.
3. compute_spi(gpcode, window_days): Standardized Precipitation Index.
4. compute_water_balance_and_irrigation(gpcode, crop, sowing_date):
   Single-layer root-zone soil bucket water balance returning:
   'irrigate in N days, X mm' with explicit agronomic assumptions.
"""

import os
import math
import logging
from typing import Dict, List, Optional, Any, Union, Tuple
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
HISTORICAL_PARQUET = os.path.join(PROJECT_ROOT, "data", "unified", "panchayat_weather_long_2020-24.parquet")

logger = logging.getLogger("AgroIndices")

_HISTORICAL_RAIN_CACHE: Optional[pd.DataFrame] = None


def compute_heat_index(temp_c: float, humidity_pct: float) -> float:
    """
    Computes the Steadman / Rothfusz Heat Index in degrees Celsius.
    Represents the apparent temperature perceived by the crop canopy and livestock.
    """
    if temp_c < 26.7:
        # Heat index is only meaningful for temperatures above ~80°F (26.7°C)
        return round(temp_c, 1)

    t_f = (temp_c * 9.0 / 5.0) + 32.0
    rh = max(0.0, min(100.0, humidity_pct))

    # Rothfusz regression equation
    hi_f = (
        -42.379
        + (2.04901523 * t_f)
        + (10.14333127 * rh)
        - (0.22475541 * t_f * rh)
        - (0.00683783 * t_f * t_f)
        - (0.05481717 * rh * rh)
        + (0.00122874 * t_f * t_f * rh)
        + (0.00085282 * t_f * rh * rh)
        - (0.00000199 * t_f * t_f * rh * rh)
    )

    # Adjustments
    if rh < 13.0 and (80.0 <= t_f <= 112.0):
        adjustment = ((13.0 - rh) / 4.0) * math.sqrt((17.0 - abs(t_f - 95.0)) / 17.0)
        hi_f -= adjustment
    elif rh > 85.0 and (80.0 <= t_f <= 87.0):
        adjustment = ((rh - 85.0) / 10.0) * ((87.0 - t_f) / 5.0)
        hi_f += adjustment

    hi_c = (hi_f - 32.0) * 5.0 / 9.0
    return round(hi_c, 1)


def compute_dry_spell_length(
    rain_series: List[float],
    threshold_mm: float = 2.5
) -> Dict[str, Any]:
    """
    Computes current and maximum dry spell duration in days.
    IMD meteorological standard: Rainy day = daily rainfall >= 2.5 mm.
    """
    if not rain_series:
        return {"current_dry_spell_days": 0, "max_dry_spell_days": 0, "is_dry_spell_active": False}

    current_spell = 0
    max_spell = 0
    temp_spell = 0

    for r in rain_series:
        if r < threshold_mm:
            temp_spell += 1
            if temp_spell > max_spell:
                max_spell = temp_spell
        else:
            temp_spell = 0

    # Current spell is the trailing count from the end of the series
    for r in reversed(rain_series):
        if r < threshold_mm:
            current_spell += 1
        else:
            break

    return {
        "current_dry_spell_days": current_spell,
        "max_dry_spell_days": max_spell,
        "is_dry_spell_active": current_spell >= 5, # 5+ days defines agromet dry spell
        "threshold_mm": threshold_mm
    }


def _load_historical_rainfall() -> pd.DataFrame:
    """Loads historical daily rainfall data from unified dataset with caching."""
    global _HISTORICAL_RAIN_CACHE
    if _HISTORICAL_RAIN_CACHE is None:
        if os.path.exists(HISTORICAL_PARQUET):
            df = pd.read_parquet(HISTORICAL_PARQUET, columns=["GPCODE", "DATE", "VARIABLE", "VALUE_FINE"])
            rain_df = df[df["VARIABLE"] == "RAINFALL"].copy()
            rain_df["DATE"] = pd.to_datetime(rain_df["DATE"])
            rain_df["VALUE_FINE"] = rain_df["VALUE_FINE"].astype(float)
            _HISTORICAL_RAIN_CACHE = rain_df
        else:
            _HISTORICAL_RAIN_CACHE = pd.DataFrame(columns=["GPCODE", "DATE", "VARIABLE", "VALUE_FINE"])
    return _HISTORICAL_RAIN_CACHE


def compute_spi(
    gpcode: int,
    window_days: int = 30,
    current_accumulation_mm: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes Standardized Precipitation Index (SPI) from the unified historical dataset.
    Standardizes precipitation accumulation over the specified window (default 30 days).
    
    Categories:
      SPI >= 2.00: Extremely Wet
      1.50 to 1.99: Very Wet
      1.00 to 1.49: Moderately Wet
      -0.99 to 0.99: Near Normal
      -1.49 to -1.00: Moderately Dry
      -1.99 to -1.50: Severely Dry
      SPI <= -2.00: Extremely Dry
    """
    hist_df = _load_historical_rainfall()
    sub = hist_df[hist_df["GPCODE"] == gpcode] if not hist_df.empty else pd.DataFrame()
    
    if sub.empty:
        # Representative Dhanbad regional statistics
        mean_acc = 110.0 * (window_days / 30.0)
        std_acc = 45.0 * math.sqrt(window_days / 30.0)
    else:
        # Calculate rolling accumulation across historical series
        sub_sorted = sub.sort_values("DATE").set_index("DATE")
        daily_rain = sub_sorted["VALUE_FINE"].resample("D").sum().fillna(0.0)
        rolling_sums = daily_rain.rolling(window_days, min_periods=window_days).sum().dropna()
        if len(rolling_sums) < 10:
            mean_acc = 110.0 * (window_days / 30.0)
            std_acc = 45.0 * math.sqrt(window_days / 30.0)
        else:
            mean_acc = float(rolling_sums.mean())
            std_acc = float(rolling_sums.std())
            if std_acc <= 0:
                std_acc = 1.0

    if current_accumulation_mm is None:
        # Use recent rainfall from unified actuals or default to seasonal normal
        current_accumulation_mm = mean_acc

    spi_value = (current_accumulation_mm - mean_acc) / std_acc
    # Bound SPI within reasonable range [-3.5, +3.5]
    spi_value = max(-3.5, min(3.5, spi_value))

    if spi_value >= 2.0:
        cat = "Extremely Wet"
    elif spi_value >= 1.5:
        cat = "Very Wet"
    elif spi_value >= 1.0:
        cat = "Moderately Wet"
    elif spi_value > -1.0:
        cat = "Near Normal"
    elif spi_value > -1.5:
        cat = "Moderately Dry"
    elif spi_value > -2.0:
        cat = "Severely Dry"
    else:
        cat = "Extremely Dry"

    return {
        "gpcode": gpcode,
        "window_days": window_days,
        "current_accumulation_mm": round(float(current_accumulation_mm), 1),
        "historical_mean_mm": round(float(mean_acc), 1),
        "historical_std_mm": round(float(std_acc), 1),
        "spi_value": round(float(spi_value), 2),
        "category": cat
    }


def compute_water_balance_and_irrigation(
    gpcode: int,
    crop: str = "paddy",
    sowing_date: Optional[str] = None,
    soil_type: str = "sandy_loam"
) -> Dict[str, Any]:
    """
    Single-layer root-zone soil water balance model (FAO-56 style).
    
    Calculates:
    - Root-zone depth (Zr) based on crop and growth stage.
    - Total Available Water (TAW = AWC * Zr).
    - Readily Available Water (RAW = MAD * TAW).
    - Daily moisture deficit balance: D_t = D_{t-1} + ETc - P.
    - Determines: 'irrigate in N days, X mm'.
    
    All assumptions are explicitly itemized in the output contract.
    """
    from backend.services import get_panchayat_forecast
    from ml.src.advisory_engine import get_crop_stage

    # 1. Fetch 10-day forecast for the Panchayat
    try:
        fc = get_panchayat_forecast(gpcode)
        forecasts = fc.get("forecasts", [])
    except Exception as e:
        logger.warning(f"Failed to fetch live forecast for GP {gpcode}: {e}")
        forecasts = []

    # 2. Resolve crop characteristics from crop_calendar.yaml
    stage_info = get_crop_stage(crop, sowing_date=sowing_date or "2026-08-01")
    crop_kc = float(stage_info.get("kc", 1.15))
    root_depth_cm = float(stage_info.get("root_depth_cm", 60.0))
    root_depth_m = root_depth_cm / 100.0
    mad = float(stage_info.get("mad", 0.50)) # Management Allowable Depletion

    # 3. Soil Water Parameters (Dhanbad Plateau Red Sandy Loam / Clay Loam)
    # Available Water Capacity (AWC):
    # Sandy Loam = 120 mm/m, Loam = 140 mm/m, Clay Loam = 160 mm/m
    if "clay" in soil_type.lower():
        awc_mm_per_m = 160.0
        soil_name = "Clay Loam (Lowland Don)"
    elif "sandy" in soil_type.lower():
        awc_mm_per_m = 120.0
        soil_name = "Red Sandy Loam (Upland Tanr)"
    else:
        awc_mm_per_m = 140.0
        soil_name = "Medium Loam (Baad Land)"

    # Total Available Water (TAW) in root zone
    taw = awc_mm_per_m * root_depth_m # mm
    # Readily Available Water (RAW) that can be depleted before stress occurs
    raw = mad * taw # mm

    # Initial soil moisture deficit (assumed moderate deficit of 25% of RAW)
    current_deficit = round(0.25 * raw, 1)

    daily_series = []
    accumulated_deficit = current_deficit
    irrigate_day: Optional[int] = None
    irrigate_amount: Optional[float] = None

    for day_idx, day_data in enumerate(forecasts):
        d_str = day_data["date"]
        preds = day_data["predictions"]
        rain = float(preds.get("RAINFALL", {}).get("predicted_value", 0.0))
        et0 = float(preds.get("EVAPOTRANSPIRATION", {}).get("predicted_value", 3.8))
        temp = float(preds.get("TEMPERATURE", {}).get("predicted_value", 28.0))
        hum = float(preds.get("HUMIDITY", {}).get("predicted_value", 70.0))

        # Crop evapotranspiration demand: ETc = Kc * ET0
        etc = round(crop_kc * et0, 2)

        # Net daily change in root zone moisture deficit
        net_depletion = etc - rain
        accumulated_deficit = max(0.0, min(taw, accumulated_deficit + net_depletion))

        # Check if readily available water is exhausted
        is_stress = accumulated_deficit >= raw
        if is_stress and irrigate_day is None:
            irrigate_day = day_idx + 1 # 1-indexed days
            irrigate_amount = round(accumulated_deficit, 1)

        daily_series.append({
            "day": day_idx + 1,
            "date": d_str,
            "rainfall_mm": rain,
            "et0_mm": et0,
            "etc_mm": etc,
            "heat_index_c": compute_heat_index(temp, hum),
            "accumulated_deficit_mm": round(accumulated_deficit, 1),
            "stress_threshold_raw_mm": round(raw, 1),
            "stress_flag": is_stress
        })

    # Build human-readable recommendation
    if irrigate_day is not None:
        if irrigate_day == 1:
            recommendation = f"Irrigate today ({irrigate_amount:.0f} mm required to restore field capacity)"
        else:
            recommendation = f"Irrigate in {irrigate_day} days ({irrigate_amount:.0f} mm)"
    else:
        recommendation = "No irrigation needed for the next 10 days (sufficient moisture maintained)"

    return {
        "gpcode": gpcode,
        "crop": stage_info["canonical_name"],
        "growth_stage": stage_info["stage_name"],
        "days_after_sowing": stage_info["days_after_sowing"],
        "recommendation": recommendation,
        "days_until_irrigation": irrigate_day,
        "irrigation_amount_mm": irrigate_amount,
        "current_soil_deficit_mm": current_deficit,
        "readily_available_water_mm": round(raw, 1),
        "total_available_water_mm": round(taw, 1),
        "assumptions": {
            "soil_type": soil_name,
            "available_water_capacity_mm_per_m": awc_mm_per_m,
            "root_depth_cm": int(root_depth_cm),
            "crop_coefficient_kc": crop_kc,
            "management_allowed_depletion_pct": int(mad * 100),
            "source_standard": "FAO Irrigation & Drainage Paper No. 56 / KVK Dhanbad"
        },
        "daily_schedule": daily_series
    }
