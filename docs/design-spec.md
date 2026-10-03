# Design Specification: GramMausam (SIH26074)
**Project Title:** Panchayat-Level Weather Downscaling & Agro-Meteorological Advisory System  
**Problem Statement:** SIH 2026 — PS 26074  
**Product Name:** **GramMausam** (Devanagari: **ग्राममौसम**)  
**Design Reference:** Design & layout taxonomy inspired by modern data journalism (Sanket as reference), modified with unique typography, viridian palette, and independent component architecture.  
**Document Status:** Revised & Aligned — Ready for Step 2  

---

## 1. Product Identity & Honest Scientific Mandate

### 1.1 Brand Identity & Voice
- **Name:** **GramMausam** (*ग्राममौसम*)
- **Tagline:** *Authoritative Gram Panchayat Micro-Weather & Agromet Intelligence*
- **Primary Spatial Anchor:** The official **Local Government Directory (LGD) Gram Panchayat polygon**. Weather, risks, and agronomic advisories are anchored to cadastral GP boundaries (~2–15 km²), never coarse district or block averages.
- **Visual Style:** Deep viridian and agricultural slate palette, high-contrast, editorial typography with `Bricolage Grotesque` and `Plus Jakarta Sans`, and data visualization designed for rural agronomists, district officials, and farmers.

### 1.2 Zero-Fabrication & Scientific Honesty Contract
- **No Invented Numbers:** All baseline scores, uncertainty widths, and soil balance figures must be ingested from verified backend endpoints (`/model/metrics`, `/panchayats/{gp_code}/water-balance`, `/panchayats/{gp_code}/weather`).
- **"NOT YET MEASURED" Rule:** If an analytical metric (e.g., historical alert verification accuracy, live soil sensor data, or off-pilot downscaling) is not present in the backend, the UI renders an em-dash (`—`) and a prominent badge: `NOT YET MEASURED`.
- **Suspicious Claims Flagged:** Near-perfect metrics (such as temperature Pearson $r = 1.000$ or error $< 0.005\text{ }^\circ\text{C}$ due to deterministic lapse rate equations) are documented in `docs/backend-gaps.md` as potential data-leakage or trivial physical constraints, and are never headlined as miraculous ML achievements.
- **Pilot Area Restriction:** Downscaling is operational strictly within the active pilot areas (Dhanbad District, Jharkhand: 239 GPs; Madhya Pradesh pilot zones). All non-pilot territories across India are explicitly rendered and labeled as `OFF-GRID — Coarse Synoptic View Only`.

---

## 2. Colour System & Tokens

To establish visual independence from Sanket's navy/cobalt palette (`#0b1220` / `#2b4eff`), GramMausam uses a **Field & Forest** palette centered on deep viridian teal, earth-slate canvas, crisp 1px borders, and a fully color-blind-safe meteorological palette.

### 2.1 Color Tokens

