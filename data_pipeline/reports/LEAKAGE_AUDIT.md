# 🚨 Critical Data Leakage & Target Provenance Audit Report
**Project:** SIH26074 — Panchayat-Level Weather Downscaling & Agro-Meteorological Advisory System  
**Audit Date:** 2026-09-30  
**Status:** HIGH RISK — CRITICAL DATA LEAKAGE & SYNTHETIC TARGET GENERATION IDENTIFIED

---

## 1. Executive Summary & Honest Answer to Target Provenance

> **Direct Answer to Core Question:**  
> **Where do the GP-level target values in `10_build_training_dataset.py` come from? Real sensors, CHIRPS, ERA5-Land, or a formula?**
>
> **FINDING: The GP-level target values DO NOT come from real sensors, nor from raw CHIRPS grids. All 5 target variables are generated from SYNTHETIC MATHEMATICAL FORMULAS applied directly to coarse ERA5-Land inputs and static terrain features.**

This audit confirms that the exceptional model scores previously reported (e.g. Temperature $R^2 = 1.0000$, Humidity $R^2 = 1.0000$, Rainfall $R^2 = 0.9997$, and $+81.7\%\text{–}+99.4\%$ RMSE improvements) were the artifact of supervised regression models learning to approximate deterministic, hand-crafted mathematical formulas rather than learning physical downscaling from real-world observations.

---

## 2. Line-by-Line Target Provenance & Generation Trace

### 2.1 Target Generation Trace in `data/scripts/build_unified_dataset.py`

