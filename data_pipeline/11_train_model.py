#!/usr/bin/env python3
"""
SIH26074 - Data Pipeline: Step 11
Train Downscaling Machine Learning Models
-----------------------------------------
Executes model training for:
1. Baselines (Coarse persistence / identity / linear / random forest)
2. Joint Multi-Output ExtraTrees Ensemble with Residual Rainfall Correction
   and 50-tree calibrated Bootstrap Uncertainty.
3. Produces audit logs and training execution report.

Output:
- ml/models/joint_model.joblib
- ml/models/baselines.joblib
- data_pipeline/reports/model_training_report.json
"""

import os
import sys
import json
import time
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] Step11: %(message)s")
logger = logging.getLogger("Step11_TrainModel")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.src.train import main as run_train_pipeline

def main():
    logger.info("=== Starting Step 11: Train ML Downscaling Models ===")
    start_time = time.time()
    
    reports_dir = PROJECT_ROOT / "data_pipeline" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    # Run the comprehensive master training pipeline
    metrics_summary = run_train_pipeline()
    elapsed = time.time() - start_time
    
    report = {
        "pipeline_step": "11_train_model",
        "status": "COMPLETED",
        "training_time_seconds": round(elapsed, 2),
        "models_saved": [
            "ml/models/joint_model.joblib",
            "ml/models/baselines.joblib"
        ],
        "training_strategy": "Chronological (2020-2022 Train, 2023 Validation Calibration, 2024 Test)",
        "spatial_holdout_strategy": "Block-level spatial holdout (Topchanchi & Tundi held out)",
        "model_architecture": "Joint Multi-Output ExtraTrees Regressor + Calibrated Bootstrap Uncertainty (80% CI) + Residual Rainfall Correction",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    report_path = reports_dir / "model_training_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        
    logger.info(f"Training completed successfully in {elapsed:.2f}s. Report saved to {report_path}")

if __name__ == "__main__":
    main()
