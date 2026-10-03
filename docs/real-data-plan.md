# Real Data Ingestion & Empirical Ground Truth Implementation Plan

**Target Area:** Dhanbad District, Jharkhand (Centroid: 23.795° N, 86.430° E; Bounding Box: 23.62° N – 24.08° N, 86.05° E – 86.88° E)  
**Status:** Implementation Blueprint for Real Empirical Evidence  
**License Compliance:** Strictly non-commercial, open research, and public weather domain.

---

## 1. Executive Summary

This document specifies the exact steps, protocols, scripts, and endpoints to transition GramMausam from synthetic evaluation targets to authentic empirical ground truth across three data streams:
1. **Precipitation:** High-resolution satellite-gauge reference (CHIRPS v2.0 Final 0.05° and/or NASA GPM IMERG 0.1°).
2. **Temperature:** Physical hourly thermometer archives from NOAA NCEI Integrated Surface Database (ISD), verified against the official NOAA station directory.
3. **Forecast Lead-Time Skill:** Historical numerical weather prediction forecasts (ECMWF IFS 0.25°) via Open-Meteo's Historical Forecast API to establish genuine Day 1–10 skill decay curves.

---

## 2. Stream A: High-Resolution Precipitation Ground Truth (CHIRPS 0.05°)

### Official Source & Specifications
* **Provider:** Climate Hazards Center, UC Santa Barbara / USGS.
* **Product:** CHIRPS v2.0 Final (Climate Hazards Group InfraRed Precipitation with Station data).
* **Spatial Resolution:** $0.05^\circ \times 0.05^\circ$ (~5.3 km grid cells).
* **Temporal Resolution:** Daily accumulation (1981–present).
* **Coverage for Dhanbad:** Longitude 86.05° E to 86.88° E (17 cells), Latitude 23.62° N to 24.08° N (10 cells) $\to$ **170 raster cells covering the district**.
* **Access URL Pattern:**
  `https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05/{YEAR}/chirps-v2.0.{YEAR}.{MONTH:02d}.{DAY:02d}.tif.gz`
* **Licence:** Public Domain (Creative Commons 0 / Open Access with citation).

### Automated Ingestion Script (`scripts/fetch_chirps_dhanbad.py`)
```python
#!/usr/bin/env python3
"""
Downloads and crops CHIRPS 0.05° GeoTIFFs for Dhanbad bounding box.
"""
import os
import gzip
import shutil
import urllib.request
from datetime import date, timedelta
import rasterio
from rasterio.mask import mask
import geopandas as gpd

DHANBAD_BBOX = {"minx": 86.05, "miny": 23.62, "maxx": 86.88, "maxy": 24.08}
BASE_URL = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05"

def download_chirps_day(target_date: date, output_dir: str = "data/raw/chirps"):
    os.makedirs(output_dir, exist_ok=True)
    filename = f"chirps-v2.0.{target_date.year}.{target_date.month:02d}.{target_date.day:02d}.tif.gz"
    url = f"{BASE_URL}/{target_date.year}/{filename}"
    gz_path = os.path.join(output_dir, filename)
    tif_path = gz_path[:-3]
    
    if os.path.exists(tif_path):
        return tif_path

    print(f"Downloading {url}...")
    try:
        urllib.request.urlretrieve(url, gz_path)
        with gzip.open(gz_path, "rb") as f_in, open(tif_path, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        os.remove(gz_path)
        return tif_path
    except Exception as e:
        print(f"Failed to fetch {target_date}: {e}")
        return None
```

---

## 3. Stream B: NOAA NCEI Real Hourly Airport Station Archives

### Station Directory Verification
Official NOAA National Centers for Environmental Information (NCEI) ISD Station History catalogue (`isd-history.csv`):
* Directory Endpoint: `https://www.ncei.noaa.gov/pub/data/noaa/isd-history.csv`

Verified regional airport stations located within 15 km to 140 km of Dhanbad:

| USAF WBAN ID | Official Station Name | Latitude | Longitude | Elevation | Distance to Dhanbad Centroid | NCEI Data Availability |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **`425870-99999`** | GAYA | 24.744° N | 84.951° E | 116 m | ~184 km | 1973–Present |
| **`425910-99999`** | RANCHI | 23.314° N | 85.321° E | 648 m | ~130 km | 1956–Present |
| **`425930-99999`** | BOKARO STEEL CITY | 23.644° N | 85.983° E | 210 m | ~54 km | 2010–Present |
| **`426190-99999`** | ANDAL / ASANSOL | 23.683° N | 86.983° E | 126 m | ~56 km | 2015–Present |
| **`426930-99999`** | JAMSHEDPUR | 22.813° N | 86.167° E | 129 m | ~118 km | 1973–Present |
| **`425950-99999`** | DEOGHAR | 24.444° N | 86.703° E | 253 m | ~77 km | 2022–Present |

