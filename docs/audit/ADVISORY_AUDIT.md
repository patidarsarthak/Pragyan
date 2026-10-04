# Audit Report: Current Agro-Meteorological Advisory System

**Document ID:** `docs/audit/ADVISORY_AUDIT.md`  
**System:** Pragyan Agro-Meteorological Advisory Subsystem  
**Date:** October 4, 2026  
**Status:** Awaiting Approval (Step A0 Audit)

---

## Executive Summary

This audit reviews the current implementation of crop calendars, agronomic rule logic, soil water budgets, and advisory distribution channels across `ml/src/advisory_engine.py`, `config/imd_thresholds.yaml`, `data/crop_calendar.yaml`, `backend/services.py`, and database tables in `backend/sih26074_panchayat.db`.

While Pragyan possesses an advanced 5-variable meteorological downscaling backbone and an initial multi-variable rule evaluator, the current advisory engine relies on **unverified heuristic cutoffs**, lacks **Growing Degree Day (GDD) phenological staging**, assumes a **single hard-coded soil type**, and violates guardrails by prescribing specific **chemical pesticide product names and doses**.

---

## 1. Crop, Stage, and Rule Implementation Audit

### 1.1 Configured Crops & Citations (`data/crop_calendar.yaml`)
The repository contains calendar specifications for 8 crops, originally parameterized for the Dhanbad pilot (Agro-Climatic Zone IV, Jharkhand):

| Crop Key | Canonical Name | Season | Duration (Days) | $K_{c\text{-mid}}$ | MAD | Root Depth (cm) | Stated Source in Code | Audit Citation Status |
|---|---|---|---|---|---|---|---|---|
| `paddy` | Paddy / Rice (*Oryza sativa*) | Kharif | 125 | 1.20 | 0.20 | 60 | BAU Ranchi / ICAR-KVK | **PARTIALLY CITED** (Dhanbad context, not MP) |
| `maize` | Maize (*Zea mays*) | Kharif | 90 | 1.15 | 0.50 | 80 | ICAR-CRIDA | **PARTIALLY CITED** |
| `soybean` | Soybean (*Glycine max*) | Kharif | 105 | 1.15 | 0.50 | 70 | ICAR-IISR Indore | **PARTIALLY CITED** |
| `wheat` | Wheat (*Triticum aestivum*) | Rabi | 120 | 1.15 | 0.55 | 90 | ICAR-IARI | **PARTIALLY CITED** (Needs JNKVV/RVSKVV MP calibration) |
| `mustard` | Mustard (*Brassica juncea*) | Rabi | 110 | 1.05 | 0.60 | 80 | ICAR-DRMR | **PARTIALLY CITED** |
| `chickpea` | Chickpea (*Cicer arietinum*) | Rabi | 115 | 1.00 | 0.60 | 80 | ICAR-IIPR | **PARTIALLY CITED** |
| `potato` | Potato (*Solanum tuberosum*) | Rabi | 95 | 1.15 | 0.35 | 50 | CPRI Shimla | **PARTIALLY CITED** |
| `tomato` | Tomato (*Solanum lycopersicum*) | Rabi/Zaid| 110 | 1.15 | 0.40 | 60 | IIHR Bengaluru | **PARTIALLY CITED** |

*Missing Major MP Crops:* **Cotton (*Gossypium hirsutum*)**, **Pigeonpea / Arhar (*Cajanus cajan*)**, and **Durum Wheat (*Triticum durum*)** are not currently parameterized in `crop_calendar.yaml`.

---

### 1.2 Evaluated Rules & Flagged Thresholds (`ml/src/advisory_engine.py`)

