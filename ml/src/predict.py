#!/usr/bin/env python3
"""
SIH26074 - Phase 2: Reusable Hyper-Local Weather Downscaling Predictor
----------------------------------------------------------------------
Provides a standalone, reusable inference interface for Phase 3:
Takes: (GPCODE, DATE, coarse_inputs)
Returns: DataFrame adhering strictly to the locked output contract:
         GPCODE | DATE | VARIABLE | PREDICTED_VALUE | UNCERTAINTY_LOWER | UNCERTAINTY_UPPER | CONFIDENCE_PCT

Supports:
- Single GPCODE or batched list of GPCODEs (or all 239 Dhanbad Panchayats if None)
- Historical or future forecast dates (e.g. 1-10 day forecasts)
- Dictionary, scalar, or DataFrame coarse inputs
- Topographic and terrain feature automatic join from data/static/
- Standalone CLI execution with argument parsing
"""

import sys
import os
import argparse
from typing import Union, Dict, List, Optional
import numpy as np
import pandas as pd
import joblib

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.dataset import FEATURE_COLS
from ml.src.model import JointMultiOutputWeatherModel, TARGET_NAMES, format_to_locked_contract

DEFAULT_MODEL_PATH = os.path.join(PROJECT_ROOT, "ml", "models", "joint_model.joblib")
DEFAULT_STATIC_PATH = os.path.join(PROJECT_ROOT, "data", "static", "panchayat_terrain_landcover.csv")

# Global caches for instant inference
_CACHED_MODEL = None
_CACHED_STATIC_DF = None


def load_model(model_path: str = DEFAULT_MODEL_PATH) -> JointMultiOutputWeatherModel:
    global _CACHED_MODEL
    if _CACHED_MODEL is None:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Trained model artifact not found at {model_path}. Run ml/src/train.py first.")
        _CACHED_MODEL = joblib.load(model_path)
    return _CACHED_MODEL


def load_static_terrain(static_path: str = DEFAULT_STATIC_PATH) -> pd.DataFrame:
    global _CACHED_STATIC_DF
    if _CACHED_STATIC_DF is None:
        if not os.path.exists(static_path):
            raise FileNotFoundError(f"Static terrain file not found at {static_path}.")
        _CACHED_STATIC_DF = pd.read_csv(static_path)
    return _CACHED_STATIC_DF


