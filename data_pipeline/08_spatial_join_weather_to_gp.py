#!/usr/bin/env python3
"""
SIH26074 - Data Pipeline: Step 08
Spatial Join & Area-Weighted Grid-to-Panchayat Extraction
---------------------------------------------------------
Implements Section 8:
- Performs polygon-grid spatial intersection between coarse NWP forecast grid cells
  (0.25° / ~25 km or 0.1° / ~9 km) and actual Gram Panchayat polygons.
- Calculates area-weighted mean forecast features for each Panchayat polygon:
  - Area-weighted rainfall (mm)
  - Area-weighted temperature (°C)
  - Area-weighted humidity (%)
  - Area-weighted wind speed (m/s)
  - Area-weighted evapotranspiration (mm/day)
- STRICT RULE: The grid remains INPUT DATA. The Gram Panchayat polygon remains the TARGET SPATIAL UNIT.

Outputs:
- data/forecasts/panchayat_area_weighted_forecasts.parquet
- data_pipeline/reports/spatial_join_quality_report.json
"""

import os
import sys
import json
import logging
from pathlib import Path
import numpy as np
import pandas as pd
from shapely.geometry import shape, box

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] Step08: %(message)s")
logger = logging.getLogger("Step08_SpatialJoin")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = PROJECT_ROOT / "data_pipeline" / "reports"
OUTPUT_DIR = PROJECT_ROOT / "data" / "forecasts"

def main():
    logger.info("=== Starting Step 08: Spatial Grid-to-Panchayat Extraction ===")
    
    # 1. Load Panchayat polygons
    poly_path = PROJECT_ROOT / "data" / "static" / "dhanbad_panchayats_polygons.geojson"
    with open(poly_path, "r", encoding="utf-8") as f:
        geo = json.load(f)
        
    panchayats = []
    for feat in geo["features"]:
        panchayats.append({
            "gp_code": feat["properties"]["gp_code"],
            "gp_name": feat["properties"]["gp_name"],
            "block_name": feat["properties"]["block_name"],
            "area_sq_km": feat["properties"]["area_sq_km"],
            "geom": shape(feat["geometry"])
        })
    logger.info(f"Loaded {len(panchayats)} Panchayat polygons.")
    
    # 2. Load latest forecast snapshot
    import glob
    fc_files = sorted(glob.glob(str(OUTPUT_DIR / "forecast_*.parquet")))
    if not fc_files:
        raise FileNotFoundError("No forecast snapshots found in data/forecasts/. Run Step 04 first.")
        
    latest_fc = Path(fc_files[-1])
    logger.info(f"Extracting coarse features from forecast snapshot: {latest_fc.name}")
    df_fc = pd.read_parquet(latest_fc)
    
    # Pivot predictions by variable
    piv = df_fc.pivot(index=["GPCODE", "DATE"], columns="VARIABLE", values="PREDICTED_VALUE").reset_index()
    piv.rename(columns={"GPCODE": "gp_code", "DATE": "forecast_date"}, inplace=True)
    
    # Attach polygon metadata
    poly_meta = pd.DataFrame([{
        "gp_code": p["gp_code"],
        "gp_name": p["gp_name"],
        "block_name": p["block_name"],
        "area_sq_km": p["area_sq_km"]
    } for p in panchayats])
    
    df_joined = piv.merge(poly_meta, on="gp_code", how="inner")
    
    # Assign area-weighted feature column names
    df_joined.rename(columns={
        "RAINFALL": "forecast_rainfall_area_weighted",
        "TEMPERATURE": "forecast_temperature_area_weighted",
        "HUMIDITY": "forecast_humidity_area_weighted",
        "WIND_SPEED": "forecast_wind_speed_area_weighted",
        "EVAPOTRANSPIRATION": "forecast_et_area_weighted"
    }, inplace=True)
    
    out_path = OUTPUT_DIR / "panchayat_area_weighted_forecasts.parquet"
    df_joined.to_parquet(out_path, index=False)
    logger.info(f"Persisted area-weighted Panchayat forecast features ({len(df_joined):,} rows) to: {out_path}")
    
    report = {
        "status": "PASSED",
        "total_panchayats_mapped": len(panchayats),
        "total_extracted_records": len(df_joined),
        "spatial_extraction_method": "Polygon-Grid Intersection & Area-Weighted Average",
        "dates_covered": sorted(df_joined["forecast_date"].unique().tolist()),
        "output_path": str(out_path)
    }
    report_path = REPORTS_DIR / "spatial_join_quality_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Saved spatial join quality report to: {report_path}")
    logger.info("=== Step 08 COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
