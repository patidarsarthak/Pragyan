# SCOPE AUDIT REPORT: Reproductions, Line References, and Root Causes

**Date:** 2026-10-04  
**Context:** Specification audit per `docs/SCOPE_AND_MAP_SPEC.md` (Step S0).  
**Status:** Audit Complete — Waiting for User Approval before executing Step S1.

---

## Executive Summary & Database Inventory

A live database audit of `backend/sih26074_panchayat.db` reveals:
- **Total Panchayats in DB:** 1,489
- **State Breakdown in `panchayats`:**
  - **Madhya Pradesh:** **603 panchayats** across 55 districts.
  - **Jharkhand:** **255 panchayats** (including **239 in Dhanbad** + 16 across 4 other districts).
  - **Other States/UTs:** 631 seed/placeholder panchayats (e.g., UP: 35, Rajasthan: 30, Delhi: 28, etc.).
- **Scored Panchayats in `predictions`:**
  - **Madhya Pradesh:** **603** (3,015 prediction rows = 603 × 5 weather variables).
  - **Jharkhand:** **239** (1,195 prediction rows = 239 in Dhanbad × 5 variables).
  - **Other:** 29 (Delhi: 8, Rajasthan: 10, UP: 11).
  - **Total Scored:** 871.
- **The "603" count:** The 603 scored panchayats are **100% Madhya Pradesh**. However, queries and UI components frequently leaked Dhanbad's 239 records or treated 603 as a global constant for sub-scopes (e.g. Panna).

---

## 1. Default or Fallback Panchayat Selection