def predict_weather(
    gpcode: Optional[Union[int, str, List[Union[int, str]]]] = None,
    date: Union[str, pd.Timestamp, List[str]] = "2026-10-01",
    coarse_inputs: Optional[Union[Dict[str, float], pd.DataFrame]] = None,
    model_path: str = DEFAULT_MODEL_PATH,
    static_path: str = DEFAULT_STATIC_PATH,
    confidence_pct: float = 80.0
) -> pd.DataFrame:
    """
    Core reusable prediction function for Phase 2 and Phase 3 integration.
    
    Parameters:
    -----------
    gpcode : int, str, list of (int/str), or None
        Local Government Directory (LGD) Gram Panchayat code.
        If None, predictions are generated for all 239 Dhanbad Panchayats.
    date : str, pd.Timestamp, or list of str
        Target date for prediction (supports future forecast dates e.g. '2026-10-01').
    coarse_inputs : dict or pd.DataFrame
        Dictionary containing coarse atmospheric inputs:
        {
            'RAINFALL': float (mm/day),
            'TEMPERATURE': float (°C),
            'HUMIDITY': float (%),
            'WIND_SPEED': float (m/s),
            'EVAPOTRANSPIRATION': float (mm/day)
        }
        Or a DataFrame containing these columns.
    model_path : str
        Path to serialized joint_model.joblib.
    static_path : str
        Path to static terrain CSV.
    confidence_pct : float
        Nominal confidence percentage (locked to 80.0%).
        
    Returns:
    --------
    pd.DataFrame matching locked schema:
    GPCODE | DATE | VARIABLE | PREDICTED_VALUE | UNCERTAINTY_LOWER | UNCERTAINTY_UPPER | CONFIDENCE_PCT
    """
    model = load_model(model_path)
    static_df = load_static_terrain(static_path)
    
    # 1. Resolve Panchayats
    if gpcode is None:
        target_gpcodes = static_df["GPCODE"].tolist()
    elif isinstance(gpcode, (int, str)):
        target_gpcodes = [int(gpcode)]
    else:
        target_gpcodes = [int(g) for g in gpcode]
        
    # Filter static attributes
    sub_static = static_df[static_df["GPCODE"].isin(target_gpcodes)].copy()
    if len(sub_static) == 0:
        raise ValueError(f"None of the provided GPCODEs {target_gpcodes} found in Dhanbad terrain database.")
        
    # 2. Normalize coarse inputs
    if coarse_inputs is None:
        raise ValueError("coarse_inputs must be provided as a dict or DataFrame.")
        
    if isinstance(coarse_inputs, dict):
        # Extract normalized keys
        c_rain = float(coarse_inputs.get("RAINFALL", coarse_inputs.get("COARSE_RAINFALL", 0.0)))
        c_temp = float(coarse_inputs.get("TEMPERATURE", coarse_inputs.get("COARSE_TEMPERATURE", 28.0)))
        c_hum = float(coarse_inputs.get("HUMIDITY", coarse_inputs.get("COARSE_HUMIDITY", 70.0)))
        c_wind = float(coarse_inputs.get("WIND_SPEED", coarse_inputs.get("COARSE_WIND_SPEED", 2.5)))
        c_et = float(coarse_inputs.get("EVAPOTRANSPIRATION", coarse_inputs.get("COARSE_EVAPOTRANSPIRATION", 4.0)))
        
        # Build DataFrame repeating for all target Panchayats
        eval_df = sub_static.copy()
        eval_df["DATE"] = str(date)
        eval_df["COARSE_RAINFALL"] = c_rain
        eval_df["COARSE_TEMPERATURE"] = c_temp
        eval_df["COARSE_HUMIDITY"] = c_hum
        eval_df["COARSE_WIND_SPEED"] = c_wind
        eval_df["COARSE_EVAPOTRANSPIRATION"] = c_et
        
    elif isinstance(coarse_inputs, pd.DataFrame):
        eval_df = coarse_inputs.copy()
        # Ensure column standard names
        for col in ["RAINFALL", "TEMPERATURE", "HUMIDITY", "WIND_SPEED", "EVAPOTRANSPIRATION"]:
            if col in eval_df.columns and f"COARSE_{col}" not in eval_df.columns:
                eval_df[f"COARSE_{col}"] = eval_df[col]
        if "GPCODE" in eval_df.columns:
            eval_df["GPCODE"] = eval_df["GPCODE"].astype(int)
            eval_df = eval_df.merge(
                static_df[["GPCODE", "ELEVATION_M", "SLOPE_DEG", "LANDCOVER_CLASS"]],
                on="GPCODE",
                how="left"
            )
        else:
            # Repeat coarse values for all target Panchayats
            dfs = []
            for _, r in eval_df.iterrows():
                m = sub_static.copy()
                for c in eval_df.columns:
                    m[c] = r[c]
                dfs.append(m)
            eval_df = pd.concat(dfs, ignore_index=True)
            
        if "DATE" not in eval_df.columns:
            eval_df["DATE"] = str(date)
    else:
        raise TypeError(f"Unsupported coarse_inputs type: {type(coarse_inputs)}")

    # 3. Engineer temporal and non-linear features
    date_dt = pd.to_datetime(eval_df["DATE"])
    doy = date_dt.dt.dayofyear
    eval_df["MONTH"] = date_dt.dt.month
    eval_df["SIN_DOY"] = np.sin(2.0 * np.pi * doy / 365.25)
    eval_df["COS_DOY"] = np.cos(2.0 * np.pi * doy / 365.25)
    eval_df["MONSOON_FLAG"] = eval_df["MONTH"].isin([6, 7, 8, 9]).astype(float)
    
    eval_df["LOG_COARSE_RAINFALL"] = np.log1p(np.maximum(0.0, eval_df["COARSE_RAINFALL"]))
    eval_df["COARSE_RAIN_EVENT"] = (eval_df["COARSE_RAINFALL"] >= 0.1).astype(float)
    
    # 4. Extract feature matrix
    X = eval_df[FEATURE_COLS].values
    coarse_rainfall = eval_df["COARSE_RAINFALL"].values
    
    # 5. Run prediction with uncertainty
    predictions_dict = model.predict_with_uncertainty(X, coarse_rainfall)
    
    # 6. Format to locked output contract
    out_df = format_to_locked_contract(
        gpcode_series=eval_df["GPCODE"],
        date_series=eval_df["DATE"],
        predictions_dict=predictions_dict,
        confidence_pct=confidence_pct
    )
    
    return out_df


def main():
    parser = argparse.ArgumentParser(
        description="SIH26074 Standalone Hyper-Local Weather Predictor (Locked Contract)"
    )
    parser.add_argument("--gpcode", type=int, default=111722, help="LGD Gram Panchayat Code (e.g. 111722)")
    parser.add_argument("--date", type=str, default="2026-10-01", help="Target date YYYY-MM-DD")
    parser.add_argument("--rainfall", type=float, default=5.0, help="Coarse Rainfall in mm/day")
    parser.add_argument("--temperature", type=float, default=29.5, help="Coarse Temperature in °C")
    parser.add_argument("--humidity", type=float, default=78.0, help="Coarse Relative Humidity in %%")
    parser.add_argument("--wind", type=float, default=3.2, help="Coarse Wind Speed in m/s")
    parser.add_argument("--et", type=float, default=4.1, help="Coarse Evapotranspiration in mm/day")
    parser.add_argument("--all-panchayats", action="store_true", help="Generate predictions across all 239 Panchayats")
    
    args = parser.parse_args()
    
    coarse = {
        "RAINFALL": args.rainfall,
        "TEMPERATURE": args.temperature,
        "HUMIDITY": args.humidity,
        "WIND_SPEED": args.wind,
        "EVAPOTRANSPIRATION": args.et
    }
    
    gp_target = None if args.all_panchayats else args.gpcode
    
    print(f"Running inference for GPCODE={gp_target or 'ALL 239 PANCHAYATS'}, DATE={args.date}...")
    preds = predict_weather(
        gpcode=gp_target,
        date=args.date,
        coarse_inputs=coarse
    )
    
    print("\n--- Output Contract Result (Sample) ---")
    print(preds.to_string(index=False))
    print(f"\nTotal rows generated: {len(preds):,}")
    print("Schema:", " | ".join(preds.columns))


if __name__ == "__main__":
    main()
