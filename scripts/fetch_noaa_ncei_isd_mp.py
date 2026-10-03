#!/usr/bin/env python3
"""
SIH26074 - Ingest Verified NOAA NCEI ISD Stations for Madhya Pradesh (2023-2024)
-------------------------------------------------------------------------------
Downloads authentic global-hourly surface records from NOAA NCEI archive:
- Bhopal / Raja Bhoj Airport (426670-99999)
- Indore / Devi Ahilyabai Holkar Airport (427540-99999)
- Jabalpur Airport (426750-99999)
- Khajuraho Airport (425670-99999)
- Satna (425710-99999)
- Ujjain (426620-99999)
- Betul (428600-99999)
- Pachmarhi (427670-99999)

Aggregates strictly to UTC calendar day (00:00:00Z to 23:59:59Z) to match
reanalysis products without timezone drift.
"""

import io
import math
import logging
import urllib.request
from pathlib import Path
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("NOAA_MP_Ingestion")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = PROJECT_ROOT / "data" / "validation" / "real"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MP_VERIFIED_STATIONS = [
    {
        "station_id": "42667099999",
        "usaf": "426670",
        "wban": "99999",
        "station_name": "BHOPAL / RAJA BHOJ",
        "district": "Bhopal",
        "latitude": 23.287,
        "longitude": 77.337,
        "elevation_m": 524.0,
        "station_type": "ISD_AIRPORT",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42754099999",
        "usaf": "427540",
        "wban": "99999",
        "station_name": "INDORE / DEVI AHILYABAI",
        "district": "Indore",
        "latitude": 22.722,
        "longitude": 75.801,
        "elevation_m": 563.9,
        "station_type": "ISD_AIRPORT",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42675099999",
        "usaf": "426750",
        "wban": "99999",
        "station_name": "JABALPUR ARPT",
        "district": "Jabalpur",
        "latitude": 23.178,
        "longitude": 80.052,
        "elevation_m": 495.0,
        "station_type": "ISD_AIRPORT",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42567099999",
        "usaf": "425670",
        "wban": "99999",
        "station_name": "KHAJURAHO ARPT",
        "district": "Chhatarpur",
        "latitude": 24.983,
        "longitude": 79.917,
        "elevation_m": 217.0,
        "station_type": "ISD_AIRPORT",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42571099999",
        "usaf": "425710",
        "wban": "99999",
        "station_name": "SATNA",
        "district": "Satna",
        "latitude": 24.567,
        "longitude": 80.833,
        "elevation_m": 317.0,
        "station_type": "ISD_OBSERVATORY",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42662099999",
        "usaf": "426620",
        "wban": "99999",
        "station_name": "UJJAIN",
        "district": "Ujjain",
        "latitude": 23.183,
        "longitude": 75.783,
        "elevation_m": 489.0,
        "station_type": "ISD_OBSERVATORY",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42860099999",
        "usaf": "428600",
        "wban": "99999",
        "station_name": "BETUL",
        "district": "Betul",
        "latitude": 21.867,
        "longitude": 77.933,
        "elevation_m": 653.0,
        "station_type": "ISD_OBSERVATORY",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42767099999",
        "usaf": "427670",
        "wban": "99999",
        "station_name": "PACHMARHI",
        "district": "Narmadapuram",
        "latitude": 22.467,
        "longitude": 78.433,
        "elevation_m": 1075.0,
        "station_type": "ISD_HILL_OBSERVATORY",
        "source": "NOAA NCEI Integrated Surface Database"
    }
]

def calculate_rh(temp_c: float, dew_c: float) -> float:
    if pd.isna(temp_c) or pd.isna(dew_c):
        return np.nan
    try:
        a = 17.625
        b = 243.04
        alpha = ((a * temp_c) / (b + temp_c))
        beta = ((a * dew_c) / (b + dew_c))
        rh = 100.0 * math.exp(beta - alpha)
        return min(100.0, max(0.0, rh))
    except Exception:
        return np.nan

