# Phase 1 Audit Report: MP Engine, Targets, Boundaries & Data Provenance
**Project:** GramMausam (SIH 2026, PS 26074)  
**Date:** 2026-10-02  
**Audit Standard:** Zero Fabrication, Complete Code Traceability, Survey of India Boundary Consistency.

---

## 1. Inventory & Location of the "MP Engine"

A complete filesystem audit was performed across this workspace (`c:\Users\LOQ\Desktop\sih26074`) and sibling directories (`c:\Users\LOQ\Desktop`):

### A. Machine Learning Models
* `ml/models/joint_model.joblib` (9.36 MB, serialized model):
  * **Finding:** Despite references in `data/mp/model_registry.json` claiming this is `mp_downscaler_v1`, this binary model was trained strictly on **Dhanbad, Jharkhand (239 GPs)** using synthetic elevation targets. No model trained on Madhya Pradesh data exists on this machine.
* `ml/models/baselines.joblib` (1.30 KB):
  * Ridge baseline models trained on Dhanbad coarse-to-synthetic data.

### B. Gram Panchayat Polygons (Count, Source, License)
* **Madhya Pradesh GP Polygons:**
  * **Count:** **0 MP Gram Panchayat polygons exist on this machine.**
  * **Source / License:** Not present. (Only `data/static/mp_districts.geojson` exists, containing 55 district outlines derived from Survey of India / GADM under CC-BY-4.0).
* **Dhanbad GP Polygons:**
  * `data/static/dhanbad_panchayats_polygons.geojson` (239 GPs, 453 KB). Archived to `archive/dhanbad/static/`.

### C. Training Data
* `data/unified/panchayat_weather_long_2020-24.parquet` (1.3 MB, 239 Dhanbad GPs $\times$ 5 variables $\times$ 1,827 days). Archived to `archive/dhanbad/unified/`.
* `data/static/panchayat_terrain_landcover.csv` (239 Dhanbad GPs). Archived to `archive/dhanbad/static/`.

### D. MP Registry & "Validation" Scripts
* `data_pipeline/mp_validation.py`:
  * **Critical Audit Finding:** Lines 92–124 use `np.random.seed(42)` and generate synthetic random normal/exponential distributions (`true_rain = np.random.exponential(scale=14.0, size=N)`, `pred_ml_rain = true_rain + np.random.normal(0, 3.4, N)`). This was a mock script whose output `data/mp/validation_results.json` was entirely fabricated.
* `scripts/setup_india_mp_datasets.py`:
  * Sets up `data/india/coverage_registry.json` (36 States/UTs) and `data/mp/model_registry.json`.

---

## 2. Training Target Provenance: Exact Lines & Formulas

Every single training target variable used by the ML engine was built using deterministic synthetic formulas applied to coarse reanalysis data. None was an independent physical observation:

### 1. Rainfall Target
* **File:** `data/scripts/build_unified_dataset.py`, Lines 192–193:
  ```python
  elev_factor = 1.0 + (elev - 200.0) / 1000.0
  f_vals = [round(float(max(0.0, v * elev_factor + (0.05 if v > 0.5 else 0.0))), 3) for v in c_vals]
  ```
* **File:** `ml/src/dataset.py`, Line 90:
  ```python
  df["TARGET_RESIDUAL_RAINFALL"] = df["FINE_RAINFALL"] - df["COARSE_RAINFALL"]
  ```
* **Status:** **100% Synthetic Formula**. Elevation-scaled multiplier applied to coarse ERA5-Land precipitation.

### 2. Temperature Target
* **File:** `ml/src/dataset.py`, Lines 94–98:
  ```python
  df["TARGET_TEMPERATURE"] = (
      df["COARSE_TEMPERATURE"]
      - (df["ELEVATION_M"] - 200.0) * 0.0065
      + np.where(df["LANDCOVER_CLASS"] == 13, 0.45, 0.0)
  ).round(2)
  ```
* **Status:** **100% Synthetic Formula**. Standard environmental lapse-rate ($6.5^\circ\text{C} / \text{km}$) plus an arbitrary $0.45^\circ\text{C}$ urban heat island constant.

### 3. Humidity Target
* **File:** `ml/src/dataset.py`, Lines 101–104:
  ```python
  df["TARGET_HUMIDITY"] = np.clip(
      df["COARSE_HUMIDITY"] + (df["ELEVATION_M"] - 200.0) * 0.012,
      5.0, 100.0
  ).round(2)
  ```
* **Status:** **100% Synthetic Formula**. Linear elevation scaling factor applied to coarse relative humidity.

### 4. Wind Speed Target
* **File:** `ml/src/dataset.py`, Lines 107–112:
  ```python
  df["TARGET_WIND_SPEED"] = np.clip(
      df["COARSE_WIND_SPEED"]
      * (1.0 + df["SLOPE_DEG"] * 0.035)
      * np.where(df["LANDCOVER_CLASS"].isin([10, 13]), 0.88, 1.04),
      0.1, 45.0
  ).round(2)
  ```
* **Status:** **100% Synthetic Formula**. Heuristic slope multiplier and landcover friction factor applied to coarse wind speed.

### 5. Evapotranspiration (ET0) Target
* **File:** `ml/src/dataset.py`, Lines 115–119:
  ```python
  df["TARGET_EVAPOTRANSPIRATION"] = np.clip(
      df["COARSE_EVAPOTRANSPIRATION"]
      * (1.0 + (df["COARSE_TEMPERATURE"] - 25.0) * 0.015),
      0.1, 15.0
  ).round(2)
  ```
* **Status:** **100% Synthetic Formula**. Empirical temperature sensitivity multiplier applied to coarse FAO-56 reference evapotranspiration.

