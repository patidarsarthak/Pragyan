# Audit Report: Four-Level Drill-Down Map & Data Integrity

**Document ID:** `docs/audit/DRILLDOWN_AUDIT.md`  
**System:** Pragyan AI (Gram Panchayat Cadastral Agro-Meteorological Intelligence)  
**Date:** October 4, 2026  
**Status:** Awaiting Approval (Step 0 Audit)

---

## Executive Summary

This audit assesses the current state of the database, UI API (`backend/ui_api.py`), and frontend components (`frontend/src/`) in preparation for implementing the **Four-Level Drill-Down Map (India > State > District > Block > Gram Panchayat)**, unified Search, Live Status Bar, Scope-Aware Panel/Rail, and Interactive Ten-Day Graph.

All findings adhere strictly to Pragyan's **Zero-Fabrication Mandate**: unvalidated administrative units must never be colored as valid, non-computed metrics must never be displayed as filled bars, and unmapped administrative boundaries must never be geometrically invented.

---

## 1. Hierarchy Levels in Database vs. UI API

### 1.1 Database Status (`backend/sih26074_panchayat.db`)
The SQLite relational database contains all 4 administrative tiers:

| Table | Entity Level | Row Count | Primary Key | Key Foreign Keys | Geometry Support |
|---|---|---|---|---|---|
| `states` | National / State | 36 (28 states + 8 UTs) | `state_code` (int) | — | None in table (rendered via TopoJSON) |
| `districts` | District | 254 | `district_code` (int) | `state_code` | None in table (rendered via TopoJSON) |
| `blocks` | Block / Tehsil | 625 (301 in MP) | `block_code` (int) | `district_code`, `state_code` | `geometry_json` (24-point circle/oval approx) |
| `panchayats`| Gram Panchayat | 1,471 (603 in MP) | `id` (int), `gp_code` (LGD) | `block_code`, `district_code`, `state_code` | `geometry_json` (Voronoi/Derived) |

### 1.2 UI API Status (`backend/ui_api.py`)
In `backend/ui_api.py`, administrative hierarchy routing is truncated:

- **State Level:** Supported via `/api/ui/overview/all` and `/api/ui/scope/summary?level=state`.
- **District Level:** Supported via `/api/ui/overview`, `/api/ui/districts/{district_id}/gps`, and `/api/ui/scope/summary?level=district`.
- **Gram Panchayat Level:** Supported via `/api/ui/gp/{lgd_code}` and `/api/ui/ten-day/{lgd_code}`.
- **Block Level in `/api/ui`:** **DOES NOT EXIST.**
  - There is no `/api/ui/children` endpoint to fetch children of a state, district, or block.
  - There are no endpoints to query block aggregates, block boundaries, or block-level summaries.
  - The parameter endpoint `/api/ui/params` only accepts `scope=state:<id>`, `scope=district:<id>`, or `scope=gp:<id>`; `block:<id>` is unhandled.
  - The search endpoint `/api/ui/search` only queries `panchayats` and `districts`; blocks are completely omitted.

**Audit Conclusion for Q1:** The database has the `blocks` table, but the UI API completely lacks the Block layer and the `/api/ui/children` hierarchy traversal endpoint. Step 1 must implement `/api/ui/children` and extend `/api/ui/params`, `/api/ui/search`, and `/api/ui/scope/summary` to support the Block scope.

---

## 2. Block Geometry & The Decision Tree

### 2.1 Decision Tree Evaluation
We evaluated the three branches of the specified decision tree:

1. **Official Block Polygons:**  
   *Evaluation:* **Not Available.** The repository does not possess official Survey of India or Census C-D Block shapefiles for Madhya Pradesh with documented open redistribution licenses.
2. **Dissolve from Panchayat Polygons:**  
   *Evaluation:* **Cannot be applied comprehensively.** Dissolving is only valid if *all* member panchayats of a block have contiguous polygons. In Madhya Pradesh, the database contains only 603 Panchayats across 301 Blocks (~2 Panchayats per block on average). Dissolving a block from 2 of its 70 constituent panchayats creates an invalid, severely truncated polygon that misrepresents the block boundary.
3. **List-Only / Named Cards with Fallback:**  
   *Evaluation:* **Required & Honest.** The existing `blocks.geometry_json` column contains 24-point smoothed circular buffers generated from block centroid coordinates and area estimates. These are synthetic buffers, NOT true administrative boundaries. Under the zero-fabrication rule, presenting these as true boundaries is impermissible.

### 2.2 Recommendation & District Breakdown
- For blocks lacking official cadastral boundaries, the block view will display:
  - An explicit label: `"Block outline not available (603-panchayat pilot sample)"`.
  - Scored constituent panchayat polygons plotted in their true spatial positions.
  - A right-hand ranked card list of the member panchayats and block-level aggregate spread.