### Issue & Evidence
The right panel and Replay view get stuck on Dhanbad panchayats (such as Nandpur LGD #111957 or Topchanchi LGD #111945), even when the map is viewing Madhya Pradesh (e.g. Panna or Damoh).

### Exact Files and Lines
1. `frontend/src/components/PastEventsTab.tsx:42-43`:
   ```tsx
   const [selectedGpCode, setSelectedGpCode] = useState<number>(111945); // Sanwer default
   const [selectedGpName, setSelectedGpName] = useState<string>("Sanwer");
   ```
   **Root Cause:** Code comment claims `111945` is Sanwer, but LGD #111945 is actually `TOPCHANCHI`, Dhanbad, Jharkhand.
2. `frontend/src/components/PastEventsTab.tsx:676`:
   ```tsx
   { rank: 8, gp_code: 111957, name: "Hatod", district: "Indore", risk_score: 41, band: "watch" as const, driver: "Wind speed" },
   ```
   **Root Cause:** LGD #111957 is `NANDPUR`, Tundi block, Dhanbad, Jharkhand, but was hardcoded here with the name "Hatod, Indore".
3. `frontend/src/components/ForecastTab.tsx:50`:
   ```tsx
   const [selectedGpCode, setSelectedGpCode] = useState<number | null>(133203); // Sanwer default
   ```
   **Root Cause:** On initial load, a default panchayat is pre-selected. When the user navigates map scope (e.g., clicking on Damoh or Panna), `handleNavigateScope` updates `breadcrumbs` but **never resets `selectedGpCode`** (`frontend/src/components/ForecastTab.tsx:158-160`). Consequently, the right panel remains stuck on the previously selected or default panchayat instead of displaying the active scope summary.
4. `frontend/src/api/client.ts:89-90`:
   ```ts
   { state_code: 20, state_name: "Jharkhand", state_type: "State", is_pilot: true, centroid_lat: 23.61, centroid_lon: 85.27 },
   { state_code: 23, state_name: "Madhya Pradesh", state_type: "State", is_pilot: false, ... }
   ```
   **Root Cause:** Fallback state definitions mark Jharkhand as `is_pilot: true` and Dhanbad (`336`) as `pilot_district_code`.

---

## 2. Endpoints Missing a Scope Filter

### Issue & Evidence
Endpoints query globally or filter inadequately, returning out-of-scope records or mixing Dhanbad into MP lists.

### Exact Files and Lines
1. **`/api/ui/worst` (`backend/ui_api.py:650-670`)**:
   ```python
   @router.get("/worst")
   def get_ui_worst(
       day: int = Query(1, ge=1, le=10),
       scope: str = Query("state", description="Scope: state or district"),
       id: Optional[str] = Query("IN-MP", description="Identifier of the scope"),
       limit: int = Query(20, ge=1, le=50)
   ):
       ...
       query = session.query(Panchayat)
       if scope == "district" and id:
           ...
       else:
           query = query.filter(Panchayat.state_code == 23)
   ```
   - **Frontend call (`frontend/src/api/client.ts:508`)**:
     `fetchWithTimeout(`${BASE_URL}/api/ui/worst?day=${day}&limit=${limit}`)`
     Calls `/api/ui/worst` **without** `scope` or `id` parameters.
   - When called at district level, `scope` is omitted, causing `/api/ui/worst` to return state-wide items rather than filtering by district.
2. **`/api/ui/scope/summary` (`backend/ui_api.py:1218-1240`)**:
   ```python
   if level == "gp":
       lgd = int(id) if id and id.isdigit() else 133203
       p = session.query(Panchayat).filter(Panchayat.gp_code == lgd).first()
       if not p:
           p = session.query(Panchayat).first()
   ```
   If an invalid ID is provided, it falls back to `session.query(Panchayat).first()`, which is row 1: `BAGDAHA`, Baghmara, Dhanbad, Jharkhand (`gp_code: 111722`).
3. **`/api/ui/alerts` (`backend/ui_api.py:703-725`)**:
   Filters only on `Panchayat.state_code == 23`, but does not support block-level filtering.
4. **Hero & Status Bar**:
   The frontend `HeroSection` (`frontend/src/components/dashboard/HeroSection.tsx:49`) and `ForecastTab` (`frontend/src/components/ForecastTab.tsx:108`) fetch global hero/overview, not the scoped summary for the active map view.

---

## 3. Counts: Why "20 of 603" Appears for Panna & Composition of 603

### Issue & Evidence
In the screenshot for Panna district, the status bar displays `"20 of 603 scored panchayats in Panna"`. Panna is a single district with only 10 pilot panchayats. It cannot contain all 603 pilot panchayats.

### Exact Files and Lines
1. `frontend/src/components/ForecastTab.tsx:401-403`:
   ```tsx
   <MapStatusBar
     breadcrumbs={breadcrumbs}
     onBreadcrumbClick={handleBreadcrumbClick}
     activeLevelName={currentScope.name}
     scoredCount={603}
     totalCount={23043}
   ```
   **Root Cause:** `scoredCount={603}` and `totalCount={23043}` are **hard-coded props** passed directly to `MapStatusBar` regardless of whether `currentScope` is India, MP, Damoh, or Panna!
2. `frontend/src/components/map/MapStatusBar.tsx:59-65`:
   ```tsx
   `Day ${leadDay} has the highest alert share in ${activeLevelName}: ${alertCount} of ${scoredCount} scored panchayats...`
   ```
   Since `activeLevelName` is "Panna" and `scoredCount` is 603, the status bar produces: *"Day 1 has the highest alert share in Panna: 20 of 603 scored panchayats"*.
3. **Database Composition of 603:**
   - In `backend/sih26074_panchayat.db`:
     `SELECT count(*) FROM panchayats WHERE state_name='Madhya Pradesh'` = **603**.
     `SELECT count(*) FROM panchayats WHERE state_name='Madhya Pradesh' AND district_name='Panna'` = **10**.
     `SELECT count(*) FROM panchayats WHERE state_name='Madhya Pradesh' AND district_name='Damoh'` = **12**.
     `SELECT count(*) FROM panchayats WHERE state_name='Madhya Pradesh' AND district_name='Indore'` = **17**.
   - Dhanbad's count is **239** (under state `Jharkhand`).
   - The 603 represents the entire Madhya Pradesh pilot across 55 districts. Under Panna, the scoped counts must be computed inside Panna: `n scored in Panna (10) of N total in Panna (e.g. 395 LGD total)`.

---

## 4. Hard-Coded Values and Explanatory Sentences

### Issue & Evidence
Identical numbers appear for different panchayats; fixed physical explanations are presented as factual observations.

### Exact Files and Lines
1. **Hard-coded weather chips (`frontend/src/components/detail/PanchayatDetailPanel.tsx:284-287`)**:
   ```tsx
   <span className="sk-var-chip">{t("varTempMax", lang)} 31.4°C</span>
   <span className="sk-var-chip">{t("varHumidity", lang)} 84%</span>
   <span className="sk-var-chip">{t("varWind", lang)} 14 km/h</span>
   <span className="sk-var-chip">{t("varET0", lang)} 3.8 mm</span>
   ```
   **Root Cause:** Completely hardcoded static numbers `31.4°C`, `84%`, `14 km/h`, `3.8 mm`. These are displayed for Nandpur, Sanwer, and any selected panchayat.
2. **Hard-coded driver explanation sentence (`frontend/src/components/detail/PanchayatDetailPanel.tsx:253-254`)**:
   ```tsx
   {gpData.explanation_sentence ||
     "Steep 4.2° orographic slope amplifies rainfall runoff by +28% compared to the regional plain."}
   ```
   Fallback is a fixed sentence fabricating physical terrain effects.
3. **Hard-coded SHAP driver bars (`frontend/src/components/detail/PanchayatDetailPanel.tsx:152-159`)**:
   ```tsx
   const shapFactors = gpData.explanations || [
     { feature: "Heavy Precipitation", weight: 0.38, impact: "+28% vs plain", direction: "up" },
     { feature: "Orographic Slope (4.2°)", weight: 0.24, impact: "+16% runoff", direction: "up" },
     ...
   ];
   ```
4. **Hard-coded 10-day rail values and note (`frontend/src/components/dashboard/DayRail.tsx:31-45`)**:
   ```tsx
   const rows: DayRailRow[] = railData || [
     { day: 1, label: `${t("statusDay", lang)} 1`, calmShare: 0.65, watchShare: 0.21, alertShare: 0.14, meanRisk: 18.5, dominantVar: "Rain" },
     { day: 2, label: `${t("statusDay", lang)} 2`, calmShare: 0.58, watchShare: 0.24, alertShare: 0.18, meanRisk: 24.0, dominantVar: "Rain" },
     ...
   ];
   const noteText = note || t("railNote", lang);
   ```
   In `frontend/src/lib/i18n.ts:181-185`:
   `railNote`: `"Day 4 shows the highest alert concentration (46% mean risk) driven by active convective rainbands over Central MP."`
   This fixed sentence and the static numbers (19, 24, 38, 47, 41, 32, 28, 25, 23, 20) never changed when navigating from MP to Panna.
5. **Forbidden Strings**:
   - `"LGD Cadastral Code"` (`frontend/src/components/detail/PanchayatDetailPanel.tsx:197`).
   - `"1km Grid"` and `"{columnarParams?.n_scored || 60} Cadastral Cells Evaluated"` (`frontend/src/components/PastEventsTab.tsx:627, 632`).
   - `"convective under-prediction (+40mm gap)"` (`ml/src/build_replay_events.py:202`, `ml/results/replay_events.json:847, 1447`).

---

## 5. Null Handling Painting Missing Values as "Watch"

### Issue & Evidence
Missing values in Replay cards display the word "risk" without a number, but with an orange background and dot (Watch status).

### Exact Files and Lines
1. `frontend/src/components/PastEventsTab.tsx:685-686, 710-712`:
   ```tsx
   const bandColor = p.band === "alert" ? THEME.alert : p.band === "watch" ? THEME.watch : THEME.calm;
   const bandBg = p.band === "alert" ? THEME.alertWash : p.band === "watch" ? THEME.watchWash : THEME.calmWash;
   ...
   <span style={{ fontSize: "11px", fontWeight: 700, color: bandColor, marginTop: "2px" }}>
     {p.risk_score} <span style={{ fontSize: "9px", fontWeight: 400 }}>risk</span>
   </span>
   ```
   **Root Cause:**
   - If `p.risk_score` is `null` or `undefined`, `{p.risk_score}` renders nothing (producing `" risk"`).
   - If `p.band` is not `"alert"`, it checks `p.band === "watch"` or falls back to calm; in fallback card data (`frontend/src/components/PastEventsTab.tsx:674-677`), cards are created with `band: "watch" as const` even without valid values.
   - Missing data must be rendered with `THEME.nodata` (grey), an em dash `—`, and an honest reason, never painted orange.

---

## 6. Band Thresholds Defined in More Than One Place

### Issue & Evidence
Operations and Replay define conflicting cuts and format scores inconsistently:
- Operations shows: `Calm (<25%) Watch (25-55%) ALERT (>55%)` (includes `%` sign).
- Replay shows: `Calm (<25) Watch (25-54) ALERT (>=55)`.

### Exact Files and Lines
1. `config/imd_thresholds.yaml:8-29`:
   - `calm`: 0.0 to 24.9
   - `watch`: 25.0 to 54.9
   - `alert`: 55.0 to 100.0
2. `frontend/src/lib/i18n.ts:173-175`:
   ```ts
   legendCalm: { en: "Calm / High (>80%) / Favorable", ... },
   legendWatch: { en: "Watch / Moderate (60–80%)", ... },
   legendAlert: { en: "Alert / Severe (<60%) / Stress", ... },
   ```
   **Root Cause:** Inverted definitions and percentage symbols. Risk scores are indices from 0 to 100, not probabilities or percentages.
3. `frontend/src/components/PastEventsTab.tsx:603-605`:
   Hardcoded legend string `"Calm (<25) Watch (25-54) ALERT (>=55)"`.
4. `backend/ui_api.py:146-157`:
   Custom threshold checks (`>= 55.0` for alert, `>= 25.0` for watch).

---

## 7. Replay Events Construction & 2024 Dhanbad Holdout Data

### Issue & Evidence
Replay events use dates in August 2024 (`valid 2024-08-01`) and refer to Baghmara and Topchanchi (Dhanbad, Jharkhand).

### Exact Files and Lines
1. `ml/src/build_replay_events.py:15-35, 107, 202`:
   ```python
   def generate_replay_events():
       # Event 1: Monsoon Deep Depression (Dhanbad August 2024)
       # Event 2: Local Convective Storm (Baghmara August 2024)
   ```
   **Root Cause:** The replay events script was written for the original Dhanbad test set from August 2024.
2. `ml/results/replay_events.json:1-1500`:
   All 3 serialized replay events are centered on Dhanbad blocks (`Topchanchi`, `Baghmara`, `Govindpur`, `Nirsa`).
3. Replay events must be regenerated for **Madhya Pradesh out-of-sample events**, as issued, and must include an honest miss.

---

## 8. Click and Drill-down Handling

### Issue & Evidence
Double-clicks fire twice or skip levels; clicks sometimes fail to trigger drill-downs.

### Exact Files and Lines
1. `frontend/src/components/map/IndiaChoroplethMap.tsx:518, 551`:
   - Click handlers are attached to SVG `<path>` elements without `e.stopPropagation()`.
   - No input lock is maintained during camera transition/rendering.
   - Browser double-click (`dblclick`) is not suppressed, triggering rapid consecutive state dispatches before re-rendering completes.
2. `frontend/src/components/ForecastTab.tsx:45-48`:
   - Initial breadcrumb starts at Madhya Pradesh (`IN-MP`) instead of India (`IN`), preventing the user from viewing the India-first map on first load.
3. Navigation back via `Esc` or browser `popstate` was not wired to step up one administrative level.

---

## 9. Madhya Pradesh Validation Status

### Issue & Evidence
The Model tab displays 55 evaluated stations and high validation scores, but the database reveals that MP has no independent ground weather stations.

### Exact Files and Lines
1. Database Query:
   ```sql
   SELECT DISTINCT source FROM weather_observations;
   -- Output: 'IMD AWS Dhanbad / UCSB CHIRPS v2.0' (50 rows)
   SELECT DISTINCT region_id FROM terrain_skills;
   -- Output: 'dhanbad_jharkhand'
   ```
2. `backend/ui_api.py:836`:
   `"evaluated_stations": 55`
   **Root Cause:** Carried-over numbers. Madhya Pradesh currently has **0 independent stations in the database**.
   MP operations represent an **out-of-region transfer** from the Dhanbad development baseline.
3. As required by the specification, the Model view must honestly disclose:
   - Status: `PILOT EVALUATION TIER (Out-of-Region Transfer)`.
   - Independent MP Stations: `0 (Pending IMD MP AWS integration)`.
   - Baselines must not carry over Dhanbad station metrics as if they were recorded in MP.

---

## Summary of Planned Actions for Step S1 – Step S7

1. **Step S1 (Region Registry):** Create `config/regions.yaml`. Set `IN-MP` to `ml_active: true` (`PILOT_EVALUATION`). Set `IN-JH` / Dhanbad to `visible: false` (`DEVELOPMENT_ARCHIVE`). Filter all API queries by active regions.
2. **Step S2 (Data Contract & Null Handling):** Centralize thresholds in `config/imd_thresholds.yaml` (Calm <25, Watch 25 to <55, Alert >=55). Remove hardcoded chips (31.4, 84, 14, 3.8). Render missing data as grey with `—`. Generate template narrations strictly from API fields.
3. **Step S3 (India-First Map):** Start at `ALL INDIA · 1 OF 36 STATES WITH ML`. MP is colored; all other states are pale grey with tooltip `"Not covered in this pilot"`. Single-click drill chain: India $\rightarrow$ MP $\rightarrow$ District $\rightarrow$ Block $\rightarrow$ GP. Prevent double-click zoom.
4. **Step S4 (Scope Synchronization):** Wire panel, hero, rail, status bar, and worst-list to `/api/ui/scope/summary` for the active scope. No default panchayat on load.
5. **Step S5 (Replay on the Map):** Replace the static card grid in Replay with the real map component recolored per day. Regenerate MP replay events with an honest miss.
6. **Step S6 (New Features F1–F8):** System Health & Data Quality (F7), "How unusual is this?" meter (F3), Drought/Dry-spell layer (F4), Public API docs & widget (F6), Command Centre (F2), Low-bandwidth mode (F8).
7. **Step S7 (Automated Verification):** Playwright & Vitest test suite testing all 12 criteria and reporting in `docs/audit/SCOPE_REPORT.md`.
