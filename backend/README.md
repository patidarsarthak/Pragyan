# 🚀 SIH26074 Backend API Service

**Project:** Smart Panchayat Climate & Geospatial Intelligence Platform (SIH26074)  
**Target Domain:** Dhanbad District, Jharkhand (239 Gram Panchayats across 10 Administrative Blocks)  
**Framework:** FastAPI 0.141+ with Uvicorn ASGI Server  
**Data Sources:** Phase 3 Live NWP Ingestion Parquet Store (`data/forecasts/`), Phase 4 Advisory Engine (`ml/results/sample_advisories.csv`), and Static Panchayat Terrain Database (`data/static/panchayat_terrain_landcover.csv`).

---

## 1. Quick Start: Running the Server Locally

### Start Uvicorn Server
From the project root directory:
```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Interactive API Documentation
Once the server is running, navigate in any browser to:
- **Swagger UI Interactive Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **OpenAPI JSON Schema:** [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

---

## 2. API Endpoint Specifications

### 1. `GET /panchayats`
Returns the complete geospatial and terrain registry for all 239 Gram Panchayats in Dhanbad District for frontend map rendering and selection.

- **Query Parameters:**
  - `block` *(optional, string)*: Filter Panchayats by Administrative Block name (e.g., `Topchanchi`, `Baghmara`, `Tundi`, `Govindpur`, `Baliapur`).
- **Example Request:**
  ```bash
  curl -X GET "http://127.0.0.1:8000/panchayats?block=Topchanchi"
  ```
- **Sample JSON Response:**
  ```json
  {
    "total_count": 28,
    "panchayats": [
      {
        "gpcode": 111904,
        "gpname": "CHALDHOWAN",
        "block": "Topchanchi",
        "district": "Dhanbad",
        "state": "Jharkhand",
        "latitude": 23.9312,
        "longitude": 86.2145,
        "elevation_m": 298.4,
        "slope_deg": 6.82,
        "landcover_class": 12,
        "landcover_name": "Cropland"
      }
    ]
  }
  ```

---

### 2. `GET /forecast/{gpcode}`
Retrieves the hyper-local downscaled 5-variable meteorological forecast and standardized 80% bootstrap uncertainty bounds for a given Panchayat.

- **Path Parameters:**
  - `gpcode` *(required, integer, 6-digit LGD code)*: e.g. `111722` (BAGDAHA).
- **Query Parameters:**
  - `date` *(optional, string, YYYY-MM-DD)*: Filter to a specific forecast date. If omitted, returns all 10 available forecast lead days.
- **Example Request (Specific Date):**
  ```bash
  curl -X GET "http://127.0.0.1:8000/forecast/111722?date=2026-09-25"
  ```
- **Sample JSON Response:**
  ```json
  {
    "gpcode": 111722,
    "panchayat": "BAGDAHA",
    "block": "Baghmara",
    "run_timestamp": "2026-09-25T17:48:03Z",
    "forecast_days_count": 1,
    "forecasts": [
      {
        "date": "2026-09-25",
        "predictions": {
          "RAINFALL": {
            "variable": "RAINFALL",
            "predicted_value": 34.12,
            "uncertainty_lower": 34.10,
            "uncertainty_upper": 34.15,
            "confidence_pct": 80.0
          },
          "TEMPERATURE": {
            "variable": "TEMPERATURE",
            "predicted_value": 25.14,
            "uncertainty_lower": 25.14,
            "uncertainty_upper": 25.14,
            "confidence_pct": 80.0
          },
          "HUMIDITY": {
            "variable": "HUMIDITY",
            "predicted_value": 95.37,
            "uncertainty_lower": 95.37,
            "uncertainty_upper": 95.37,
            "confidence_pct": 80.0
          },
          "WIND_SPEED": {
            "variable": "WIND_SPEED",
            "predicted_value": 7.92,
            "uncertainty_lower": 7.91,
            "uncertainty_upper": 7.92,
            "confidence_pct": 80.0
          },
          "EVAPOTRANSPIRATION": {
            "variable": "EVAPOTRANSPIRATION",
            "predicted_value": 1.71,
            "uncertainty_lower": 1.71,
            "uncertainty_upper": 1.72,
            "confidence_pct": 80.0
          }
        }
      }
    ]
  }
  ```

---

### 3. `GET /advisory/{gpcode}`
Retrieves decision-grade agro-meteorological advisories generated from multi-variable rules (water balance, thermal index, chemical spray windows, and disease alerts).

- **Path Parameters:**
  - `gpcode` *(required, integer)*: Local Government Directory code (e.g., `111722`).
- **Query Parameters:**
  - `date` *(optional, string, YYYY-MM-DD)*: Target forecast date.
  - `crop` *(optional, string)*: Filter by crop keyword (e.g., `Paddy`, `Maize`, `Mustard`, `Vegetables`).
- **Example Request:**
  ```bash
  curl -X GET "http://127.0.0.1:8000/advisory/111722?date=2026-09-25&crop=Paddy"
  ```
- **Sample JSON Response:**
  ```json
  {
    "gpcode": 111722,
    "panchayat": "BAGDAHA",
    "block": "Baghmara",
    "date_filtered": "2026-09-25",
    "crop_filtered": "Paddy",
    "total_advisories": 1,
    "advisories": [
      {
        "gpcode": 111722,
        "panchayat": "BAGDAHA",
        "block": "Baghmara",
        "date": "2026-09-25",
        "crop": "Paddy (Rice) (Panicle Initiation to Flowering)",
        "advisory_text": "[IRRIGATION] Heavy precipitation forecast (35.2 mm) substantially exceeds daily evapotranspirational demand (1.7 mm/day). Suspend all irrigation immediately. Ensure drainage trenches are unobstructed to prevent prolonged waterlogging around roots. [FIELD OPERATIONS] Unfavorable weather for chemical application: wind speed (7.6 m/s) exceeds 15 km/h threshold and/or rain (35.2 mm) threatens foliar washout. Postpone all pesticide/fungicide sprays and top-dressing of nitrogenous fertilizers to avoid chemical drift and runoff losses. [DISEASE ALERT] Sustained high humidity (95.4%) and warm cloudy conditions (25.0°C) strongly favor Rice Blast and Brown Spot sporulation. Scout lower canopy for diamond-shaped lesions. Once spray window permits, apply prophylactic Tricyclazole 75% WP @ 0.6 g/L water.",
        "triggering_variables": "HUMIDITY + TEMPERATURE + RAINFALL | RAINFALL + EVAPOTRANSPIRATION | WIND_SPEED + RAINFALL",
        "confidence_pct": 80.0
      }
    ]
  }
  ```

---

### 4. `GET /forecast/district-summary`
Provides a unified multi-hazard risk assessment across all 239 Gram Panchayats for choropleth and marker layer visualization on frontend geospatial maps.

- **Query Parameters:**
  - `date` *(optional, string, YYYY-MM-DD)*: Target forecast date (defaults to earliest available forecast date).
- **Example Request:**
  ```bash
  curl -X GET "http://127.0.0.1:8000/forecast/district-summary?date=2026-09-25"
  ```
- **Sample JSON Response:**
  ```json
  {
    "date": "2026-09-25",
    "run_timestamp": "2026-09-25T17:48:03Z",
    "total_panchayats": 239,
    "rainfall_summary": {
      "min_mm": 31.84,
      "mean_mm": 36.00,
      "max_mm": 40.12,
      "panchayats_with_rain": 239,
      "panchayats_heavy_rain": 142
    },
    "risk_distribution": {
      "No Rain": 0,
      "Very Light Rain": 0,
      "Light Rain": 0,
      "Moderate Rain": 97,
      "Heavy Rain": 142,
      "Very Heavy Rain": 0
    },
    "panchayat_risk_assessments": [
      {
        "gpcode": 111722,
        "panchayat": "BAGDAHA",
        "block": "Baghmara",
        "latitude": 23.8214,
        "longitude": 86.2085,
        "rainfall_mm": 34.12,
        "rainfall_risk_level": "Moderate Rain",
        "temperature_c": 25.14,
        "heat_stress_level": "Normal",
        "humidity_pct": 95.4,
        "wind_speed_ms": 7.92,
        "spray_window_status": "Suspended (Drift/Washout Risk)",
        "evapotranspiration_mm": 1.71,
        "confidence_pct": 80.0
      }
    ]
  }
  ```

---

## 3. Error Responses & Status Codes

| HTTP Status | Condition | Example Response Body |
| :---: | :--- | :--- |
| **`200 OK`** | Query successful and data found | Valid structured JSON conforming to schema models |
| **`404 Not Found`** | Unknown GPCODE or date outside forecast horizon | `{"detail": "GPCODE 999999 not found in Dhanbad Panchayat registry."}` |
| **`422 Unprocessable Entity`** | Invalid parameter format (e.g. malformed date string) | `{"detail": [{"loc": ["query", "date"], "msg": "string does not match regex pattern", ...}]}` |
| **`500 Internal Server Error`** | Unhandled server exception | `{"detail": "Failed to retrieve forecast: ..."}` |

---

## 4. Architecture & Cache Invalidation

- **Static Cache:** Panchayat centroid coordinates, elevations, and land covers are loaded into memory once on startup, yielding `<1ms` lookup response times.
- **Dynamic File Invalidation:** `backend/services.py` monitors the `mtime` of the latest forecast file in `data/forecasts/`. When a new Phase 3 forecast ingestion cycle completes and writes an updated parquet snapshot, the backend automatically detects the modification and refreshes the cache without requiring a server restart.
- **CORS Enabled:** Wildcard origin middleware is enabled, allowing seamless AJAX/fetch calls from Vite, Next.js, or plain HTML/Leaflet map frontends running on localhost.
