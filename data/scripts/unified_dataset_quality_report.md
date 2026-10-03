# 📋 Data Quality Verification Report: SIH26074 Unified Long Dataset
**Generated:** 2026-09-26 00:23:34 UTC
**Target File:** `data\unified\panchayat_weather_long_2020-24.parquet`

---

## 1. Structural Dimensions & Schema Audit

- **Total Rows:** `2,183,265` (Expected: `2,183,265`) -> **PASS**
- **Total Columns:** `15`
- **Schema Fields:** `GPCODE, DATE, VARIABLE, VALUE_COARSE, VALUE_FINE, UNIT, COARSE_SOURCE, FINE_SOURCE, PREDICTION_MODE, GPNAME, BLOCK, DISTRICT, ELEVATION_M, SLOPE_DEG, LANDCOVER_CLASS`

## 2. Temporal Continuity Audit

- **Date Range:** `2020-01-01` to `2024-12-31` (1827 continuous calendar days) -> **PASS**
- **Missing Calendar Dates:** `0` across 5 continuous years (2020–2024)

## 3. Variable Balance & Summary Statistics

| Variable | Rows | Coarse Source | Fine Source | Mode | Min Coarse | Max Coarse | Mean Coarse | Fine Nulls |
| :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `EVAPOTRANSPIRATION` | 436,653 | ECMWF ERA5-Land (0.1 deg / ~9km) | None (Direct-prediction only) | `direct_prediction` | 0.52 | 11.75 | 4.19 | 436,653 |
| `HUMIDITY` | 436,653 | ECMWF ERA5-Land (0.1 deg / ~9km) | None (Direct-prediction only) | `direct_prediction` | 14.00 | 98.00 | 68.86 | 436,653 |
| `RAINFALL` | 436,653 | ECMWF ERA5-Land (0.1 deg / ~9km) | UCSB CHIRPS v2.0 (0.05 deg / ~5.5km) | `residual_correction` | 0.00 | 283.90 | 4.40 | 3,654 |
| `TEMPERATURE` | 436,653 | ECMWF ERA5-Land (0.1 deg / ~9km) | None (Direct-prediction only) | `direct_prediction` | 12.00 | 38.10 | 25.21 | 436,653 |
| `WIND_SPEED` | 436,653 | ECMWF ERA5-Land (0.1 deg / ~9km) | None (Direct-prediction only) | `direct_prediction` | 0.97 | 16.25 | 3.88 | 436,653 |


## 4. Physical Constraint & Bound Verification

- **`RAINFALL` Coarse Range:** `[0.00, 283.90]` (Physical bounds: `[0.0, 400.0]`) -> **PASS**
- **`RAINFALL` Fine Range:** `[0.00, 368.89]` (Physical bounds: `[0.0, 400.0]`) -> **PASS**
- **`TEMPERATURE` Coarse Range:** `[12.00, 38.10]` (Physical bounds: `[0.0, 50.0]`) -> **PASS**
- **`HUMIDITY` Coarse Range:** `[14.00, 98.00]` (Physical bounds: `[5.0, 100.0]`) -> **PASS**
- **`WIND_SPEED` Coarse Range:** `[0.97, 16.25]` (Physical bounds: `[0.0, 45.0]`) -> **PASS**
- **`EVAPOTRANSPIRATION` Coarse Range:** `[0.52, 11.75]` (Physical bounds: `[0.0, 25.0]`) -> **PASS**


## 5. Completeness & Target Availability Analysis

- **`VALUE_COARSE` Completeness:** `100.0%` (Zero nulls across all 2,183,265 rows) -> **PASS**
- **`VALUE_FINE` for Rainfall (CHIRPS):** 432,999 / 436,653 valid observations (`99.16%` complete)
- **Unobserved Fine Panchayats (`RAINFALL`):** `MAHESHPUR 2, RAJGANJ` (Exactly 2 border panchayats with 3,654 unobserved dates)
- **`VALUE_FINE` for Direct-Prediction Variables:** `100.0% null` (Strictly documented as direct-prediction only without artificial imputation)

## 6. Geographic Integrity & Invariance Audit

- **Total Gram Panchayats (`GPCODE`):** `239` across `10` Administrative Blocks -> **PASS**
- **Duplicate `(GPCODE, DATE, VARIABLE)` Records:** `0` -> **PASS**
- **Static Spatial Attribute Invariance:** `0` mismatches across 1,827 days -> **PASS**
- **Administrative Blocks Verified:** `Baghmara, Baliapur, Dhanbad, Egarkund, Govindpur, Kaliasol, Nirsa, Purvi Tundi, Topchanchi, Tundi`

## 7. Overall Verification Verdict

> **STATUS:** **READY FOR PHASE 2 MODELING (ALL CHECKS PASSED)**

The unified long-format dataset satisfies all data contracts, temporal continuity requirements, physical meteorological bounds, and geographic key uniqueness constraints.
