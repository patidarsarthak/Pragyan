# 📊 Downscaling Baseline Comparison & Independent Validation Summary
**Evaluation Source:** Held-Out Spatial Holdout Partition (Topchanchi & Tundi, 2024)  
**Sample Size:** 15,372 records  
**Generated At:** 2026-09-30 20:35:21  

> **Methodological Integrity Notice:**  
> The Joint Downscaled Model was evaluated with completely frozen parameters.  
> Zero hyperparameter tuning or retraining was performed on this validation set.

---

## Performance Comparison Table

| Variable | Method | N | MAE | RMSE | Bias | Pearson r | Skill Score (RMSE %) | Skill Score (MAE %) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **RAINFALL** | Coarse_Unadjusted_NWP | 15,372 | 0.5652 | 2.1963 | -0.5651 | 0.9892 | **+0.00%** | **+0.01%** |
| **RAINFALL** | Bilinear_Interpolation | 15,372 | 0.5652 | 2.1963 | -0.5651 | 0.9892 | **+0.00%** | **+0.01%** |
| **RAINFALL** | Lapse_Rate_Only | 15,372 | 0.5652 | 2.1963 | -0.5651 | 0.9892 | **+0.00%** | **+0.01%** |
| **RAINFALL** | Empirical_Quantile_Mapping | 15,372 | 0.5655 | 2.6508 | -0.3830 | 0.9741 | **-20.69%** | **-0.04%** |
| **RAINFALL** | Ensemble_Downscaled_Model | 15,372 | 0.0975 | 0.3890 | +0.0099 | 0.9995 | **+82.29%** | **+82.75%** |
| **TEMPERATURE** | Coarse_Unadjusted_NWP | 15,372 | 0.8205 | 1.3192 | +0.8200 | 0.9823 | **+0.00%** | **+0.00%** |
| **TEMPERATURE** | Bilinear_Interpolation | 15,372 | 0.8205 | 1.3192 | +0.8200 | 0.9823 | **+0.00%** | **+0.00%** |
| **TEMPERATURE** | Lapse_Rate_Only | 15,372 | 0.0024 | 0.0027 | +0.0007 | 1.0000 | **+99.79%** | **+99.70%** |
| **TEMPERATURE** | Empirical_Quantile_Mapping | 15,372 | 0.7804 | 1.2855 | +0.6706 | 0.9801 | **+2.55%** | **+4.89%** |
| **TEMPERATURE** | Ensemble_Downscaled_Model | 15,372 | 0.0022 | 0.0028 | +0.0004 | 1.0000 | **+99.79%** | **+99.73%** |
| **HUMIDITY** | Coarse_Unadjusted_NWP | 15,372 | 1.5084 | 2.4210 | -1.5079 | 0.9954 | **-0.00%** | **+0.00%** |
| **HUMIDITY** | Bilinear_Interpolation | 15,372 | 1.5084 | 2.4210 | -1.5079 | 0.9954 | **-0.00%** | **+0.00%** |
| **HUMIDITY** | Lapse_Rate_Only | 15,372 | 1.5084 | 2.4210 | -1.5079 | 0.9954 | **-0.00%** | **+0.00%** |
| **HUMIDITY** | Empirical_Quantile_Mapping | 15,372 | 1.9599 | 3.9196 | -1.1691 | 0.9824 | **-61.90%** | **-29.93%** |
| **HUMIDITY** | Ensemble_Downscaled_Model | 15,372 | 0.0027 | 0.0151 | -0.0005 | 1.0000 | **+99.38%** | **+99.82%** |
| **WIND_SPEED** | Coarse_Unadjusted_NWP | 15,372 | 0.3837 | 0.5984 | -0.3210 | 0.9601 | **+0.00%** | **-0.01%** |
| **WIND_SPEED** | Bilinear_Interpolation | 15,372 | 0.3837 | 0.5984 | -0.3210 | 0.9601 | **+0.00%** | **-0.01%** |
| **WIND_SPEED** | Lapse_Rate_Only | 15,372 | 0.3837 | 0.5984 | -0.3210 | 0.9601 | **+0.00%** | **-0.01%** |
| **WIND_SPEED** | Empirical_Quantile_Mapping | 15,372 | 0.4081 | 0.4900 | +0.1191 | 0.9598 | **+18.12%** | **-6.35%** |
| **WIND_SPEED** | Ensemble_Downscaled_Model | 15,372 | 0.0238 | 0.0335 | +0.0015 | 0.9998 | **+94.41%** | **+93.79%** |
| **EVAPOTRANSPIRATION** | Coarse_Unadjusted_NWP | 15,372 | 0.3180 | 0.4461 | -0.1184 | 0.9937 | **+0.00%** | **+0.01%** |
| **EVAPOTRANSPIRATION** | Bilinear_Interpolation | 15,372 | 0.3180 | 0.4461 | -0.1184 | 0.9937 | **+0.00%** | **+0.01%** |
| **EVAPOTRANSPIRATION** | Lapse_Rate_Only | 15,372 | 0.3180 | 0.4461 | -0.1184 | 0.9937 | **+0.00%** | **+0.01%** |
| **EVAPOTRANSPIRATION** | Empirical_Quantile_Mapping | 15,372 | 0.1069 | 0.2406 | -0.0327 | 0.9949 | **+46.06%** | **+66.39%** |
| **EVAPOTRANSPIRATION** | Ensemble_Downscaled_Model | 15,372 | 0.0228 | 0.0557 | -0.0123 | 0.9998 | **+87.52%** | **+92.84%** |

---

## Methodological Insights & Key Observations
1. **Coarse Unadjusted Baseline:** Represents the raw NWP forecast directly from ECMWF ERA5-Land (or GFS) without local adjustment.
2. **Bilinear Interpolation:** Evaluates spatial distance-weighting across neighboring grid cell centers.
3. **Lapse Rate Only:** Implements the environmental lapse rate ($6.5\text{ °C/km}$) using SRTM 30m elevation. Demonstrates the isolated impact of thermodynamics without ML.
4. **Empirical Quantile Mapping (EQM):** Evaluates classical climatological frequency correction per calendar month.
5. **Ensemble Downscaled Model:** Demonstrates whether physical coupling and gradient-boosted microclimatic residuals yield statistically meaningful skill gains over classical benchmarks.

---

### How to Test With Your Own Ground-Truth Data:
1. Place your independent CSV, Parquet, or JSON file into `data/validation/`.
2. Run `python data_pipeline/14_independent_validation.py`.
3. Inspect updated metrics in `ml/results/baseline_comparison.csv`.