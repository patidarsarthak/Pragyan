# 05. Design Spec Extracted from the Sanket Frontend (for a look-alike on your backend)

Source analysed: https://github.com/Bhushan2318/sih-main (frontend/, MIT licence, (c) 2026 The Sanket contributors, Team Winging It) and the live site https://sanket-a0dd.onrender.com/. I read the cloned source. I could not see the rendered live pages (JavaScript app), so everything below comes from code, not screenshots. Open the live site once beside this spec to check proportions.

## 1. Stack
React 18, TypeScript, Vite, TanStack Query, Zustand (live-socket status only), Recharts, d3-geo (SVG map), vitest. One hand-written `styles.css` (about 1,400 lines) plus `theme.ts` for chart colours. No service worker (the code says this was deliberate). Roughly 4,100 lines of source.

## 2. Design tokens (from `styles.css` and `theme.ts`)

| Token | Value | Use |
|---|---|---|
| `--paper` | #eceff5 | page background |
| `--card` / `--card-2` | #ffffff / #f5f7fb | cards / hover and alt rows |
| `--rule` / `--rule-2` | #d5dbe6 / #e5e9f0 | borders / light dividers |
| `--ink` / `--ink-2` / `--ink-3` | #0b1220 / #3d4a5c / #7b8798 | text, secondary, muted |
| `--blue` / `--blue-2` / `--blue-wash` | #2b4eff / #5c78ff / #e5eaff | accent, links, focus |
| `--calm` / `--watch` / `--bust` | #00a882 / #f08700 / #f5254a | low / medium / high risk |
| washes | #d9f6ef / #ffefd8 / #ffe2e8 | risk backgrounds |
| `--nodata` | #dfe4ec | no data |
| radius `--r` | 11px | cards |
| shadows | `0 16px 34px -24px rgba(11,18,32,.42)`; lift `0 20px 40px -22px rgba(11,18,32,.45)` | |
| Chart colours | forecast #2b4eff, observed #0b1220, error #f5254a, ensemble member #a9b6d6, marker #f08700, grid #e5e9f0, axis #7b8798 | Recharts |

**Fonts** (Google Fonts, SIL OFL, free to use): Archivo (variable width 62 to 125, weight 400 to 900) for display; Public Sans (400 to 700) for body; DM Mono (400, 500) for labels and numbers.

**Type rules:** body 13.5px/1.55. h1 Archivo wdth 96 wght 800, 1.2rem. h3 is a DM Mono label: 0.66rem, uppercase, letter-spacing 0.14em, colour ink-3. Hero headline: Archivo wdth 78 wght 800, `clamp(36px, min(5.6vw, 9.2vh), 92px)`, line-height 0.93, letter-spacing -0.035em, with an `<em>` in the risk red that gets an underline "wipe" animation. KPI value: Archivo wdth 84 wght 800, `clamp(30px, 2.2vw, 44px)`.

**Motion:** `sk-rise` (fade up 14px, 0.55s), `sk-beat` (pulsing red dot on the alarm pill), `sk-wipe` (headline underline), `sk-bob` (scroll cue), ticker slide at constant speed. Everything respects `prefers-reduced-motion`.

## 3. Page structure

**Top bar** (sticky, 59px, `rgba(236,239,245,.88)` with 10px blur, 1px bottom rule): brand button (logo glyph 32px high, wordmark 13px high, 1px divider, grey subtitle 11.5px), then tab buttons (Operations, Alerts, Model, Replay "a real bust", About; active tab = ink background, white text, 7px radius), right side = pills. Pill styles: `quiet` (white, green dot, forecast cycle), `alarm` (solid red, pulsing white dot, count of high-risk regions), `watch`. On phones the pills move into a separate `cyclebar` under the bar. **There is no footer.**

**Operations view** (default), top to bottom:
1. **Opening screen** (fills the viewport on laptops): hero + KPI strip + a call-to-action button + scroll cue + a ticker pinned to the viewport bottom.
   - Hero: two columns (1.14fr / 0.86fr). Left: kicker (short rule plus mono caps), big headline with red `<em>`, sub paragraph, a "why" note with a 2px blue left border, then a gauge row: a 128px SVG ring (11px stroke, grey track, risk-coloured arc), a mono caption, a big sentence, and a delta pill (up red, down green, none grey). Right: a white card (radius 13px) with a header of mono title plus red "crossover" note, two tabs (a line chart and a calibration scatter), a skill row of four stat tiles, the chart, and a key row.
   - KPI strip: 4 cards in a grid (2 columns under 900px). Each card has a 30x4px coloured cap bar, mono label, big value, small note. Hover lifts 2px.
   - CTA: pill button in risk red ("Watch it call a real bust"), with a lifted shadow, and a bobbing scroll cue "The national map".
   - Ticker: ink-coloured band, mono 11.5px, items = dot (risk colour) + name + value, duplicated track sliding left at constant speed (duration is computed from track width). Disabled on touch/reduced-motion (becomes a scrollable row).