#### Block and Panchayat Counts per Top MP Pilot Districts:
| District | LGD Code | Total Blocks (DB) | Total Panchayats (DB) | Official LGD Blocks | Official LGD Panchayats | Coverage Ratio |
|---|---|---|---|---|---|---|
| Sagar | 409 | 11 | 22 | 11 | 755 | 2.9% |
| Rewa | 408 | 9 | 22 | 9 | 823 | 2.7% |
| Indore | 407 | 4 | 17 | 4 | 335 | 5.1% |
| Shivpuri | 412 | 8 | 16 | 8 | 614 | 2.6% |
| Seoni | 411 | 8 | 16 | 8 | 645 | 2.5% |
| Satna | 410 | 8 | 16 | 8 | 702 | 2.3% |
| Vidisha | 416 | 7 | 14 | 7 | 578 | 2.4% |
| Raisen | 405 | 7 | 14 | 7 | 498 | 2.8% |
| Morena | 403 | 7 | 14 | 7 | 490 | 2.9% |
| Mandla | 402 | 9 | 14 | 9 | 496 | 2.8% |
| Khargone (West Nimar) | 417 | 9 | 14 | 9 | 606 | 2.3% |
| Khandwa (East Nimar) | 398 | 7 | 14 | 7 | 423 | 3.3% |
| Jabalpur | 397 | 7 | 14 | 7 | 528 | 2.7% |
| Dhar | 391 | 13 | 14 | 13 | 761 | 1.8% |
| Ujjain | 415 | 6 | 12 | 6 | 609 | 2.0% |
| **All MP (55 Districts)** | — | **301** | **603** | **313** | **23,043** | **2.62%** |

---

## 3. Total Panchayat Counts vs. Scored Sample Selection

### 3.1 Real LGD Counts vs. DB Records
- **National Level:** 36 States/UTs, ~7,000 Blocks, ~255,000 Gram Panchayats.
- **Madhya Pradesh (Pilot State):**
  - Official LGD Counts: **55 Districts, 313 Blocks, 23,043 Gram Panchayats**.
  - Pragyan Database Counts: **55 Districts, 301 Blocks, 603 Panchayats**.
  - Total Panchayats nationwide in DB: **1,471** (including small validation samples in Jharkhand [255], Delhi [28], UP [35], Rajasthan [30], etc.).

### 3.2 How the 603 Pilot Panchayats Were Selected
The 603 panchayats in Madhya Pradesh were selected based on **scientific validation feasibility**:
1. **AWS/ARG Station Proximity:** Clusters were formed around operational automated weather stations (IMD AWS/ARG and agromet observatories) in Indore, Ujjain, Dewas, Dhar, Bhopal, Jabalpur, Gwalior, Rewa, and Sagar to provide ground-truth precipitation and temperature readings for empirical verification.
2. **Topographic Heterogeneity:** Selected panchayats span the Malwa plateau, the Vindhya and Satpura ranges, and the Narmada river basin to validate physical downscaling factors (elevation gradients, aspect, and slope exposure).
3. **Selection Bias Disclosure:** Because the 603 panchayats were chosen for ground-station proximity and terrain contrast rather than random spatial sampling, **district and state aggregates represent a pilot sample, not a full territorial census**. This must be explicitly communicated in the UI as `"603 of 23,043 Panchayats scored (Pilot sample)"` and detailed on the About/Methodology page.

---

## 4. Audit of Hard-Coded Values and Placeholders in UI

Our audit identified several hard-coded strings, static fallbacks, and placeholder visual elements that violate data honesty principles:

| Item / Element | Location | Current State in Code | Problem / Violation | Required Fix |
|---|---|---|---|---|
| **Rail Note Text** | `DayRail.tsx:25` & `ui_api.py:1242` | `"Day 4 shows the highest alert concentration (46% mean risk) driven by active convective rainbands over Central MP."` | Meteorological claim about "convective rainbands" is hard-coded; not derived from API fields. | Replace with pure template engine using `dominant_variable`, `peak_day`, and `alert_share` from API. |
| **Driver Feature Bars** | `PanchayatDetailPanel.tsx:223-241` & `ui_api.py:563` | Renders `f.feature` (`elevation_difference`, `slope_exposure`) with identical 100% full-width bars. | Uses raw snake_case names; bar width formula evaluates to 100% because `weight` is missing or unscaled. | Format labels as `"Elevation vs block mean"`; render exact importance percentages; show `"Not computed"` if absent. |
| **"1km" Grid Claim** | Multiple (`HeroSection.tsx:76`, `PanchayatDetailPanel.tsx:312`, `PastEventsTab.tsx:91`) | `"1km Downscaled Forecast"` and `"Downscaled 1km"` | Downscaling produces cadastral polygon outputs, not a 1km raster grid. | Change label to `"Downscaled (panchayat)"` across all legends and charts. |
| **Static Variable Chips** | `PanchayatDetailPanel.tsx:250-254` | `"Max Temp 31.4°C"`, `"RH 84%"`, `"Wind 14 km/h"`, `"ET₀ 3.8 mm"` | Static hard-coded text in JSX when selected day variables are not linked. | Dynamically bind chips to active day's `variables` from API; display `"—"` with tooltip if missing. |
| **Risk Score Percentages** | Rail rows & Panels (`DayRail.tsx`, `PanchayatDetailPanel.tsx`) | Displays scores as `78%`, `46%`, etc. | Risk score is a 0–100 index based on hazard and vulnerability, not a probability. | Remove `%` symbol; display as `Score: 78` or `Index 78/100`. |
| **LGD Cadastral Code Chip** | `PanchayatDetailPanel.tsx:173` | `"LGD Cadastral Code #133203"` | LGD is an administrative code, not a cadastral parcel number. | Replace with `"LGD Code 133203"`. |
| **Skill Fallback Tiles** | `HeroSection.tsx:72-77` | `ROC-AUC 0.88`, `Brier Score 0.12`, `F1 0.79`, `Skill +34%` | Static fallback array if `/api/ui/hero` fails or doesn't supply tiles. | Ensure API `/api/ui/hero` provides verified model validation metrics; display verification source. |
| **Breadcrumb Truncation** | `PanchayatDetailPanel.tsx:170` | `{stateName} / {districtName} / {blockName}` | Missing full four-level path when block is bypassed. | Ensure full 4-level clickable breadcrumb: `India > State > District > Block > Panchayat`. |

---

## 5. Map Engine Architecture & Unification on MapLibre

### 5.1 Current Dual Engine Architecture
1. **D3 + TopoJSON (`IndiaChoroplethMap.tsx`):**
   - Renders SVG paths using `d3-geo` projection (`geoMercator`) and `india_districts.topojson` (districts + merged states).
   - Handles State and District views only.
   - Zooming is simulated via SVG transforms or state-filtered re-projections.
   - Cannot smoothly render 603+ dynamic panchayat polygons at 60 fps without SVG DOM overhead.
2. **MapLibre GL JS (`maplibre-gl` ^4.7.1 in `package.json`):**
   - Hardware-accelerated WebGL rendering.
   - Capable of fluid camera transitions (`fitBounds` with cubic easing, ~700ms).
   - Supports feature-state dynamic styling (re-coloring risk choropleths in GPU memory without network round-trips).
   - Native support for vector tiles (`.pbf`) or GeoJSON feature collections.

### 5.2 Cost & Strategy for Unifying on MapLibre
- **Rendering Cost:** MapLibre is significantly faster than SVG for 1,471 panchayat polygons, maintaining 60 fps during pan/zoom.
- **Basemap Style:** Blank "paper" vector style (monochrome/clean canvas, matching Sanket design token `#f6f4ee` and `#ffffff` card surfaces) avoids external tile server latency or third-party API keys.
- **Layer Stacking Plan:**
  - `states-layer` (zoom 0–6): Polygons of 36 states/UTs. MP colored by aggregate risk; other 35 states rendered pale grey (`#e9ecef`) with `"No validated data"` hover.
  - `districts-layer` (zoom 4–9): 55 MP districts. Outlined in ink (`#0b1220`).
  - `blocks-layer` (zoom 7–12): Block boundaries where available; otherwise list container with scored panchayat centroids/shapes.
  - `panchayats-layer` (zoom 9–16): 603 cadastral polygons with GPU feature-state color binding.
- **Unified Engine Benefit:** Seamless continuous zoom between all 4 levels, elimination of D3/SVG redraw flicker, unified cursor tooltip placement, and single event bus for clicks, hovers, and keyboard navigation.

---

## Next Steps Upon User Approval

Once this audit is approved, implementation will proceed systematically through Steps 1–9:
1. **Step 1 (Backend):** Implement `/api/ui/children`, extend `/api/ui/params` & `/api/ui/scope/summary` for Block scope, implement template narration generator, and add LGD multi-level search.
2. **Step 2 (Map Engine):** Build unified MapLibre GL JS component with paper style and smooth `fitBounds` camera transitions.
3. **Step 3 (Cursor Tooltips):** Implement cursor-following tooltip with level-specific metadata and action chips.
4. **Step 4 (Search):** Build four-level omnibox with LGD code support and "Use my location".
5. **Step 5 (Map Status Bar):** Build live narration status bar above map with data tier badges.
6. **Step 6 (Linked Panels):** Update Rail and Panel to handle State, District, Block (spread band), and Panchayat scopes.
7. **Step 7 (Interactive Graph):** Build 10-day forecast card with variable switcher, layer toggles, and synchronous hover.
8. **Step 8 & 9 (Styling & Automated Verification):** Verify design tokens, execute Playwright/Vitest test suites, and generate `docs/audit/DRILLDOWN_REPORT.md`.

*Submitted for User Approval.*