```css
:root {
  /* Surfaces & Structural Canvas */
  --gm-canvas: #f1f4f8;                 /* Cool slate neutral page background */
  --gm-surface: #ffffff;                /* Primary card & inspector panel */
  --gm-surface-secondary: #f8fafc;      /* Table headers, hover rows, card insets */
  --gm-surface-elevated: #ffffff;       /* Modals and sticky overlays */

  /* Structural Rules & Borders */
  --gm-border-base: #cbd5e1;            /* Standard component borders (Slate-300) */
  --gm-border-subtle: #e2e8f0;          /* Table dividers & chart gridlines (Slate-200) */
  --gm-border-focus: #0d9488;           /* Accessible focus outline (Teal-600) */

  /* Inks / Text Hierarchy */
  --gm-ink-primary: #0f172a;            /* Primary titles, headlines, deep slate-navy */
  --gm-ink-secondary: #334155;          /* Body copy, narrative explanations (Slate-700) */
  --gm-ink-muted: #64748b;              /* Monospace labels, timestamps, units (Slate-500) */
  --gm-ink-inverse: #ffffff;            /* Text on dark buttons & active chips */

  /* Primary Accent: Forest Viridian (Field & Vegetation Theme) */
  --gm-accent: #0f766e;                 /* Teal-700: Primary actions, active navigation */
  --gm-accent-hover: #115e59;           /* Teal-800: Action hover */
  --gm-accent-wash: #f0fdfa;            /* Teal-50: Active row tint, subtle selection wash */
  --gm-accent-border: #99f6e4;          /* Teal-200: Highlight boundary */

  /* 3-Tier Alert & Severity System (Includes Yellow Advisory) */
  /* Level 1: Advisory (Yellow) — Soil moisture depletion, spray advisory, minor delay */
  --gm-status-advisory: #ca8a04;        /* Yellow-600 */
  --gm-status-advisory-wash: #fef9c3;   /* Yellow-100 */
  --gm-status-advisory-text: #713f12;   /* Yellow-900 (High contrast WCAG AA) */

  /* Level 2: Watch (Amber) — Significant heat, heavy rain forecast, moderate bust risk */
  --gm-status-watch: #ea580c;           /* Orange-600 */
  --gm-status-watch-wash: #ffedd5;      /* Orange-100 */
  --gm-status-watch-text: #7c2d12;      /* Orange-900 */

  /* Level 3: Warning (Crimson) — Deluge, localized cloudburst, extreme heatwave */
  --gm-status-warning: #be123c;         /* Rose-700 */
  --gm-status-warning-wash: #ffe4e6;    /* Rose-100 */
  --gm-status-warning-text: #881337;    /* Rose-900 */

  /* Favorable / Normal Status (Emerald) */
  --gm-status-favorable: #059669;       /* Emerald-600 */
  --gm-status-favorable-wash: #d1fae5;  /* Emerald-100 */
  --gm-status-favorable-text: #064e3b;  /* Emerald-900 */

  /* No Data / Off-Grid Territory */
  --gm-status-offgrid: #e2e8f0;         /* Slate-200 */
  --gm-status-offgrid-border: #cbd5e1;  /* Slate-300 */
  --gm-status-offgrid-text: #94a3b8;    /* Slate-400 */

  /* Dimensions & Spacing */
  --gm-topbar-height: 56px;
  --gm-radius-sm: 4px;
  --gm-radius-base: 8px;
  --gm-radius-lg: 12px;
  --gm-radius-pill: 9999px;
  --gm-shadow-card: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05);
  --gm-shadow-elevated: 0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.05);
}
```

### 2.2 Color-Blind-Safe Sequential Variable Ramps
All choropleth map layers and chart fills avoid red-green divergence and use perceptually uniform sequential ramps:

| Variable | Unit | Scale Type | Color Ramp (Low $\to$ High) |
| :--- | :--- | :--- | :--- |
| **Rainfall** | mm | Sequential Teal-Blue (`YlGnBu`) | `#f7fcf0` $\to$ `#ccebc5` $\to$ `#7bccc4` $\to$ `#4eb3d3` $\to$ `#2b8cbe` $\to$ `#08589e` |
| **Temperature** | °C | Sequential Amber-Purple (`Magma/Inferno`) | `#fef0d9` $\to$ `#fdcc8a` $\to$ `#fc8d59` $\to$ `#e34a33` $\to$ `#b30000` |
| **Humidity** | % | Sequential Cyan-Navy | `#e0f3f8` $\to$ `#abd9e9` $\to$ `#74add1` $\to$ `#4575b4` $\to$ `#313695` |
| **Wind Speed** | km/h | Sequential Purple-Indigo | `#ede8f5` $\to$ `#bcbddc` $\to$ `#756bb1` $\to$ `#54278f` |
| **Evapotranspiration ($ET_0$)** | mm/d | Sequential Warm Bronze | `#ffffe5` $\to$ `#fff7bc` $\to$ `#fee391` $\to$ `#fe9929` $\to$ `#cc4c02` |

---

## 3. Typography: Replacing the Reference Font Trio

To ensure that GramMausam does not copy Sanket's typography (`Archivo` + `Public Sans` + `DM Mono`), we use an independent modern technical font stack:

| Role | Font Family | Weights | Details |
| :--- | :--- | :--- | :--- |
| **Headings & Display** | `Bricolage Grotesque` | 700, 800 | Expressive, contemporary grotesk with distinctive optical letterforms |
| **Body & UI** | `Plus Jakarta Sans` | 400, 500, 600 | Clean, geometric neo-grotesque with exceptional legibility on screens |
| **Metrics, Mono & Data**| `JetBrains Mono` | 400, 500 | High-legibility coding font with clear tabular numbers and micro-tags |
| **Hindi (Devanagari)** | `Noto Sans Devanagari` | 400, 600 | Official high-quality Unicode Devanagari script font |

