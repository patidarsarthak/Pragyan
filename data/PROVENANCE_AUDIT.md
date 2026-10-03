# 🔬 SIH26074 Meteorological Data Provenance & Ground-Truth Audit

**Project:** Smart Panchayat Climate & Geospatial Intelligence Platform (SIH26074)  
**Target Domain:** Dhanbad District, Jharkhand, India (239 Gram Panchayats across 10 Administrative Blocks)  
**Temporal Span:** 2020-01-01 to 2024-12-31 (1,827 continuous daily timesteps)  
**Deliverable Status:** Phase 1 (Data-Only Sourcing, Verification & Unified Long-Format Restructuring)

---

## Executive Summary

The objective of Phase 1 is to establish a rigorous, non-fabricated, and scientifically defensible data foundation for hyper-local climate downscaling across five meteorological variables:
1. **Rainfall (Precipitation)**
2. **Temperature (2m Air Temperature)**
3. **Relative Humidity (2m)**
4. **Wind Speed (10m Surface Wind)**
5. **Evapotranspiration (Reference / Potential ET)**

Rather than continuing legacy patterns of siloed wide CSV files, all five parameters have been unified into a single long-format data architecture (`data/unified/panchayat_weather_long_2020-24.parquet`) keyed on `(GPCODE, DATE, VARIABLE)` with standardized coarse and fine attributes.

---

## Variable Provenance Audits

### 1. Rainfall (Precipitation)

| Dimension | Specification |
| :--- | :--- |
| **Physical Quantity** | Daily accumulated surface precipitation |
| **Unit** | millimeters per day (`mm/day`) |
| **Coarse Reference Source** | ECMWF ERA5-Land Reanalysis (Surface Precipitation) |
| **Coarse Spatial Resolution** | 0.1° × 0.1° (~9 km horizontal grid spacing) |
| **Coarse Temporal Resolution** | Daily sum (00:00 to 23:59 IST / UTC aggregated) |
| **Fine Reference Source** | Climate Hazards Group InfraRed Precipitation with Station data (UCSB CHIRPS v2.0) |
| **Fine Spatial Resolution** | 0.05° × 0.05° (~5.3 km horizontal grid spacing) |
| **Fine Temporal Resolution** | Daily accumulated rainfall |
| **Date Range Audited** | `2020-01-01` to `2024-12-31` (1,827 continuous days) |
| **Panchayat Coverage** | 239 Gram Panchayats (Dhanbad District) |
| **Completeness** | Coarse: 100.0% (436,653 / 436,653 records) <br> Fine: 99.16% (432,999 / 436,653 records) |
| **Missing Target Notes** | 3,654 fine target dates (0.84%) missing strictly across 2 border panchayats (`MAHESHPUR 2`, `RAJGANJ` in Baghmara block) due to satellite retrieval masking. Left un-imputed to prevent artificial noise. |
| **Provenance Confidence** | **CONFIRMED** (Directly verified against UCSB CHIRPS archive and ECMWF reanalysis) |
| **Phase 2 Modeling Strategy**| **Residual Correction (GO)** |

#### Scientific Reasoning:
CHIRPS v2.0 blends geostationary thermal infrared (TIR) cold cloud duration (CCD) satellite imagery with in-situ rain gauge station records from national meteorological agencies. At 0.05° spatial resolution (~5.3 km), it resolves localized orographic precipitation gradients across the Dhanbad landscape (e.g. enhanced convection against the Topchanchi and Parasnath foothill topography versus the lowland Damodar river basin). Because both a genuine coarse numerical model reference (ERA5-Land at ~9 km) and an independent fine satellite-station reference (CHIRPS at ~5 km) exist with high observational correlation, additive or multiplicative residual correction ($\Delta = \text{Rain}_{\text{fine}} - \text{Rain}_{\text{coarse}}$) is viable, mathematically defensible, and operationally grounded.

---

### 2. Temperature (2m Air Temperature)

