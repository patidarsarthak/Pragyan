# 14. Three Winning Features: Research, Explanation, Demo, and the Master Prompt

Prepared 4 October 2026 for SIH26074. This builds on files 03, 04, 10, 12 and 13.

**What "does not exist" means here.** I checked three bodies of material: (1) the government systems in Report 1, (2) the 18 rival repositories in Report 2 (seven read in full, the rest from snippets), and (3) the extra searches in this session. "Not found" means I searched and did not see it. I cannot prove a negative, and teams with private code may have built something similar.

---

## 1. How SIH judges, and why these three

The official-style idea criteria published for SIH list novelty, complexity, clarity, feasibility, practicability, sustainability, scale of impact, user experience, and potential for future work. Secondary 2026 guides say judges prefer working prototypes to slides and weigh problem understanding, technical implementation, innovation and feasibility (these weightings come from blog posts, not an official source). The finale is a 36-hour build and pitch.

The problem statement asks you to turn block-level forecasts into panchayat-level advice. A winning feature should therefore answer three questions a judge will ask:

1. **So what?** Does a panchayat-level forecast change what a farmer does?
2. **Can we trust it?** How do you know it is right, and can anyone check?
3. **Where does it fail?** Where should nobody rely on it?

| # | Feature | Answers | One line |
|---|---|---|---|
| **1** | **Decision Cards + Downscaling Value Meter** | So what? | Shows where the panchayat forecast changes the farmer's action compared with the block forecast, with a personal cost setting, and later whether it was right |
| **2** | **Trust Ledger + Report Card** | Can we trust it? | A tamper-evident forecast archive and a public, honest scorecard per panchayat and per advice rule |
| **3** | **Verifiability Map + Expected Error** | Where does it fail? | Shows how far each panchayat is from real observations and how large the error is likely to be there |

Together: **Decide, Prove, Limit.**

---

## 2. Research findings that shaped the choices

| Finding | Source (open it yourself) | Consequence |
|---|---|---|
| The government already measures agromet advisory benefit through **programme-level surveys** (NCAER studies; field studies reporting 10 to 34% higher profit for advisory users) and verifies forecasts at district or agro-sub-division level with skill scores | NCAER report on rsmcnewdelhi.imd.gov.in/uploads/survey/NCAER2010.pdf; IMD AAS overview at safoam.org.in; Telangana, Karnataka and Andhra Pradesh studies | Impact is known **in aggregate and after the fact**. I found no per-panchayat, per-advice-rule scoreboard |
| IMD's own overview reports that **local-level** forecasts showed incremental benefits of up to 13% over district-based advisories | safoam.org.in AAS overview | The premise "finer forecasts help" has government support, but nobody shows **which decisions change** |
| **ForecastAdvisor** (ForecastWatch, USA) publishes provider accuracy by city (temperature within 3 F; precipitation correct), for 2,200+ locations | forecastadvisor.com | Public location-level accuracy exists commercially for cities. I did **not** find it at panchayat level in India, or tied to farm advice |
| The **cost-loss model** (Murphy 1977) says a user should act when the event probability exceeds their cost-to-loss ratio; University of Chicago's monsoon-forecast design work notes that farmers have different action thresholds, so one fixed threshold is not optimal for all | Cost-loss model (Wikipedia, standard references), arXiv 2603.07893 | Personal thresholds are science-backed. I found them in research, not in any Indian government or rival product |
| A June 2025 Mongabay report quotes farmers saying services are one-way, with little scope to report local anomalies | india.mongabay.com | Supports using observations and feedback |
| Citizen rain-gauge networks abroad (CoCoRaHS, WOW) stress timely validation, feedback and peer support to retain volunteers; a Nepal citizen-science study found gauges outperforming CHIRPS in data-poor mountains | NSF, Newcastle thesis, Springer | Informs the future reporter layer (not needed for these three features) |
| Rivals compare against the block baseline (FieldCast, GramSevak, Gram Mausam, Uddip07) but report **weather-variable** errors | Report 2 | They show that the panchayat forecast differs, not that **the farmer's decision** differs |

