# WINNING FEATURES AUDIT REPORT (Step W0)

**Date:** 2026-10-04  
**Project:** SIH26074 — Pragyan Panchayat Micro-Weather Intelligence  
**Specification:** `docs/WINNING_FEATURES_SPEC.md`  
**Status:** Audit Complete — Waiting for User Approval before executing Steps W1–W5.

---

## 1. Rule Engine, Probabilities, and Block-Value Inputs

### Current State
1. **Rule Engine:**
   - Sourced agromet rules are implemented in [`ml/src/planners.py`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/planners.py) and exposed via [`backend/ui_advisory_api.py`](file:///c:/Users/LOQ/Desktop/sih26074/backend/ui_advisory_api.py) (`/api/advisory/{lgd}`).
   - Rules evaluate 7 core agricultural operations:
     1. `plan_sowing_window` (soil moisture, temperature range, germination rainfall)
     2. `plan_irrigation` (rainfall vs ET₀ deficit, soil field capacity/wilting point)
     3. `plan_spray_window` (wind speed safety < 15 km/h, foliar rain washout < 1 mm)
     4. `plan_drainage` (excess rainfall threshold > 25 mm for Vertisol waterlogging)
     5. `plan_heat_frost_care` (terminal heat > 35°C or frost < 4°C)
     6. `plan_harvest_window` (dry canopy, humidity < 70%)
     7. `plan_disease_weather_risk` (high RH > 85% with warm temp 22–30°C for fungal blast)
2. **Dual-Evaluation (Block vs Panchayat):**
   - An initial prototype exists in [`ml/src/advice_difference.py`](file:///c:/Users/LOQ/Desktop/sih26074/ml/src/advice_difference.py) (`compare_advice`), which accepts `gp_weather` and `block_weather`.
   - **Can the same rules run with block and panchayat inputs?** **YES.** The rules take meteorological dictionaries (`rainfall_mm`, `temp_c`, `humidity_pct`, `wind_speed_ms`, `et0_mm`). They can be invoked identically with coarse block values and with downscaled 1km panchayat values.
3. **Probabilities:**
   - Currently, forecasts in `backend/database.py` (`Prediction`) store `uncertainty_lower`, `uncertainty_upper`, and `confidence_pct` (80% conformal prediction band).
   - Event probabilities $P(\text{event})$ (e.g. $P(\text{Rain} \ge 25\text{mm})$ or $P(\text{Wind} \ge 15\text{km/h})$) can be directly computed from the conformal interval / Gaussian ensemble variance $\sigma = (\text{p90} - \text{p10}) / 2.56$.
4. **Cost-Loss Decision Model (Murphy 1977):**
   - Not yet integrated into `planners.py`.
   - The decision rule $\text{Action} = \text{Act if } P(\text{event}) \ge C/L$ will be implemented in `ml/src/decision.py`, with presets in `config/cost_presets.yaml` labeled `ASSUMPTION` (Cheap: 0.1, Medium: 0.3, Expensive: 0.6).

---

## 2. Forecast Archive, Ledger, and Verification Code State

### Current State
1. **Forecast Archive:**
   - Parquet archive exists at [`data/forecast_archive/live_ifs_forecast_runs.parquet`](file:///c:/Users/LOQ/Desktop/sih26074/data/forecast_archive/live_ifs_forecast_runs.parquet).
   - In SQLite (`backend/sih26074_panchayat.db`), `weather_forecasts` contains 10-day lead forecast rows for pilot panchayats.
2. **Ledger:**
   - In `backend/ui_api.py:928-936`, `ledger` is currently a static mock JSON object with 4 timestamped strings.
   - **No cryptographic hash chain exists yet.**
   - `ml/src/ledger.py` and `tools/verify_ledger.py` do not yet exist.
   - To satisfy Feature 2, we must implement SHA-256 hash chaining:
     $$\text{Entry Hash} = \text{SHA-256}(\text{prev\_hash} + \text{manifest\_sha256} + \text{model\_version\_hash} + \text{git\_commit\_sha})$$
     with a public `/api/ui/ledger` endpoint and standalone CLI verification script.
3. **Report Card:**
   - `ml/src/report_card.py` does not yet exist.
   - Verification metrics (Hits, Misses, False Alarms, POD, FAR, CSI) need to be computed with strict separation of `HINDCAST` vs `LIVE`, with a minimum sample guard ($n \ge 30$, otherwise printing *"not enough data yet"*).

---

## 3. Stations, Gauges, and Satellite Truth for Madhya Pradesh

### Current State & Empirical Inventory
1. **NOAA ISD Weather Stations in Madhya Pradesh:**
   - A verified dataset exists at [`data/validation/real/mp_isd_daily_observations.csv`](file:///c:/Users/LOQ/Desktop/sih26074/data/validation/real/mp_isd_daily_observations.csv).
   - **8 verified stations** in MP:
     1. `KHAJURAHO ARPT` (Chhatarpur) — 24.983°N, 79.917°E, Elev 217m
     2. `SATNA` (Satna) — 24.567°N, 80.833°E, Elev 317m
     3. `UJJAIN` (Ujjain) — 23.183°N, 75.783°E, Elev 489m
     4. `BHOPAL / RAJA BHOJ` (Bhopal) — 23.287°N, 77.337°E, Elev 524m
     5. `JABALPUR ARPT` (Jabalpur) — 23.178°N, 80.052°E, Elev 495m
     6. `INDORE / DEVI AHILYABAI` (Indore) — 22.722°N, 75.801°E, Elev 563.9m
     7. `PACHMARHI` (Narmadapuram) — 22.467°N, 78.433°E, Elev 1075m
     8. `BETUL` (Betul) — 21.867°N, 77.933°E, Elev 653m
   - **Total daily observation records:** **3,497 daily records** (from 2023-01-01 to 2024-12-31).
2. **Distance & Coverage Distribution across the 603 MP Panchayats:**
   - Minimum distance to nearest station: **6.6 km**
   - Median distance: **94.1 km**
   - Mean distance: **99.8 km**
   - Maximum distance: **286.0 km**
   - **Verifiability Classes:**
     - **Well verifiable ($\le 30$ km):** 95 panchayats (**15.8%**)
     - **Partial (30 to 80 km):** 163 panchayats (**27.0%**)
     - **Poorly verifiable (> 80 km):** 345 panchayats (**57.2%**)
3. **Satellite Truth (CHIRPS):**
   - CHIRPS parquet file [`data/validation/real/chirps_panchayat_rainfall_daily.parquet`](file:///c:/Users/LOQ/Desktop/sih26074/data/validation/real/chirps_panchayat_rainfall_daily.parquet) contains 109,701 daily rainfall records, but currently covers only Dhanbad's 239 panchayats.
   - Rule per spec: CHIRPS is a satellite model estimate, **not an independent ground gauge**. It must be explicitly labeled `SATELLITE_DERIVED` and never counted as independent ground truth.

---

## 4. Validation Status: Madhya Pradesh versus Dhanbad

### Current Comparison
| Dimension | Dhanbad (Development Archive) | Madhya Pradesh (Pilot Expansion) |
|---|---|---|
| **Panchayats in DB** | 239 in Dhanbad | 603 across 55 districts |
| **Panchayats with Predictions** | 239 (1,195 rows) | 603 (3,015 rows) |
| **Ground Stations in DB** | 1 (Dhanbad AWS) | 0 currently in DB (8 available in `mp_isd_daily_observations.csv`) |
| **Observation Rows in DB** | 50 rows in `weather_observations` | 0 rows in DB |
| **Terrain Skill Registry** | Validated in `terrain_skills` table (`dhanbad_jharkhand`) | None in DB table (out-of-region transfer) |
| **Real Daily Station Observations** | ~730 days | 3,497 days across 8 NOAA ISD stations in CSV/Parquet |
| **Operational Designation** | `DEVELOPMENT_ARCHIVE` (`visible: false`) | `PILOT_EVALUATION` (`ml_active: true`) |

**Key Finding:** MP's 3,497 real station observations from NOAA ISD must be loaded into the database / validation pipelines so MP is backed by authentic station evidence for temperature, humidity, and wind. For rainfall downscaling, MP must be honestly labeled as an **out-of-region transfer** until local dense rain gauge networks are ingested.

---

## 5. Screen Placement & UI Hosting Matrix

| Feature | Target Screen / Component | Placement & UI Elements |
|---|---|---|
| **F1: Decision Cards** | `PanchayatDetailPanel.tsx` (Operations Tab) | **Decision Card**: Shows Action (Act/Wait/Hedge), event probability, "Block would say ...", cause line (e.g. rain +14mm), live cost selector (Cheap / Med / Exp / Custom slider), and "Why?" expander. |
| **F1: Downscaling Value Meter** | `PanchayatDetailPanel.tsx` (District/State view) & `HeroSection.tsx` | **Value Meter Card**: Shows divergence rate ("In Indore, advice differs for 18% of panchayat-days; 7% robust"). |
| **F1: Advice Differs Map Layer** | `DrillDownMap.tsx` / `ForecastTab.tsx` | New map layer toggle: **"Advice Differs from Block"** with legend (`Same`, `Differs`, `Robust Differs`). |
| **F1: Farmer Mode Decision** | `FarmerModeCard.tsx` / `FarmerAdvisoryModal.tsx` | Simplified personal decision card with cost preset toggle and multilingual TTS readout. |
| **F2: Trust Ledger** | `EvidenceTab.tsx` / Dedicated Trust View | **Trust Ledger**: Cryptographic hash chain table, genesis block, manifest hash, code commit SHA, and copyable `verify_ledger.py` command. |
| **F2: Report Card** | `EvidenceTab.tsx` | **Panchayat/Block Report Card**: Hits, misses, false alarms, CSI, MAE vs block baseline. Separate tabs for `HINDCAST` vs `LIVE`. Sample size guard ($n < 30 \rightarrow$ "not enough data yet"). Raw CSV download. |
| **F3: Verifiability Map** | `DrillDownMap.tsx` / `ForecastTab.tsx` | Map layer: **"Verifiability"** (Well verifiable $\le 30$km, Partial 30–80km, Poorly verifiable >80km). |
| **F3: Expected Error** | Map Tooltip, Status Bar, and Panel | Tooltip line: *"Typical error here: $\pm X$ mm/°C (nearest station $Y$ km)"*. |
| **F3: Skill-Distance Curve** | `EvidenceTab.tsx` | Smooth curve of error vs distance with bootstrap confidence intervals and station count $n=8$. If slope $p > 0.05$, display honest text: *"No distance effect detected in tested range"*. |

---

## 6. List of Missing Prerequisites

To proceed with Step W1 through Step W5 without blockers:
1. **Config Files:**
   - `config/cost_presets.yaml`: Define cost-to-loss ratios (Cheap: 0.1, Medium: 0.3, Expensive: 0.6) with explicit `ASSUMPTION` labels.
   - `config/coverage.yaml`: Define verifiability distance bands (30 km, 80 km) and robust-difference margin (10 points) labeled `ASSUMPTION`.
2. **Backend Modules to Create:**
   - `ml/src/decision.py`: Murphy (1977) cost-loss decision engine comparing block vs panchayat inputs.
   - `ml/src/value_meter.py`: Aggregation engine computing difference rates, robust difference rates, and verification metrics.
   - `ml/src/ledger.py`: Hash-chain archive builder with SHA-256 links.
   - `tools/verify_ledger.py`: Public verification script to recompute and validate chain integrity.
   - `ml/src/report_card.py`: Multi-level scorecard engine with $n \ge 30$ sample guard and honest miss reporting.
   - `ml/src/skill_vs_distance.py`: Error-vs-distance regression using leave-one-station-out cross-validation on the 8 MP stations.
3. **Database Population:**
   - Seed the 8 MP NOAA ISD stations and their observations into `weather_observations` table in `backend/sih26074_panchayat.db`.
4. **API Endpoints to Wire:**
   - `GET /api/ui/decision/{lgd}`
   - `GET /api/ui/value-meter`
   - `GET /api/ui/ledger`
   - `GET /api/ui/report-card`
   - `GET /api/ui/coverage`
   - Columnar params `advice_differs`, `advice_robust_differs`, `expected_error`, `coverage_class` on map data.
5. **Frontend Components to Build / Wire:**
   - `DecisionCard.tsx` (or integrated in `PanchayatDetailPanel.tsx`)
   - `ValueMeterCard.tsx`
   - `TrustLedgerCard.tsx` & `ReportCardView.tsx` (in `EvidenceTab.tsx`)
   - Verifiability layer & expected error tooltip in `DrillDownMap.tsx`
   - Demo offline snapshot mode (`?judge=1`).

---

## Conclusion & Approval Request
The prerequisites and audit criteria for all three winning features are verified and ready. Awaiting user approval to proceed with **Step W1 (Decision Cards & Value Meter)** through **Step W5 (Tests & Acceptance)**.
