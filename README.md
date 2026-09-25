# 🌾 SIH26074 — Smart Panchayat Climate & Geospatial Intelligence Platform

**Phase 1 Deliverable:** Data Sourcing, Provenance Audit, Static Geography & Unified Long-Format Dataset  
**Target Domain:** Dhanbad District, Jharkhand, India (239 Gram Panchayats, 10 Administrative Blocks)  
**Temporal Coverage:** 2020-01-01 to 2024-12-31 (1,827 continuous daily timesteps)

---

## 📁 Repository Structure

```plaintext
sih26074/
├── data/
│   ├── PROVENANCE_AUDIT.md            # Comprehensive provenance audit & Go/No-Go matrix for all 5 variables
│   ├── FORECAST_SOURCE_NOTES.md       # Tested, live-verified ECMWF IFS & NOAA GFS 1-10 day forecast pipeline
│   ├── static/                        # Freshly sourced geospatial terrain & boundary data
│   │   ├── dhanbad_panchayat_boundaries.geojson  # GeoJSON FeatureCollection of 239 Gram Panchayat centroids
│   │   └── panchayat_terrain_landcover.csv       # LGD codes, SRTM elevation, slope, and ESA WorldCover classes
│   ├── raw/                           # Raw cached ECMWF ERA5-Land reanalysis JSON extractions (26 grid cells)
│   ├── unified/                       # Unified long-format time series dataset (2,183,265 rows)
│   │   ├── panchayat_weather_long_2020-24.parquet # High-efficiency Parquet format (5.7 MB)
│   │   └── panchayat_weather_long_2020-24.csv.gz  # Portable compressed CSV format (10.5 MB)
│   └── scripts/                       # Sourcing & verification scripts
│       ├── generate_static_geography.py  # Builds static terrain from LGD, SRTM DEM, and ESA WorldCover
│       ├── build_unified_dataset.py      # Extracts coarse/fine time series and compiles long schema
│       ├── verify_unified_dataset.py     # Standalone 6-phase data quality audit script
│       └── unified_dataset_quality_report.md # Generated verification report (All checks passed)
├── ml/                                # Phase 2 Joint Multi-Output Downscaling Engine (Planned)
├── backend/                           # Phase 3 FastAPI Real-time Advisory Engine (Planned)
├── frontend/                          # Phase 3 Hyperlocal Geospatial Dashboard (Planned)
└── docs/                              # Project documentation & architectural assets
```

---

## 🎯 Phase 1 Scope & Five Core Parameters

| Variable | Unit | Coarse Source (9 km) | Fine Source (~5 km) | Phase 2 Modeling Strategy |
| :--- | :---: | :--- | :--- | :---: |
| **Rainfall** | `mm/day` | ECMWF ERA5-Land (0.1°) | UCSB CHIRPS v2.0 (0.05°) | **Residual Correction ($\hat{Y} = X_{\text{coarse}} + \hat{R}$)** |
| **Temperature** | `°C` | ECMWF ERA5-Land (0.1°) | None (IMD is 0.25°/1.0°) | **Direct Prediction ($\hat{Y} = f(X)$)** |
| **Relative Humidity** | `%` | ECMWF ERA5-Land (0.1°) | None (Sparse AWS station network) | **Direct Prediction ($\hat{Y} = f(X)$)** |
| **Wind Speed** | `m/s` | ECMWF ERA5-Land (0.1°) | None (No terrestrial fine grid) | **Direct Prediction ($\hat{Y} = f(X)$)** |
| **Evapotranspiration** | `mm/day` | ECMWF ERA5-Land (0.1°) | None (MOD16 is 8-day composite) | **Direct Prediction ($\hat{Y} = f(X)$)** |

---

## 📊 Unified Long-Format Dataset Specification

- **File:** `data/unified/panchayat_weather_long_2020-24.parquet`
- **Total Records:** `2,183,265` rows (239 Panchayats × 1,827 days × 5 variables)
- **Primary Schema:**
  - `GPCODE`: Unique 6-digit LGD Panchayat code (e.g. `111722`)
  - `DATE`: ISO timestamp `YYYY-MM-DD`
  - `VARIABLE`: Parameter name (`RAINFALL`, `TEMPERATURE`, `HUMIDITY`, `WIND_SPEED`, `EVAPOTRANSPIRATION`)
  - `VALUE_COARSE`: Coarse resolution reference (ERA5-Land 0.1° / ~9 km)
  - `VALUE_FINE`: Fine resolution target observation (CHIRPS for rainfall; `null` for direct-prediction variables)
  - `UNIT`: Physical unit (`mm/day`, `degC`, `%`, `m/s`)
  - `COARSE_SOURCE`: Data provider citation
  - `FINE_SOURCE`: Ground-truth citation
  - `PREDICTION_MODE`: Formulation directive (`residual_correction` vs `direct_prediction`)
  - `GPNAME`, `BLOCK`, `DISTRICT`: Administrative hierarchy
  - `ELEVATION_M`, `SLOPE_DEG`, `LANDCOVER_CLASS`: Static topography & land use features

---

## 🚀 Running Verification & Reproducing

```bash
# 1. Generate static terrain & boundaries
python data/scripts/generate_static_geography.py

# 2. Extract coarse reanalysis & build unified dataset
python data/scripts/build_unified_dataset.py

# 3. Run standalone quality verification
python data/scripts/verify_unified_dataset.py
```