| Dimension | Specification |
| :--- | :--- |
| **Physical Quantity** | Daily mean air temperature at 2 meters above ground level |
| **Unit** | degrees Celsius (`°C`) |
| **Coarse Reference Source** | ECMWF ERA5-Land Reanalysis (`2m_temperature`) |
| **Coarse Spatial Resolution** | 0.1° × 0.1° (~9 km horizontal grid spacing) |
| **Coarse Temporal Resolution** | Daily mean (hourly integrated average) |
| **Fine Reference Source** | **None Available** (Evaluated IMD Pune Gridded & MODIS LST) |
| **Fine Spatial Resolution** | N/A (Evaluated IMD 0.25°/1.0° and MODIS 1 km) |
| **Fine Temporal Resolution** | N/A |
| **Date Range Audited** | `2020-01-01` to `2024-12-31` (1,827 continuous days) |
| **Panchayat Coverage** | 239 Gram Panchayats (Dhanbad District) |
| **Completeness** | Coarse: 100.0% (436,653 / 436,653 records) <br> Fine: 0.0% (Documented as Direct-Prediction Only) |
| **Provenance Confidence** | **CONFIRMED** (Coarse ERA5-Land verified; Absence of fine ground truth verified) |
| **Phase 2 Modeling Strategy**| **Direct Prediction Only (NO-GO for Residual Correction)** |

#### Scientific Reasoning:
1. **IMD Pune Gridded Temperature Inadequacy:** India Meteorological Department (IMD Pune CDSP) publishes gridded daily temperature data at **1.0° × 1.0°** (~110 km) and experimental **0.25° × 0.25°** (~27.5 km) spatial resolution. In Dhanbad district (spanning approximately 50 km east-to-west and 40 km north-to-south), a 0.25° grid produces only 2 to 4 discrete grid cells for the entire district. In contrast, ERA5-Land already resolves 26 discrete cells across Dhanbad at 0.1° (~9 km). Attempting to "downscale" a 9 km dataset against a 27.5 km target is physically inverted (target is 3x coarser than the predictor).
2. **Access & Security Restrictions:** The IMD CDSP Pune portal (`cdsp.imdpune.gov.in`) enforces manual captcha/OTP verification, institutional user clearances, and active firewall restrictions that prevent automated programmatic continuous pipelines.
3. **Satellite Land Surface Temperature (LST) Pitfalls:** While MODIS Terra/Aqua provides 1 km daily LST (`MOD11A1` / `MYD11A1`), LST represents **radiometric skin surface temperature** (heavily biased by asphalt, barren rock, and bare soil), NOT ambient 2m air shelter temperature. More critically, optical/thermal infrared sensors suffer **60% to 85% data loss due to cloud contamination** during the crucial Indian Kharif monsoon season (June–September).
4. **Decision:** Fabricating or interpolating a synthetic "fine temperature" target would introduce false precision and corrupt downstream agro-advisory models. Temperature is therefore classified strictly as **Direct-Prediction Only** from coarse reanalysis/forecasts.

---

### 3. Relative Humidity (2m)

| Dimension | Specification |
| :--- | :--- |
| **Physical Quantity** | Daily mean relative humidity at 2 meters |
| **Unit** | percentage (`%`) |
| **Coarse Reference Source** | ECMWF ERA5-Land Reanalysis (Derived from 2m Temperature and 2m Dewpoint) |
| **Coarse Spatial Resolution** | 0.1° × 0.1° (~9 km horizontal grid spacing) |
| **Coarse Temporal Resolution** | Daily mean |
| **Fine Reference Source** | **None Available** |
| **Fine Spatial Resolution** | N/A |
| **Fine Temporal Resolution** | N/A |
| **Date Range Audited** | `2020-01-01` to `2024-12-31` (1,827 continuous days) |
| **Panchayat Coverage** | 239 Gram Panchayats (Dhanbad District) |
| **Completeness** | Coarse: 100.0% (436,653 / 436,653 records) <br> Fine: 0.0% (Documented as Direct-Prediction Only) |
| **Provenance Confidence** | **CONFIRMED** |
| **Phase 2 Modeling Strategy**| **Direct Prediction Only (NO-GO for Residual Correction)** |

#### Scientific Reasoning:
There are currently no operational, public, high-resolution (<5 km) daily gridded relative humidity observation datasets spanning the Indian subcontinent. While automatic weather station (AWS) networks operated by IMD and state agricultural universities measure relative humidity, station density in Dhanbad district is extremely sparse (<2 operational stations with public continuous records: Dhanbad AWS and Maithon Dam). Spatial kriging across 2 stations over 239 Panchayats would produce circular interpolation artifacts rather than true physical sub-grid variance. Relative humidity is therefore scoped as **Direct Prediction Only**.

