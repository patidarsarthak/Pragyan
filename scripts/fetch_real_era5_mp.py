#!/usr/bin/env python3
"""
Fetch Native ECMWF ERA5 (0.25°) Reanalysis for MP Ground Stations (2023-2024).
-----------------------------------------------------------------------------
Downloads authentic daily ERA5 reanalysis from ECMWF via Open-Meteo archive API
for the 5 key NOAA ISD stations across Madhya Pradesh:
- Bhopal / Raja Bhoj (42667099999)
- Indore / Devi Ahilyabai (42754099999)
- Jabalpur Arpt (42675099999)
- Khajuraho Arpt (42567099999)
- Satna (42571099999)

All data strictly referenced to UTC calendar day (00:00Z to 23:59Z).
"""

import sys
import time
import json
import logging
from pathlib import Path
import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ERA5_MP_Ingestion")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = PROJECT_ROOT / "data" / "validation" / "real"
OUT_DIR.mkdir(parents=True, exist_ok=True)

CACHE_DIR = OUT_DIR / "era5_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

MP_STATIONS = [
    {"station_id": "42667099999", "name": "BHOPAL / RAJA BHOJ", "lat": 23.287, "lon": 77.337, "elevation_m": 524.0},
    {"station_id": "42754099999", "name": "INDORE / DEVI AHILYABAI", "lat": 22.722, "lon": 75.801, "elevation_m": 563.9},
    {"station_id": "42675099999", "name": "JABALPUR ARPT", "lat": 23.178, "lon": 80.052, "elevation_m": 495.0},
    {"station_id": "42567099999", "name": "KHAJURAHO ARPT", "lat": 24.983, "lon": 79.917, "elevation_m": 217.0},
    {"station_id": "42571099999", "name": "SATNA", "lat": 24.567, "lon": 80.833, "elevation_m": 317.0}
]

def fetch_era5_station(st: dict, start_date: str = "2023-01-01", end_date: str = "2024-12-31") -> pd.DataFrame:
    sid = st["station_id"]
    lat = st["lat"]
    lon = st["lon"]
    cache_file = CACHE_DIR / f"era5_mp_{sid}_{start_date}_{end_date}.json"

    if cache_file.exists():
        logger.info(f"Loading cached ERA5 for {st['name']} ({sid})")
        with open(cache_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        logger.info(f"Downloading ERA5 for {st['name']} ({lat}, {lon})...")
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": [
                "temperature_2m_mean",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum"
            ],
            "models": "era5",
            "timezone": "UTC"
        }
        for attempt in range(5):
            try:
                r = requests.get(url, params=params, timeout=40)
                if r.status_code == 200:
                    data = r.json()
                    with open(cache_file, "w", encoding="utf-8") as f:
                        json.dump(data, f)
                    time.sleep(4.0)
                    break
                elif r.status_code == 429:
                    logger.warning("Rate limit hit, sleeping 15s...")
                    time.sleep(15.0)
                else:
                    time.sleep(5.0)
            except Exception as e:
                logger.warning(f"Error: {e}")
                time.sleep(5.0)
        else:
            raise RuntimeError(f"Failed to fetch ERA5 for {sid}")

    daily = data["daily"]
    era5_elev = data.get("elevation", st["elevation_m"])

    df = pd.DataFrame({
        "station_id": sid,
        "station_name": st["name"],
        "station_lat": lat,
        "station_lon": lon,
        "station_elevation_m": st["elevation_m"],
        "era5_elevation_m": era5_elev,
        "date": daily["time"],
        "era5_temp_mean_c": daily["temperature_2m_mean"],
        "era5_temp_max_c": daily["temperature_2m_max"],
        "era5_temp_min_c": daily["temperature_2m_min"],
        "era5_precip_mm": daily["precipitation_sum"]
    })
    return df

def main():
    dfs = []
    for st in MP_STATIONS:
        df = fetch_era5_station(st)
        dfs.append(df)
        logger.info(f"Fetched {len(df)} days for {st['name']}")

    all_era5 = pd.concat(dfs, ignore_index=True)
    out_parquet = OUT_DIR / "real_era5_mp_stations_daily_2023_2024.parquet"
    out_csv = OUT_DIR / "real_era5_mp_stations_daily_2023_2024.csv"

    all_era5.to_parquet(out_parquet, index=False)
    all_era5.to_csv(out_csv, index=False)

    logger.info(f"\nSaved {len(all_era5)} station-day ERA5 reanalysis records to:")
    logger.info(f"  {out_parquet}")
    logger.info(f"  {out_csv}")

if __name__ == "__main__":
    main()
