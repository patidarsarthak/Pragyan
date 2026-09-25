#!/usr/bin/env python3
"""
SIH26074 - Phase 3: Live NWP Forecast Ingestion & Downscaling Pipeline
----------------------------------------------------------------------
Executes:
1. Ingestion of 1-10 day coarse NWP forecast data (ECMWF IFS 0.25° or NOAA GFS)
   covering Dhanbad District's 26 spatial grid cells.
2. Unit normalization and parameter validation:
   - Precipitation sum (mm/day) -> COARSE_RAINFALL
   - Temperature (2m mean °C) -> COARSE_TEMPERATURE
   - Relative humidity (2m mean %) -> COARSE_HUMIDITY
   - Wind speed (10m max km/h converted to m/s) -> COARSE_WIND_SPEED
   - Reference ET (FAO-56 ET0 mm/day) -> COARSE_EVAPOTRANSPIRATION
3. Nearest-neighbor spatial mapping to all 239 Gram Panchayat centroids.
4. Downscaling through Phase 2's locked inference engine (ml/src/predict.py).
5. Storage into queryable partitioned Parquet store with RUN_TIMESTAMP:
   data/forecasts/forecast_<date>_<runtime>.parquet
6. Graceful failure handling (zero silent fabrication or stale data substitution).
"""

import sys
import os
import time
import argparse
import logging
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional, Any

import requests
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.predict import predict_weather

STATIC_TERRAIN_PATH = os.path.join(PROJECT_ROOT, "data", "static", "panchayat_terrain_landcover.csv")
DEFAULT_FORECAST_DIR = os.path.join(PROJECT_ROOT, "data", "forecasts")

# Setup structured logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("ForecastIngest")

REQUIRED_RAW_VARS = [
    "precipitation_sum",
    "temperature_2m_max",
    "temperature_2m_min",
    "relative_humidity_2m_mean",
    "wind_speed_10m_max",
    "et0_fao_evapotranspiration"
]

REQUIRED_COARSE_COLS = [
    "COARSE_RAINFALL",
    "COARSE_TEMPERATURE",
    "COARSE_HUMIDITY",
    "COARSE_WIND_SPEED",
    "COARSE_EVAPOTRANSPIRATION"
]


class ForecastIngestionError(Exception):
    """Base exception for forecast ingestion failures."""
    pass


class ForecastSourceUnreachableError(ForecastIngestionError):
    """Raised when upstream NWP forecast API cannot be reached."""
    pass


class IncompleteForecastDataError(ForecastIngestionError):
    """Raised when upstream forecast returns missing variables, nulls, or truncated dates."""
    pass


def load_panchayat_grid_mapping(static_path: str = STATIC_TERRAIN_PATH) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Loads 239 Panchayats and computes their unique coarse parent grid cells (0.1° resolution).
    Returns (panchayats_df, unique_cells_df).
    """
    if not os.path.exists(static_path):
        raise FileNotFoundError(f"Panchayat terrain static file not found at: {static_path}")
        
    df = pd.read_csv(static_path)
    df["LAT_COARSE"] = (df["LATITUDE"] * 10).round() / 10
    df["LON_COARSE"] = (df["LONGITUDE"] * 10).round() / 10
    
    unique_cells = df[["LAT_COARSE", "LON_COARSE"]].drop_duplicates().reset_index(drop=True)
    logger.info(f"Loaded {len(df)} Panchayats mapped across {len(unique_cells)} unique coarse grid cells.")
    return df, unique_cells


def fetch_nwp_forecast(
    unique_cells: pd.DataFrame,
    model: str = "ecmwf_ifs025",
    forecast_days: int = 10,
    timeout: int = 15,
    simulate_failure: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Pulls coarse numerical weather prediction forecast from Open-Meteo for all Dhanbad grid cells.
    Supports ECMWF IFS 0.25° (primary) and NOAA GFS (secondary fallback).
    """
    if simulate_failure == "network_error":
        logger.error("[SIMULATED FAILURE] Simulating upstream NWP server outage (HTTP 503 / Network Timeout).")
        raise ForecastSourceUnreachableError("Simulated connection timeout to NWP forecast gateway.")
        
    lats = ",".join(unique_cells["LAT_COARSE"].astype(str))
    lons = ",".join(unique_cells["LON_COARSE"].astype(str))
    
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lats,
        "longitude": lons,
        "daily": ",".join(REQUIRED_RAW_VARS),
        "models": model,
        "timezone": "Asia/Kolkata",
        "forecast_days": forecast_days
    }
    
    logger.info(f"Querying NWP model '{model}' for {len(unique_cells)} grid cells (Lead horizon: {forecast_days} days)...")
    t0 = time.time()
    try:
        response = requests.get(url, params=params, timeout=timeout)
        duration = time.time() - t0
        logger.info(f"NWP response received in {duration:.2f}s (HTTP {response.status_code}).")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to connect to forecast provider: {e}")
        raise ForecastSourceUnreachableError(f"Upstream provider connection failed: {e}") from e
        
    if response.status_code != 200:
        logger.error(f"Upstream server returned error status {response.status_code}: {response.text[:200]}")
        raise ForecastSourceUnreachableError(f"HTTP {response.status_code} error from forecast provider.")
        
    payload = response.json()
    if isinstance(payload, dict):
        payload = [payload]
        
    # Validation & Simulation Checks
    if simulate_failure == "missing_variable":
        logger.warning("[SIMULATED FAILURE] Intentionally dropping 'relative_humidity_2m_mean' from upstream payload.")
        for item in payload:
            if "daily" in item and "relative_humidity_2m_mean" in item["daily"]:
                del item["daily"]["relative_humidity_2m_mean"]
                
    validate_raw_payload(payload, expected_count=len(unique_cells), expected_days=forecast_days)
    return payload


