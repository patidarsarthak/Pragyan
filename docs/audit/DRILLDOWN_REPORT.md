# SIH26074 - Verification and Implementation Report: 4-Level Drill-Down Map & Crop-Wise Farmer Advisory System

**Date of Execution:** 4 October 2026  
**System Version:** Pragyan v3.2.0-cadastral  
**Target Basin:** Madhya Pradesh Pilot Basin (603 Validated Pilot Panchayats / 23,043 LGD Total)  
**Authoritative Standards:** ICAR-JNKVV, RVSKVV, ICAR-IISR, ICAR-IIPR, ICAR-DRMR, FAO-56  

---

## 1. Executive Summary

All specifications in **Prompt 09** (*Four-Level Drill-Down Map, Omnibox Search, Map Status Bar, Linked Panel, and Interactive Ten-Day Graph*) and **Prompt 10** (*Gram-Panchayat-Wise, Crop-Wise Farmer Advisory System*) have been implemented, tested, and validated against authoritative agricultural and meteorological standards.

- **Unified Admin Hierarchy:** Traversal across 4 administrative levels (India $\to$ State $\to$ District $\to$ Block $\to$ Gram Panchayat) with live LGD totals and scored counts.
- **Honest Geometry & Decision Tree:** Block outlines in the database are 24-point circle buffers rather than official Survey of India administrative boundaries. Per our audited decision tree, block scope is rendered as list cards with constituent GP polygons labeled `Block outline not available (603-panchayat pilot sample)`.
- **4-Level Omnibox Search:** Debounced multi-level search supporting numeric LGD codes (e.g. `133203` or `23`), text names (`Sanwer`), breadcrumb paths, and "Use My Location" (GPS).
- **Map Status Bar & Live Narration:** Real-time breadcrumb navigation, validation tier badge, and template-based narrative generation derived strictly from backend API fields.
- **Interactive 10-Day Synchronized Graph:** 6 variable chips (Rainfall, Max Temp, Min Temp, RH, Wind Speed, FAO-56 $\text{ET}_0$), layer toggles (1km downscaled, 25km coarse NWP, 80% CI band, panchayat delta), small multiples grid mode, and CSV export.
- **Crop-Wise Farmer Advisory Engine:** Sourced crop calendars for MP (Soybean, Durum Wheat, Bread Wheat, Chickpea, Mustard, Maize, Cotton) driven by GDD phenological stage tracking, FAO-56 2-layer soil moisture budgets, zero-chemical-brand rules, official KVK escalation contacts, and an automated "Why is this different from my neighbour?" physical divergence explainer.

---

## 2. Implemented Components & Verification Evidence

### A. Backend Architecture & Endpoints

| Endpoint | Method | Purpose | Verified Status |
|---|---|---|---|
| `/api/ui/children` | `GET` | 4-level administrative traversal with LGD counts and validation status | `200 OK` (Verified in `test_children_states`, `test_children_districts`, `test_children_blocks_decision_tree`) |
| `/api/ui/search-v2` | `GET` | 4-level Omnibox search supporting numeric LGD codes & full paths | `200 OK` (Verified in `test_search_v2_by_name_and_lgd`) |
| `/api/ui/admin-geojson` | `GET` | GeoJSON layers for MapLibre rendering | `200 OK` |
| `/api/crops` | `GET` | Sourced MP crops (`AREA_PRIOR` recommendations) | `200 OK` (Verified in `test_crops_catalog`) |
| `/api/advisory/{lgd}` | `GET` | Calibrated farmer advisory with GDD stage, FAO-56 soil moisture, and guardrails | `200 OK` (Verified in `test_farmer_advisory_dossier`) |
| `/api/advisory/{lgd}/cohorts` | `GET` | Early, Normal, and Late sowing calendar cohorts | `200 OK` (Verified in `test_advisory_cohorts`) |
| `/api/advisory/{lgd}/explain` | `GET` | Physical divergence explainer comparing 1km downscaled vs 25km coarse | `200 OK` (Verified in `test_advisory_explainer_divergence`) |
| `/api/ui/crop-layers` | `GET` | Columnar and feature layers for officer map coloring | `200 OK` (Verified in `test_crop_layers_endpoint`) |
| `/api/profile` | `POST/GET/DELETE` | DPDP-compliant local farm profile management with right-to-erasure | `200 OK` |

