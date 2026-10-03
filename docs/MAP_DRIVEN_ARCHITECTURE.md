# 07. Map-Driven, Gram-Panchayat-Keyed Architecture (Addendum to files 04 and 06)

**The rule:** the map is the control surface. Whatever you pick on it (a state, district, block or Gram Panchayat), every number, chart, alert, advisory and badge on screen changes to match. Every parameter is stored and served per Gram Panchayat (keyed by LGD code); anything above panchayat level is an aggregate of panchayat values and is labelled that way.

This addendum **extends** F1 (backend adapter) and **supersedes** the tile spec in F5 of file 06: tiles now carry geometry and the LGD id only; values arrive separately and are painted with feature-state, so the day slider and parameter switch need no new tile downloads.

**Setup:** copy this file into your repo as `docs/MAP_DRIVEN_ARCHITECTURE.md` (the prompts refer to that path).

I have not run any of this against your backend; the endpoint shapes are proposals for Antigravity to implement against your real tables.

---

## 1. One source of truth: the selection state

```ts
type Scope = { level: 'india' | 'state' | 'district' | 'block' | 'gp'; id: string | null };
type UiState = {
  scope: Scope;            // what is selected
  day: number;             // 1..10
  param: ParamId;          // what the map colours by
  mode: 'farmer' | 'officer';
  lang: 'en' | 'hi' | 'bn';
  pinned: string[];        // up to 2 LGD codes pinned for comparison
};
type ParamId = 'risk' | 'rain' | 'tmax' | 'tmin' | 'rh' | 'wind' | 'et0'
             | 'agreement' | 'coverage' | 'expected_error';
```

- The state lives in a Zustand store **and** the URL (`?scope=gp:<lgd>&day=3&param=rain&lang=hi&mode=farmer`), two-way synced. Loading a URL reproduces the exact screen.
- Nothing else keeps its own selection. Map, cascade selectors, search, ticker, rail, panels and tables all read and write this one store.
- Selecting through any route (map click, cascade, search box, "use my location", ticker item, worst-list row, alert row, deep link) calls the same `setScope()`.

## 2. Parameter registry (config/parameters.yaml, served at /api/ui/parameters)

One file defines every parameter so the API, legend, tooltip and chart agree.

```yaml
parameters:
  - { id: risk,           label: "Risk score",               unit: "0-100",     kind: banded,      palette: "risk tokens (calm/watch/alert)" }
  - { id: rain,           label: "Rainfall",                 unit: "mm/day",    kind: sequential,  palette: Blues,   domain: [0, 100], clamp: true }
  - { id: tmax,           label: "Max temperature",          unit: "C",         kind: sequential,  palette: Plasma }
  - { id: tmin,           label: "Min temperature",          unit: "C",         kind: sequential,  palette: Plasma }
  - { id: rh,             label: "Relative humidity",        unit: "%",         kind: sequential,  palette: YlGnBu,  domain: [0, 100] }
  - { id: wind,           label: "Wind speed",               unit: "m/s",       kind: sequential,  palette: Purples }
  - { id: et0,            label: "Reference ET (derived)",   unit: "mm/day",    kind: sequential,  palette: YlOrBr }
  - { id: agreement,      label: "Model agreement",          unit: "0-1",       kind: sequential,  palette: Greys }
  - { id: coverage,       label: "Verifiability",            unit: "class",     kind: categorical, classes: [WELL_VERIFIABLE, PARTIAL, POORLY] }
  - { id: expected_error, label: "Typical error",            unit: "per variable", kind: sequential, palette: Greys }
```

Rules: risk colours (calm/watch/alert) are used **only** for risk and alerts, never for plain weather values. Palettes must be colour-blind safe (use `d3-scale-chromatic`), every legend shows min, max and units, and a parameter with no data for a panchayat renders as the `--nodata` grey with a reason.

## 3. What each screen element does when the scope changes

| Element | scope = state / district / block | scope = gp |
|---|---|---|
| **Map** | Fits to the scope; polygons coloured by `param` for the selected `day`; neighbours stay visible | Zooms to the polygon, draws an ink outline, dims others slightly |
| **Cascade selectors, search, breadcrumb** | Show the path India > State > District > Block | Show the full path ending at the panchayat and its LGD code |
| **Hero gauge and chart** | Aggregate of the scope's panchayats (share in ALERT; mean risk by day with P10 to P90) | That panchayat's own risk by day |
| **KPI strip** | Mean risk, panchayats in ALERT, model agreement, peak panchayat | Risk today, peak day, rain next 24 h, expected error |
| **Ticker** | Highest-risk panchayats inside the scope | Neighbouring panchayats ranked by risk |
| **Day rail** | Share of the scope's panchayats in each band per day | This panchayat's band and value per day |
| **Right panel** | "Highest-risk panchayats . Day N" for the scope | Full GP detail: all parameters, intervals, charts, advisories, trust strip |
| **Alerts tab** | Filtered to the scope | Alerts affecting that panchayat |
| **Model tab** | Stations, skill and coverage inside the scope | Nearest station, distance, expected error here |
| **Replay tab** | Past events that affected the scope | Past events at that panchayat |
| **Footer and freshness** | Forecast issue time, model, tier for the scope | Same, plus boundary quality and served source |
| **URL** | `scope=district:<id>` | `scope=gp:<lgd>` |

