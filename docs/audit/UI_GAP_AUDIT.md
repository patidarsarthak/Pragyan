# UI Gap Audit & Implementation Blueprint
**Document:** `docs/audit/UI_GAP_AUDIT.md`  
**Reference Sources:** 3 Sanket live screenshots, 32s reference screen recording, cloned Sanket source, and `SIH26074_MASTER_PROJECT_SUMMARY.md`.  
**Target:** Implementation of the complete Sanket-style look-alike frontend on authentic SIH26074 backend, ML, and LGD Gram Panchayat data.

---

## 1. Executive Summary of Audit

| Step / Module | Status | Primary Files Involved | Scope of Work |
|---|---|---|---|
| **STEP 1. First Page (Opening Screen)** | **PARTIAL** | `Navbar.tsx`, `ForecastTab.tsx`, `HeroDivergence.tsx`, `KpiStrip.tsx`, `RiskTicker.tsx` | Build the full opening screen: kicker, huge Archivo headline with red wipe underline, data-driven subline, 2px blue note, 128px SVG gauge ring, right card with 2 tabs (`Risk by forecast day` & `Were we right?`), 4 KPI cards with coloured cap bars, red CTA pill, and bottom ticker band. Add issued/valid date pill and ALERT count pill to top bar. |
| **STEP 2. Operations: Map Behaviour** | **PARTIAL** | `IndiaChoroplethMap.tsx`, `GpMap.tsx`, `ForecastTab.tsx` | Integrate freshness strip, IMD thresholds legend note, "Worst panchayat \| Mean of panchayats" toggle, 2px ink bounding box on selected GP, animated state drill-down with "All India" back button, and MapLibre GP layer with feature-state painting. |
| **STEP 3. Day Rail (Center Column)** | **MISSING** | `DayRail.tsx` (new), `ForecastTab.tsx` | Create 10-row stacked bar rail showing day, calm/watch/alert share bar, mean %, dominant driver, active row 3px ink border, and data-driven note box. Sync globally with URL, top-bar pills, map, and panel. |
| **STEP 4. Right Panel (Panchayat Detail)** | **PARTIAL** | `PanchayatDetailPanel.tsx`, `RiskCurve.tsx`, `VariableChart.tsx` | Transform table into Sanket panel: peak risk pill, 6 horizontal gradient SHAP bars ("What drives this"), variable chips with black "driver" tag, Recharts curve with red panchayat-effect line, badges row, and ICAR advisory cards. When unselected, show top 20 worst panchayats list. |
| **STEP 5. Ten-Day Card Under Columns** | **MISSING** | `TenDayForecastCard.tsx` (new), `BaselineLadderCard.tsx` | Add full-width card with 5 synchronized sparkline charts (rain, temp, RH, wind, ET₀) with 80% CI, advisory timeline strip, "Show numbers" accessible table, and compact baseline ladder table ("NOT JUST DAY 10 IS WORSE THAN DAY 1"). |
| **STEP 6. Alerts Page** | **PARTIAL** | `AlertsTab.tsx` | Add 4 KPI stat cards, CSV download button, ALERT and WATCH filter buttons, search box, "One row per panchayat" toggle, and table with click-through navigation to Operations. |
| **STEP 7. Model Page** | **PARTIAL** | `EvidenceTab.tsx` | Add run ID header with LIVE tag, 4 KPI cards, thresholds table, per-variable skill chips, reliability curve, coverage distance analysis, and cost-loss slider (or honest unmeasured flag). |
| **STEP 8. Replay & About Pages** | **PARTIAL** | `PastEventsTab.tsx`, `MethodologyTab.tsx` | Add Play/Prev/Next day stepper, synchronized map recolouring, top 5 panchayats card, and observed vs forecast chart with "Close enough" tolerance marker. Rewrite About copy into clean cards. |
| **STEP 9. Backend Adapter Additions** | **PARTIAL** | `backend/ui_api.py` | Add `worst_gp` and `mean_agreement` to `/overview`, add `rail` and `pills` to `/scope/summary`, add `panchayat_effect` and `explanations` to `/gp/{lgd}`, add `/ten-day/{lgd}` endpoint, and enrich `/replay/{id}`. |
| **STEP 10. Verification & Tests** | **PARTIAL** | `tests/test_ui_api.py`, `frontend-next/src/test/` | Expand test suite to cover all new components, URL state transitions, and Playwright workflow checks. |