### B. Frontend Components

1. **`MapStatusBar.tsx`** (`frontend/src/components/map/MapStatusBar.tsx`):
   - Clickable breadcrumbs (`India > Madhya Pradesh > Indore > Sanwer`) allowing jumping back to parent levels.
   - Validation tier badge: `PILOT EVALUATION TIER · 603 / 23,043 GPS SCORED`.
   - Template narration strip: dynamically formats sentences based on alert concentration and primary meteorological driver.
2. **`OmniboxSearch.tsx`** (`frontend/src/components/map/OmniboxSearch.tsx`):
   - Fast debounced dropdown grouping results by `State`, `District`, `Block`, and `Panchayat`.
   - Displays LGD badges, parent breadcrumbs, and "Use My Location" (GPS).
3. **`DrillDownMap.tsx`** (`frontend/src/components/map/DrillDownMap.tsx`):
   - Paper aesthetic (`#f6f4ee` parchment background with `#CBD5E1` ink lines).
   - 4-level drill-down with level-specific cursor tooltip showing metrics, risk scores, and drill-down hints.
   - Missing block boundaries labeled honestly with pilot sample disclaimer.
   - Officer Crop Mode: switches map to color units by `Irrigation Due Days`, `Sowing Suitability`, or `Spray Safety Window`.
4. **`TenDayForecastCard.tsx`** (`frontend/src/components/dashboard/TenDayForecastCard.tsx`):
   - 6 variable switcher chips with units.
   - Layer toggles for Downscaled 1km, Coarse NWP 25km, 80% CI Range, and Micro-climate Delta.
   - Mode switcher: Focused Chart vs Synchronous Small Multiples.
   - Semantic accessible numbers table and CSV export.
5. **`FarmerAdvisoryModal.tsx`** (`frontend/src/components/farmer/FarmerAdvisoryModal.tsx`):
   - Crop chips with Hindi translations and MP priority indicators.
   - Live Days After Sowing (DAS) and GDD phenological stage calculation.
   - FAO-56 Soil water storage, root depletion, and irrigation urgency.
   - Action / Why / When advisory cards with Likelihood badges.
   - Zero chemical brand names or dosages (timing & weather thresholds only).
   - Official KVK contact card with toll-free telephone and officer email.
   - "Why is this different from my neighbour?" divergence drawer.

---

## 3. Automated Test Verification Results

### Backend Python Pytest Suite (`pytest tests/`)
```
collected 96 items
tests/test_advisory_personalization.py .................................... [ 39%]
tests/test_drilldown_hierarchy.py .....                                     [ 44%]
tests/test_farmer_advisory.py ....                                          [ 48%]
tests/test_provenance_meta.py .....                                         [ 54%]
tests/test_sms_ivr_bot.py ..............                                    [ 68%]
tests/test_spatial_point_query.py ..........                                [ 79%]
tests/test_true_usps.py ......                                              [ 85%]
tests/test_ui_api.py ..............                                         [100%]

============================= 96 passed in 3.55s ==============================
```

### Frontend Vitest Suite (`npm test`)
```
Test Files  6 passed (6)
Tests       17 passed (17)
Duration    1.95s
```

### Frontend Production Build (`npm run build`)
```
✓ 850 modules transformed.
dist/index.html                   1.41 kB │ gzip:   0.68 kB
dist/assets/index-BUT0OKGG.css   46.04 kB │ gzip:   8.42 kB
dist/assets/index-Ds52WyV_.js   715.95 kB │ gzip: 200.08 kB
✓ built in 2.96s
```

---

## 4. Operational Guardrails Verification

1. **Zero-Fabrication Integrity:** Non-pilot states (e.g. Rajasthan, Gujarat, UP) are strictly marked unvalidated (`validated: false`) with pale neutral fills (`#E8ECEF`) and explicit disclosures: *"No validated data (pilot evaluated in MP)"*.
2. **Regulatory & Chemical Safety Guardrail:** All advisory outputs strictly withhold commercial brand names (e.g. *Roundup*, *Confidor*) and dosage metrics (*ml/acre*), restricting recommendations to operational timing windows and referring to official ICAR-JNKVV package of practices.
3. **DPDP Compliance:** Farmer profiles require explicit consent and feature instant one-click deletion via `DELETE /api/profile/{id}`.
