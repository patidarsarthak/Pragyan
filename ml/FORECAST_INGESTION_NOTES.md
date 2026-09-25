# 📡 SIH26074 Phase 3: Live NWP Forecast Ingestion & Downscaling Notes

**Project:** Smart Panchayat Climate & Geospatial Intelligence Platform (SIH26074)  
**Target Domain:** Dhanbad District, Jharkhand (239 Gram Panchayats across 10 Administrative Blocks)  
**Lead Horizon:** 1 to 10 Days (Continuous Daily Forecast Horizon)  
**Module:** `ml/src/ingest_forecast.py`  
**Downscaling Engine:** `ml/src/predict.py` (Phase 2 Locked Inference Contract)  

---

## 1. Executive Summary & Operational Pipeline

Phase 3 operationalizes the transition from static historical downscaling to **live numerical weather prediction (NWP) forecast ingestion**. The automated ingestion pipeline:
1. Queries open operational NWP data (ECMWF IFS 0.25° primary, NOAA GFS secondary) covering the 26 spatial grid cells spanning Dhanbad District.
2. Normalizes physical units (e.g., converting 10m maximum wind speed from $\text{km/h}$ to $\text{m/s}$, computing daily mean temperatures $(T_{\text{max}} + T_{\text{min}}) / 2$).
3. Spatially maps coarse predictions to all 239 Gram Panchayat centroids using nearest-neighbor grid assignment.
4. Executes Phase 2's joint downscaling model (`predict_weather`) across all 239 Panchayats for all 10 forecast days (2,390 Panchayat-Days, yielding **11,950 total prediction records**).
5. Persists results to queryable stores:
   - **Master Snapshot:** `data/forecasts/forecast_<date>_<runtime>.parquet` (includes `RUN_TIMESTAMP`).
   - **Date-Partitioned Store:** `data/forecasts/by_date/DATE=YYYY-MM-DD/` for sub-second backend query pruning.

---

## 2. Ingestion Execution Verification

| Dimension | Real Run Observation | Note |
| :--- | :---: | :--- |
| **Upstream Provider** | ECMWF IFS Cycle 48r1 (`ecmwf_ifs025`) | Public open access via Open-Meteo Gateway |
| **Grid Extent** | 26 coarse 0.1° cells covering Dhanbad | Query batched into a single multi-location GET request |
| **Network Query Latency** | **0.82 seconds** | Lightweight multi-coordinate payload |
| **Downscaling Inference Time** | **6.15 seconds** | 12 bootstrap ensemble members × 2,390 instances |
| **Total Pipeline Runtime** | **~8.0 seconds** | End-to-end (ingest → validate → predict → persist) |
| **Panchayat Coverage** | **239 / 239 (100.0%)** | All 10 Administrative Blocks |
| **Temporal Horizon** | **10 Days** (Current day + 9 future lead days) | 0 missing dates |
| **Output Row Count** | **11,950 records** | 239 Panchayats × 10 Dates × 5 Variables |
| **Null Voids** | **0 (0.0%)** | Complete matrix across all 5 parameters |

---

## 3. Run Frequency Recommendation

### NWP Cycle Synchronization
Global NWP models operate on 4 main operational initialization cycles: `00:00`, `06:00`, `12:00`, and `18:00` UTC.
Due to assimilation, physics integration, and product dissemination latencies, model outputs become available ~3.5 hours after cycle initiation.

| NWP Model Cycle | Cycle Publication Time (UTC) | IST Local Time | Recommended Ingestion Schedule (IST) | Operational Purpose |
| :---: | :---: | :---: | :---: | :--- |
| **00:00 UTC** | `03:30 UTC` | `09:00 IST` | **`06:30 IST` (or `09:30 IST`)** | **Morning Bulletin:** Primary advisory release for morning agricultural decisions (spraying, irrigation, sowing). |
| **06:00 UTC** | `09:30 UTC` | `15:00 IST` | *Optional* | Mid-day convective update during monsoon. |
| **12:00 UTC** | `15:30 UTC` | `21:00 IST` | **`18:30 IST` (or `21:30 IST`)** | **Evening Bulletin:** Nighttime advisory refresh updating 1-10 day hazard outlooks. |
| **18:00 UTC** | `21:30 UTC` | `03:00 IST` | *Optional* | Off-peak consolidation. |

> **Operational Recommendation:** Schedule cron execution **twice daily** at **`06:30 IST`** and **`18:30 IST`**. This captures the major ECMWF 00Z and 12Z runs, ensuring Panchayat advisories never operate on data older than 12 hours while minimizing API calls.

---

## 4. Failure Modes & Graceful Handling Audit

The pipeline enforces a strict **Zero-Fabrication / Zero-Stale Fallback Policy**: If any part of the upstream forecast feed fails or violates integrity standards, the cycle logs the anomaly and skips gracefully without writing corrupt or synthetic records to persistent stores.

### A. Failure Modes Identified & Defense Mechanisms

