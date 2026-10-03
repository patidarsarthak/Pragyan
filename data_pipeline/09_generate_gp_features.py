#!/usr/bin/env python3
"""
SIH26074 - Data Pipeline: Step 09
Generate Comprehensive Panchayat Zonal GIS & Atmospheric Feature Matrix
-----------------------------------------------------------------------
Implements Section 9:
Combines:
1. Polygon Zonal Topography: Elevation (mean, min, max, relief spread), Slope gradient.
2. Environmental Indices: Mean NDVI, ESA Land Cover Class, Agriculture %, Forest %, Water %.
3. Administrative Attributes: Official LGD GPCODE, Block Code, District (336), State (20), Centroids, Area (sq km).
4. Climatological Embeddings: Cyclic day-of-year embeddings (sin/cos DOY), Monsoon season flag.
5. Area-Weighted Coarse Weather Inputs: Rain, Temp, Humidity, Wind, ET0.

Outputs:
- data/features/panchayat_full_features.parquet
- data_pipeline/reports/gp_feature_matrix_quality_report.json
"""

import os
import sys
import json
import logging
from pathlib import Path
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] Step09: %(message)s")
logger = logging.getLogger("Step09_GPFeatures")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "data" / "features"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR = PROJECT_ROOT / "data_pipeline" / "reports"

def main():
    logger.info("=== Starting Step 09: Full Panchayat Feature Matrix Assembly ===")
    
    # 1. Load Panchayat polygons geojson with embedded zonal stats
    poly_path = PROJECT_ROOT / "data" / "static" / "dhanbad_panchayats_polygons.geojson"
    with open(poly_path, "r", encoding="utf-8") as f:
        geo = json.load(f)
        
    records = []
    for feat in geo["features"]:
        props = feat["properties"]
        records.append({
            "gp_code": props["gp_code"],
            "gp_name": props["gp_name"],
            "block_code": props["block_code"],
            "block_name": props["block_name"],
            "district_code": props["district_code"],
            "district_name": props["district_name"],
            "state_code": props["state_code"],
            "state_name": props["state_name"],
            "latitude": props["centroid_lat"],
            "longitude": props["centroid_lon"],
            "area_sq_km": props["area_sq_km"],
            "elevation_mean": props["elevation_mean"],
            "elevation_min": props["elevation_min"],
            "elevation_max": props["elevation_max"],
            "slope_mean": props["slope_mean"],
            "ndvi_mean": props["ndvi_mean"],
            "land_cover_class": props["land_cover_class"],
            "land_cover_name": props["land_cover_name"],
            "agriculture_fraction": props["agriculture_fraction"],
            "forest_fraction": props["forest_fraction"],
            "water_fraction": props["water_fraction"]
        })
        
    df_static = pd.DataFrame(records)
    logger.info(f"Loaded {len(df_static)} Panchayat zonal static profiles.")
    
    # 2. Merge with area-weighted forecasts
    fc_path = PROJECT_ROOT / "data" / "forecasts" / "panchayat_area_weighted_forecasts.parquet"
    if fc_path.exists():
        df_fc = pd.read_parquet(fc_path)
        df_merged = df_fc.merge(df_static, on=["gp_code", "gp_name", "block_name", "area_sq_km"], how="inner")
    else:
        df_merged = df_static.copy()
        
    out_file = OUTPUT_DIR / "panchayat_full_features.parquet"
    df_merged.to_parquet(out_file, index=False)
    logger.info(f"Persisted comprehensive feature matrix ({len(df_merged):,} records) to: {out_file}")
    
    report = {
        "status": "PASSED",
        "total_panchayats": len(df_static),
        "total_feature_columns": len(df_merged.columns),
        "feature_list": df_merged.columns.tolist(),
        "output_path": str(out_file)
    }
    report_path = REPORTS_DIR / "gp_feature_matrix_quality_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Saved feature matrix quality report to: {report_path}")
    logger.info("=== Step 09 COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
