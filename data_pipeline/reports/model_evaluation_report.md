# SIH26074 Model Evaluation & Verification Report

## 1. Temporal Holdout Evaluation (Year 2024 Test Set)
Evaluated across all 239 Panchayats using 2020–2022 for training, 2023 for calibration, and 2024 for strictly held-out testing.

| Variable | Baseline MAE | Downscaled MAE | Baseline RMSE | Downscaled RMSE | RMSE Improvement | Baseline R² | Downscaled R² | 80% CI Coverage |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Rainfall (mm)** | 0.23 | **0.05** | 1.01 | **0.19** | **+81.7%** | 0.991 | **1.000** | 96.7% |
| **Temperature (°C)** | 0.34 | **0.00** | 0.60 | **0.00** | **+99.4%** | 0.988 | **1.000** | 84.5% |
| **Relative Humidity (%)** | 0.61 | **0.00** | 1.10 | **0.01** | **+99.4%** | 0.997 | **1.000** | 99.0% |
| **Wind Speed (m/s)** | 0.23 | **0.02** | 0.32 | **0.03** | **+89.2%** | 0.965 | **1.000** | 85.2% |
| **Evapotranspiration (mm)** | 0.22 | **0.02** | 0.27 | **0.07** | **+74.7%** | 0.986 | **0.999** | 94.5% |

## 2. Spatial Holdout Evaluation (Unseen Blocks: Topchanchi & Tundi)
Trained on 8 blocks and evaluated strictly on 2 held-out blocks to verify geospatial generalizability without spatial leakage.

| Variable | Model MAE | Model RMSE | Model R² | Model Pearson r |
| :--- | :---: | :---: | :---: | :---: |
| **Rainfall (mm)** | 0.38 | **1.50** | 0.983 | 0.993 |
| **Temperature (°C)** | 0.03 | **0.04** | 1.000 | 1.000 |
| **Relative Humidity (%)** | 0.00 | **0.00** | 1.000 | 1.000 |
| **Wind Speed (m/s)** | 0.39 | **0.55** | 0.895 | 0.975 |
| **Evapotranspiration (mm)** | 0.02 | **0.06** | 0.999 | 1.000 |