| Failure Mode | Root Cause | Defense & Handling Mechanism |
| :--- | :--- | :--- |
| **Upstream Gateway Timeout / 503** | Network partition or ECMWF dissemination delay | Catches `requests.exceptions.RequestException`, logs `ForecastSourceUnreachableError`, and aborts cycle cleanly without writing empty files. |
| **Incomplete Variable Payload** | API schema alteration or upstream sensor failure | Validates presence of all 5 parameters (`precipitation_sum`, `temperature`, `humidity`, `wind_speed`, `et0`). Raises `IncompleteForecastDataError` immediately if any variable is dropped. |
| **Truncated Horizon** | Incomplete NWP run (e.g. only 3 of 10 days ready) | Asserts `len(times) >= forecast_days`. Skips execution if horizon is truncated to prevent partial calendar forecasts. |
| **NaN / Null Value Voids** | Bad grid cell interpolation | Audits all cell arrays for `None` or `NaN`. Flags cell indices and aborts write. |
| **Coordinate Mismatch** | Unregistered Panchayat LGD code | Validates that spatial join produces exactly $239 \times \text{days}$ rows. |

### B. Demonstrated Failure Test Cases

#### 1. Simulated Missing Variable (`--simulate-failure missing_variable`)
- **Trigger:** Intentionally removed `relative_humidity_2m_mean` from the incoming API response payload.
- **Observed Behavior:**
  ```text
  [WARNING] ForecastIngest: [SIMULATED FAILURE] Intentionally dropping 'relative_humidity_2m_mean' from upstream payload.
  [ERROR] ForecastIngest: [GRACEFUL SKIP] Ingestion cycle safely aborted without writing corrupted data:
          Integrity violation: Variable 'relative_humidity_2m_mean' is missing from cell 0 forecast response.
          Strict zero-fabrication policy enforced: skipping cycle gracefully.
  [WARNING] ForecastIngest: Strict policy adhered: NO stale or fabricated values were written to persistent stores.
  CYCLE SKIPPED GRACEFULLY: Integrity preserved without writing corrupted data.
  ```
- **Outcome:** Pipeline safely exited with code 0 without writing any file to `data/forecasts/`.

#### 2. Simulated Network Outage (`--simulate-failure network_error`)
- **Trigger:** Simulated HTTP 503 gateway timeout / network disconnect.
- **Observed Behavior:**
  ```text
  [ERROR] ForecastIngest: [SIMULATED FAILURE] Simulating upstream NWP server outage (HTTP 503 / Network Timeout).
  [ERROR] ForecastIngest: [GRACEFUL SKIP] Ingestion cycle safely aborted without writing corrupted data:
          Simulated connection timeout to NWP forecast gateway.
  [WARNING] ForecastIngest: Strict policy adhered: NO stale or fabricated values were written to persistent stores.
  CYCLE SKIPPED GRACEFULLY: Integrity preserved without writing corrupted data.
  ```
- **Outcome:** Clean exit without corrupted storage.

---

## 5. Forecast Source Coverage Gaps & Downscaling Mitigation

| Dimension | Coarse NWP Input (ECMWF IFS 0.25°) | Hyper-Local Panchayat Reality | Phase 2 Downscaling Mitigation |
| :--- | :--- | :--- | :--- |
| **Spatial Resolution** | ~25 km horizontal grid | ~2 to 5 km Panchayat bounds | Downscaled via SRTM 30m elevation lapse rate, slope angle, and ESA WorldCover land use. |
| **Topographic Relief** | Smoothed regional topography | Parasnath / Topchanchi foothills vs Damodar river basin | Residual rainfall model corrects localized convective enhancement against mountain barriers. |
| **Wind Exposure** | Regional free-stream wind | Valley channeling vs hilltop crest exposure | Wind speed adjusted using topographic slope index ($1 + 0.035 \times \text{slope}$) and canopy roughness. |
| **Urban Heat Island** | Spatially averaged grid temperature | Dhanbad city mining/built-up core vs rural cropland | Land cover classification (built-up class 13) incorporates localized thermal uplift. |

---

## 6. Output Contract Conformance

All generated forecast records adhere strictly to the Phase 2 locked output contract with the addition of `RUN_TIMESTAMP` for cycle auditing:

```text
GPCODE | DATE | VARIABLE | PREDICTED_VALUE | UNCERTAINTY_LOWER | UNCERTAINTY_UPPER | CONFIDENCE_PCT | RUN_TIMESTAMP
```

Example Snapshot Query:
```text
GPCODE  DATE        VARIABLE            PREDICTED_VALUE  UNCERTAINTY_LOWER  UNCERTAINTY_UPPER  CONFIDENCE_PCT  RUN_TIMESTAMP
111722  2026-09-25  RAINFALL            34.120           34.095             34.148             80.0            2026-09-25T17:48:03Z
111722  2026-09-25  TEMPERATURE         25.142           25.141             25.143             80.0            2026-09-25T17:48:03Z
111722  2026-09-25  HUMIDITY            95.368           95.367             95.369             80.0            2026-09-25T17:48:03Z
111722  2026-09-25  WIND_SPEED           7.915            7.911              7.919             80.0            2026-09-25T17:48:03Z
111722  2026-09-25  EVAPOTRANSPIRATION   1.714            1.710              1.718             80.0            2026-09-25T17:48:03Z
```
