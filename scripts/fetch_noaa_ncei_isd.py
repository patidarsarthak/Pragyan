#!/usr/bin/env python3
"""
SIH26074 - Ingest Verified NOAA NCEI ISD Stations (2023-2024)
-----------------------------------------------------------
Downloads authentic global-hourly surface records from NOAA NCEI archive:
- Birsa Munda Airport, Ranchi (427010-99999)
- Gaya Airport (425910-99999)
- Purulia Observatory (427050-99999)
- Jamshedpur Sonari Airport (427980-99999)
- Bankura Observatory (427060-99999)
- Shanti Niketan Observatory (427080-99999)

Aggregates strictly to UTC calendar day (00:00:00Z to 23:59:59Z) to eliminate
time-zone offsets against ERA5-Land / CHIRPS daily products.
"""

import io
import sys
import math
import logging
import urllib.request
from pathlib import Path
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("NOAA_Ingestion")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = PROJECT_ROOT / "data" / "validation" / "real"
OUT_DIR.mkdir(parents=True, exist_ok=True)

VERIFIED_STATIONS = [
    {
        "station_id": "42701099999",
        "usaf": "427010",
        "wban": "99999",
        "station_name": "BIRSA MUNDA (Ranchi Airport)",
        "latitude": 23.314,
        "longitude": 85.322,
        "elevation_m": 654.7,
        "station_type": "ISD_AIRPORT",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42591099999",
        "usaf": "425910",
        "wban": "99999",
        "station_name": "GAYA (Gaya Airport)",
        "latitude": 24.744,
        "longitude": 84.951,
        "elevation_m": 115.8,
        "station_type": "ISD_AIRPORT",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42705099999",
        "usaf": "427050",
        "wban": "99999",
        "station_name": "PURULIA (Purulia Observatory)",
        "latitude": 23.333,
        "longitude": 86.417,
        "elevation_m": 255.0,
        "station_type": "ISD_OBSERVATORY",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42798099999",
        "usaf": "427980",
        "wban": "99999",
        "station_name": "JAMSHEDPUR (Sonari Airport)",
        "latitude": 22.813,
        "longitude": 86.169,
        "elevation_m": 153.9,
        "station_type": "ISD_AIRPORT",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42706099999",
        "usaf": "427060",
        "wban": "99999",
        "station_name": "BANKURA (Bankura Observatory)",
        "latitude": 23.383,
        "longitude": 87.083,
        "elevation_m": 100.0,
        "station_type": "ISD_OBSERVATORY",
        "source": "NOAA NCEI Integrated Surface Database"
    },
    {
        "station_id": "42708099999",
        "usaf": "427080",
        "wban": "99999",
        "station_name": "SHANTI NIKETAN (Shanti Niketan)",
        "latitude": 23.650,
        "longitude": 87.700,
        "elevation_m": 59.0,
        "station_type": "ISD_OBSERVATORY",
        "source": "NOAA NCEI Integrated Surface Database"
    }
]

def calculate_rh(temp_c: float, dew_c: float) -> float:
    """Computes relative humidity (%) using Magnus-Tetens formula."""
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

    # Parse DATE in UTC
    raw_df["utc_datetime"] = pd.to_datetime(raw_df["DATE"], errors="coerce", utc=True)
    raw_df = raw_df.dropna(subset=["utc_datetime"])
    raw_df["date"] = raw_df["utc_datetime"].dt.strftime("%Y-%m-%d")

    # Parse Temperature (TMP column: format "+0116,1")
    def parse_tmp(val):
        if pd.isna(val):
            return np.nan
        parts = str(val).split(",")
        try:
            t = float(parts[0]) / 10.0
            qc = parts[1] if len(parts) > 1 else ""
            if qc in ["1", "5"] and t < 60.0 and t > -30.0:
                return t
        except Exception:
            pass
        return np.nan

    # Parse Dew Point (DEW column: format "+0085,1")
    def parse_dew(val):
        if pd.isna(val):
            return np.nan
        parts = str(val).split(",")
        try:
            d = float(parts[0]) / 10.0
            qc = parts[1] if len(parts) > 1 else ""
            if qc in ["1", "5"] and d < 50.0 and d > -40.0:
                return d
        except Exception:
            pass
        return np.nan

    # Parse Wind (WND column: format "dir,qc,type,speed,qc")
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
    raw_df["dew_c"] = raw_df["DEW"].apply(parse_dew) if "DEW" in raw_df.columns else np.nan
    raw_df["wind_ms"] = raw_df["WND"].apply(parse_wnd_spd) if "WND" in raw_df.columns else np.nan
    raw_df["rh_pct"] = [calculate_rh(t, d) for t, d in zip(raw_df["temp_c"], raw_df["dew_c"])]

    # Daily UTC Aggregation
    daily_records = []
    for dt, group in raw_df.groupby("date"):
        valid_t = group["temp_c"].dropna()
        valid_rh = group["rh_pct"].dropna()
        valid_wnd = group["wind_ms"].dropna()

        obs_count = len(group)
        t_count = len(valid_t)

        daily_records.append({
            "station_id": station_meta["station_id"],
            "station_name": station_meta["station_name"],
            "latitude": station_meta["latitude"],
            "longitude": station_meta["longitude"],
            "elevation_m": station_meta["elevation_m"],
            "date": dt,
            "obs_temp_max_c": round(float(valid_t.max()), 2) if t_count > 0 else np.nan,
            "obs_temp_min_c": round(float(valid_t.min()), 2) if t_count > 0 else np.nan,
            "obs_temp_mean_c": round(float(valid_t.mean()), 2) if t_count > 0 else np.nan,
            "obs_humidity_mean_pct": round(float(valid_rh.mean()), 1) if len(valid_rh) > 0 else np.nan,
            "obs_wind_speed_mean_ms": round(float(valid_wnd.mean()), 2) if len(valid_wnd) > 0 else np.nan,
            "obs_wind_speed_max_ms": round(float(valid_wnd.max()), 2) if len(valid_wnd) > 0 else np.nan,
            "raw_observations_count": obs_count,
            "valid_temp_records_count": t_count,
            "day_completeness_pct": round(min(100.0, (t_count / 8.0) * 100.0), 1), # Most Indian ISD stations report 3-hourly (8 obs/day) or hourly
            "day_definition": "UTC_DAY_00Z_TO_2359Z"
        })

    return pd.DataFrame(daily_records)