---

### 4. Wind Speed (10m Surface Wind)

| Dimension | Specification |
| :--- | :--- |
| **Physical Quantity** | Daily mean surface wind speed at 10 meters above ground |
| **Unit** | meters per second (`m/s`) |
| **Coarse Reference Source** | ECMWF ERA5-Land Reanalysis (10m $U$-zonal and $V$-meridional wind vectors) |
| **Coarse Spatial Resolution** | 0.1° × 0.1° (~9 km horizontal grid spacing) |
| **Coarse Temporal Resolution** | Daily mean |
| **Fine Reference Source** | **None Available** |
| **Fine Spatial Resolution** | N/A |
| **Fine Temporal Resolution** | N/A |
| **Date Range Audited** | `2020-01-01` to `2024-12-31` (1,827 continuous days) |
| **Panchayat Coverage** | 239 Gram Panchayats (Dhanbad District) |
| **Completeness** | Coarse: 100.0% (436,653 / 436,653 records) <br> Fine: 0.0% (Documented as Direct-Prediction Only) |
| **Provenance Confidence** | **CONFIRMED** |
| **Phase 2 Modeling Strategy**| **Direct Prediction Only (NO-GO for Residual Correction)** |

#### Scientific Reasoning:
Surface wind vectors are strongly influenced by microscale surface roughness, canopy friction, and local building density. While satellite scatterometers (such as ASCAT or Oceansat OSCAT) measure ocean surface winds, they do not provide terrestrial land surface winds. Public atmospheric reanalyses (ERA5-Land 0.1° and GFS 0.25°) represent the highest spatial resolution available for continuous terrestrial wind fields in the region. Without high-density anemometer arrays in every Panchayat, no independent daily fine reference exists. Wind speed is assigned to **Direct Prediction Only**.

---

### 5. Evapotranspiration (Reference / Potential ET)

| Dimension | Specification |
| :--- | :--- |
| **Physical Quantity** | Daily reference evapotranspiration ($ET_0$, FAO-56 Penman-Monteith equivalent) |
| **Unit** | millimeters per day (`mm/day`) |
| **Coarse Reference Source** | ECMWF ERA5-Land Reanalysis (`potential_evaporation_sum` / $ET_0$) |
| **Coarse Spatial Resolution** | 0.1° × 0.1° (~9 km horizontal grid spacing) |
| **Coarse Temporal Resolution** | Daily accumulated equivalent |
| **Fine Reference Source** | **None Available** (Evaluated MODIS MOD16A2) |
| **Fine Spatial Resolution** | N/A (MOD16 is 500m but 8-day composite) |
| **Fine Temporal Resolution** | N/A |
| **Date Range Audited** | `2020-01-01` to `2024-12-31` (1,827 continuous days) |
| **Panchayat Coverage** | 239 Gram Panchayats (Dhanbad District) |
| **Completeness** | Coarse: 100.0% (436,653 / 436,653 records) <br> Fine: 0.0% (Documented as Direct-Prediction Only) |
| **Provenance Confidence** | **CONFIRMED** |
| **Phase 2 Modeling Strategy**| **Direct Prediction Only (NO-GO for Residual Correction)** |

#### Scientific Reasoning:
Actual and reference evapotranspiration cannot be measured directly by satellites; it is computed via aerodynamic-energy balance formulations (such as Penman-Monteith). The premier satellite product, NASA's MODIS MOD16A2, is provided strictly as an **8-day aggregated composite** at 500m resolution, not a daily observation. Furthermore, MOD16 is itself an empirical Penman-Monteith model driven by GMAO reanalysis meteorology rather than ground truth observations. Lysimeter and eddy covariance flux towers do not exist at the Panchayat level in Dhanbad. Using an 8-day model composite as a "daily ground-truth target" would introduce massive temporal disaggregation error. ET is properly designated as **Direct Prediction Only**.

---

## Go / No-Go Decision Matrix for Phase 2 Joint Modeling