| Rule ID / Category | Condition / Trigger | Generated Advisory Text | Stated Source | Exact Threshold Status |
|---|---|---|---|---|
| **Rule 0.1** (Flowering Heat) | Flowering + Temp $\ge 34.0^\circ\text{C}$ (Paddy, Tomato, Soybean, Wheat) | Induces spikelet sterility, blossom drop, terminal heat. | ICAR-CRIDA | **UNSOURCED CUTOFF:** $34.0^\circ\text{C}$ is a generic threshold; varies by variety and duration. |
| **Rule 0.2** (Tillering Drainage) | Active Tillering + Rain $\ge 20.0\text{ mm}$ | Open drainage bunds immediately to prevent submergence. | BAU Ranchi | **FLAGGED EXAMPLE:** Rain $\ge 20\text{ mm}$ cutoff is heuristic. **UNSOURCED.** |
| **Rule 0.3** (Wheat CRI Irrigation) | Wheat CRI stage (0–25 DAS) + Rain $< 3.0\text{ mm}$ (or Rain $\ge 25\text{ mm}$) | Apply first irrigation (50–60 mm) without delay. | ICAR-IARI | CRI physiological stage cited, but $3.0\text{ mm}$ and $25.0\text{ mm}$ cutoffs are **UNSOURCED.** |
| **Rule 0.4** (Maize Tasseling Heat) | Silking/Tasseling + Temp $\ge 35.0^\circ\text{C}$ | Silk desiccation risk; maintain 75% field capacity. | ICAR | **UNSOURCED CUTOFF:** $35.0^\circ\text{C}$. |
| **Rule 0.5** (Potato Late Blight) | Tuber bulking + RH $\ge 80\%$ + $12 \le \text{Temp} \le 22^\circ\text{C}$ | Late blight outbreak alert; spray prophylactic Mancozeb 75% WP @ 2.5 g/L. | CPRI | **GUARDRAIL VIOLATION:** Recommends specific chemical name and dosage (`Mancozeb @ 2.5 g/L`). Must be timing-only. |
| **Rule 0.6** (Mustard Aphid Alert) | Flowering/Podding + RH $\ge 75\%$ + Temp $\le 26.0^\circ\text{C}$ | Aphid buildup alert; spray Thiamethoxam 25% WG @ 0.2 g/L. | ICAR-DRMR | **GUARDRAIL VIOLATION:** Prescribes chemical product name and dosage (`Thiamethoxam @ 0.2 g/L`). |
| **Rule 0.7** (Chickpea Wilt/Blight) | Flowering/Podding + Rain $\ge 15\text{ mm}$ or (RH $\ge 80\%$ & Temp $\ge 20^\circ\text{C}$) | Wet soil promotes collar rot and Ascochyta blight. | ICAR-IIPR | **UNSOURCED CUTOFFS:** $15\text{ mm}$, $80\%$, $20^\circ\text{C}$. |
| **Rule Cat 1** (Irrigation Scheduling) | Rain $\ge 15\text{ mm}$ or (Rain $\ge 1.5 \times \text{ET}$ & Rain $\ge 8\text{ mm}$) | Suspend all irrigation for 48–72 hours. | IMD AAS SOP | **FLAGGED EXAMPLE:** Rain $\ge 15\text{ mm}$ / $20\text{ mm}$ suspends irrigation. **UNSOURCED.** |
| **Rule Cat 3** (Spraying Windows) | Wind $\ge 4.17\text{ m/s}$ ($15\text{ km/h}$) or Rain $\ge 2.5\text{ mm}$ or RH $\ge 85\%$ | Withhold chemical sprays; drift & foliar washout danger. | IMD / CIBRC | **FLAGGED EXAMPLE:** Wind $\ge 15\text{ km/h}$, RH $\ge 85\%$. Standard CIBRC drift guideline, but unreviewed. |
| **Rule Cat 4** (Rice Blast / Spot) | RH $\ge 82\%$ + $21 \le \text{Temp} \le 29.5^\circ\text{C}$ + Rain $\ge 0.5\text{ mm}$ | Rice Blast alert; apply Tricyclazole 75% WP @ 0.6 g/L. | CRRI Cuttack | **GUARDRAIL VIOLATION:** Chemical product name and dosage (`Tricyclazole @ 0.6 g/L`). |
| **Soil Water Budget** (`services.py:1788-92`) | Field Capacity = $140.0\text{ mm}$, Wilting Point = $65.0\text{ mm}$, MAD = $50\%$ | Calculate soil depletion percentage and trigger irrigation. | FAO-56 (Generic) | **FLAGGED EXAMPLE:** $140\text{ mm}$ FC, $65\text{ mm}$ WP, $50\%$ MAD. Hard-coded constants; **UNSOURCED for MP soils.** |

---

## 2. Crop Stage Computation vs. Sowing Date

### 2.1 Stage Determination Logic
- **With Farmer Sowing Date (`get_crop_stage`):**
  - Computes simple calendar **Days After Sowing (DAS)**: $\text{DAS} = (\text{as\_of\_date} - \text{sowing\_date}).\text{days}$.
  - Matches DAS against hard-coded start/end day brackets in `crop_calendar.yaml`.
  - **Limitation:** Does **not** compute Growing Degree Days (GDD), accumulated thermal units ($\sum (T_\text{mean} - T_\text{base})$), or downscaled temperature variations. A warm lowland panchayat and a cool hill panchayat are assigned the exact same stage on day 35.
- **Without Sowing Date (`get_active_crops_for_date`):**
  - Uses static monthly lookup (e.g., September = Paddy flowering, October 1-15 = Maize harvesting).
  - Assumes a single fixed regional planting window; does not support early/normal/late sowing cohorts.
- **Uncertainty & Feedback:**
  - Stage is returned as a deterministic single string, with **no probability score**, **no earliest/likely/latest transition dates**, and **no mechanism for farmer ground feedback** to correct stage drift.

---

## 3. Soil Classes per Panchayat

