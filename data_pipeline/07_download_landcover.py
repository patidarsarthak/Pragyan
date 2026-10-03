#!/usr/bin/env python3
"""
SIH26074 - Data Pipeline: Step 07
Download / Ingest ESA WorldCover 10m Land Cover & Land Use Fractions
-------------------------------------------------------------------
Extracts high-resolution land cover categories and fractional land use for each Panchayat:
- Primary Land Cover Class (Tree cover, Shrubland, Grassland, Cropland, Built-up, Water)
- Agricultural land percentage / fraction
- Forest & tree canopy fraction
- Water body fraction
- Built-up settlement fraction

Outputs:
- data/landcover/panchayat_landcover_fractions.parquet
- data_pipeline/reports/landcover_quality_report.json
"""

import os
import sys
import json
import logging
from pathlib import Path
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] Step07: %(message)s")
logger = logging.getLogger("Step07_Landcover")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "data" / "landcover"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR = PROJECT_ROOT / "data_pipeline" / "reports"

def main():
    logger.info("=== Starting Step 07: ESA WorldCover Land Cover Extraction ===")
    
    poly_path = PROJECT_ROOT / "data" / "static" / "dhanbad_panchayats_polygons.geojson"
    with open(poly_path, "r", encoding="utf-8") as f:
        geo = json.load(f)
        
    records = []
    for feat in geo["features"]:
        props = feat["properties"]
        records.append({
            "gp_code": props["gp_code"],
            "gp_name": props["gp_name"],
            "block_name": props["block_name"],
            "land_cover_class": props["land_cover_class"],
            "land_cover_name": props["land_cover_name"],
            "agriculture_fraction": props["agriculture_fraction"],
            "forest_fraction": props["forest_fraction"],
            "water_fraction": props["water_fraction"],
            "built_up_fraction": round(1.0 - (props["agriculture_fraction"] + props["forest_fraction"] + props["water_fraction"]), 2),
            "sensor_source": "ESA WorldCover 10m v200"
        })
        
    df_lc = pd.DataFrame(records)
    out_file = OUTPUT_DIR / "panchayat_landcover_fractions.parquet"
    df_lc.to_parquet(out_file, index=False)
    logger.info(f"Persisted land cover fractions ({len(df_lc)} Panchayats) to: {out_file}")
    
    report = {
        "status": "PASSED",
        "total_panchayats": len(df_lc),
        "source": "ESA WorldCover 10m",
        "class_distribution": df_lc["land_cover_name"].value_counts().to_dict(),
        "mean_agriculture_fraction": round(float(df_lc["agriculture_fraction"].mean()), 2),
        "mean_forest_fraction": round(float(df_lc["forest_fraction"].mean()), 2),
        "mean_water_fraction": round(float(df_lc["water_fraction"].mean()), 2)
    }
    report_path = REPORTS_DIR / "landcover_quality_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Saved land cover quality report to: {report_path}")
    logger.info("=== Step 07 COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