| Parameter | Coarse Reference (9 km) | Fine Ground Truth (<6 km) | Viability of Residual Correction | Modeling Formulation (Phase 2) | Physical / Data Rationale |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Rainfall** | **ERA5-Land (0.1°)** | **CHIRPS v2.0 (0.05°)** | **GO** ✅ | **Residual Correction ($\hat{Y} = X_{\text{coarse}} + \hat{R}$)** | Dual independent data sources with verified sub-grid orographic signal. |
| **Temperature** | **ERA5-Land (0.1°)** | None (IMD is 0.25°/1.0°) | **NO-GO** ❌ | **Direct Prediction ($\hat{Y} = f(X)$)** | IMD gridded target is coarser than input; MODIS LST has monsoon cloud voids. |
| **Humidity** | **ERA5-Land (0.1°)** | None | **NO-GO** ❌ | **Direct Prediction ($\hat{Y} = f(X)$)** | No gridded fine observation product in India; station network is sparse. |
| **Wind Speed** | **ERA5-Land (0.1°)** | None | **NO-GO** ❌ | **Direct Prediction ($\hat{Y} = f(X)$)** | No terrestrial fine-scale gridded daily wind observation product available. |
| **Evapotranspiration**| **ERA5-Land (0.1°)** | None (MOD16 is 8-day) | **NO-GO** ❌ | **Direct Prediction ($\hat{Y} = f(X)$)** | MOD16 is an 8-day composite model, not a daily physical observation. |

---

## Static Geography & Administrative Verification

1. **Panchayat Registry & LGD Key:**  
   All 239 Gram Panchayats are referenced to their official Local Government Directory (LGD) codes (`111722` through `111967`).
2. **Administrative Blocks (10 total):**  
   - `Baghmara` (54 Panchayats)
   - `Baliapur` (23 Panchayats)
   - `Dhanbad` (12 Panchayats)
   - `Egarkund` (18 Panchayats)
   - `Govindpur` (39 Panchayats)
   - `Kaliasol` (18 Panchayats)
   - `Nirsa` (24 Panchayats)
   - `Purvi Tundi` (9 Panchayats)
   - `Topchanchi` (28 Panchayats)
   - `Tundi` (14 Panchayats)
3. **Topographical Sourcing:**  
   NASA Shuttle Radar Topography Mission (SRTM v3 30m DEM) provides elevation (`ELEVATION_M`) ranging from 122m to 312m, with slope (`SLOPE_DEG`) capturing the northern foothills of Parasnath.
4. **Land Cover Sourcing:**  
   ESA WorldCover 2021/2023 10m global land cover resolves 4 predominant classes:
   - Code `12` (Cropland, ~84%)
   - Code `10` (Tree cover / Forest, ~6%)
   - Code `13` (Built-up / Urban settlements, ~9%)
   - Code `4` (Grassland / Shrubland, ~1%)

---

## 🏛️ Administrative Boundary Provenance & Quality Classification (`boundary_source`, `boundary_quality`)

To ensure complete transparency regarding how Gram Panchayat polygons were established across the platform, every polygon is classified and stored with explicit quality metadata in the PostGIS/SQLite database:

| Quality Tier (`boundary_quality`) | Methodology Description | Source Attribution (`boundary_source`) |
| :--- | :--- | :--- |
| **`OFFICIAL`** | Directly digitized from official state cadastral portals or gazetted administrative boundaries. | *Survey of India / Bharat Maps Gazetted Boundary* |
| **`DERIVED`** | Spatially partitioned via Voronoi / Delaunay tessellation from authoritative LGD revenue village centroids and bounded strictly by official Block & District administrative envelopes. | *LGD Revenue Village Centroids + Block-Bounded Voronoi Tessellation* |
| **`APPROXIMATE`** | Estimated boundary geometry for non-cadastral forest fringe, open-cast mining leases, or border buffer zones under cadastral revision. | *Non-Cadastral Mining/Forest Fringe Buffer Boundary* |

### Audit & Inspection Access:
- **API Endpoint:** `GET /map/panchayats/{gp_code}` and `GET /panchayats/{gp_code}` return `boundary_source` and `boundary_quality`.
- **Frontend Deep-Dive Drawer:** Displays the boundary quality tag directly below the GP title.
- **Classification Script:** Re-classifiable at any time via `python scripts/classify_gp_boundaries.py`.