2. **Freshness strip** (FeedFreshness) under the opening screen.
3. **Operations grid** (full viewport height minus the top bar): columns `[map | lead-day rail | detail panel]` at 1440x700 and up; `[map | panel]` below that; single column under 960px.
   - Map column: toolbar (lead-day buttons when there is no rail, plus the risk legend), then the map card.
   - Map card: SVG choropleth with a viewBox of 620x680, Mercator fitted to the geometry, a search box, "back" button and level indicator (state to district drill-down), aggregation toggle (how a state is coloured), hover tooltip (ink background), selection outline, keyboard and aria support.
   - Rail: white card with ten day rows (46px day label, stacked band bar 10px high showing the share of regions in each band, mean value), active row has a 3px ink left border, a key and a note.
   - Detail panel (`aside.panel`, scrolls internally): header (name, state, copy-link and close buttons), then sections each separated by a 1px rule: peak risk, factors (SHAP) with a one-sentence explanation, variable tabs with a "driver" chip, a trajectory line chart, probability by lead day, similar past cases. When nothing is selected the panel shows the **Worst districts** list for that day (top 20, worst first).
4. **Baseline ladder card** under the map (guarded: only renders if data exists), with a "see full" chip.

**Alerts view:** page header, KPI-style stats (count in each band, peak, most common cause), search box and state filter, a paged table (show more / show all), CSV download, rows click through to the map.

**Model view:** stat row (ROC-AUC, PR-AUC, Brier, F1), cards for training data, definition of the event, error per variable vs a baseline, every baseline vs climatology, reliability, misses, pipeline log, economic value.

**Replay view:** cycle picker, event header, probability chart, focus chart with a day stepper.

**About view:** cards (question it answers, how well it works, use as a service, why trust it, what it does not do, how it runs, data and attribution).

## 4. Chart specs (Recharts)
- All charts: `CartesianGrid strokeDasharray="3 3"` colour #e5e9f0 (vertical lines off on time series), axes colour #7b8798 with no tick lines, axis labels 11px, 100% width responsive container.
- Hero line chart: ComposedChart, x = lead day ("Day 1"), y = 0 to 100, ensemble band as an Area (#a9b6d6 at 40% opacity), forecast line 2.6px #2b4eff with 2.5px dots, margins `{top:10,right:22,bottom:18,left:4}`.
- Calibration scatter: x predicted 0 to 100, y observed 0 to 100, dashed 5-5 diagonal reference line, points #2b4eff at 75% opacity.
- Variable trajectory: LineChart with forecast solid blue 2px, observed dashed `6 4` ink 2px, predicted error red 1.5px; legend; short unit label on the y axis.
- Tooltip: ink background, white text, radius 9px, strong title in Archivo 13px, mono meta line in 55% white.
- Gauge ring: SVG r about 55 in a 128 box, stroke 11, track #dfe4ec.

## 5. Behaviour worth keeping
- URL state: `view`, `region`, `day` and filters are validated and written to the URL; tab and region changes push history, day and filter changes replace it.
- Honest states: missing numbers render as "—"; unscored never means zero; totals count the whole dataset; Skeleton, Loading, Empty and Error components for every query.
- Loading hints for a slow free-tier server (retry hints after failures).
- Accessibility: focus-visible 2.5px blue outline, tab roles and `aria-selected`, aria-labels on map regions, reduced-motion support, tabular numbers.
- Performance: responses precomputed, one fetch for all lead days, `minmax(0, 1fr)` grid columns to avoid sideways scroll.

## 6. What does not transfer to your project

| Sanket piece | Why it cannot be copied as is |
|---|---|
| SVG choropleth of 666 districts | A panchayat map has tens of thousands of polygons. SVG will not cope. Use the SVG look for state and district overview only; use MapLibre vector tiles for panchayats |
| Loading every region for all ten days in one call | Impossible at panchayat scale. Fetch district aggregates for the overview and panchayats on demand |
| "Bust probability" | Your project has no such model. Replace with your risk score and alert bands |
| Upload, ingest, live socket, economic value, pipeline log | Not part of your project |
| `assets/geo/*`, logo, wordmark, og-image, name, subtitle, copy | Not covered by the MIT licence the same way (geometry is GADM-derived; branding is theirs). Replace with your own |

## 7. Licence and attribution checklist
- Keep their MIT notice in `THIRD_PARTY_NOTICES.md` and a header comment in every file whose code is largely unchanged; list adapted files in `ATTRIBUTION.md`.
- The fonts are open-source; keep their licences.
- The 2021 Indian geospatial guidelines and the Survey of India boundary standard apply to your India outlines; use your own LGD / Survey of India data.
- Say in your README and presentation that the frontend architecture and styling are adapted from an MIT-licensed open-source project and that your data, models, backend and features are your own. Check SIH rules on third-party code.
