# Smart Panchayat Climate & Geospatial Intelligence Platform (SIH26074)
## Phase 6: Frontend GIS Dashboard

A responsive, high-performance GIS dashboard for Dhanbad District, Jharkhand, delivering hyper-local 1–10 day downscaled weather forecasts and ICAR/IMD agro-climatic advisories across all 239 Gram Panchayats.

---

## 1. Visual & Design Architecture

Per design guidelines, the dashboard is styled with a **clean, modern white theme** (`#ffffff` canvas, `#f8fafc` subtle background tints, `#0f172a` high-contrast typography, and refined border-radius + box shadows). It offers an intuitive, low-cognitive-load experience tailored for district agriculture officers, block development officers, and field extension workers.

```
+----------------------------------------------------------------------------------------------------+
|  [Logo] Smart Panchayat Climate & Geospatial Intelligence  |  [Live API: 239 GPs]  [Run: 2026-09-25] |
+----------------------------------------------------------------------------------------------------+
|  KPI: Dist. Avg Rain  |  Max Temperature  |  High Risk Panchayats  |  Avg Confidence  |  Lead Time |
+----------------------------------------------------------------------------------------------------+
|  CONTROLS: [Date: 2026-09-25] [Layer: Rainfall Risk] [Crop: Paddy] [Block: All] [Search Panchayat] |
+------------------------------------------------------------------+---------------------------------+
|                                                                  |  PANEL: Chhatabad (GP: 110023)  |
|                                                                  |  Block: Baghmara                |
|                    INTERACTIVE LEAFLET MAP                       +---------------------------------+
|                                                                  |  DOWN-SCALED 5-VARIABLE CARDS:  |
|            - CartoDB Positron Base Layer (Light)                 |  * Rainfall: 14.8 mm [11 - 18]  |
|            - 239 Panchayat Centroid Markers                      |  * Temperature: 31.4 C          |
|            - Dynamic Thematic Choropleth Fill                    |  * Relative Humidity: 82.5%     |
|            - Hover Tooltip with GP and Metric                    |  * Wind Speed: 14.2 km/h        |
|            - Click-to-Focus and Detail Fetch                     |  * Evapotranspiration: 3.8 mm   |
|                                                                  +---------------------------------+
|   [ Legend: No Rain / Light / Moderate / Heavy / Very Heavy ]    |  10-DAY RAINFALL SPARKLINE      |
|                                                                  +---------------------------------+
|                                                                  |  AGRO-ADVISORY (ICAR / IMD)     |
|                                                                  |  Stage: Tillering               |
|                                                                  |  * Water Balance: Skip irrigate |
|                                                                  |  * Heat/Blast: High humidity    |
+------------------------------------------------------------------+---------------------------------+
```

---

## 2. Key Features

### A. Thematic Map Visualization (All 239 Panchayats)
- **Base Map:** CartoDB Positron high-resolution light tile layer.
- **Layers Supported:**
  1. `rainfall_risk` (Default): Categorized per IMD rainfall classification (No Rain / Trace, Light, Moderate, Heavy, Very Heavy).
  2. `rainfall_mm`: Continuous gradient from light sky blue to deep indigo.
  3. `temp_c`: Continuous temperature gradient (green $\to$ amber $\to$ crimson).
  4. `confidence`: Visual representation of model certainty (85% to 99%).
- **Interactive Controls:**
  - Auto-fit bounds on district initialization (`map.fitBounds`).
  - Smooth zoom-to-panchayat on selection.
  - Hover tooltip with name, block, value, and confidence rating.

### B. Controls & Filtering
- **Lead-Time Date Selector:** Fetches dynamic available forecast dates from `/forecast/district-summary` (Day 1 through Day 10).
- **Thematic Layer Selector:** Instant switch between risk categories and raw physical variables without reloading.
- **Crop Context Selector:** Select between Paddy, Maize, Mustard, or Vegetables; dynamically refreshes the ICAR/IMD agro-advisories for the selected panchayat.
- **Block Filter:** Filters the 239 panchayats by administrative block (Baghmara, Baliapur, Dhanbad, Govindpur, Jharia, Nirsa, Topchanchi, Tundi, Purbi Tundi, Egarkund).
- **Typeahead Search:** Instant autocomplete search to locate any panchayat by name or GPCODE.

### C. Detail Drawer & Multi-Variable Inspection
- **5 Physical Variables:**
  - Rainfall (`mm`) with lower/upper uncertainty intervals.
  - 2m Temperature (`°C`) with uncertainty envelope.
  - Relative Humidity (`%`).
  - 10m Wind Speed (`km/h`).
  - Reference Evapotranspiration (`mm/day`).
- **Confidence Rating:** Color-coded pill reflecting bootstrap ensemble spread.
- **10-Day Trend Sparkline:** Mini bar chart showing daily rainfall distribution over the full forecast horizon.
- **Actionable Agro-Advisory:** Direct rendering of ICAR/IMD rule evaluations:
  - Irrigation advice (Water Balance: Rainfall vs. ET).
  - Pest/disease warning (Blast, blight risk based on temp + humidity index).
  - Spray/wind advice (Safe chemical application threshold < 15 km/h).
  - Official citations (ICAR-CRURRS, KVK Dhanbad, IMD AAS Bulletin).

---

## 3. End-to-End API Consumption

The dashboard **directly consumes the live FastAPI service** running on port 8000:

| UI Component | Backend Endpoint | Query Params | Functionality |
| :--- | :--- | :--- | :--- |
| Map Geography | `GET /panchayats` | — | Loads 239 panchayat coordinates, names, and blocks. |
| Thematic Coloring & KPIs | `GET /forecast/district-summary` | `date=YYYY-MM-DD` | Returns aggregate metrics and per-GP risk categories. |
| Detail Weather Cards | `GET /forecast/{gpcode}` | `date=YYYY-MM-DD` | Returns 5 downscaled values with uncertainty envelopes. |
| 10-Day Sparkline | `GET /forecast/{gpcode}` | — | Returns full multi-day forecast time-series. |
| Advisory Drawer | `GET /advisory/{gpcode}` | `date=YYYY-MM-DD&crop=...` | Returns ICAR-backed advisory rules, urgency, and citations. |

---

## 4. How to Run Locally

### Option 1: Via Backend Static Mount (Recommended)
The FastAPI server automatically serves the frontend at `/dashboard/`:

1. Start the FastAPI backend:
   ```bash
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```
2. Open your browser:
   ```
   http://127.0.0.1:8000/dashboard/
   ```

### Option 2: Standalone Local HTTP Server
If running frontend separately:
```bash
cd frontend
python -m http.server 3000
```
Open `http://127.0.0.1:3000`. The frontend automatically detects port 3000 and routes all API requests to `http://127.0.0.1:8000`.

---

## 5. Acceptance Test Verification

- [x] **239 Panchayats Rendered:** Verified via Leaflet circle markers with exact geographic coordinates.
- [x] **Dynamic Coloring:** Markers color-coded based on `/forecast/district-summary` data for the active date.
- [x] **Real API Integration:** Zero mock data; all numbers come from Phase 3 Parquet forecast stores and Phase 4 advisory rules.
- [x] **Click-Through:** Clicking any marker or search item immediately loads the detail drawer and renders 5 variables + advisory text.
- [x] **White Clean UI:** Strictly adheres to light-mode surface design with responsive layout.
