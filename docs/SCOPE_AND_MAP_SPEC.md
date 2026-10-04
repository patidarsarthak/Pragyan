# 13. Fix the Scope Problems, India-First Map, Replay on a Map, Why Dhanbad Keeps Appearing, New Project Features, and the Master Prompt

**Setup:** copy this file into your repo as `docs/SCOPE_AND_MAP_SPEC.md` (the prompt refers to that path).

Based on your three new screenshots (Replay page, Operations page with Panna selected, Day 9 card) and files 07 to 12. I have **not** seen your code. Everything below about causes is a diagnosis from the screenshots; section 2 tells you how to confirm it.

---

## 1. What your screenshots show (bugs and risks, with evidence)

| # | Evidence in the screenshots | Problem | Fix |
|---|---|---|---|
| 1 | Map and breadcrumb say **Madhya Pradesh > Damoh > Panna**, but the right panel shows **NANDPUR, Jharkhand / Dhanbad / Tundi** | The right side is not following the map; a Dhanbad panchayat is stuck as the default selection | Panel must show the map's scope. No default panchayat. If nothing is selected, show the scope summary |
| 2 | Status bar: "20 of 603 scored panchayats in **Panna**" | 603 is the pilot total, not Panna's count. A district cannot contain all 603 | Counts must be computed inside the selected scope (`n scored in Panna of N total in Panna`) |
| 3 | Rail values (19, 24, 38, 47, 41, 32, 28, 25, 23, 20), "Scored across 603 Panchayats" and the note "Day 4 ... 46% mean risk ... convective rainbands over Central MP" are **identical to your previous screenshot**, where the scope was different | The rail does not change with the map, and the note is a fixed sentence | Rail and note come from `/api/ui/scope/summary` for the current scope; note built by template from fields |
| 4 | Chips "Max Temp 31.4C, RH 84%, Wind 14 km/h, ET0 3.8 mm" are **the same numbers as the Sanwer panel earlier**, now shown for Nandpur | These are hard-coded or placeholder values, not data | Read from the panchayat's forecast for the selected day; show em dash if missing |
| 5 | Driver bars are still all identical full-width bars. Text says "windward orographic enhancement over Tundi block" and "intense convective precipitation" | Placeholder bars and a fixed physical explanation presented as fact | Real contribution values with human labels, or "Not computed". Remove any cause not stated by a field |
| 6 | Replay cards for Dhanbad panchayats show the word "risk" with **no number**, but they are coloured orange (watch) | A missing value is being painted as "watch". That is invented data | Missing = grey, em dash and a reason |
| 7 | Replay shows **name cards, "1km Grid" and "60 Cadastral Cells Evaluated"**, with 5 Dhanbad cards and 7 Indore cards | Not a map; grid cells named like panchayats breaks your own rule (panchayat polygons, not grid IDs); "cadastral" is the wrong term | Replay uses the map component with real polygons. Remove "1km Grid" and "Cadastral" |
| 8 | Day 9 text: "risk score in Baghmara **rises from 37 to 37**; convective under-prediction (+40mm gap)" | Not a rise; "under-prediction gap" is Sanket-style forecast-error language that your product does not compute | Narration only from fields: biggest mover must have prev < curr; no "gap" wording unless a field supplies it |
| 9 | "94 alert, 206 watch" next to "60 cells evaluated" | Counts do not add up to the cells shown | One counting function for the map, card and list |
| 10 | Legends: "Calm (<25) Watch (25-54) ALERT (>=55)" on Replay but "Calm (<25%) Watch (25-55%) ALERT (>55%)" on Operations | Two definitions of the same bands, and a % sign on a score | One config, one legend component, no % sign |
| 11 | Replay date "valid 2024-08-01" | 2024 is the holdout year in your handoff (and Dhanbad's 2024 test data), so this replay is probably built from the old Dhanbad test set, not MP out-of-sample events | See section 2; replay events must be MP, out of sample, as issued |
| 12 | "LGD Cadastral Code" label again | "Cadastral" is wrong | "LGD code" |
| 13 | Map: only MP is drawn and the user has to be inside MP to see anything | You asked for the whole of India first | Section 3 |
| 14 | Status bar warning "Block outlines not available (603-panchayat pilot sample)" | Honest, good | Keep the message; add the list fallback for blocks |
| 15 | New "Crop Advisory Layers" tab and "Crop Advisory" button | Good addition | Keep; follow file 10 guardrails |

---

## 2. Why Dhanbad shows up all the time

**What I can tell from the screenshots:** the Dhanbad panchayat is the default panel selection; the Day 9 top-5 list is all Dhanbad; the replay mixes Dhanbad and Indore cards; and the replay date is in 2024, your holdout year. Your handoff says Dhanbad (239 panchayats in 10 blocks) was the original pilot and Madhya Pradesh the expansion, and **603 - 239 = 364**, so the "603 scored" may be Dhanbad's 239 plus about 364 in Madhya Pradesh (my arithmetic, a hypothesis to check).

**Likely causes (check each):**
1. **A hard-coded default panchayat** in the store, the URL default or a fallback (the first row of the table, or a stored LGD code like 111957).
2. **Scope filters missing** in the endpoints, so "worst" and "top-5" queries run over all 603 panchayats, including Dhanbad's.
3. **Ties or ordering:** if risk scores tie or are missing, the sort falls back to insertion order, and Dhanbad was inserted first.
4. **Dhanbad has the fullest data**, because the model, the 2024 test set and the replay were built there first, so its panchayats dominate "highest risk" lists.
5. **Replay events built from the old Dhanbad test data** (the 2024 date points to this).
6. **Missing values painted as "watch"**, which makes Dhanbad cards (no number) look like risk.

**How to confirm in ten minutes (adjust names to your schema):**
```
-- how many scored panchayats per state/district?
SELECT s.name state, COUNT(*) FROM predictions p
JOIN panchayats g ON g.id=p.panchayat_id JOIN blocks b ON b.id=g.block_id
JOIN districts d ON d.id=b.district_id JOIN states s ON s.id=d.state_id
GROUP BY s.name;
```
Search the code for the default selection: `grep -rn "111957\|Nandpur\|dhanbad\|DHANBAD\|defaultGp\|DEFAULT_GP" backend frontend-next/src`. Call `/api/ui/worst?day=9` and look at the `state` field of the first ten rows.

### The decision you asked for: ML only for Madhya Pradesh
Do it through a region registry (step S1 below): MP is `ml_active`, everything else is not, and Dhanbad becomes a hidden development archive (kept for tests and history, excluded from every public query).

**Honesty caveat:** if the model and its validation were developed on Dhanbad, MP results are an **out-of-region transfer** until MP has its own station validation (file 04, P3 and P9). Keep the label "PILOT EVALUATION TIER" and show MP's own validation numbers (stations in MP, skill versus block baseline, coverage) on the Model tab. If MP has no independent stations yet, say so; do not carry Dhanbad numbers over.

---

## 3. Map behaviour you asked for

1. **Full India first.** All states and UTs drawn from the official outline (use your Survey of India based data; do not use Sanket's files). Madhya Pradesh is the only `ML_ACTIVE` area, coloured by risk band. Every other state is pale grey. Legend chip: **"Outside ML coverage (not modelled)"**. Hover tooltip on a grey state: "Not covered in this pilot. No forecasts are produced here." No numbers anywhere for grey areas. The map label reads `ALL INDIA . 1 OF 36 STATES WITH ML`.
2. **Drill chain:** India > Madhya Pradesh > District > Block > Gram Panchayat. Clicking a grey state opens a small info card, not a data view.
3. **One click, one level.** A single click drills exactly one level. The first click must not merely "select" and need a second click; the second click must not drill again. Technical rules: disable map double-click zoom, ignore `dblclick`, attach the click handler to one layer only (not a path and its parent group), and lock input until the camera animation ends.
   *My reading of your sentence "double click on the single area does not come twice" is that clicks currently need two attempts or fire twice. Tell me if you meant something else.*
4. **Districts open blocks; blocks open panchayats.** If block polygons do not exist, show the block list and the message "Block outline not available", then draw the panchayats that have polygons. Never invent block shapes.
5. **Gram Panchayat map, area-wise.** Panchayat polygons filled by the selected parameter (risk, rain, etc.). Panchayats without scores are drawn as outlined, unfilled "Not scored" areas when polygons exist.
6. **Replay shows the map**, not name cards. Same component, same drill chain, recoloured per replay day.
7. **Right side follows the map** at every level (file 07, section 3 matrix). At India level the panel shows MP's coverage and validation status, not a panchayat.

---

## 4. New project features (not chat)

All can be built with free tools and your own data. "Not found" means I did not find it in the government or rival material I read.

| ID | Feature | What it does | Novelty | Free? |
|---|---|---|---|---|
| F1 | **Region registry and ML coverage layer** | `regions.yaml` decides what is modelled; the map, API, search and tests obey it | Engineering integrity; supports USP-5 | Yes |
| F2 | **Season Command Centre** (block/district officers) | One page: this week's risk calendar, alerts by day, panchayats by crop stage (cohorts), approvals pending, top-risk list, **one-click weekly PDF brief** | Government gives forecasts; I did not find a combined officer brief | Yes |
| F3 | **"How unusual is this?" meter** | Percentile of the forecast rainfall or temperature against that panchayat's own 40 years of climatology (CHIRPS from 1981) | Not found at panchayat level | Yes (CHIRPS is free) |
| F4 | **Drought and dry-spell layer** | SPI, current dry-spell length and soil-water depletion as map layers | IMD publishes drought indices at coarser scale; panchayat layer not found | Yes |
| F5 | **Time Machine** | Pick any past date inside your archive; see what the system said versus what happened for any panchayat, including misses | Generalises Replay; not found | Yes, grows over time |
| F6 | **Public API, embeddable widget, open downloads** | OpenAPI docs, a web component for panchayat portals, CSV/GeoJSON/Parquet downloads with a data card (licence, provenance) | Matches the "use as a service" idea; no rival found with embeddable widgets | Yes |
| F7 | **System Health and Data Quality page** | Ingest freshness, gaps per panchayat, ledger verification, weekly residual drift, model card and limitations per region | Not found | Yes |
| F8 | **Accessibility and low-bandwidth mode** | Text-only light mode under about 200 KB, high contrast, large text, full keyboard use, screen-reader labels, Hindi | Parity-plus | Yes |
| F9 | **Compare mode** | Pin two panchayats or one against its block value or two dates | Parity-plus | Yes |
| F10 | **Role views** | Farmer / Secretary / Block officer / District officer / Researcher presets of the same components | Parity-plus | Yes |
| F11 | **Scenario slider** | Low / likely / high rainfall (from the ensemble quantiles) and how risk and advice change | Not found | Yes |
| F12 | **Alert policy editor with backtest** | Officers adjust thresholds and see what would have fired last season, with an audit trail | Not found | Yes |

**Priority:** F1 (must), F7, F3, F4, F6, F2, F8; then F5, F9 to F12. Skip anything that needs reporters, paid SMS/WhatsApp or official permissions (see my previous message).

---

## 5. THE MASTER PROMPT FOR ANTIGRAVITY (paste once, Planning mode)

```
ROLE AND CONTEXT
Work in frontend-next/ and backend/. Read PROJECT_CONTEXT.md, AGENTS.md rules,
docs/SANKET_LOOKALIKE_DESIGN_SPEC.md, docs/MAP_DRIVEN_ARCHITECTURE.md and the
prior drill-down and replay specs. A read-only MIT reference (Sanket) is at
../reference/sanket; keep MIT notices and ATTRIBUTION.md. Do not rebuild what works.

RULES
- The Gram Panchayat (LGD code) is the data unit; higher levels are labelled
  aggregates ("x of y scored").
- No fabricated data and no hard-coded numbers or explanatory sentences. A missing
  value is grey with an em dash and a reason. Never colour a missing value.
- Every number and every sentence on screen comes from the API; narration uses
  templates over API fields and never names a cause that no field supplies.
- Modelled area = regions with ml_active true in regions.yaml. Anything else is
  "Outside ML coverage" and has no numbers.
- No "bust"/Sanket branding or copy; "LGD code", never "cadastral"; no "1km grid"
  claim; scores are 0-100 without a % sign.
- Tests pass; small commits.

STEP S0. REPRODUCE AND AUDIT (stop for approval)
Write docs/audit/SCOPE_AUDIT.md reproducing each issue with file and line:
1. Default or fallback panchayat selection (Nandpur/111957 or any Dhanbad record).
2. Endpoints missing a scope filter (worst, top5, hero, rail, status bar, alerts).
3. Counts: why "20 of 603" appears for Panna; how 603 is composed (list scored
   panchayats per state, district, block; confirm whether 239 are Dhanbad).
4. Hard-coded values and sentences: chips 31.4/84/14/3.8, rail values and note,
   driver bars, peak-risk and "what drives" text, replay narration, "1km Grid",
   "Cadastral".
5. Null handling that paints missing values as watch.
6. Band thresholds defined in more than one place.
7. How the replay events are built, their dates, whether they use the 2024
   holdout/Dhanbad data, and whether forecasts are as issued.
8. Click handling: why one click does not drill or fires twice (duplicate
   handlers, dblclick zoom, state update before animation end).
9. What MP-only validation exists (stations in MP, skill vs block baseline).
Wait for approval.

STEP S1. REGION REGISTRY AND ISOLATION
Create regions.yaml (id, name, level, ml_active, status, bbox, model_version) with
Madhya Pradesh ml_active true (status PILOT_EVALUATION) and Jharkhand/Dhanbad as
DEVELOPMENT_ARCHIVE with visible false. Make every API, search, tile, replay and
aggregate query take the scope and filter by registry. Add coverage_class
(ML_ACTIVE / OUTSIDE_COVERAGE) to /api/ui/children, /search and /params. Move the
Dhanbad data out of public queries but keep it for tests and history. Tests:
no Dhanbad panchayat appears under any MP scope; counts per scope add up; no
default panchayat exists; outside-coverage scopes return null with the reason
"Outside ML coverage".
If MP lacks independent station validation, make the Model tab say so and show
only MP's own numbers.

STEP S2. REMOVE FIXED VALUES AND FIX THE DATA CONTRACT
Delete every hard-coded chip value, sentence and constant found in S0. Single band
definition in config/imd_thresholds.yaml (calm <25, watch 25 to <55, alert >=55)
served by /api/ui/parameters and used by every legend and colour function. Null
handling: grey, em dash, reason. Narration templates (server-side, with returned
field values) for the status bar, the rail note, the peak-risk box, the Day card
and the replay sentence; the "biggest mover" must satisfy prev < curr, otherwise
the sentence is omitted. Real driver contributions with human labels or "Not
computed". Chips show the selected day's value with its 80% range on hover.

STEP S3. INDIA-FIRST MAP AND DRILL-DOWN
Implement section 3 of docs/SCOPE_AND_MAP_SPEC.md (this document): all
states drawn, only ml_active areas coloured and clickable for data; grey states
with the tooltip "Not covered in this pilot" and an info card on click; label "ALL
INDIA . 1 OF 36 STATES WITH ML"; drill India > MP > district > block > panchayat
with one click per level; disable double-click zoom; one click handler per layer;
input lock during camera animation; Esc and browser Back go up one level;
block fallback list with "Block outline not available"; panchayat polygons filled
by parameter, unscored ones as outlined "Not scored". Use our own Survey-of-India
based outlines, not Sanket's files.

STEP S4. RIGHT SIDE FOLLOWS THE MAP
Wire hero, KPI strip, ticker, rail, rail note, status bar and panel to
/api/ui/scope/summary for the current scope. At India: MP coverage and
validation status. At state/district/block: aggregate with n scored of N total in
that scope, top-20 list within the scope. At panchayat: full detail. Build a test
harness that, for scopes [India, MP, Damoh, Panna, a block, a panchayat], asserts
every displayed number and sentence equals the API for that scope, and that
changing scope changes the rail values.

STEP S5. REPLAY ON THE MAP
Replace the name-card grid with the map component in replay mode (same drill
chain, MP only), recoloured per day; Day card, top-5 and charts as in file 11.
Remove "1km Grid" and "Cadastral". Rebuild events from MP, out of sample, as
issued, using ml/src/build_replay_events.py; include at least one miss. If no valid
MP event exists, show an honest empty state.

STEP S6. NEW FEATURES (in this order; each with API, UI, tests, docs)
F7 System Health and Data Quality page: ingest freshness, per-panchayat gaps,
  ledger status, weekly residual drift, model card with limitations per region.
F3 "How unusual is this?" meter: percentile vs the panchayat's CHIRPS climatology
  (state period used, sample size shown).
F4 Drought/dry-spell layer: SPI, dry-spell length, soil-water depletion as
  parameters on the map.
F6 Public API docs, an embeddable web component for a panchayat widget, and open
  downloads (CSV/GeoJSON/Parquet) with a data card (licence, provenance,
  boundary quality). Rate limits and CORS.
F2 Season Command Centre for block/district scope with a weekly PDF brief.
F8 Light mode (text-only, small payload), high contrast, large text, keyboard and
  screen-reader checks.
Optional if time: F5 Time Machine, F9 Compare mode, F10 Role views, F11 Scenario
slider, F12 Alert policy editor with backtest.
No feature may need paid services, official permissions, or real reporters; mock
anything that does and label it.

STEP S7. TESTS AND REPORT
Playwright/vitest, PASS/FAIL with evidence:
1. First load: full India map; MP coloured; other states grey with the tooltip;
   label "1 OF 36 STATES WITH ML".
2. No panchayat selected on first load; panel shows MP summary and validation.
3. Click MP: one click goes to districts. Click a district: blocks (or the block
   list fallback). Click a block: panchayat map. Each takes exactly one click.
4. Rapid double-click does not skip a level or fire twice.
5. Selecting Panna: status bar says "x scored of N in Panna" with correct counts;
   rail values differ from MP values; the note changes; the panel shows a Panna
   summary, not a Jharkhand panchayat.
6. Selecting a panchayat: chips, chart, drivers and sentences match the API.
7. No Dhanbad/Jharkhand record appears anywhere in public UI or API outputs.
8. A panchayat without a score is grey with an em dash and a reason.
9. Legends and colours use one band definition; no % on scores.
10. Replay shows the map; Day card counts equal map counts; the biggest mover
    sentence is correct or absent; includes a miss when one exists.
11. Source search finds no hard-coded values or forbidden strings (bust, Sanket,
    Cadastral, 1km Grid, 31.4, "convective rainbands over Central MP").
12. Health page, unusualness meter, drought layer, API docs/widget, command
    centre and light mode work with real data.
Report PASS/FAIL, fix FAILs, and write docs/audit/SCOPE_REPORT.md.
```

---

## 6. Things you must decide or check yourself

1. **Run the three checks in section 2** (state counts, default selection, `/api/ui/worst`) and send me the output if you want a firmer diagnosis.
2. **Is there MP validation?** Count independent stations in Madhya Pradesh and compute skill against the block baseline there. If none, your MP claims are a transfer from Dhanbad.
3. **What is the 603?** Confirm how many scored panchayats are Dhanbad's and how many are MP's.
4. **Block polygons:** do you have them? If not, keep the list fallback.
5. **National outline:** use your Survey of India based data and document the source.
6. **What "double click" meant:** tell me if my reading in section 3 is wrong.
7. Keep Dhanbad only as an archived development region unless you decide to present it as a second, separately validated pilot.