def validate_raw_payload(payload: List[Dict[str, Any]], expected_count: int, expected_days: int):
    """
    Strict validation of NWP payload. Aborts immediately if incomplete or missing variables.
    Strictly prohibits silent fallback to fabricated or stale historical values.
    """
    if len(payload) != expected_count:
        raise IncompleteForecastDataError(
            f"Expected forecasts for {expected_count} grid cells, but received {len(payload)}."
        )
        
    for i, cell_data in enumerate(payload):
        if "daily" not in cell_data:
            raise IncompleteForecastDataError(f"Cell index {i} missing 'daily' time-series container.")
        daily = cell_data["daily"]
        
        # 1. Check all required variables
        for var in REQUIRED_RAW_VARS:
            if var not in daily:
                raise IncompleteForecastDataError(
                    f"Integrity violation: Variable '{var}' is missing from cell {i} forecast response. "
                    f"Strict zero-fabrication policy enforced: skipping cycle gracefully."
                )
                
        # 2. Check time horizon
        times = daily.get("time", [])
        if len(times) < expected_days:
            raise IncompleteForecastDataError(
                f"Truncated forecast lead horizon: Expected {expected_days} days, received {len(times)} days."
            )
            
        # 3. Check for NaN voids
        for var in REQUIRED_RAW_VARS:
            values = daily[var]
            if any(v is None or np.isnan(v) for v in values):
                raise IncompleteForecastDataError(
                    f"Integrity violation: Detected null/NaN voids in '{var}' for cell {i}."
                )
                
    logger.info("Payload validation PASSED: All 5 variables intact across all lead days with 0 nulls.")


