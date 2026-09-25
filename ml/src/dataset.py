#!/usr/bin/env python3
"""
SIH26074 - Phase 2: Tabular Dataset Builder & Feature Engineering
-----------------------------------------------------------------
Transforms the unified long-format weather dataset into tabular feature matrices
for joint multi-output modeling with strict chronological and spatial partitions.
"""

import os
import pandas as pd
import numpy as np

DATA_PATH = os.path.join("data", "unified", "panchayat_weather_long_2020-24.parquet")
STATIC_PATH = os.path.join("data", "static", "panchayat_terrain_landcover.csv")

FEATURE_COLS = [
    "ELEVATION_M",
    "SLOPE_DEG",
    "LANDCOVER_CLASS",
    "SIN_DOY",
    "COS_DOY",
    "MONTH",
    "MONSOON_FLAG",
    "COARSE_RAINFALL",
    "LOG_COARSE_RAINFALL",
    "COARSE_RAIN_EVENT",
    "COARSE_TEMPERATURE",
    "COARSE_HUMIDITY",
    "COARSE_WIND_SPEED",
    "COARSE_EVAPOTRANSPIRATION"
]

TARGET_VARS = [
    "RAINFALL",
    "TEMPERATURE",
    "HUMIDITY",
    "WIND_SPEED",
    "EVAPOTRANSPIRATION"
]


def load_and_engineer_features(parquet_path=DATA_PATH, static_path=STATIC_PATH):
    """
    Loads unified dataset, pivots to wide representation per (GPCODE, DATE),
    and derives temporal, terrain, and coarse meteorological features.
    """
    print(f"Loading unified dataset from {parquet_path}...")
    long_df = pd.read_parquet(parquet_path)
    
    # 1. Pivot coarse features
    piv_coarse = long_df.pivot(
        index=["GPCODE", "DATE"],
        columns="VARIABLE",
        values="VALUE_COARSE"
    ).reset_index()
    piv_coarse.columns = ["GPCODE", "DATE"] + [f"COARSE_{c}" for c in piv_coarse.columns[2:]]
    
    # 2. Extract fine rainfall observation (CHIRPS)
    rain_fine = long_df[long_df["VARIABLE"] == "RAINFALL"][["GPCODE", "DATE", "VALUE_FINE"]].rename(
        columns={"VALUE_FINE": "FINE_RAINFALL"}
    )
    
    # 3. Static metadata
    meta = long_df[[
        "GPCODE", "GPNAME", "BLOCK", "DISTRICT",
        "ELEVATION_M", "SLOPE_DEG", "LANDCOVER_CLASS"
    ]].drop_duplicates(subset=["GPCODE"])
    
    # Merge into wide modeling table
    df = piv_coarse.merge(rain_fine, on=["GPCODE", "DATE"]).merge(meta, on="GPCODE")
    
    # 4. Temporal feature engineering (cyclic day-of-year, seasonal flags)
    date_dt = pd.to_datetime(df["DATE"])
    doy = date_dt.dt.dayofyear
    df["DAY_OF_YEAR"] = doy
    df["MONTH"] = date_dt.dt.month
    df["YEAR"] = date_dt.dt.year
    df["SIN_DOY"] = np.sin(2.0 * np.pi * doy / 365.25)
    df["COS_DOY"] = np.cos(2.0 * np.pi * doy / 365.25)
    df["MONSOON_FLAG"] = df["MONTH"].isin([6, 7, 8, 9]).astype(float)
    
    # 5. Non-linear precipitation transformations
    df["LOG_COARSE_RAINFALL"] = np.log1p(np.maximum(0.0, df["COARSE_RAINFALL"]))
    df["COARSE_RAIN_EVENT"] = (df["COARSE_RAINFALL"] >= 0.1).astype(float)
    
    # 6. Targets definition
    # RAINFALL: Head predicts RESIDUAL = fine_observed - coarse_reference
    df["TARGET_RESIDUAL_RAINFALL"] = df["FINE_RAINFALL"] - df["COARSE_RAINFALL"]
    
    # DIRECT PREDICTIONS:
    # Temperature: downscaled lapse rate target (6.5 deg C / km + urban heat island)
    df["TARGET_TEMPERATURE"] = (
        df["COARSE_TEMPERATURE"]
        - (df["ELEVATION_M"] - 200.0) * 0.0065
        + np.where(df["LANDCOVER_CLASS"] == 13, 0.45, 0.0)
    ).round(2)
    
    # Humidity: moisture adjusted with elevation cooling, bounded to [0, 100]
    df["TARGET_HUMIDITY"] = np.clip(
        df["COARSE_HUMIDITY"] + (df["ELEVATION_M"] - 200.0) * 0.012,
        5.0, 100.0
    ).round(2)
    
    # Wind Speed: relief exposure & canopy roughness
    df["TARGET_WIND_SPEED"] = np.clip(
        df["COARSE_WIND_SPEED"]
        * (1.0 + df["SLOPE_DEG"] * 0.035)
        * np.where(df["LANDCOVER_CLASS"].isin([10, 13]), 0.88, 1.04),
        0.1, 45.0
    ).round(2)
    
    # Evapotranspiration: radiation/temperature driven
    df["TARGET_EVAPOTRANSPIRATION"] = np.clip(
        df["COARSE_EVAPOTRANSPIRATION"]
        * (1.0 + (df["COARSE_TEMPERATURE"] - 25.0) * 0.015),
        0.1, 15.0
    ).round(2)
    
    print(f"Engineered modeling table shape: {df.shape}")
    return df


def split_chronological(df):
    """
    Strict chronological partitioning:
    - Train: 2020-01-01 to 2022-12-31 (3 years)
    - Validation: 2023-01-01 to 2023-12-31 (1 year)
    - Test: 2024-01-01 to 2024-12-31 (1 year)
    """
    train_df = df[df["YEAR"].isin([2020, 2021, 2022])].copy()
    val_df = df[df["YEAR"] == 2023].copy()
    test_df = df[df["YEAR"] == 2024].copy()
    
    print(f"Chronological split:")
    print(f"  Train:      {len(train_df):,} rows (2020–2022)")
    print(f"  Validation: {len(val_df):,} rows (2023)")
    print(f"  Test:       {len(test_df):,} rows (2024)")
    return train_df, val_df, test_df


def split_spatial_holdout(df, holdout_blocks=("Topchanchi", "Tundi")):
    """
    Spatial holdout partitioning:
    Excludes 2 complete administrative blocks during training to test geographic transferability.
    """
    train_seen = df[df["YEAR"].isin([2020, 2021, 2022]) & (~df["BLOCK"].isin(holdout_blocks))].copy()
    test_holdout = df[(df["YEAR"] == 2024) & (df["BLOCK"].isin(holdout_blocks))].copy()
    test_seen = df[(df["YEAR"] == 2024) & (~df["BLOCK"].isin(holdout_blocks))].copy()
    
    print(f"Spatial Holdout split (Holdout blocks: {holdout_blocks}):")
    print(f"  Train Seen:   {len(train_seen):,} rows")
    print(f"  Test Seen:    {len(test_seen):,} rows")
    print(f"  Test Holdout: {len(test_holdout):,} rows (unseen geography)")
    return train_seen, test_seen, test_holdout
