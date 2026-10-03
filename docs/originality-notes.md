# Originality, Divergence & Intellectual Property Notes
**Project:** GramMausam (SIH26074) — Panchayat-Level Weather Downscaling & Agro-Meteorological Advisory System  
**Reference Examined:** Sanket (SIH26079 — Forecast Bust Detection)  
**Date:** October 2026  

---

## 1. Executive Statement of Originality

GramMausam was developed to address **SIH Problem Statement 26074** (downscaling block-level weather forecasts to individual Gram Panchayats using terrain features for agricultural advisories). It is fundamentally different in scientific domain, mathematical formulation, spatial unit, and technical implementation from the reference project "Sanket" (which solved SIH26079: predicting district-level forecast busts and SHAP divergence).

While the layout structure of modern editorial data interfaces was studied for best practices in typography hierarchy and density, **every single line of frontend code, component implementation, design token, boundary geometry, and copy text in GramMausam is original and written from scratch.**

---

## 2. Side-by-Side Architectural Divergence

| Architectural Dimension | Reference App (Sanket) | GramMausam (SIH26074) | Originality Verdict |
| :--- | :--- | :--- | :--- |
| **Problem Statement** | SIH26079: Forecast Bust Detection & Risk Classification | SIH26074: Panchayat Downscaling & Agrometeorological Advisory | **Completely Different** |
| **Primary Spatial Unit** | 666 District Polygons (National overview) | **239 Gram Panchayat Polygons** (Cadastral village scale) | **100% Original** |
| **Product Branding** | "Sanket · Forecast Bust Detection" | **"GramMausam" (*ग्राममौसम*) — Micro-Weather & Agromet Intelligence** | **100% Original** |
| **Typography Stack** | `Archivo` + `Public Sans` + `DM Mono` | `Bricolage Grotesque` + `Plus Jakarta Sans` + `JetBrains Mono` | **Completely Replaced** |
| **Colour Palette** | Navy `#0b1220` + Cobalt Blue `#2b4eff` + White | Deep Viridian `#0f766e` + Slate `#f1f4f8` + 3-tier Alert (Yellow `#ca8a04`, Amber `#ea580c`, Crimson `#be123c`) | **Distinct & Color-Blind Safe** |
| **Tab Architecture** | Operations $\to$ Alerts $\to$ Replay $\to$ Model $\to$ About | **Forecast $\to$ Evidence $\to$ Alerts $\to$ Past Events $\to$ Methodology** | **Reordered & Redesigned** |
| **Map Geometries** | `india_districts.topojson` & foreign territory outlines | **Survey of India compliant** national outline + LGD 239 GP polygons (`dhanbad_panchayats_polygons.geojson`) | **Independent Sovereign Geometry** |
| **Map Engine** | D3 SVG District Choropleth | Custom vector GIS canvas / MapLibre GL with GP vector drilldown | **100% Original** |
| **Agronomic Intelligence**| None (Atmospheric error focus) | ICAR-KVK agro-advisories (Action/Why/Timing), FAO-56 Penman-Monteith ET0, and root-zone water balance | **100% Original** |
| **Disaster Protocol** | None | **OASIS Common Alerting Protocol (CAP 1.2 XML)** download | **100% Original** |
| **Multilingual Support**| English Only | **Instant English / Hindi Toggle** (`src/lib/i18n.ts`) | **100% Original** |

---

## 3. What Was Inspired by the Reference vs. What Is Original

### 3.1 Layout Principles Studied:
- Density: Keeping primary map and inspector controls accessible without excessive vertical scrolling on desktop.
- Monospace numerical readouts for dates, coordinates, and units.
- Clean card borders with subtle dividers.

### 3.2 What Is Original:
1. **Panchayat Micro-Climate Engine:** All weather variables (Rain, Max/Min Temp, Humidity, Wind, ET0) downscaled to individual Gram Panchayat polygons using NASA SRTM 30m DEM elevation, slope, aspect, and ESA WorldCover fractions.
2. **Confidence Hatching:** Implemented as a genuine SVG vector pattern (`<pattern id="gm-hatch-uncertainty">`), avoiding CSS hacks and meeting WCAG AA accessibility standards.
3. **Agro-Meteorological Advisory Card:** Action / Why / Timing framework designed specifically for farmers and village panchayat secretaries.
4. **Soil Moisture & Irrigation Bucket:** FAO-56 Penman-Monteith water budget with Field Capacity, Wilting Point, and MAD parameters.
5. **Government CAP 1.2 XML Integration:** Direct standard emergency alerting XML generation for NDMA SACHET and IMD.
6. **Honest Baseline Ladder:** Evaluation comparing Coarse NWP vs Bilinear Interpolation vs Lapse Rate vs ML, with explicit data-leakage warnings for near-zero temperature errors.
7. **Full Devanagari Hindi Localization:** Built-in dual-language dictionary across all tabs, buttons, tooltips, and advisories.