---

## 4. Map Architecture & Sovereign Boundary Compliance

### 4.1 Plain Basemap without Disputed Third-Party Lines
- **No Esri Imagery / No Foreign Mapbox Political Boundaries:** The application renders **no commercial basemap with pre-drawn international boundaries**.
- **Vector Canvas Rendering:** Boundaries are drawn entirely from our own verified GeoJSON/TopoJSON files:
  1. **National Outline:** Official Survey of India (SoI) consistent boundary adhering strictly to the Ministry of Science & Technology's 2021 National Geospatial Guidelines.
  2. **Jammu & Kashmir, Ladakh, Gilgit-Baltistan, Aksai Chin, Siachen, Shaksgam:** Drawn as an integral, undivided part of the Sovereign Territory of India silhouette. A persistent hover tooltip states: *"Authoritative National Boundary of India (Survey of India 2021 Guidelines) — Cadastral observation unavailable"*.
  3. **State & District Outlines:** Sourced from Local Government Directory (LGD) and Survey of India open administrative datasets.
  4. **Gram Panchayat Polygons:** Sourced from `data/static/dhanbad_panchayats_polygons.geojson` (239 authoritative polygons for Dhanbad District, Jharkhand).
  5. **Non-Pilot / Off-Grid Territory:** All states outside active downscaling pilots are rendered in neutral `--gm-status-offgrid` with an explicit label: *"OFF-GRID — Coarse Synoptic View Only"*.

### 4.2 Polygon Hatching via SVG / MapLibre Pattern
Hatching for low model confidence or high ensemble spread is **not** a CSS background-image. It is implemented as a formal vector fill pattern:
- **In SVG Map:**
  ```xml
  <defs>
    <pattern id="gm-hatch-uncertainty" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#be123c" stroke-width="2" opacity="0.35" />
    </pattern>
  </defs>
  <!-- Rendered on low-confidence polygons -->
  <path d="..." fill="url(#gm-hatch-uncertainty)" />
  ```
- **In MapLibre GL JS:** Loaded via `map.addImage('hatch-pattern', image)` and applied using a `fill-pattern` layer filter.

---

## 5. Information Architecture & Distinct Tab Order

To break Sanket's tab pattern (`Operations` $\to$ `Alerts` $\to$ `Replay` $\to$ `Model` $\to$ `About`), GramMausam establishes a workflow tailored to agronomists and disaster response officials:

```
[Forecast]  ──>  [Evidence]  ──>  [Alerts]  ──>  [Past Events]  ──>  [Methodology]
(पूर्वानुमान)     (प्रमाण व सटीकता)   (चेतावनी)        (विगत घटनाएँ)      (पद्धति व स्रोत)
```

### Tab 1: Forecast (*पूर्वानुमान*)
- **Choropleth Map Canvas:**
  - Active Variable Switch: **Rainfall (mm)** | **Max/Min Temp (°C)** | **Humidity (%)** | **Wind (km/h)** | **$ET_0$ (mm/day)**.
  - Lead-Time Buttons: Day 1 through Day 10 with actual dates.
  - Granularity Toggle: **Coarse Block NWP (ECMWF 0.25°)** vs **Downscaled Gram Panchayat (LightGBM/CatBoost)**.
  - Pilot Drilldown: Quick-search and filter for Dhanbad's 10 Blocks (Topchanchi, Tundi, Baghmara, etc.) and 239 Gram Panchayats.
- **Side Inspector Panel:**
  - Selected Panchayat profile (Name, Block, LGD Code, Elevation from NASA SRTM 30m, Agricultural fraction from ESA WorldCover).
  - 5-variable weather forecast table with calibrated **80% Confidence Interval** ($p_{10}$ to $p_{90}$) from `/panchayats/{gp_code}/weather`.
  - **Agromet Action Directive:** Structured agricultural recommendations (**Action / Why / Timing**).
  - **Root-Zone Soil Moisture & Irrigation:** Parameters (Field Capacity, Wilting Point, MAD, Daily Depletion) fetched dynamically from `/panchayats/{gp_code}/water-balance`. Soil type (e.g. Deep Black Vertisol / Gangetic Loam) and crop growth stage (e.g. Paddy Panicle Initiation) explicitly attributed.