### 3.1 Current Status in Database
- **No Soil Class Data in DB:** The database tables (`panchayats`, `districts`, `blocks`, `gis_features`) do **not** have columns for soil order, texture class, depth, field capacity, or wilting point.
- **Single Hard-Coded Default:** In `backend/services.py:1788-1792`, the FAO-56 water balance engine applies a single hard-coded parameter set to every panchayat in India:
  $$\text{Field Capacity} = 140.0\text{ mm},\quad \text{Wilting Point} = 65.0\text{ mm},\quad \text{MAD} = 50\%,\quad \text{RAW} = 37.5\text{ mm}$$
  While the code comment states `(Vertisol / Gangetic Loam)`, it is applied identically to sandy loams, red soils, and heavy clay Vertisols.

---

## 4. Available Panchayat GIS Fields & Irrigation Data

### 4.1 Available Fields in `gis_features` Table
The SQLite database actively maintains 1,471 rows in `gis_features`:
- **Elevation:** `elevation_mean`, `elevation_min`, `elevation_max` (meters, derived from SRTM DEM).
- **Topography:** `slope_mean` (degrees), `aspect_mean` (degrees).
- **Vegetation:** `ndvi_mean` (Sentinel-2 NDVI composite).
- **Land Cover:** `agriculture_fraction` (cropland share), `forest_fraction`, `water_fraction`, `land_cover_class`, `land_cover_name` (Copernicus 100m Land Cover).

### 4.2 Irrigation Source Data
- **Current Status:** **COMPLETELY ABSENT.**
  - There is no data indicating whether a panchayat's cropland is canal-commanded, tube-well/borewell irrigated, open-well fed, tank-fed, or rainfed.
  - The FAO-56 water balance assumes unlimited irrigation water availability whenever MAD is breached.

---

## 5. Advisory Storage, History, and Delivery

### 5.1 Storage & Immutability
- **Database Table:** `advisories` in `backend/sih26074_panchayat.db` stores 1,367 records (`id`, `gp_code`, `advisory_date`, `crop`, `growth_stage`, `advisory_text`, `triggering_variables`, `confidence_pct`, `rule_source`, `created_at`).
- **File Export:** Flat CSV at `ml/results/sample_advisories.csv`.
- **Gaps:**
  - Advisories are not version-controlled.
  - There is no `status` (`ACTIVE`, `NEEDS_EXPERT_REVIEW`), `reviewed_by`, or `verifiable_event` logging.
  - No `advisory_feedback` table exists to record whether farmers followed the advice or if the predicted hazard occurred.

### 5.2 Delivery Protocols
- **OASIS CAP 1.2 XML:** Fully functional endpoint at `GET /panchayats/{gp_code}/cap-alert.xml` generating compliant disaster/emergency agromet alerts.
- **SMS & IVR:** Twilio integrations in `backend/bot/sms_twilio.py` and `backend/bot/ivr_twilio.py` (bilingual English/Hindi interactive voice prompts).
- **Interactive Chatbot:** WhatsApp/Telegram multi-turn webhook in `backend/bot/core.py`.
- **Gaps:**
  - No capability to broadcast targeted advisories filtered by `(panchayat_lgd \times crop \times stage)`.
  - No Officer Review & Approval Console with audit trails before broadcasting critical advisories.

---

## Required Remediation Plan (Steps A1–A10)

1. **Step A1 (Sourced Crop Calendar & Schema):**
   - Create tables: `crops`, `crop_calendar`, `agro_zones`, `soil_classes`, `farmer_profiles`, `advisories_issued`, `advisory_feedback`, and `kvk_directory`.
   - Populate `config/crop_calendar.yaml` exclusively with cited parameters for Madhya Pradesh (JNKVV / RVSKVV / ICAR-IISR / CRIDA). Flag all unsourced items as disabled (`NEEDS_EXPERT_REVIEW`).
2. **Step A2 (GDD Phenology Stage Engine):**
   - Implement `ml/src/crop_stage.py` calculating Growing Degree Days ($\sum (T_\text{mean} - T_\text{base})$) and DAS, returning earliest/likely/latest stage transition windows and confidence.
3. **Step A3 (Rule Registry v3 & Guardrail Enforcement):**
   - Strip all chemical brand names and dosages (Mancozeb, Tricyclazole, Thiamethoxam) to strictly adhere to Guardrail 2 (timing & weather only; link to official IPM).
   - Require `source`, `reviewed_by`, and translations (`en`, `hi`, `bn`).
4. **Step A4 & A5 (Planners & Personalization API):**
   - Implement 7 modular planners (sowing, irrigation, spray, drainage, thermal stress, harvest, disease-weather risk).
   - Add `/api/advisory/{lgd}`, `/api/profile`, and crop map layer endpoints.
5. **Step A6 (Panchayat vs. Block Explainer):**
   - Implement `ml/src/advice_difference.py` to quantify and display the value of 1km downscaling to farmer decisions.
6. **Step A7–A9 (Officer Console, Frontend UI, Verification):**
   - Build "My Farm" farmer view, officer broadcast console, and verification loop.

*Submitted for User Approval.*