def reformat_and_map_to_panchayats(
    payload: List[Dict[str, Any]],
    unique_cells: pd.DataFrame,
    panchayats_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Transforms raw NWP response into standardized coarse inputs mapped to 239 Panchayats:
    - Normalizes units (wind km/h -> m/s, temperature mean)
    - Joins coarse grid cell forecasts to all 239 Panchayats
    """
    cell_records = []
    
    for i, cell_data in enumerate(payload):
        lat = unique_cells.iloc[i]["LAT_COARSE"]
        lon = unique_cells.iloc[i]["LON_COARSE"]
        daily = cell_data["daily"]
        times = daily["time"]
        
        # Calculate daily mean temperature: (Tmax + Tmin) / 2
        t_max = np.array(daily["temperature_2m_max"], dtype=float)
        t_min = np.array(daily["temperature_2m_min"], dtype=float)
        t_mean = np.round((t_max + t_min) / 2.0, 2)
        
        # Convert wind speed: km/h to m/s
        wind_kmh = np.array(daily["wind_speed_10m_max"], dtype=float)
        wind_ms = np.round(wind_kmh / 3.6, 2)
        
        rain = np.array(daily["precipitation_sum"], dtype=float)
        hum = np.array(daily["relative_humidity_2m_mean"], dtype=float)
        et0 = np.array(daily["et0_fao_evapotranspiration"], dtype=float)
        
        for d_idx, date_str in enumerate(times):
            cell_records.append({
                "LAT_COARSE": lat,
                "LON_COARSE": lon,
                "DATE": date_str,
                "COARSE_RAINFALL": float(rain[d_idx]),
                "COARSE_TEMPERATURE": float(t_mean[d_idx]),
                "COARSE_HUMIDITY": float(hum[d_idx]),
                "COARSE_WIND_SPEED": float(wind_ms[d_idx]),
                "COARSE_EVAPOTRANSPIRATION": float(et0[d_idx])
            })
            
    cell_forecast_df = pd.DataFrame(cell_records)
    
    # Spatial join: map coarse cell forecasts onto all 239 Panchayats
    coarse_panchayat_df = panchayats_df[[
        "GPCODE", "GPNAME", "BLOCK", "LAT_COARSE", "LON_COARSE",
        "ELEVATION_M", "SLOPE_DEG", "LANDCOVER_CLASS"
    ]].merge(
        cell_forecast_df,
        on=["LAT_COARSE", "LON_COARSE"],
        how="inner"
    )
    
    expected_rows = len(panchayats_df) * len(payload[0]["daily"]["time"])
    if len(coarse_panchayat_df) != expected_rows:
        raise IncompleteForecastDataError(
            f"Spatial mapping mismatch: Expected {expected_rows} rows, got {len(coarse_panchayat_df)}."
        )
        
    logger.info(f"Mapped coarse forecasts to {len(panchayats_df)} Panchayats ({len(coarse_panchayat_df):,} total Panchayat-Day records).")
    return coarse_panchayat_df


def execute_pipeline(
    model: str = "ecmwf_ifs025",
    forecast_days: int = 10,
    output_dir: str = DEFAULT_FORECAST_DIR,
    simulate_failure: Optional[str] = None
) -> Optional[str]:
    """
    Master ingestion and downscaling execution routine.
    Returns path to persisted output parquet on success, or None on graceful failure.
    """
    run_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    date_today = datetime.now(timezone.utc).strftime("%Y%m%d")
    run_time = datetime.now(timezone.utc).strftime("%H%M%S")
    os.makedirs(output_dir, exist_ok=True)
    
    logger.info(f"=== Starting Forecast Ingestion Cycle (Run: {date_today}_{run_time}, Model: {model}) ===")
    
    try:
        # 1. Load Panchayats and grid coordinate map
        panchayats_df, unique_cells = load_panchayat_grid_mapping()
        
        # 2. Ingest NWP forecast
        payload = fetch_nwp_forecast(
            unique_cells=unique_cells,
            model=model,
            forecast_days=forecast_days,
            simulate_failure=simulate_failure
        )
        
        # 3. Format and spatially map to 239 Panchayats
        coarse_df = reformat_and_map_to_panchayats(payload, unique_cells, panchayats_df)
        
        # 4. Downscale through Phase 2's locked inference engine
        logger.info(f"Executing Phase 2 downscaling (predict_weather) for {len(coarse_df):,} records...")
        t0_pred = time.time()
        downscaled_df = predict_weather(coarse_inputs=coarse_df)
        dur_pred = time.time() - t0_pred
        logger.info(f"Downscaling completed in {dur_pred:.2f}s ({len(downscaled_df):,} total output predictions).")
        
        # 5. Attach RUN_TIMESTAMP to distinguish multi-run daily updates
        downscaled_df["RUN_TIMESTAMP"] = run_timestamp
        
        # 6. Persist to queryable store
        # A. Master snapshot Parquet file
        snapshot_filename = f"forecast_{date_today}_{run_time}.parquet"
        snapshot_path = os.path.join(output_dir, snapshot_filename)
        downscaled_df.to_parquet(snapshot_path, engine="pyarrow", compression="snappy", index=False)
        logger.info(f"Persisted master forecast snapshot: {snapshot_path}")
        
        # B. Date-partitioned store for backend query acceleration
        partitioned_dir = os.path.join(output_dir, "by_date")
        downscaled_df.to_parquet(
            partitioned_dir,
            partition_cols=["DATE"],
            engine="pyarrow",
            compression="snappy",
            index=False
        )
        logger.info(f"Updated date-partitioned query store in: {partitioned_dir}")
        
        logger.info(f"=== Forecast Ingestion Cycle COMPLETED SUCCESSFULLY (Output: {snapshot_filename}) ===")
        return snapshot_path
        
    except ForecastIngestionError as e:
        logger.error(f"[GRACEFUL SKIP] Ingestion cycle safely aborted without writing corrupted data: {e}")
        logger.warning("Strict policy adhered: NO stale or fabricated values were written to persistent stores.")
        return None
    except Exception as e:
        logger.exception(f"[UNEXPECTED FAILURE] Unhandled error during forecast pipeline: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="SIH26074 Operational Forecast Ingestion & Downscaling Engine")
    parser.add_argument("--model", type=str, default="ecmwf_ifs025", choices=["ecmwf_ifs025", "gfs_seamless"],
                        help="NWP model source (default: ecmwf_ifs025)")
    parser.add_argument("--forecast-days", type=int, default=10, help="Forecast lead horizon in days (1-10)")
    parser.add_argument("--output-dir", type=str, default=DEFAULT_FORECAST_DIR, help="Directory to save forecast parquet files")
    parser.add_argument("--simulate-failure", type=str, default=None,
                        choices=["missing_variable", "network_error"],
                        help="Simulate failure condition for robustness verification")
    args = parser.parse_args()
    
    result = execute_pipeline(
        model=args.model,
        forecast_days=args.forecast_days,
        output_dir=args.output_dir,
        simulate_failure=args.simulate_failure
    )
    
    if result:
        print(f"\nSUCCESS: Generated forecast at {result}")
        sys.exit(0)
    else:
        print("\nCYCLE SKIPPED GRACEFULLY: Integrity preserved without writing corrupted data.")
        sys.exit(1 if not args.simulate_failure else 0)


if __name__ == "__main__":
    main()