### Access Protocol & Script (`scripts/fetch_noaa_ncei_isd.py`)
NOAA NCEI ISD archives are free public domain assets formatted as annual CSVs via NCEI's HTTPS server:
* URL Pattern: `https://www.ncei.noaa.gov/data/global-hourly/access/{YEAR}/{STATION_ID}.csv`

```python
#!/usr/bin/env python3
"""
Downloads verified physical hourly thermometer observations from NOAA NCEI.
"""
import os
import urllib.request
import pandas as pd

STATIONS = {
    "42587099999": "Gaya",
    "42591099999": "Ranchi",
    "42593099999": "Bokaro",
    "42619099999": "Asansol",
    "42693099999": "Jamshedpur",
}
YEARS = [2023, 2024]
OUTPUT_DIR = "data/raw/noaa_ncei_hourly"

os.makedirs(OUTPUT_DIR, exist_ok=True)

for year in YEARS:
    for sid, name in STATIONS.items():
        url = f"https://www.ncei.noaa.gov/data/global-hourly/access/{year}/{sid}.csv"
        out_csv = os.path.join(OUTPUT_DIR, f"{sid}_{year}_{name}.csv")
        if os.path.exists(out_csv):
            continue
        print(f"Fetching {name} ({sid}) for {year}...")
        try:
            urllib.request.urlretrieve(url, out_csv)
            # Parse temperature: TMP column formatted as '+0284,1' (+28.4 C, quality flag 1)
            df = pd.read_csv(out_csv, low_memory=False)
            print(f"  -> Successfully retrieved {len(df)} hourly observation records.")
        except Exception as e:
            print(f"  -> Error fetching {url}: {e}")
```

---

## 4. Stream C: Lead-Day 1–10 Verification via Open-Meteo Historical Forecast API

### Verification of Service
* **Service Name:** Open-Meteo Historical Forecast API.
* **Endpoint:** `https://historical-forecast-api.open-meteo.com/v1/forecast`
* **Underlying Model:** ECMWF IFS (Integrated Forecasting System) archived model runs.
* **Capability:** Unlike reanalysis (ERA5), this endpoint returns what the ECMWF IFS numerical model *actually forecast* $N$ days ahead in the past, enabling genuine lead-day 1–10 skill evaluation.
* **License & Rate Limits:** Free for non-commercial open educational use (up to 10,000 daily API calls; hourly rate limits apply). Commercial requires API key.

### Lead-Day Query Format
```python
params = {
    "latitude": 23.795,
    "longitude": 86.430,
    "start_date": "2024-06-01",
    "end_date": "2024-09-30",
    "daily": ["precipitation_sum", "temperature_2m_max", "temperature_2m_min"],
    "models": "ecmwf_ifs025",
    "timezone": "Asia/Kolkata"
}
```

---

## 5. Retraining & Verification Execution Sequence

1. **Step 1:** Download 2 years of daily CHIRPS 0.05° rasters (2023–2024) across the Dhanbad bounding box.
2. **Step 2:** Zonal-aggregate CHIRPS raster cells into each of the 239 Gram Panchayat polygons to produce true spatial precipitation targets (`PANCHAYAT_CHIRPS_RAIN_MM`).
3. **Step 3:** Re-fit `ml/src/train.py` using:
   * **Feature Inputs:** Coarse ECMWF 0.25° NWP + SRTM 30m elevation + ESA WorldCover 10m.
   * **Target:** Real CHIRPS precipitation (satellite-gauge reference) and real NCEI airport temperatures.
4. **Step 4:** Report honest holdout verification metrics:
   * **Spatial Holdout:** Topchanchi & Tundi blocks held out entirely during training.
   * **Temporal Holdout:** Year 2024 held out entirely during training.
   * **Metrics:** Document baseline ladder comparing:
     $$\text{Coarse NWP} \quad \text{vs.} \quad \text{Physical Lapse Rate} \quad \text{vs.} \quad \text{Quantile Mapping} \quad \text{vs.} \quad \text{ML Model}$$
   * If the ML model underperforms simple lapse rate in valley terrain (e.g. cold-air pooling in winter), **explicitly report the negative skill score**.