Global controls that change **everything at once**: the **day** slider (Day 1 to 10, play/pause) and the **parameter** switch (recolours the map, the legend, the rail metric and the default chart tab).

## 4. Map behaviour

- **Hover:** tooltip shows the panchayat name, LGD code, the selected parameter's value with its 80% interval, band, and a "not available because ..." reason where relevant. Hover also highlights the matching row in the ticker or worst list.
- **Click:** selects the panchayat (`setScope`), opens the panel, updates the URL. Click on empty space steps the scope up one level.
- **Keyboard and screen readers:** arrow keys move between neighbouring panchayats, Enter selects, an `aria-live` region announces "Selected: <name>, <value>".
- **Pin to compare:** shift-click or a Pin button keeps up to two panchayats; the panel shows them side by side.
- **Layers popover:** satellite, roads, water, buildings, land use, POIs, coverage class, model agreement, low-confidence hatching, coarse-vs-downscaled compare slider (your existing nine toggles).
- **Use my location:** point query to the panchayat, then `setScope(gp)`.
- **Honest states:** non-validated regions are grey and unselectable for weather values (the panel explains why); tier B and C banners show on the map.

---

## 5. Backend additions (extend F1)

Every response is built from existing tables (`predictions`, `advisories`, `gis_features`, coverage, alerts); no new modelling.

```
GET /api/ui/parameters
 -> parameter registry above (labels in en, hi, bn; units; palettes; domains)

GET /api/ui/scope/summary?level=india|state|district|block|gp&id=...&day=N
 -> { scope:{level,id,name,path:[{level,id,name}]}, aggregate:true|false,
      n_gp, n_gp_scored,
      gauge:{share_alert, delta_vs_prev},
      risk_by_day:[{day, mean, p10, p90, band_shares:{calm,watch,alert}}],
      kpis:{mean_risk, n_alert, mean_agreement, peak_gp:{lgd,name,risk}},
      ticker:[{lgd,name,value,band}],           // top 40 inside scope
      worst:[{lgd,name,block,risk,band,dominant_variable}],   // top 20
      meta:{forecast_issued_at, source_model, model_version, tier, data_age_minutes} }
  For level=gp the same shape is returned with the panchayat's own values
  (aggregate:false).

GET /api/ui/params?scope=district:<id>&day=N&params=risk,rain,tmax,tmin,rh,wind,et0,agreement
 -> columnar and compact (gzip):
    { lgd:[...], values:{rain:[...], tmax:[...], ...},
      lower:{rain:[...], ...}, upper:{rain:[...], ...},
      band:[...], served_source:[...], low_conf:[...], boundary_quality:[...],
      coverage_class:[...], reason:{"<lgd>":"..."} /*only for nulls*/ ,
      units:{...}, domains:{...} }

GET /api/ui/gp/{lgd}
 -> everything for one panchayat across all ten days and all parameters:
    identity, path (state/district/block), badges, variables[...] (coarse,
    downscaled, lower, upper, observed, agreement, expected_error per day),
    risk_by_day, factors, advisories, nearest_station {id, km, truth_class},
    reports_count, meta.

GET /tiles/gp/{z}/{x}/{y}.pbf
 -> MVT with geometry and properties { lgd, name, block_id, district_id } only.
    Use promoteId = "lgd" so feature-state can be set from /api/ui/params.
GET /api/ui/scope/bounds?level=&id=  -> bbox for fitBounds
GET /api/ui/search?q=                -> across all levels incl. LGD code, returns
                                        { level, id, name, path, bbox }
```

Rules: panchayat is the unit of storage; aggregates are computed from panchayat values and always carry `aggregate:true` with `n_gp_scored`. Values that cannot be computed are `null` with a reason. Cache per (scope, day) and precompute in the nightly job so the free-tier server stays fast.

---

## 6. Prompts for Antigravity

Run after F1 to F4 of file 06. Paste the BRIEFING from file 06 first.

### M1. Parameter registry and per-GP data completeness

```
Create config/parameters.yaml (as specified in docs/MAP_DRIVEN_ARCHITECTURE.md)
and serve it at /api/ui/parameters. Audit that EVERY parameter exists per Gram
Panchayat per forecast day in our tables (rain, tmax, tmin, rh, wind, et0 with
lower/upper, risk score and band, agreement index, coverage class, expected
error, served_source, boundary_quality). Write docs/audit/PARAM_COVERAGE.md
listing, per parameter, the table/column, the fraction of GPs with data, and the
reason code for gaps. Do not fabricate: any gap stays null with a reason. If a
parameter is missing in the pipeline, add it to the nightly job rather than
computing it in the API. Add tests.
```
**DONE WHEN:** the coverage report exists and each missing value has a reason code.