def main():
    logger.info("=== Ingesting Verified NOAA NCEI ISD Ground Observations (2023-2024) ===")
    
    # 1. Save Catalog
    catalog_df = pd.DataFrame(VERIFIED_STATIONS)
    catalog_csv = OUT_DIR / "verified_isd_stations.csv"
    catalog_df.to_csv(catalog_csv, index=False)
    logger.info(f"Saved verified stations catalog to: {catalog_csv}")

    # 2. Ingest Observations
    all_daily = []
    summary_stats = []

    for st in VERIFIED_STATIONS:
        st_dfs = []
        for yr in ["2023", "2024"]:
            df_yr = fetch_station_year(st["station_id"], yr)
            if not df_yr.empty:
                st_dfs.append(df_yr)

        if st_dfs:
            combined_raw = pd.concat(st_dfs, ignore_index=True)
            daily_df = parse_and_aggregate_station(combined_raw, st)
            all_daily.append(daily_df)

            total_days = len(daily_df)
            missing_temp = daily_df["obs_temp_mean_c"].isna().sum()
            missing_temp_rate = (missing_temp / total_days * 100.0) if total_days > 0 else 100.0

            summary_stats.append({
                "station_id": st["station_id"],
                "name": st["station_name"],
                "raw_hourly_rows": len(combined_raw),
                "daily_utc_rows": total_days,
                "missing_temp_days": int(missing_temp),
                "missing_temp_pct": round(missing_temp_rate, 2),
                "date_min": daily_df["date"].min(),
                "date_max": daily_df["date"].max()
            })
            logger.info(f"Station {st['station_name']}: {len(combined_raw):,} raw records -> {total_days} daily UTC rows (Missing temp: {missing_temp_rate:.1f}%)")
        else:
            logger.warning(f"No records found for station {st['station_name']}")

    if all_daily:
        final_df = pd.concat(all_daily, ignore_index=True)
        out_parquet = OUT_DIR / "real_isd_station_observations_daily.parquet"
        final_df.to_parquet(out_parquet, index=False)
        logger.info(f"Successfully wrote {len(final_df):,} daily records to {out_parquet}")

        # Save Ingestion Summary MD
        summary_df = pd.DataFrame(summary_stats)
        summary_md = OUT_DIR / "isd_ingestion_summary.md"
        with open(summary_md, "w", encoding="utf-8") as f:
            f.write("# Verified NOAA ISD Surface Station Ingestion Summary\n\n")
            f.write(f"Generated at: UTC\n")
            f.write(f"Total Daily Observation Records: **{len(final_df):,}**\n")
            f.write(f"Standard Day Definition: **UTC Day (00:00Z to 23:59Z)**\n\n")
            # Custom markdown table generator
            headers = list(summary_df.columns)
            header_line = "| " + " | ".join(headers) + " |"
            sep_line = "| " + " | ".join(["---"] * len(headers)) + " |"
            rows = ["| " + " | ".join(str(val) for val in row) + " |" for row in summary_df.values]
            f.write(header_line + "\n" + sep_line + "\n" + "\n".join(rows) + "\n\n")
        logger.info(f"Wrote summary to: {summary_md}")

        print("\n=== FINAL INGESTION SUMMARY TABLE ===")
        print(summary_df.to_string(index=False))

if __name__ == "__main__":
    main()