In [`data/scripts/build_unified_dataset.py`](file:///c:/Users/LOQ/Desktop/sih26074/data/scripts/build_unified_dataset.py), daily reanalysis was pulled from ECMWF ERA5-Land via the Open-Meteo archive API for 26 grid cells (Lines 35–69). However, fine-scale targets were created as follows:

* **Rainfall Target (`FINE_RAINFALL`):**
  - **Location:** [`data/scripts/build_unified_dataset.py`](file:///c:/Users/LOQ/Desktop/sih26074/data/scripts/build_unified_dataset.py#L184-L194)
  ```python
  192: elev_factor = 1.0 + (elev - 200.0) / 1000.0
  193: f_vals = [round(float(max(0.0, v * elev_factor + (0.05 if v > 0.5 else 0.0))), 3) for v in c_vals]
  ```
  - **Verdict:** Despite metadata stating `fine_source: UCSB CHIRPS v2.0` (Line 119), `f_vals` is **NOT** downloaded CHIRPS data. It is literally `c_vals` (the coarse ERA5-Land rainfall) multiplied by an elevation adjustment factor `1.0 + (elev - 200)/1000.0` plus a fixed 0.05 mm constant.
  
* **Temperature, Humidity, Wind Speed, and ET0 Targets:**
  - **Location:** [`data/scripts/build_unified_dataset.py`](file:///c:/Users/LOQ/Desktop/sih26074/data/scripts/build_unified_dataset.py#L194-L196)
  ```python
  194: else:
  195:     f_vals = [np.nan] * n_days
  ```
  - **Verdict:** All fine target values in the raw unified long table were set to `np.nan`.

---

### 2.2 Target Generation Trace in `ml/src/dataset.py`

When building the wide modeling dataset in [`ml/src/dataset.py`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/dataset.py), the target columns are synthesized directly on Lines 88–120:

| Target Variable | File & Exact Line Numbers | Code Formulation | Leakage / Synthesis Type |
| :--- | :--- | :--- | :--- |
| **`TARGET_RESIDUAL_RAINFALL`** | [`ml/src/dataset.py:89-90`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/dataset.py#L89-L90) | `df["TARGET_RESIDUAL_RAINFALL"] = df["FINE_RAINFALL"] - df["COARSE_RAINFALL"]` | **Deterministic formula on input feature:** Because `FINE_RAINFALL` was computed from `COARSE_RAINFALL` and `ELEVATION_M`, the residual is algebraically $\approx \text{COARSE\_RAINFALL} \times \frac{\text{ELEVATION\_M} - 200}{1000} + 0.05$. Both are input features! |
| **`TARGET_TEMPERATURE`** | [`ml/src/dataset.py:94-98`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/dataset.py#L94-L98) | `df["TARGET_TEMPERATURE"] = (df["COARSE_TEMPERATURE"] - (df["ELEVATION_M"] - 200.0) * 0.0065 + np.where(df["LANDCOVER_CLASS"] == 13, 0.45, 0.0)).round(2)` | **100% Synthetic Formula:** Directly derived from input features `COARSE_TEMPERATURE`, `ELEVATION_M`, and `LANDCOVER_CLASS`. Zero observational basis. |
| **`TARGET_HUMIDITY`** | [`ml/src/dataset.py:101-104`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/dataset.py#L101-L104) | `df["TARGET_HUMIDITY"] = np.clip(df["COARSE_HUMIDITY"] + (df["ELEVATION_M"] - 200.0) * 0.012, 5.0, 100.0).round(2)` | **100% Synthetic Formula:** Directly derived from input features `COARSE_HUMIDITY` and `ELEVATION_M`. Zero observational basis. |
| **`TARGET_WIND_SPEED`** | [`ml/src/dataset.py:107-112`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/dataset.py#L107-L112) | `df["TARGET_WIND_SPEED"] = np.clip(df["COARSE_WIND_SPEED"] * (1.0 + df["SLOPE_DEG"] * 0.035) * np.where(df["LANDCOVER_CLASS"].isin([10, 13]), 0.88, 1.04), 0.1, 45.0).round(2)` | **100% Synthetic Formula:** Directly derived from input features `COARSE_WIND_SPEED`, `SLOPE_DEG`, and `LANDCOVER_CLASS`. Zero observational basis. |
| **`TARGET_EVAPOTRANSPIRATION`** | [`ml/src/dataset.py:115-119`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/dataset.py#L115-L119) | `df["TARGET_EVAPOTRANSPIRATION"] = np.clip(df["COARSE_EVAPOTRANSPIRATION"] * (1.0 + (df["COARSE_TEMPERATURE"] - 25.0) * 0.015), 0.1, 15.0).round(2)` | **100% Synthetic Formula:** Directly derived from input features `COARSE_EVAPOTRANSPIRATION` and `COARSE_TEMPERATURE`. Zero observational basis. |

---

### 2.3 False Provenance Masking in `data_pipeline/10_build_training_dataset.py`

In [`data_pipeline/10_build_training_dataset.py`](file:///c:/Users/LOQ/Desktop/sih26074/data_pipeline/10_build_training_dataset.py#L74-L77):
```python
74: # Add quality and source attribution
75: df["target_quality"] = "SATELLITE_DERIVED"
76: df["observation_source"] = "UCSB CHIRPS v2.0 (Rainfall) / Physical Elevation Parameterized Ground Truth"
77: df["observation_distance_km"] = 0.0
```
- **Severity: CRITICAL.**  
  Labeling the dataset as `"SATELLITE_DERIVED"` and `"UCSB CHIRPS v2.0"` gives users, judges, and downstream evaluators a false impression of independent empirical validity. In reality, the ground truth was parameter-generated via closed-form Python functions.

---

## 3. Train/Test Split Leakage Analysis

### 3.1 Chronological Split (`ml/src/dataset.py:125-140`)
- **Split Configuration:**
  - Training Set: 2020-01-01 to 2022-12-31 (1,096 days)
  - Validation Set: 2023-01-01 to 2023-12-31 (365 days)
  - Test Set: 2024-01-01 to 2024-12-31 (366 days)
- **Leakage Finding 1: Spatial Entity Identity Across Time:**
  All 239 Gram Panchayats appear in the training, validation, and test sets. While temporal dates do not overlap, static spatial features (`ELEVATION_M`, `SLOPE_DEG`, `LANDCOVER_CLASS`, latitude, longitude) are identically repeated across all three partitions.
- **Leakage Finding 2: Rolling Features:**
  There are **no** dynamic rolling features (such as 7-day rolling precipitation averages) crossing split boundaries.
- **Leakage Finding 3: Target Formula Invariance Across Split Boundary:**
  Because the target generation formula was applied globally to the entire dataset (2020–2024) before splitting, the test set target is generated by the exact same algebraic formula with identical coefficients as the training set target. A tree-based model or linear ridge model simply learns the formula coefficients, guaranteeing near-zero test error.

### 3.2 Spatial Holdout Split (`ml/src/dataset.py:143-156`)
- **Split Configuration:**
  - Train: 2020–2022 excluding Topchanchi and Tundi blocks.
  - Test Holdout: 2024 restricted to Topchanchi and Tundi blocks.
- **Leakage Finding:**
  Even on the "unseen" blocks (Topchanchi and Tundi), the target variables in those blocks were generated using the same static mathematical function (`- (ELEVATION_M - 200) * 0.0065`, etc.). The model achieved $R^2 = 1.0000$ and $r = 1.0000$ not because it discovered regional microclimatic physics, but because it generalized the linear algebra it learned during training.

---

## 4. Multi-Feature Coupling & Circular Target Leakage (ET0 Case Study)

In [`ml/src/dataset.py`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/dataset.py):
- **Input Feature Matrix (`FEATURE_COLS`, Lines 16–31):**
  - Includes `COARSE_TEMPERATURE` (Line 27)
  - Includes `COARSE_EVAPOTRANSPIRATION` (Line 30)
- **Target Vector (`TARGET_VARS`, Lines 33–39):**
  - Predicts `TARGET_TEMPERATURE`
  - Predicts `TARGET_EVAPOTRANSPIRATION`

**Circular Coupling Trace:**
```python
df["TARGET_EVAPOTRANSPIRATION"] = np.clip(
    df["COARSE_EVAPOTRANSPIRATION"] * (1.0 + (df["COARSE_TEMPERATURE"] - 25.0) * 0.015),
    0.1, 15.0
)
```
1. `COARSE_TEMPERATURE` is an **input feature** fed into `X`.
2. `TARGET_EVAPOTRANSPIRATION` is explicitly an algebraic function of that exact same input feature `COARSE_TEMPERATURE`.
3. In [`ml/src/train.py`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/train.py#L90-L96), the model simultaneously takes `COARSE_TEMPERATURE` in `X_train` and is asked to predict `TARGET_EVAPOTRANSPIRATION` in `Y_train`.
4. This violates independent target isolation and constitutes direct feature-to-target leakage.

---

## 5. Summary Table of Audit Findings

| Category | Finding | Impact / Severity | Recommended Remediation |
| :--- | :--- | :--- | :--- |
| **Precipitation Target** | Derived from `COARSE_RAINFALL * (1 + elev_factor) + 0.05`. Not real CHIRPS data. | **CRITICAL** | Ingest raw, unadulterated CHIRPS 0.05° TIFFs or netCDFs directly from UCSB CHIRPS FTP/HTTP archive. |
| **Temperature Target** | Synthesized via `- (elev - 200) * 0.0065 + urban_offset`. | **CRITICAL** | Ingest real IMD AWS/ARG station temperature records or independent ERA5-Land high-res grids. |
| **Humidity Target** | Synthesized via `COARSE_HUMIDITY + (elev - 200) * 0.012`. | **CRITICAL** | Ingest real station RH or ERA5-Land 2m dewpoint/RH grids. |
| **Wind Speed Target** | Synthesized via `COARSE_WIND * (1 + slope * 0.035) * roughness`. | **CRITICAL** | Ingest real IMD station 10m wind or ERA5-Land 10m wind fields. |
| **ET0 Target** | Synthesized via `COARSE_ET0 * (1 + (COARSE_TEMP - 25) * 0.015)`. | **CRITICAL** | Ingest independent FAO-56 Penman-Monteith derived from actual station measurements. |
| **Train/Test Integrity** | Split uses same synthetic target equations on both sides. | **HIGH** | Benchmark against an independent, external validation set that was never created by these equations. |
| **Provenance Integrity** | Labeled as `SATELLITE_DERIVED` / `CHIRPS` in metadata. | **HIGH** | Update metadata and provenance registry to disclose synthetic formulation until replaced with raw data. |

---

## 6. Action Items for Credibility Remediation (Phase 0)

1. **Keep Model Code Frozen:** Maintain [`ml/src/model.py`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/model.py) as-is until baseline comparisons are completed.
2. **Implement Baseline Models (`ml/src/baselines.py`):**
   - Baseline A: Bilinear spatial interpolation of coarse grid to GP centroids.
   - Baseline B: Standard Environmental Lapse Rate only (6.5 °C/km) using GP mean elevation.
   - Baseline C: Empirical Quantile Mapping (EQM) per variable and per month.
3. **Build Independent Validation Pipeline (`data_pipeline/14_independent_validation.py`):**
   - Ingest an independent dataset placed in `data/validation/` (e.g. true raw CHIRPS 0.05° or ground AWS station records).
   - Evaluate our trained model and the three baselines on that independent dataset without tuning the model on it.
   - Compute honest MAE, RMSE, Bias, Pearson $r$, and Realized Skill Score against coarse input.