---

## 3. Feature 1: Decision Cards + Downscaling Value Meter

### What it is
For each panchayat, crop and day, the system runs the advice rules twice: once with the **block value** (the problem statement's input) and once with the **panchayat value** (your output). It shows:

- The action (Act / Wait / Hedge), its probability, and the reason.
- **Whether the block-level forecast would have given a different action**, and why (rainfall 40% lower, one degree warmer, and so on).
- A **personal cost setting**: "How costly is it to act?" (Cheap / Medium / Expensive; officers get a numeric slider). The recommendation changes live because the rule is: act if the event probability exceeds the cost-to-loss ratio.
- A district and block **Value Meter**: "In Indore, the panchayat forecast changes the advice for 18% of panchayat-days; in 7% of days the change is robust (the probability differs by 10 points or more)."
- Later, when observations exist: of the days where the two disagreed, how often the panchayat-based action matched what actually happened, with a confidence interval.

### Why it should win
- It is the direct answer to the problem statement's "why downscale?". Judges see value in decisions, not in RMSE.
- A live slider is a strong demo moment and easy for non-experts to understand.
- Fully buildable with free data and your own code.

### What exists (evidence)
- Government: forecasts and crop-stage advisories (KALP) exist; I found no display of block-versus-panchayat advice differences.
- Rivals: baseline comparisons of weather variables; FieldCast has a fixed three-level advice scale. I found no personal cost setting and no decision-difference metric.
- Outside: the cost-loss method is standard in forecast-value research.

### Risks and honesty rules
- Differences may be noise if the panchayat adjustment is smaller than the forecast uncertainty. Report **robust** differences separately, and say so.
- The cost ratios are **assumptions** (default 0.1 / 0.3 / 0.6 is a suggestion to review, not a fact). Label them as assumptions everywhere.
- Rules need cited sources and expert sign-off (file 10).
- Verification of "which was right" needs observations; until then, show only the difference rate.

### Judge questions and answers
- *"Is the difference just noise?"* We show a robust-difference rate and, with data, a confidence interval on which version matched outcomes.
- *"Where do the cost numbers come from?"* Farmer-chosen or officer-set; defaults are labelled assumptions.
- *"Why not just use the block forecast?"* Here are the panchayat-days where it would have changed the advice, and the verified record.

### Falsifier
If differences are rare or the panchayat version is no better when verified, report it. The framework remains a valid evaluation tool, and that result is itself useful to IMD.

---

## 4. Feature 2: Trust Ledger + Report Card

### What it is
- **Ledger:** every daily forecast run is archived and chained by hash (each entry includes the hash of the previous entry, the data manifest, the model version and the code commit). A public page lists entries, and a script anyone can run recomputes the chain. Public git commit times give an outside time anchor.
- **Report Card (web and weekly message):** for each panchayat and block, over a stated period: warnings issued, outcomes (hit, miss, false alarm), rule-level hit rates, amount error for rain, temperature error, and comparison with the block baseline and, where logged, the official Mausamgram forecast. It shows sample sizes, includes misses, and says **"not enough data yet"** below a minimum count instead of printing a percentage.
- **Labels:** every number is tagged HINDCAST (computed on past data with archived forecasts) or LIVE (prospective, from the ledger). They are never merged.

### Why it should win
- Accountability is what separates a trustworthy service from a dashboard. It also pre-empts the question that sinks most weather projects: "how do you know it works?"
- It improves with time: a prospective record that others cannot copy overnight.
- It is cheap to demo: a page and a verification command.

### What exists (evidence)
- Government: forecast verification at district or sub-division level exists, and programme-level impact surveys exist. I found no public per-panchayat scoreboard or tamper-evident archive.
- Rivals: retrospective evidence pages and validation tables (FieldCast, GramVarsha, AgroMet, GramSevak). I found no prospective ledger and no report card sent to users.
- Outside: ForecastAdvisor shows city-level provider accuracy for non-agricultural use.

### Risks and honesty rules
- A hash chain proves order and integrity, not truth, and it does not prove the time by itself. Say so, and publish the repository.
- The prospective record starts when you start. Begin the daily archive immediately.
- Truth data are sparse. State the truth source and class (station, satellite, reanalysis) next to every score.
- Never cherry-pick events; include the worst weeks.

### Judge questions and answers
- *"Could you have edited the forecasts afterwards?"* Run the verification script; the chain and public commits show otherwise.
- *"Why are some numbers missing?"* Minimum-sample rule; we do not report percentages we cannot support.
- *"Is this just ForecastAdvisor?"* That site compares weather providers for cities; this ties accountability to panchayat-level advice for farmers.

### Falsifier
If the model loses to the block baseline in some places, the card says so. That is the point.

---

## 5. Feature 3: Verifiability Map + Expected Error

### What it is
- A map layer showing, for every panchayat, the **distance to the nearest real observation** (weather station, rain gauge) and a class: Well verifiable, Partial, Poorly verifiable.
- A fitted curve from leave-one-station-out testing: **how forecast error grows with distance and elevation difference from the nearest station**. Each panchayat gets an **"expected error here"** (for example, "typical rain error about x mm, range a to b") shown beside the forecast and in the tooltip.
- If the relationship is not significant, the system says so ("no distance effect detected in the tested range").

### Why it should win
- It tells judges exactly where the system is weak, which most teams hide. Every rival admits panchayat-scale truth does not exist; this feature turns that admission into a measured, mapped result.
- A visually striking layer: a map of trust.
- Scientific grounding: gauge-based estimates are known to lose reliability with distance from gauges; you apply it to a user-facing forecast.

### What exists (evidence)
- Government: IMD scientists cite a lack of local observatories; I found no public map of verifiability.
- Rivals: FieldCast and GramVarsha state the scarcity of truth data; AgroMet and GramSevak use few stations. I found no coverage map and no error-versus-distance model.

### Risks and honesty rules
- With few stations the curve will be noisy. Show bootstrap bands and the number of stations. Madhya Pradesh may have only a handful of usable free stations (NOAA ISD airports plus any IMD AWS/ARG you can obtain).
- A satellite product such as CHIRPS can supply dense truth for rain, but it is not independent (it uses gauges and is itself an estimate). Label it SATELLITE_DERIVED and keep it out of any claim of independence.
- Distances are geodesic; document the method.

### Judge questions and answers
- *"Is your expected error validated?"* We predict it from held-out stations and report coverage; here is the curve with bands and n.
- *"What if there is no relationship?"* We report that.

### Falsifier
If there is no usable relationship, the map alone still shows where checks are possible. That is a defensible result.

---

## 6. How the three fit and a 4-minute demo

1. **(30 s)** India map: only Madhya Pradesh modelled; click to a block and a panchayat.
2. **(60 s) Feature 1:** open a Decision Card; slide "How costly is it to act?" and watch the action flip; open the Value Meter ("in this block the panchayat forecast changes the advice on x% of days").
3. **(60 s) Feature 2:** open the Trust page; run the ledger check; show the report card with a miss and a "not enough data yet" line.
4. **(60 s) Feature 3:** switch the map to Verifiability; show a far-from-station panchayat with a wider expected error.
5. **(30 s)** What is next: reporters, more crops, more states, each gated by evidence.

---

## 7. MASTER PROMPT FOR ANTIGRAVITY (paste once, Planning mode)

```
ROLE AND CONTEXT
Work in backend/, ml/ and frontend-next/. Read PROJECT_CONTEXT.md, AGENTS.md rules,
docs/MAP_DRIVEN_ARCHITECTURE.md, docs/SCOPE_AND_MAP_SPEC.md, the advisory sources
and rule registry (file 10), and the forecast archive/ledger and validation code
from the build plan (file 04). Modelled area is Madhya Pradesh only
(regions.yaml ml_active). Do not rebuild what works. Zero-budget: free data and
tools only; mock anything that needs payment, permissions or real reporters and
label it.

RULES
- Panchayat (LGD) is the data unit; higher levels are labelled aggregates with
  "x of y scored".
- No fabricated or hard-coded numbers or sentences. Missing = em dash plus reason.
  Narration only from templates over API fields.
- Every metric states its truth source and class (DIRECT_OBSERVATION,
  NEARBY_OBSERVATION, SATELLITE_DERIVED, REANALYSIS), its period, and its sample
  size. Minimum sample n = 30 (configurable): below it, print "not enough data
  yet" instead of a number.
- HINDCAST and LIVE results are never merged. SYNTHETIC data are labelled and kept
  out of every reported metric.
- Cost ratios, thresholds and robust-difference margins in config files carry a
  source or an explicit ASSUMPTION label.
- No agronomy without a cited, reviewed source; unsourced rules stay disabled.
- Tests pass; small commits; keep MIT notices and ATTRIBUTION.md.

STEP W0. AUDIT (stop for approval)
Write docs/audit/WINNING_FEATURES_AUDIT.md: (1) what rule engine, probabilities
(ensemble or quantiles) and block-value inputs exist; whether the same rules can
run with block and panchayat inputs; (2) the forecast archive, ledger and
verification code state and how many days are archived; (3) which stations, gauges
and satellite truth exist for Madhya Pradesh, with counts and distances; (4) what
validation exists inside MP versus Dhanbad; (5) which existing screens can host the
new cards and layers. List missing prerequisites. Wait for approval.

STEP W1. FEATURE 1: DECISION CARDS AND VALUE METER
Backend (ml/src/decision.py, ml/src/value_meter.py):
- Run the active, sourced rule set twice per (panchayat, crop, stage, day): with the
  block value and with the panchayat value, using ensemble or quantile
  probabilities for the event named by each rule.
- Cost-loss decision: act if P(event) >= C/L (Murphy 1977). Outputs Act / Wait /
  Hedge with the probability, the C/L used and the reason. Cost presets Cheap,
  Medium, Expensive map to ratios in config/cost_presets.yaml labelled ASSUMPTION;
  officers may set a numeric ratio.
- For each pair record whether the action differs, the weather difference that
  caused it (variable, panchayat value, block value), and whether it is robust
  (probability difference >= margin from config, labelled ASSUMPTION).
- Aggregate to block, district and state: difference rate, robust-difference rate,
  n panchayat-days, n scored of total.
- Verification: where observations exist, among days with differing actions compute
  how often the panchayat-based action matched the outcome vs the block-based one,
  with a bootstrap 95% CI; HINDCAST and LIVE separate; below n = 30 say "not enough
  data yet".
Endpoints: GET /api/ui/decision/{lgd}?crop=&day=&cost=; GET
/api/ui/value-meter?scope=&crop=&day=; plus columnar params
"advice_differs" and "advice_robust_differs" for the map.
Frontend: Decision Card in the panel (Action, probability, "block would say ...",
cause line, cost selector with live update, Why? expander); Value Meter card at
block/district/state scope; map layer "Advice differs from block" with legend and
tooltip. Farmer mode shows the simplified card.
Tests: decision flips at the C/L threshold; identical inputs give no difference;
aggregates equal member counts; sample guard; no hard-coded text.

STEP W2. FEATURE 2: TRUST LEDGER AND REPORT CARD
Backend: ensure ml/src/ledger.py chains entries as
sha256(prev_hash + manifest_sha256 + model_version_hash + code_git_sha), tools/
verify_ledger.py recomputes the chain, GET /api/ui/ledger lists entries. Build
ml/src/report_card.py producing per panchayat, block and district over a stated
period: warnings issued, hits, misses, false alarms, POD, FAR, CSI, rain amount
MAE vs block baseline, temperature MAE, rule-level hit rates, comparison with the
official forecast where logged (source=IMD_MAUSAMGRAM), each with truth class,
sample size and CI. Include misses. GET /api/ui/report-card?scope=&period=.
Generate the weekly card text by template from the same data (for web and for the
chat adapters). Frontend: Trust page with ledger status and a "Verify it yourself"
box showing the command; report card per scope; HINDCAST/LIVE tabs; downloadable
CSV of raw rows (date, panchayat, rule, forecast, observed, truth source).
Tests: tampering with an archived file makes verification fail; card numbers equal
database values; minimum sample guard; misses included.

STEP W3. FEATURE 3: VERIFIABILITY MAP AND EXPECTED ERROR
Backend: data_pipeline/22_compute_coverage.py (distance, elevation difference and
class per panchayat and variable, thresholds in config/coverage.yaml labelled
ASSUMPTION) and ml/src/skill_vs_distance.py: from leave-one-station-out residuals
fit expected absolute error as a smooth monotone function of distance and
elevation difference with bootstrap bands; store expected_error(gp, variable, lead)
with bands and n_stations; if not significant set status NO_RELATIONSHIP.
Endpoints: GET /api/ui/coverage?scope=, expected_error and coverage_class as
columnar params. Frontend: map layer "Verifiability" and "Expected error"; tooltip
and panel line "Typical error here: x (range a to b), nearest station y km"; a
Trust-page chart of error vs distance with bands and station counts; honest text
when the relationship is not significant. Truth classes shown; CHIRPS labelled
SATELLITE_DERIVED and not counted as independent.
Tests: distances correct on fixtures; NO_RELATIONSHIP path; bands present.

STEP W4. INTEGRATION
Add the three features to the scope-aware panel, status bar chips (Advice differs,
Verifiability), the Replay tab (decision cards and misses per day), the Model tab
(links to the report card and curve), and the demo mode (?judge=1) using a stored
snapshot so the demo works offline. Update regions gating: a feature is shown only
for ml_active regions.

STEP W5. TESTS AND ACCEPTANCE (Playwright + vitest)
PASS/FAIL with evidence:
1. Move the cost selector: the action flips exactly at the stored C/L threshold.
2. A panchayat where block and panchayat inputs give different actions shows the
   cause line with the real values; one where they give the same shows "same".
3. Value Meter numbers at block/district scope equal the database counts.
4. Verification card for differing days appears only with n >= 30, else "not enough
   data yet".
5. verify_ledger passes; corrupting one archived file makes it fail.
6. Report card numbers match the database; misses and truth class are visible; the
   HINDCAST and LIVE tabs are separate.
7. Coverage layer and expected-error tooltip agree with the API; NO_RELATIONSHIP
   path shows the honest text.
8. No Dhanbad/Jharkhand record appears; non-ML areas show no numbers.
9. No hard-coded metric or sentence in the source; no forbidden strings.
10. Offline judge mode works; axe accessibility passes.
Write docs/audit/WINNING_FEATURES_REPORT.md with results, including anything that
did not hold (for example a missing relationship).
```

---

## 8. What you must do or check yourself

1. **Start the daily forecast archive and ledger today.** Prospective evidence cannot be backfilled, and Feature 2 grows with it.
2. **Count usable stations in Madhya Pradesh** (NOAA ISD plus any IMD data you can get). Feature 3 needs several; if you have very few, say so and rely on the coverage map more than the curve.
3. **Get a rule reviewer** (KVK or university agronomist). Feature 1 is only as good as its sourced rules.
4. **Decide the cost presets** with an extension worker or agronomist, and keep them labelled assumptions.
5. **Check the live Mausamgram, KALP and rival demos** before claiming novelty on stage.
6. **Rehearse the honest failures.** A judge who sees you show a miss and a "not enough data yet" line will trust the rest.

## 9. What I could not verify

- Whether IMD publishes any per-panchayat accuracy internally.
- Whether any rival, or any private team, has built a decision-difference metric, a ledger or an error-versus-distance map without describing it in its README.
- How many free stations Madhya Pradesh offers, and whether IMD API access is possible for you.
- That judges will weight these features as I expect; the criteria above come from published guides, and the finale rules may differ.
