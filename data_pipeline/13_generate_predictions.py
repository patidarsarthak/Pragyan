#!/usr/bin/env python3
"""
SIH26074 - Data Pipeline: Step 13
Generate Panchayat-Level Predictions & Agro-Advisories
-----------------------------------------------------
Executes downscaling inference for all 239 Gram Panchayats:
1. Ingests coarse forecast features for target forecast dates.
2. Merges with authoritative Panchayat GIS features (elevation, slope, NDVI, landcover).
3. Applies trained Joint Multi-Output Bootstrap Ensemble with Residual Rainfall Correction.
4. Computes calibrated 80% bootstrap uncertainty bounds (P10, P90) and confidence.
5. Generates rule-based agro-meteorological advisories based on downscaled outputs.
6. Persists predictions and advisories into SQLite/PostGIS database.
7. Produces operational run report in data_pipeline/reports/.

Outputs:
- SQLite/PostGIS tables: predictions, advisories
- data/predictions/dhanbad_operational_predictions.parquet
- data_pipeline/reports/prediction_generation_report.json
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] Step13: %(message)s")
logger = logging.getLogger("Step13_GeneratePredictions")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.src.predict import predict_weather
from ml.src.advisory_engine import generate_advisories
from backend.database import SessionLocal, Prediction, Advisory, Panchayat

def main():
    logger.info("=== Starting Step 13: Operational Prediction & Advisory Generation ===")
    reports_dir = PROJECT_ROOT / "data_pipeline" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    preds_dir = PROJECT_ROOT / "data" / "predictions"
    preds_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Target operational date
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    forecast_dates = [today_str]
    
    logger.info(f"Generating downscaled predictions for dates: {forecast_dates}")
    
    # Coarse regional forecast input for Dhanbad
    coarse_input = {
        "COARSE_RAINFALL": 18.5,
        "COARSE_TEMPERATURE": 28.2,
        "COARSE_HUMIDITY": 84.0,
        "COARSE_WIND_SPEED": 14.5
    }
    
    all_preds = []
    for f_date in forecast_dates:
        df_pred = predict_weather(
            gpcode=None, # All 239 Panchayats
            date=f_date,
            coarse_inputs=coarse_input
        )
        all_preds.append(df_pred)
        
    preds_df = pd.concat(all_preds, ignore_index=True)
    logger.info(f"Generated {len(preds_df)} prediction records across {len(preds_df['GPCODE'].unique())} Panchayats.")
    
    # Save to parquet
    parquet_path = preds_dir / "dhanbad_operational_predictions.parquet"
    preds_df.to_parquet(parquet_path, index=False)
    
    # Generate advisories
    adv_df = generate_advisories(preds_df)
    logger.info(f"Generated {len(adv_df)} advisory recommendations.")
    
    # Persist into database
    session = SessionLocal()
    try:
        run_ts = datetime.now(timezone.utc).isoformat()
        records_to_insert = []
        for _, row in preds_df.iterrows():
            records_to_insert.append(Prediction(
                gp_code=int(row["GPCODE"]),
                prediction_date=str(row["DATE"]),
                variable=str(row["VARIABLE"]),
                predicted_value=float(row["PREDICTED_VALUE"]),
                uncertainty_lower=float(row["UNCERTAINTY_LOWER"]),
                uncertainty_upper=float(row["UNCERTAINTY_UPPER"]),
                confidence_pct=float(row["CONFIDENCE_PCT"]),
                model_version="v2.0-joint-ensemble",
                run_timestamp=run_ts
            ))
            
        advisories_to_insert = []
        for _, row in adv_df.iterrows():
            advisories_to_insert.append(Advisory(
                gp_code=int(row["GPCODE"]),
                advisory_date=str(row["DATE"]),
                crop=str(row["CROP"]),
                growth_stage=str(row.get("GROWTH_STAGE", "Active Crop Stage")),
                advisory_text=str(row["ADVISORY_TEXT"]),
                triggering_variables=str(row["TRIGGERING_VARIABLES"]),
                confidence_pct=float(row["CONFIDENCE_PCT"]),
                rule_source="ICAR-KVK Dhanbad / BAU Ranchi AAS"
            ))
            
        # Delete prior predictions and advisories for target dates
        session.query(Prediction).filter(Prediction.prediction_date.in_(forecast_dates)).delete(synchronize_session=False)
        session.query(Advisory).filter(Advisory.advisory_date.in_(forecast_dates)).delete(synchronize_session=False)
        
        session.bulk_save_objects(records_to_insert)
        session.bulk_save_objects(advisories_to_insert)
        session.commit()
        logger.info(f"Successfully committed {len(records_to_insert)} predictions and {len(advisories_to_insert)} advisories to database.")
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error persisting to DB: {e}")
        raise
    finally:
        session.close()
        
    # Write report
    report = {
        "pipeline_step": "13_generate_predictions",
        "status": "COMPLETED",
        "target_dates": forecast_dates,
        "panchayats_predicted": len(preds_df["GPCODE"].unique()),
        "total_prediction_records": len(preds_df),
        "total_advisories_generated": len(adv_df),
        "coarse_forecast_input": coarse_input,
        "output_parquet": str(parquet_path),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    report_path = reports_dir / "prediction_generation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        
    logger.info(f"Step 13 completed. Report saved to {report_path}")

if __name__ == "__main__":
    main()
