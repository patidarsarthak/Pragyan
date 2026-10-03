"""
Daily Live IFS Forecast Logger.

Fetches the operational ECMWF IFS forecast for Dhanbad district for all lead days (Day 1 to Day 10)
and appends each forecast cycle to an immutable historical forecast archive.

This builds a verified lead-time verification archive over time:
- run_date: Date/time the forecast cycle was initiated (e.g. 2026-10-02 00Z)
- target_date: The future calendar date being predicted
- lead_day: Lead time in days (1 = +24h, 2 = +48h, ..., 10 = +240h)
- variables: precipitation_sum_mm, temp_mean_c, temp_max_c, temp_min_c

Run this script once daily via Windows Task Scheduler or cron.
"""

import sys
import os
import time
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Live_IFS_Logger")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_DIR = PROJECT_ROOT / "data" / "forecast_archive"
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
ARCHIVE_PARQUET = ARCHIVE_DIR / "live_ifs_forecast_runs.parquet"

# Key monitoring centroids across Dhanbad district
MONITORING_POINTS = [
    {"point_id": "DHN_CENTRAL", "name": "Dhanbad HQ / Jharia", "lat": 23.79, "lon": 86.43},
    {"point_id": "DHN_WEST", "name": "Topchanchi / Parasnath foothills", "lat": 23.90, "lon": 86.20},
    {"point_id": "DHN_EAST", "name": "Nirsa / Chirkunda", "lat": 23.78, "lon": 86.71},
    {"point_id": "DHN_NORTH", "name": "Tundi highlands", "lat": 23.99, "lon": 86.45},
    {"point_id": "DHN_SOUTH", "name": "Baliapur / Damodar basin", "lat": 23.71, "lon": 86.53},
]

def fetch_live_ifs_run(lat: float, lon: float) -> dict:
    """Fetch 10-day ECMWF IFS forecast cycle from Open-Meteo."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": [
            "precipitation_sum",
            "temperature_2m_mean",
            "temperature_2m_max",
            "temperature_2m_min",
            "wind_speed_10m_max"
        ],
        "models": "ecmwf_ifs025",
        "forecast_days": 10,
        "timezone": "UTC"
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def log_daily_run():
    run_timestamp_utc = datetime.now(timezone.utc)
    run_date_str = run_timestamp_utc.strftime("%Y-%m-%d")
    run_cycle_str = run_timestamp_utc.strftime("%Y-%m-%d_%H00Z")

    logger.info(f"=== Logging Live ECMWF IFS 10-Day Forecast Cycle: {run_cycle_str} ===")

    new_rows = []
    for pt in MONITORING_POINTS:
        pid = pt["point_id"]
        pname = pt["name"]
        lat = pt["lat"]
        lon = pt["lon"]

        logger.info(f"  Fetching 10-day forecast for {pname} ({lat}, {lon})...")
        try:
            res = fetch_live_ifs_run(lat, lon)
            daily = res.get("daily", {})
            times = daily.get("time", [])
            precips = daily.get("precipitation_sum", [])
            t_means = daily.get("temperature_2m_mean", [])
            t_maxs = daily.get("temperature_2m_max", [])
            t_mins = daily.get("temperature_2m_min", [])

            run_dt = datetime.strptime(run_date_str, "%Y-%m-%d")

            for idx, target_date_str in enumerate(times):
                target_dt = datetime.strptime(target_date_str, "%Y-%m-%d")
                lead_day = (target_dt - run_dt).days

                new_rows.append({
                    "run_cycle": run_cycle_str,
                    "run_date": run_date_str,
                    "point_id": pid,
                    "point_name": pname,
                    "latitude": lat,
                    "longitude": lon,
                    "target_date": target_date_str,
                    "lead_day": lead_day,
                    "forecast_precip_mm": precips[idx] if idx < len(precips) else None,
                    "forecast_temp_mean_c": t_means[idx] if idx < len(t_means) else None,
                    "forecast_temp_max_c": t_maxs[idx] if idx < len(t_maxs) else None,
                    "forecast_temp_min_c": t_mins[idx] if idx < len(t_mins) else None,
                    "model_source": "ECMWF_IFS_025",
                    "logged_at_utc": run_timestamp_utc.isoformat()
                })
            time.sleep(1.0)
        except Exception as e:
            logger.error(f"Failed to fetch forecast for {pid}: {e}")

    if not new_rows:
        logger.error("No forecast rows fetched.")
        return

    new_df = pd.DataFrame(new_rows)

    # Append to existing parquet archive
    if ARCHIVE_PARQUET.exists():
        existing_df = pd.read_parquet(ARCHIVE_PARQUET)
        combined_df = pd.concat([existing_df, new_df], ignore_index=True)
        # Drop duplicates on run_cycle, point_id, target_date
        combined_df = combined_df.drop_duplicates(subset=["run_cycle", "point_id", "target_date"])
    else:
        combined_df = new_df

    combined_df.to_parquet(ARCHIVE_PARQUET, index=False)
    logger.info(f"Saved {len(new_df)} new forecast records to archive. Total archived rows: {len(combined_df):,}")
    logger.info(f"Archive file: {ARCHIVE_PARQUET}")

if __name__ == "__main__":
    log_daily_run()
