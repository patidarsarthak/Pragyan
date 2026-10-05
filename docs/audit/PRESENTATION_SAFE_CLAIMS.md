# Pragyan SIH26074 — Presentation Safe Claims & Slide Guidance

**Audit Date:** 2026-10-05  
**Auditor Role:** Antigravity AI Coding Assistant (Strict Read-Only Architecture Audit)  
**Standard:** Every claim made to SIH evaluators must be defensible under live cross-examination with verifiable code and data evidence.

---

## 1. Claims We Can Make NOW (With Verified Evidence)

These features are genuinely implemented, backed by real data or mathematical logic, and validated by passing automated tests:

1. **Operational 603-Panchayat Downscaling Pilot in Madhya Pradesh**
   - **What to say:** "We have deployed an operational pilot covering 603 Gram Panchayats across all 55 districts of Madhya Pradesh, delivering daily 10-day downscaled forecasts."
   - **Evidence:** [`backend/sih26074_panchayat.db`](file:///C:/Users/LOQ/Desktop/Pragyan/backend/sih26074_panchayat.db) (1,471 total panchayats registered, 603 active in MP), `GET /api/ui/scope/summary?level=state&id=IN-MP`, [`tests/test_ui_api.py`](file:///C:/Users/LOQ/Desktop/Pragyan/tests/test_ui_api.py).

2. **High-Resolution Topographic & Land Cover Geospatial Feature Pipeline**
   - **What to say:** "Our system extracts 30-meter NASA SRTM elevation and slope relief, combined with 10-meter ESA WorldCover and Sentinel-2 NDVI composites, specifically bounded to each Gram Panchayat polygon."
   - **Evidence:** [`data_pipeline/05_download_dem.py`](file:///C:/Users/LOQ/Desktop/Pragyan/data_pipeline/05_download_dem.py), [`data_pipeline/07_download_landcover.py`](file:///C:/Users/LOQ/Desktop/Pragyan/data_pipeline/07_download_landcover.py), [`data/static/panchayat_terrain_landcover.csv`](file:///C:/Users/LOQ/Desktop/Pragyan/data/static/panchayat_terrain_landcover.csv), [`tests/test_features.py`](file:///C:/Users/LOQ/Desktop/Pragyan/tests/test_features.py).

3. **Semi-Parametric Downscaling Engine (Ridge Trunk + GBDT Residuals)**
   - **What to say:** "We implement a hybrid architecture: a physically-constrained Topographic Ridge regression trunk handling environmental lapse-rate adjustments, paired with a non-linear Gradient Boosted Decision Tree residual head capturing localized microclimate nuances."
   - **Evidence:** [`ml/src/model.py:48-285`](file:///C:/Users/LOQ/Desktop/Pragyan/ml/src/model.py#L48-L285), [`tests/test_model.py`](file:///C:/Users/LOQ/Desktop/Pragyan/tests/test_model.py).

4. **Cryptographic Forecast Ledger (Tamper-Evident SHA-256 Audit Trail)**
   - **What to say:** "To prevent post-hoc forecast tampering and enforce accountability, every generated forecast batch is committed to a SHA-256 hash-chained immutable ledger that can be mathematically verified by independent auditors."
   - **Evidence:** [`ml/src/ledger.py`](file:///C:/Users/LOQ/Desktop/Pragyan/ml/src/ledger.py), [`data/forecast_archive/forecast_ledger.json`](file:///C:/Users/LOQ/Desktop/Pragyan/data/forecast_archive/forecast_ledger.json), [`tools/verify_ledger.py`](file:///C:/Users/LOQ/Desktop/Pragyan/tools/verify_ledger.py) (100% verification pass), `GET /api/ui/ledger`.

5. **Distance-Based Forecast Verifiability & Error Degradation Modeling**
   - **What to say:** "We compute the exact geodesic distance from every Panchayat centroid to the nearest physical reference station, modeling spatial error degradation $MAE(d)$ so users know the local trust boundary."
   - **Evidence:** [`ml/src/skill_vs_distance.py`](file:///C:/Users/LOQ/Desktop/Pragyan/ml/src/skill_vs_distance.py), [`data/mp/panchayat_coverage.json`](file:///C:/Users/LOQ/Desktop/Pragyan/data/mp/panchayat_coverage.json), `GET /api/ui/skill-vs-distance`.

6. **Agronomic Rules Engine & GDD-Based Phenology Stage Tracker**
   - **What to say:** "Weather forecasts are directly translated into actionable farmer advisories for 7 major crops (Soybean, Wheat, Mustard, Chickpea, Paddy, Maize, Vegetables), computing Growing Degree Days (GDD) to adjust advice to phenological crop stages."
   - **Evidence:** [`config/advisory_rules/*.yaml`](file:///C:/Users/LOQ/Desktop/Pragyan/config/advisory_rules/), [`ml/src/crop_stage.py`](file:///C:/Users/LOQ/Desktop/Pragyan/ml/src/crop_stage.py), [`ml/src/planners/sowing_window.py`](file:///C:/Users/LOQ/Desktop/Pragyan/ml/src/planners/sowing_window.py), [`tests/test_advisory.py`](file:///C:/Users/LOQ/Desktop/Pragyan/tests/test_advisory.py).

7. **Weather-Driven Crop Disease & Pest Warnings**
   - **What to say:** "We evaluate relative humidity duration, wet canopy hours, and temperature ranges to issue prophylactic disease risk alerts (e.g., Rice Blast, Rust, Powdery Mildew), referencing ICAR/KVK recommended active ingredients with statutory disclaimers."
   - **Evidence:** [`ml/src/planners/disease_weather_risk.py`](file:///C:/Users/LOQ/Desktop/Pragyan/ml/src/planners/disease_weather_risk.py), [`tests/test_disease_risk.py`](file:///C:/Users/LOQ/Desktop/Pragyan/tests/test_disease_risk.py).

8. **FAO-56 Reference Evapotranspiration (ET0) Modeling**
   - **What to say:** "ET0 is calculated using the FAO-56 Hargreaves-Samani formulation, driven by downscaled daily temperature extremes and astronomical extraterrestrial solar radiation."
   - **Evidence:** [`ml/src/indices.py:38-75`](file:///C:/Users/LOQ/Desktop/Pragyan/ml/src/indices.py#L38-L75), [`tests/test_indices.py`](file:///C:/Users/LOQ/Desktop/Pragyan/tests/test_indices.py).

9. **Interactive Web GIS with State-Level Scope Isolation**
   - **What to say:** "Our MapLibre-based Web GIS renders all 36 States/UTs of India, with deep drill-down across Madhya Pradesh's 55 districts and 603 panchayats, while isolating unmodeled states gracefully without fake data."
   - **Evidence:** [`frontend/src/components/map/MapContainer.tsx`](file:///C:/Users/LOQ/Desktop/Pragyan/frontend/src/components/map/MapContainer.tsx), [`config/regions.yaml`](file:///C:/Users/LOQ/Desktop/Pragyan/config/regions.yaml), 33 passing frontend unit tests.

---

## 2. Claims We MUST Label "Planned" or "Future Scope"

Do NOT present these as existing, active features. Frame them explicitly as next-phase architecture:

1. **Nationwide Scaling (250,000+ Panchayats)**
   - *Current Reality:* Only 603 panchayats in MP are active; nationwide polygons and forecasts are not yet populated.
   - *Slide Label:* **"Phase 2 Nationwide Rollout (Architecture Designed for Scale)"**.

2. **Official IMD NWP Model & Radar Grid Ingestion**
   - *Current Reality:* We currently ingest open ECMWF IFS 0.25° and NOAA GFS 0.25° via Open-Meteo. No IMD NWP API is currently feeding the pipeline.
   - *Slide Label:* **"Planned Integration: IMD Numerical Weather Prediction & DWR Radar Feeds"**.

3. **Area-Weighted Polygon Boundary Aggregation**
   - *Current Reality:* Current grid sampling uses coordinate rounding to 0.1°, not a GIS polygon intersection integral.
   - *Slide Label:* **"Future Scope: Exact Polygon-Weighted Spatial Aggregation"**.

4. **Production Telecom Gateway Dissemination (SMS / Voice IVR / WhatsApp)**
   - *Current Reality:* Webhooks exist in sandbox mode with mock Twilio adapters; no paid production SMS/IVR gateway is active.
   - *Slide Label:* **"Dissemination Engine (Prototype Tested via Mock Telecom Webhooks; Production Gateway Integration Planned)"**.

5. **Closed-Loop Crowdsourced Feedback Integration into ML Weights**
   - *Current Reality:* Farmer reports are stored as unverified records and deliberately excluded from model scoring.
   - *Slide Label:* **"Phase 2 Roadmap: Bayesian Assimilation of Ground Crowdsourced Reports"**.

6. **Automated Continuous Retraining & Model Orchestration**
   - *Current Reality:* Model retraining is an offline manual script (`11_train_model.py`), not an automated streaming scheduler.
   - *Slide Label:* **"Future Architecture: Automated Airflow / MLflow Retraining DAG"**.

---

## 3. Claims or Numbers to REMOVE from Slides Immediately

These claims are factually false, misleading, or broken, and will fail under scrutiny if probed by evaluators:

1. **PURGE: "55 Ground Reference Stations in Madhya Pradesh"**
   - *Why:* Hard-coded literal in API. Database contains 0 stations in MP; offline dataset contains only 5 synoptic airport stations.
   - *Fix:* Replace with **"5 Synoptic Ground Stations in Madhya Pradesh"**.

2. **PURGE: "82.4% Conformal CI Coverage"**
   - *Why:* Hard-coded literal in API. The model does NOT use conformal prediction; it uses an $N=12$ bootstrap ensemble whose empirical coverage on point predictions collapsed to ~55% on rainfall.
   - *Fix:* Replace with **"Nominal 80% Prediction Intervals via 12-Member Bootstrap Ensemble"**.

3. **PURGE: "$R^2 = 0.9997$ to $1.0000$" and "$+81.7\%$ / $+97.41\%$ Skill Improvements"**
   - *Why:* Result of data leakage where regression trees learned deterministic mathematical formulas rather than observational physical downscaling.
   - *Fix:* Remove $R^2$ values completely. Quote baseline comparison against lapse-rate and bilinear interpolation without astronomical claims.

4. **PURGE: "Direct IMD Operational Forecast Ingestion"**
   - *Why:* False. Only ECMWF IFS and GFS are ingested.
   - *Fix:* State honestly: **"ECMWF IFS 0.25° & NOAA GFS Global Models"**.

5. **PURGE: "Live Decision Cards Demo" (DO NOT CLICK IN LIVE DEMO)**
   - *Why:* Live endpoint `GET /api/ui/decision/{gp_code}` throws a 500 error (`TypeError: evaluate_decision() got an unexpected keyword argument 'day'`).
   - *Fix:* Do not click on the Decision Cards tab during the live presentation until instructed to patch the backend.

6. **PURGE: Hardcoded Meteorological Descriptions ("convective rainbands over Central MP")**
   - *Why:* Static text leftover from early mockup prototypes.
   - *Fix:* Use dynamic API summary narratives only.