### Tab 2: Evidence (*प्रमाण व सटीकता*)
- **Baseline Ladder Table:**
  - Evaluated performance fetched from `GET /model/metrics` and `ml/results/baseline_comparison.csv`.
  - Compares:
    1. *Coarse Unadjusted NWP*
    2. *Spatial Bilinear Interpolation*
    3. *Physical Lapse Rate Correction*
    4. *Empirical Quantile Mapping (EQM)*
    5. *Ensemble Downscaled Model (LightGBM / CatBoost)*
  - Shows MAE, RMSE, Pearson $r$, and Skill Scores.
  - Honest disclosure note: highlights near-zero temperature errors resulting from static lapse rate physics rather than magical machine learning.
- **Station Validation:** In-situ verification metrics against physical IMD Automatic Weather Stations (AWS).
- **Observation Coverage:** Distance from each Gram Panchayat centroid to the nearest physical automated weather station.
- **Multi-Model Agreement:** Consensus score across coarse ECMWF IFS and GFS inputs.

### Tab 3: Alerts (*चेतावनी*)
- **Severity Classification:**
  - *Advisory* (Yellow: `#ca8a04`)
  - *Watch* (Amber: `#ea580c`)
  - *Warning* (Crimson: `#be123c`)
- **Historical Alert Verification:** Acknowledges past warnings. If verification telemetry is unmeasured in the backend, clearly displays `NOT YET MEASURED`.
- **Active Panchayat Alerts Table:** Filtering by block, severity, and hazard type.
- **Government CAP 1.2 Export:** One-click download of compliant **OASIS CAP 1.2 XML / JSON** alert files for integration with NDMA SACHET and IMD disaster networks (`/panchayats/{gp_code}/cap-alert.xml`).

### Tab 4: Past Events (*विगत घटनाएँ* — Renamed from Replay)
- **Archive-Backed Events Only:** Populated dynamically from `/replay/events` (reading `ml/results/predictions_test2024.parquet`).
  - *Monsoon Deep Depression & Deluge (Sept 14–17, 2024 — Dhanbad & Damodar Basin)*
  - *Intense Orographic Monsoon Surge (Aug 1–4, 2024 — Damodar Basin)*
  - *Active Monsoon Onset & Kharif Sowing Spell (July 2–5, 2024 — Topchanchi)*
- **Interactive Scrubber:** Play/pause, step-forward, and timeline inspection.
- **Dynamic Data-Driven Narration:** Narratives are constructed from actual numbers in the parquet archive, including explicit bust warnings (`WARNING: Precipitation error exceeded operational tolerance threshold`) when the model missed ground truth.

### Tab 5: Methodology (*पद्धति व स्रोत* — Renamed from About)
- **Scientific Pipeline:** ECMWF IFS 0.25° NWP $\to$ Spatial Intersection $\to$ NASA SRTM 30m DEM Elevation/Slope/Aspect $\to$ ESA WorldCover 10m fractions $\to$ LightGBM/CatBoost residual correction $\to$ FAO-56 Penman-Monteith agromet engine.
- **Boundary Provenance & Licences:** Complete documentation of Survey of India guidelines, MoPR LGD codes, and open boundary datasets.
- **Known Limitations & Edge Cases:** Convective cloudburst micro-prediction limits, radar shadowing in rugged terrain, and off-grid coverage gaps.

---

## 6. Real Stack & Input Architecture

| Component | Actual Technology in Repository | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI 3.0 (Python 3.11) with Uvicorn & PostGIS | REST API, spatial queries, caching |
| **ML Models** | LightGBM & CatBoost Gradient Boosting | Orographic and convective residual downscaling |
| **Coarse NWP Input** | ECMWF IFS Cycle 48r1 (0.25° ~27 km) via Open-Meteo | Boundary synoptic atmospheric forcing |
| **Terrain Features** | NASA SRTM v3 (30m 1 arc-second DEM) | Elevation, slope, aspect, terrain roughness (TRI) |
| **Surface Land Cover** | ESA WorldCover 10m v200 (Sentinel-1/2) | Agricultural, forest, water, and built-up fractions |
| **Crop Water Engine** | FAO Irrigation & Drainage Paper No. 56 | Penman-Monteith deterministic combination equation for $ET_0$ |
| **Disaster Protocol** | OASIS Common Alerting Protocol (CAP 1.2 XML) | NDMA SACHET / IMD national alert broadcast |
