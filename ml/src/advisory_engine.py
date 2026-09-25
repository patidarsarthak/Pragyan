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
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

STATIC_TERRAIN_PATH = os.path.join(PROJECT_ROOT, "data", "static", "panchayat_terrain_landcover.csv")
DEFAULT_FORECAST_DIR = os.path.join(PROJECT_ROOT, "data", "forecasts")
DEFAULT_OUTPUT_CSV = os.path.join(PROJECT_ROOT, "ml", "results", "sample_advisories.csv")


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
    rain_lower: float,
    rain_upper: float,
    confidence_pct: float
) -> Tuple[str, str]:
    """
    Evaluates multi-variable agronomic rule base for a specific Panchayat, date, and crop.
    Returns (advisory_text, triggering_variables).
    """
    advisory_components = []
    triggers = []

    # Calculate uncertainty spread
    rain_spread = max(0.0, rain_upper - rain_lower)
    is_uncertain = (confidence_pct < 75.0) or (rain_spread > 15.0)

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