### M2. Scope and params endpoints

```
Implement /api/ui/scope/summary, /api/ui/params, /api/ui/gp/{lgd},
/api/ui/scope/bounds and /api/ui/search as specified. Aggregates are computed
from GP values with aggregate:true and n_gp_scored. Add vector tiles that carry
only geometry plus lgd/name/block_id/district_id (promoteId lgd). Precompute
per (scope, day) aggregates in the nightly job and cache. Return gzip columnar
JSON for /api/ui/params. Tests with fixtures: a scope with all GPs scored, a
scope with partial data, and a non-validated region (everything null with
reasons). Verify that the sum of band shares equals 1 within scored GPs and that
a district aggregate equals the mean of its GP values in a test.
```

### M3. Store, URL sync and global controls

```
Create src/store/uiStore.ts (Zustand) with the UiState from
docs/MAP_DRIVEN_ARCHITECTURE.md and setScope(), setDay(), setParam(), pin(),
unpin(). Two-way sync with the URL (scope=gp:<lgd>&day=&param=&lang=&mode=),
history push on scope changes and replace on day/param changes. Replace every
local selection state in the existing components (map, rail, cascade, search,
ticker, worst list, alerts rows, model tab) with this store. Add a unit test per
route into setScope and a test that loading a URL reproduces the state.
```

### M4. Map layers, parameter switch and feature-state painting

```
In GpMap.tsx: load the vector tiles (promoteId lgd) and the columnar values from
/api/ui/params for the current scope, day and param, then paint with
setFeatureState (no tile reload when day or param changes). Colour using the
palette from /api/ui/parameters: risk uses the calm/watch/alert tokens, all
weather parameters use their sequential palettes; nodata = grey with a reason
tooltip. Add: a parameter switch (segmented control above the map in the
Sanket toolbar style), a legend that shows min, max and units, hover tooltip
with the value and 80% interval, ink outline for the selected GP, pin-to-compare,
keyboard navigation, aria-live announcement, fitBounds on scope change, the
nine existing layer toggles in a Layers popover. Day slider play/pause must
animate by changing feature-state only. Handle 5,000+ polygons smoothly
(measure and report frame rate). Component tests plus a Playwright check that
clicking a polygon updates the URL and the panel.
```

### M5. Linked panels

```
Wire every panel to scope/summary and gp endpoints using the table in
docs/MAP_DRIVEN_ARCHITECTURE.md (section 3): hero gauge and chart, KPI strip,
ticker, day rail, right panel (worst list or GP detail), alerts tab filter,
model tab scope, replay tab scope, footer/freshness. When scope.level == 'gp'
the same components show that panchayat's own values (aggregate:false) and the
labels change accordingly ("Aggregate of N panchayats" is shown only when
aggregate:true). The GP detail panel must show all parameters for all ten days
(tabs for each variable, intervals, observed where available, expected error,
agreement, advisories). Hover on the map highlights the matching ticker or list
row and vice versa. Show skeletons while loading and em dashes with reasons for
nulls. Add integration tests: select a GP and assert that hero, KPIs, rail,
panel, alerts, model and URL all reflect that GP; select a district and assert
labels say aggregate.
```

### M6. Acceptance run

```
Run this scripted check and report PASS/FAIL with evidence (screenshots or test
output):
1. Click a GP: map outline, breadcrumb, hero, KPIs, ticker, rail, panel,
   alerts filter, model tab, footer and URL all change to that GP.
2. Reload the URL: the identical screen returns.
3. Change the parameter to rain, tmax, rh, wind, et0: map colours and legend
   change; the value in the hover tooltip matches the number in the panel for the
   same GP and day.
4. Move the day slider: map, rail, hero marker, KPIs and the panel's day marker
   move together; no tile refetch occurs (network log).
5. Select a district: every label says aggregate and shows N panchayats scored.
6. Select a non-validated region: grey map, panel explains why, no invented
   numbers.
7. Search by panchayat name, by LGD code, by "use my location": all three end in
   the same selected state.
8. Pin two GPs: the panel compares them.
9. Every displayed number is traceable to /api/ui/params or /api/ui/gp.
10. 1,000+ polygons paint without dropped frames on a mid-range laptop and
    5,000+ remain usable; report measured numbers.
```

---

## 7. Why this design

- A single selection state is what makes "the map drives everything" true instead of looking true. Without it each component drifts out of sync.
- Panchayat-keyed storage means a number shown anywhere traces to one row; aggregates are derived, labelled, and never presented as forecasts for a district.
- Feature-state painting is what lets the day slider and parameter switch feel instant on a free-tier server.

## 8. Things to decide or check yourself

1. Whether you want 7 or fewer parameters in the first release; each extra one adds data to compute, store and verify.
2. Which regions are validated: everything else must stay grey.
3. Real panchayat counts per district: if a district has thousands of polygons, load per block instead and confirm the frame rate.
4. Hindi and Bengali labels for each parameter, reviewed by a native speaker.