---

## 2. Detailed Gap Analysis by Step

### STEP 1. First Page (Opening Screen)

| Feature | Current State | Target State | Gap / Change Needed |
|---|---|---|---|
| **Top Bar Brand** | "GramMausam" with "ग" glyph | SVG glyph, Archivo wordmark, 1px vertical rule, subtitle: "Panchayat Weather Intelligence" | Update `Navbar.tsx` brand block. |
| **Top Bar Tabs** | Forecast, Evidence, Alerts, Past Events, Methodology | Operations, Alerts, Model, Replay "a real event", About | Rename tabs and route IDs in `Navbar.tsx`. |
| **Top Bar Pills** | Single watch vintage pill | Left: White pill with green dot: `ISSUED <d mon> . VALID <d mon> (DAY n)`. Right: Solid red pill: `<n> ALERT . DAY n` | Add dynamic pills fed from `/api/ui/scope/summary`. |
| **Mode & Lang Toggles** | Language toggle only | Farmer/Officer toggle button + Language switcher (en, hi, bn) left of pills | Add FarmerMode toggle and 3-language selector. |
| **Hero Kicker** | Missing | Short rule + mono caps `<REGION NAME> . <N> PANCHAYATS SCORED . CYCLE <date>` | Create `HeroSection.tsx` with mono kicker. |
| **Hero Headline** | Missing | Huge Archivo: *"Which panchayats need to act <em>today?</em>"* with red underline wipe animation | Add Archivo headline with `.sk-wipe` CSS animation. |
| **Hero Subline** | Missing | Data-driven sentence: *"Mean risk moves from X at Day 1 to Y at Day 10 across N scored panchayats in M districts."* | Compute dynamically from `/api/ui/hero` risk curve. |
| **Hero Note** | Missing | 2px solid blue left border note explaining what is averaged and what ALERT means | Add note box with link to thresholds. |
| **Hero Gauge** | Missing | 128px SVG ring gauge (Day 1 share in ALERT), caption `SHARE IN ALERT . DAY 1`, bold sentence, delta pill vs previous issue | Build SVG circle stroke-dasharray gauge component. |
| **Hero Right Card** | Missing | White card (r: 13px) with tabs `Risk by forecast day` (mean line + P10-P90 Area band) and `Were we right?` (calibration scatter + 4 skill tiles) | Implement Recharts ComposedChart and scatter tab. |
| **KPI Strip** | Missing | 4 cards with 30x4px coloured cap bars: Mean risk, Panchayats in ALERT, Model agreement, Peak risk | Build 4-card responsive grid with hover lift. |
| **CTA Pill** | Missing | Red pill "Replay a real heavy-rain event" + "THE PANCHAYAT MAP" with chevron scroll cue | Add CTA button with smooth scroll to `#operations`. |
| **Bottom Ticker** | Missing | Ink band pinned to bottom on laptops: top 40 highest-risk panchayats sliding at constant speed | Implement CSS ticker with touch fallback. |

---

### STEP 2. Operations: Map Behaviour

| Feature | Current State | Target State | Gap / Change Needed |
|---|---|---|---|
| **Freshness Strip** | Missing | `Forecast cycle <date> <hh>Z . ingested <age> ago` left; `tier A live / B cached / C block only` right | Add `FreshnessStrip.tsx` above operations grid. |
| **Legend Row** | Basic swatches | `RISK` chips (calm/watch/alert/no data) + note: *"Band edges follow the IMD thresholds in config/imd_thresholds.yaml, not chosen by hand."* | Update legend row to use exact tokens. |
| **Map Search & Toggle** | Search box exists | Search "Find any state, district or panchayat...", label "ALL INDIA . 36 STATES AND UTS", segmented toggle "Worst panchayat \| Mean of panchayats" | Connect segmented control to aggregation mode. |
| **State Hover & Click** | Hover tooltip exists | Tooltip: Name, worst panchayat %, worst GP name, N panchayats scored. Click: animated zoom into districts, back button "All India", label "<STATE> . <N> DISTRICTS" | Refine tooltip strings; ensure panel does not reset on state click. |
| **District Hover & Click** | District drill-down | Tooltip: District, state, worst GP %, mean risk %, driver, N panchayats scored. Click: load MapLibre GP vector layer, back button "<State>" | Swap SVG to MapLibre GP layer upon district click. |
| **GP Selection Marker** | Standard outline | 2px ink rectangular bounding box outline around selected GP + polygon fill | Add SVG/MapLibre bounding box ink rectangle. |
| **Parameter Switch** | Toolbar variable buttons | Risk, Rainfall, Tmax, Tmin, RH, Wind, ET0 segmented control; updates MapLibre feature-state without tile reload | Wire parameter switch to `setParam()` in store. |