---

## 3. Dhanbad / Jharkhand Assumptions & Archival Action

### Artifacts Archived to `archive/dhanbad/`:
* `archive/dhanbad/static/`: `dhanbad_district.geojson`, `dhanbad_blocks.geojson`, `dhanbad_panchayat_boundaries.geojson`, `dhanbad_panchayats_polygons.geojson`, `panchayat_terrain_landcover.csv`
* `archive/dhanbad/unified/`: `panchayat_weather_long_2020-24.parquet`
* `archive/dhanbad/raw/`: 26 files of `era5_land_daily_*.json`
* `archive/dhanbad/validation/`: `chirps_dhanbad_005deg_daily.parquet`, `chirps_panchayat_rainfall_daily.parquet`, `real_era5_dhanbad_025deg_daily_2015_2024.parquet`

### Placeholder Weather Stations Removed:
* Removed placeholder station definitions (`IMD_DHN_01`, `IMD_MAITHON_02`, `IMD_PANCHET_03`, `KVK_BALIAPUR_04`, `ARG_TOPCHANCHI_05`) from `data_pipeline/03_download_weather_observations.py` and deleted their records in `backend/database.py` (lines 429–431).
* Verified synthetic station observation files (`synthetic_station_observations.parquet`) are strictly quarantined in `data/validation/synthetic/` and `ml/results/synthetic/`.

---

## 4. Uncertainty Diagnostics: Confidence, Hatching & 80% CI

* **`confidence_score`:**
  * **Code origin:** Set to `None` in `backend/api_v1.py` (lines 142, 603) and `null` in `frontend-next/src/api/client.ts` (lines 183, 236).
  * **Classification:** **Uncalibrated**. Remains `null` everywhere.
* **`uncertainty_80ci` (Upper / Lower Bounds):**
  * **Code origin:** `ml/src/model.py`, lines 186–187 and 199–200 (`lower = np.percentile(clamped_members, 10.0, axis=0)`, `upper = np.percentile(clamped_members, 90.0, axis=0)` across 12 bootstrap trees).
  * **Classification:** **Uncalibrated Bootstrap Spread (Trained on Synthetic Targets)**. Because the trees were trained against synthetic formulas, the interval reflects tree ensemble variance, not physical real-world error.
* **`hatch_uncertainty` / `is_high_uncertainty`:**
  * **Code origin:** Triggered when ensemble spread exceeds the 80th percentile relative to neighboring panchayats (`frontend-next/src/components/ForecastTab.tsx`, line 308).
  * **Label:** Strictly labeled in `frontend-next/src/lib/i18n.ts` (lines 79–82) as **"wider spread than other panchayats (relative)"**.

---

## 5. Removal of Fake GFS / Multi-Model Consensus

* **Code origin:** `backend/services.py`, lines 1830–1833:
  ```python
  ecmwf_val = round(base_rain, 1)
  gfs_val = round(base_rain * 1.12 + 0.4, 1)
  aifs_val = round(base_rain * 0.94 - 0.2, 1)
  ```
* **Remediation Executed:**
  * Completely removed the fake multipliers from `backend/services.py`.
  * Replaced `get_multimodel_consensus_data` to return `status: "NOT YET MEASURED"` and `feature_status: "DISABLED_PER_ZERO_FABRICATION_RULE"`.
  * Endpoint `/panchayats/{gp_code}/consensus` now returns null metrics with an explicit note explaining the retraction.

---

## 6. Advisory Hit-Rate & False-Alarm Tracing

* **Code origin:** `backend/services.py`, lines 1662–1667 (`overall_hit_rate_pct: 83.6`, `overall_false_alarm_pct: 11.2`) and lines 1675–1705 (`hit_rate_pct: 84.8, 79.2, 87.1`).
* **Audit Finding:** **Completely Hardcoded Literals.** No operational tracking or farmer verification dataset existed.
* **Remediation Executed:**
  * Replaced `get_advisory_verification_metrics` in `backend/services.py` to return `status: "NOT YET MEASURED"`.
  * Set `overall_hit_rate_pct: None`, `overall_false_alarm_pct: None`, `overall_miss_rate_pct: None`, `economic_value_score: None`.
  * UI renders **NOT YET MEASURED** with an honest disclosure: *"Advisory verification requires operational tracking of real farmer advisory responses against observed local weather."*

---

## 7. Live Forecast Data Feed & Lead-Time Skill Reality

* **What Actually Feeds Live Inference:**
  * Ingestion script `ml/src/ingest_forecast.py` (lines 188–196) queries Open-Meteo's `/v1/forecast` endpoint with `models=ecmwf_ifs025` (ECMWF Integrated Forecasting System, 0.25° resolution).
* **Training vs. Inference Inconsistency:**
  * Training used historical reanalysis (`ECMWF ERA5-Land`, 0.1° resolution) from Open-Meteo `/v1/archive`.
  * Live inference queries operational weather prediction (`ECMWF IFS`, 0.25° resolution).
* **Lead-Time (Day 1–10) Skill Reality:**
  * **Historical lead-day skill curves cannot be verified from retrospective open APIs.** Neither Open-Meteo's Previous Runs API (keeps only ~4 cycles) nor ECMWF Open Data (keeps 48 hours) archives historical multi-lead runs for past years.
  * Live operational daily logging script [scripts/log_live_ifs_forecasts.py](file:///c:/Users/LOQ/Desktop/sih26074/scripts/log_live_ifs_forecasts.py) has been created to log real IFS forecasts daily into `data/forecast_archive/live_ifs_forecast_runs.parquet` to accumulate an authentic skill curve going forward.
  * All forecasts beyond Day 1 must be labeled **"Lead-time skill not verified"**.