def fetch_station_year(station_id: str, year: str) -> pd.DataFrame:
    url = f"https://www.ncei.noaa.gov/data/global-hourly/access/{year}/{station_id}.csv"
    logger.info(f"Downloading: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read()
            df = pd.read_csv(io.BytesIO(content), low_memory=False)
            return df
    except Exception as e:
        logger.warning(f"Failed to fetch {station_id} for {year}: {e}")
        return pd.DataFrame()

def parse_and_aggregate_station(raw_df: pd.DataFrame, station_meta: dict) -> pd.DataFrame:
    if raw_df.empty:
        return pd.DataFrame()

    raw_df["utc_datetime"] = pd.to_datetime(raw_df["DATE"], errors="coerce", utc=True)
    raw_df = raw_df.dropna(subset=["utc_datetime"])
    raw_df["date"] = raw_df["utc_datetime"].dt.strftime("%Y-%m-%d")

    def parse_tmp(val):
        if pd.isna(val):
            return np.nan
        parts = str(val).split(",")
        try:
            t = float(parts[0]) / 10.0
            qc = parts[1] if len(parts) > 1 else ""
            if qc in ["1", "5"] and -30.0 < t < 60.0:
                return t
        except Exception:
            pass
        return np.nan

    def parse_dew(val):
        if pd.isna(val):
            return np.nan
        parts = str(val).split(",")
        try:
            d = float(parts[0]) / 10.0
            qc = parts[1] if len(parts) > 1 else ""
            if qc in ["1", "5"] and -40.0 < d < 50.0:
                return d
        except Exception:
            pass
        return np.nan

    def parse_wnd_spd(val):
        if pd.isna(val):
            return np.nan
        parts = str(val).split(",")
        if len(parts) >= 4:
            try:
                spd = float(parts[3]) / 10.0
                if spd < 100.0:
                    return spd
            except Exception:
                pass
        return np.nan

    raw_df["temp_c"] = raw_df["TMP"].apply(parse_tmp)
    raw_df["dew_c"] = raw_df["DEW"].apply(parse_dew)
    raw_df["wind_spd_ms"] = raw_df["WND"].apply(parse_wnd_spd)
    raw_df["rh_pct"] = raw_df.apply(lambda row: calculate_rh(row["temp_c"], row["dew_c"]), axis=1)

    daily = raw_df.groupby("date").agg(
        n_obs=("temp_c", "count"),
        temp_mean=("temp_c", "mean"),
        temp_min=("temp_c", "min"),
        temp_max=("temp_c", "max"),
        rh_mean=("rh_pct", "mean"),
        wind_speed_mean=("wind_spd_ms", "mean")
    ).reset_index()

    # Filter out days with < 4 observations
    daily = daily[daily["n_obs"] >= 4].copy()

    for k, v in station_meta.items():
        daily[k] = v

    return daily

def main():
    years = ["2023", "2024"]
    all_daily_records = []

    for meta in MP_VERIFIED_STATIONS:
        st_id = meta["station_id"]
        st_name = meta["station_name"]
        logger.info(f"Processing station: {st_name} ({st_id})")

        station_dfs = []
        for yr in years:
            raw = fetch_station_year(st_id, yr)
            if not raw.empty:
                daily = parse_and_aggregate_station(raw, meta)
                station_dfs.append(daily)
                logger.info(f"  Year {yr}: {len(daily)} valid days processed.")

        if station_dfs:
            combined = pd.concat(station_dfs, ignore_index=True)
            all_daily_records.append(combined)

    if not all_daily_records:
        logger.error("No daily records fetched.")
        return

    full_df = pd.concat(all_daily_records, ignore_index=True)
    full_df = full_df.sort_values(by=["station_id", "date"]).reset_index(drop=True)

    # Save to CSV and Parquet
    csv_path = OUT_DIR / "mp_isd_daily_observations.csv"
    parquet_path = OUT_DIR / "mp_isd_daily_observations.parquet"

    full_df.to_csv(csv_path, index=False)
    full_df.to_parquet(parquet_path, index=False)

    logger.info(f"\n=======================================================")
    logger.info(f"SUCCESS: Saved {len(full_df)} daily station records to:")
    logger.info(f"  CSV:     {csv_path}")
    logger.info(f"  Parquet: {parquet_path}")
    logger.info(f"=======================================================")

    # Summary table
    print("\n--- Summary of Verified Real MP NOAA Stations ---")
    summary = full_df.groupby(["station_name", "station_id"]).agg(
        days_count=("date", "count"),
        min_date=("date", "min"),
        max_date=("date", "max"),
        temp_mean=("temp_mean", "mean"),
        temp_min_record=("temp_min", "min"),
        temp_max_record=("temp_max", "max")
    ).reset_index()
    print(summary.to_string(index=False))

if __name__ == "__main__":
    main()