---

### STEP 3. Day Rail (Center Column)

| Feature | Current State | Target State | Gap / Change Needed |
|---|---|---|---|
| **Rail Layout** | Horizontal buttons in toolbar | Dedicated vertical center column card (10 rows for 1440px+ screens; collapses on mobile) | Create `DayRail.tsx`. |
| **Row Structure** | Just day numbers | Day label, stacked calm/watch/alert 10px bar, mean % on right, sub-line `<n> alert . <n> watch . <dominant variable>` | Render stacked bar per day from `/api/ui/scope/summary`. |
| **Active Row Styling** | Active button color | 3px ink solid left border + background tint | Apply CSS `.is-active-rail-row`. |
| **Rail Notes & Summary** | None | Caption explaining band distribution + data-driven note box: *"The main cause changes N times across the ten days."* | Compute dominant variable shifts across 10 days. |
| **Global Synchronization** | Updates local state | Clicking a day sets URL `day=N`, updates top-bar pills, recolours map, and shifts curves | Connect rail click to `setDay()` in unified store. |

---

### STEP 4. Right Panel (Panchayat Detail)

| Feature | Current State | Target State | Gap / Change Needed |
|---|---|---|---|
| **Header** | Basic titles | `<GP>, <District>` with `<Block> · LGD <code> · cycle <date>`, Copy link, close button | Structure header with LGD code and copy button. |
| **Peak Risk Section** | None | `PEAK RISK <value>%` with band pill, *"at forecast day n"*, *"Mostly driven by: <variable>"* | Add peak risk summary block with 1px divider rule. |
| **Topographic Drivers (SHAP)** | None | "WHAT DRIVES THIS PANCHAYAT": one bold sentence + 6 horizontal bars (red-orange gradient) with numeric values | Render horizontal gradient bars from `/explanation`. |
| **Leading Driver & Variable Chips** | Variable buttons | "LEADING DRIVER: <VARIABLE>" with sentence; variable chips with black "driver" badge on dominant variable | Implement driver chip styling and variable switching. |
| **Recharts Curve** | Simple table | 10-day curve: coarse/block (#a9b6d6), downscaled (#2b4eff with dots), 80% CI area band, observed (dashed ink), and red **Panchayat Effect** line | Replace table with Recharts ComposedChart. |
| **Badges & Advisories** | Basic advisory box | Badges row (boundary quality, served source, truth class, low confidence, agreement) + ICAR advisory cards with Listen button | Render structured advisory cards with severity tags. |
| **Default Unselected State** | Empty or placeholder | "Highest-risk panchayats · Day n" list (top 20 worst panchayats, click selects) | Render worst list when `scope.level !== 'gp'`. |

---

### STEP 5. Ten-Day Card Under Columns

| Feature | Current State | Target State | Gap / Change Needed |
|---|---|---|---|
| **Full-Width Card** | Missing | Card titled "TEN-DAY FORECAST · <GP>" below the 3-column operations grid | Create `TenDayForecastCard.tsx`. |
| **5 Synchronized Sparklines** | None | Responsive grid of 5 charts: Rainfall (bars + whiskers + coarse line), Temp (max/min band), RH, Wind, ET₀ | Implement synchronized Recharts grid. |
| **Advisory Timeline Strip** | None | Horizontal strip with daily agronomic icons (irrigate, no spray, drain, heat care) + Likely/Uncertain chips | Add 10-day horizontal icon strip. |
| **Accessible Table Toggle** | None | "Show numbers" toggle button rendering accessible HTML table | Add accessible table view toggle. |
| **Compact Baseline Ladder** | None | Compact card: "NOT JUST 'DAY 10 IS WORSE THAN DAY 1'" with 5 baseline rows, our row highlighted in pale blue, link to Model tab | Create `CompactBaselineCard.tsx`. |

---

### STEP 6. Alerts Page

| Feature | Current State | Target State | Gap / Change Needed |
|---|---|---|---|
| **Header & Description** | Generic title | Title "Alerts", description *"Every panchayat above the watch level in the current run, worst first."* | Update page header copy. |
| **Stat Cards** | Single card | 4 stat cards with coloured cap bars: Panchayats in alert, Panchayats in watch, Peak risk score, Most common cause | Add 4-card KPI summary strip. |
| **Controls & Filters** | Minimal filters | Download CSV button, ALERT and WATCH filter chips, search box, state/district dropdown, "One row per panchayat" toggle | Add CSV export trigger and filter controls. |
| **Alerts Table** | Basic rows | Columns: PANCHAYAT, LEAD, VALID DATE, RISK, BAND pill, MAIN CAUSE. Row click navigates to Operations | Wire row click to `setScope({ level: 'gp', id: lgd })`. |

---

### STEP 7. Model Page

| Feature | Current State | Target State | Gap / Change Needed |
|---|---|---|---|
| **Header** | Generic header | Model run ID, trained timestamp, and a pulsing green `LIVE` pill | Add run metadata header. |
| **KPI Strip** | None | 4 KPI cards: MAE vs block (+30.2%), Bias (-0.12 mm), Interval coverage (82.4%), Stations used (55) | Add KPI cards. |
| **Cards Structure** | 2 tables | Cards: Training data; "What counts as an alert" (thresholds); "Error per variable"; "Every baseline compared"; Reliability curve; Weaknesses; Coverage | Restructure into modular cards. |
| **Cost-Loss Slider** | None | Interactive slider for early action cost vs damage avoided | Implement cost-loss calculator with honest unmeasured fallback. |

---

### STEP 8. Replay & About Pages

| Feature | Current State | Target State | Gap / Change Needed |
|---|---|---|---|
| **Replay Controls** | Basic select | Event picker, result box, Play/Prev/Next stepper, Day 1..10 buttons | Build interactive playback bar. |
| **Replay Synchronized Map** | None | Map recoloured dynamically per day step | Link replay stepper to map feature-state. |
| **Replay Outcome Charts** | None | Forecast vs observed with vertical peak line and "Close enough" tolerance marker | Add Recharts comparison with tolerance band. |
| **About Page Cards** | Text sections | Structured cards: Question we answer, How well it works, What it does not do, How it runs, Data & attribution | Rewrite About page with modular cards. |

---

### STEP 9. Backend Adapter Additions (`backend/ui_api.py`)

| Endpoint | Missing Fields / Requirements | Action |
|---|---|---|
| `GET /api/ui/overview?day=N` | Add `worst_gp {lgd, name, risk}` and `mean_agreement` per district | Enrich district aggregates with worst GP object. |
| `GET /api/ui/scope/summary` | Add `rail: [{day, n_calm, n_watch, n_alert, mean_risk, dominant_variable}]`, `rail_note`, and `pills: {issued_at, valid_date, day, n_alert}` | Add 10-day rail breakdown and top-bar pills data. |
| `GET /api/ui/gp/{lgd}` | Add `panchayat_effect` (downscaled minus block) per variable per day, and `explanations: [{label, value}]` | Add delta line series and normalized feature weights. |
| `GET /api/ui/ten-day/{lgd}` | Add dedicated compact 10-day table endpoint for 5 variables | Implement endpoint returning columnar 10-day points. |
| `GET /api/ui/model` | Add thresholds table, per-variable skill table, and cost-loss evaluation | Add thresholds from YAML and cost-loss matrix. |
| `GET /api/ui/replay/{id}` | Add per-day map values (columnar), top 5, average risk, and per-panchayat forecast vs observed | Enrich replay step details. |

---

## 3. Audit of Hard-Coded Metrics & Over-Coverage Disclosures

### A. Hard-Coded Metrics in Current Code
1. `frontend-next/src/components/ForecastTab.tsx`:
   - Line 194: Fallback elevation `524m` when API value is missing. Must be replaced with em dash `"–"` plus `"Elevation unavailable"`.
   - Line 156-160: Hand-coded legend risk thresholds (`<20%`, `20%–40%`, `>40%`). Must be dynamically read from `config/imd_thresholds.yaml` via `/api/ui/parameters` (`<25%`, `25%–54.9%`, `≥55%`).
2. `frontend-next/src/components/EvidenceTab.tsx`:
   - Line 57: Hard-coded string `"Held-Out Spatial Holdout Partition (Topchanchi & Tundi Blocks, 15,372 records, 2024)"` left over from Dhanbad pilot. Must be dynamically fetched from `/api/ui/model`.

### B. Places That Could Imply Whole-State Coverage (When Only 603 Panchayats Are Scored)
Madhya Pradesh contains **23,043 Gram Panchayats** across 55 districts. Our active operational downscaling database currently contains **603 Gram Panchayats**. Every screen element must honestly state this sample scope:

1. **Top Bar & Opening Screen Kicker:**
   - *Current wording:* "Madhya Pradesh Pilot Operational".
   - *Required correction:* **"MADHYA PRADESH PILOT · 603 GRAM PANCHAYATS SCORED ACROSS 55 DISTRICTS · CYCLE 2026-10-03"**.
2. **National Choropleth Map District Tooltips (`IndiaChoroplethMap.tsx`):**
   - *Current wording:* "Click to drill down into 55 MP Districts & Gram Panchayats".
   - *Required correction:* **"Aggregate of N scored Gram Panchayats (Pilot sample; 603 total in MP)"**.
3. **Operations Status Notice:**
   - *Current wording:* "ML Downscaling Operational for Madhya Pradesh".
   - *Required correction:* **"Operational ML Pilot: 603 Gram Panchayats across 55 Districts. Phase 2 expansion to remaining 22,440 panchayats scheduled."**
4. **Hero Gauge Sentence:**
   - Must explicitly say: **"X of 603 scored panchayats reach the alert band on at least one day"**, never "X of all panchayats".

---

## 4. Verification & Testing Strategy (STEP 10)

1. **Vitest Unit & Component Tests:**
   - Expand from 16 to 30+ tests covering: `Navbar` pills, `HeroSection` calculations, `DayRail` clicks, `PanchayatDetailPanel` driver chips, and `TenDayForecastCard` rendering.
2. **Backend Pytest Tests:**
   - Expand `tests/test_ui_api.py` to assert new fields: `worst_gp`, `mean_agreement`, `rail`, `pills`, `panchayat_effect`, and `cost_loss`.
3. **Automated Verification Script (`test_sanket_flow.py`):**
   - Verify every step of the user journey:
     1. Load `/` $\rightarrow$ Hero, KPIs, pills, and ticker match API.
     2. Click CTA $\rightarrow$ Smooth scroll to `#operations`.
     3. Hover & Click State $\rightarrow$ Map fits bounds, "All India" back button appears.
     4. Click District $\rightarrow$ MapLibre vector layer loads.
     5. Click Panchayat $\rightarrow$ URL syncs `?scope=gp:133203`, 2px ink bounding box renders, detail panel loads 10-day curves.
     6. Click Day 10 on Rail $\rightarrow$ URL gets `day=10`, top pills update to `DAY 10`, map recolours.
     7. Toggle Parameter Switch $\rightarrow$ Map recolours without tile refetch.
     8. Alerts, Model, Replay, and About render cleanly with zero console errors.

---

## 5. Checkpoint & Approval Request

> **HALT FOR USER APPROVAL:**  
> This gap audit document has been committed to `docs/audit/UI_GAP_AUDIT.md`.  
> Per Prompt 08 Step 0 (*"Wait for my approval before STEP 1"*), please review the identified gaps and provide approval to proceed with implementing **STEP 1 through STEP 10**.
