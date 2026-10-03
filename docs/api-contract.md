# API Contract & Schema Specification: GramMausam (SIH26074)
**Backend Service:** FastAPI v3.0  
**Host & Port:** `http://127.0.0.1:8000`  
**Canonical Route Standard:** Root service routes (`/states`, `/districts`, `/blocks`, `/panchayats/{gp_code}/*`, `/map/*`, `/model/*`, `/replay/*`) are canonical.  
**Canonical Identifier Standard:** `gp_code: number` (official Local Government Directory Gram Panchayat code).  
**Data Standards:** JSON (RFC 8259), GeoJSON (RFC 7946), OASIS CAP v1.2 XML (ITU-T X.1303)  
**Date:** October 2026 (Revised Canonical Edition)  

---

## 1. System & Health Endpoints

### 1.1 `GET /health`
- **Purpose:** System liveness, database connectivity, and spatial index status.
- **Canonical Route:** `GET /health`
- **Response Schema:**
  ```typescript
  interface SystemHealthResponse {
    status: "ok" | "degraded";
    database: "connected" | "disconnected";
    spatial_index: {
      total_panchayats_indexed: number; // 239
      pilot_district_code: number;      // 336 (Dhanbad)
      status: "ready" | "initializing";
    };
    version: string;
    timestamp: string;                  // ISO 8601 UTC
  }
  ```

### 1.2 `GET /api/system`
- **Purpose:** Pilot scope declaration and dataset provenance.
- **Canonical Route:** `GET /api/system`
- **Response Schema:**
  ```typescript
  interface SystemMetadataResponse {
    project: string;
    primary_spatial_unit: string;
    ml_pilot_district: "Dhanbad (239 Gram Panchayats, Jharkhand)";
    data_vintage: "Archived 2024 Test-Period Data";
    all_india_coverage: "Coarse Synoptic Only";
  }
  ```

---

## 2. Administrative Hierarchy & Spatial Boundary Endpoints

### 2.1 `GET /states`
- **Canonical Route:** `GET /states`
- **Response:** `Array<StateItem>`
  ```typescript
  interface StateItem {
    state_code: number;          // Official MoPR LGD Code (e.g. 20 for Jharkhand)
    state_name: string;          // "Jharkhand"
    state_type: "State" | "UT";
    is_pilot: boolean;           // True strictly for Jharkhand (Dhanbad Pilot)
    centroid_lat: number | null;
    centroid_lon: number | null;
  }
  ```

### 2.2 `GET /states/{state_id}/districts`
- **Canonical Route:** `GET /states/{state_id}/districts`
- **Path Parameter:** `state_id` (number, LGD state code).
- **Response:** `Array<DistrictItem>`
  ```typescript
  interface DistrictItem {
    district_code: number;       // e.g. 336 for Dhanbad
    district_name: string;       // "Dhanbad"
    state_code: number;          // 20
    is_pilot: boolean;           // True for Dhanbad (336)
    total_blocks: number;        // 10
    total_gps: number;           // 239
    centroid_lat: number | null;
    centroid_lon: number | null;
  }
  ```

### 2.3 `GET /districts/{district_id}/blocks`
- **Canonical Route:** `GET /districts/{district_id}/blocks`
- **Path Parameter:** `district_id` (number, e.g. 336).
- **Response:** `Array<BlockItem>`
  ```typescript
  interface BlockItem {
    block_code: number;          // e.g. 2361 for Topchanchi
    block_name: string;          // "Topchanchi"
    district_code: number;       // 336
    state_code: number;          // 20
    area_sq_km: number | null;
    centroid_lat: number | null;
    centroid_lon: number | null;
  }
  ```

### 2.4 `GET /blocks/{block_id}/panchayats`
- **Canonical Route:** `GET /blocks/{block_id}/panchayats`
- **Path Parameter:** `block_id` (number, e.g. 2361).
- **Response:** `Array<PanchayatListItem>`
  ```typescript
  interface PanchayatListItem {
    gp_code: number;             // LGD Gram Panchayat Code (canonical)
    gp_name: string;             // "Topchanchi"
    block_name: string;          // "Topchanchi"
    district_name: string;       // "Dhanbad"
    state_name: string;          // "Jharkhand"
    latitude: number;
    longitude: number;
    elevation_m: number;         // SRTM 30m mean elevation
    slope_deg: number;           // Terrain slope in degrees
    landcover_class: number;     // ESA WorldCover primary class code
    landcover_name: string;      // e.g. "Cropland"
  }
  ```

### 2.5 `GET /map/panchayats`
- **Canonical Route:** `GET /map/panchayats`
- **Query Parameters:** `block_code` (optional number), `bbox` (optional string).
- **Response:** Standard GeoJSON `FeatureCollection` containing all 239 real closed Gram Panchayat polygons of Dhanbad.

### 2.6 `GET /map/forecast-frames`
- **Canonical Route:** `GET /map/forecast-frames`
- **Query Parameters:** `days` (number 1..10, default 10).
- **Purpose:** Bulk precomputed daily forecast frames with the official uncertainty hatching signal.
- **Response Schema:**
  ```typescript
  interface ForecastFramesResponse {
    days_count: number;
    frames: Array<{
      day_index: number;
      date: string;              // YYYY-MM-DD
      q75_ci_threshold: number;  // 75th percentile of 80% CI width across all GPs
      panchayats: Record<string, {
        rainfall_mm: number;
        ci_lower: number;
        ci_upper: number;
        ci_width: number;
        is_high_uncertainty: boolean; // TRUE if ci_width >= q75_ci_threshold (Official Hatching Signal)
      }>;
    }>;
  }
  ```

---

## 3. Meteorological Downscaling & Forecast Endpoints

### 3.1 `GET /panchayats/{gp_code}/weather`
- **Canonical Route:** `GET /panchayats/{gp_code}/weather`
- **Path Parameter:** `gp_code` (number, LGD code).
- **Vintage Attribution:** Must be labeled in the UI as *"Archived 2024 Test-Period Data (ECMWF ERA5-Land Forcing)"*.
- **Response Schema:**
  ```typescript
  interface PanchayatWeatherResponse {
    gp_code: number;
    panchayat_name: string;
    block_name: string;
    district_name: string;
    elevation_m: number;
    run_timestamp: string;
    current_conditions: {
      temperature_c: number;
      rainfall_mm: number;
      humidity_pct: number;
      wind_speed_ms: number;
      wind_speed_kmh: number;     // Canonical wind speed in km/h for UI display
      et0_mm: number;
      source: "MODEL_GENERATED";
    };
    daily_forecasts: Array<{
      date: string;
      lead_day: number;           // 1 to 10
      downscaled: {
        rainfall_mm: number;
        temp_max_c: number;
        temp_min_c: number;
        humidity_pct: number;
        wind_speed_kmh: number;
        et0_mm: number;
      };
      uncertainty_80ci: {
        rain_p10: number;
        rain_p90: number;
        temp_p10: number;
        temp_p90: number;
      };
      coarse_nwp_comparison: {
        rainfall_mm: number;
        temp_max_c: number;
        humidity_pct: number;
        provider: "ECMWF_ERA5_0.25";
      };
      confidence_score: number;   // 0.0 to 1.0
      is_high_uncertainty: boolean;
    }>;
    as_of: string;
  }
  ```

### 3.2 `GET /panchayats/{gp_code}/water-balance`
- **Canonical Route:** `GET /panchayats/{gp_code}/water-balance`
- **Path Parameter:** `gp_code` (number, LGD code).
- **Attribution Policy:** Must be labeled *"Assumed default soil profile (60 cm root zone: FC 140 mm, WP 65 mm, MAD 50%), not measured"*.
- **Response Schema:**
  ```typescript
  interface WaterBalanceResponse {
    gp_code: number;
    panchayat_name: string;
    block_name: string;
    soil_type: string;           // "Deep Black Vertisol (Clay 48%, Organic C 0.58%)"
    crop_profile: string;        // "Paddy (Rice) - Panicle Initiation Phase (Kc = 1.15)"
    root_zone_depth_cm: 60;      // Physical root zone depth represented by soil bucket
    soil_water_parameters: {
      field_capacity_mm: number;           // 140.0
      wilting_point_mm: number;            // 65.0
      total_available_water_mm: number;    // 75.0
      readily_available_water_mm: number;  // 37.5 (MAD = 50%)
    };
    prescriptive_irrigation_advisory: {
      irrigation_urgency: "Urgent" | "Postpone" | "Adequate";
      next_irrigation_lead_days: number;
      prescribed_water_depth_mm: number;
      irrigation_method_recommended: string;
      justification: string;
    };
    ten_day_water_budget: Array<{
      day: string;
      date: string;
      fao56_et0_mm: number;
      crop_etc_mm: number;
      downscaled_rainfall_mm: number;
      effective_rainfall_mm: number;
      soil_moisture_storage_mm: number;
      root_zone_depletion_pct: number;
      action_recommendation: string;
      prescribed_irrigation_mm: number;
    }>;
    physics_formulation: string;
  }
  ```

---

## 4. Agrometeorological Advisory Endpoints

### 4.1 `GET /panchayats/{gp_code}/advisory`
- **Canonical Route:** `GET /panchayats/{gp_code}/advisory`
- **Honesty Flag:** Any historical verification stats returned (`overall_advisory_hit_rate`, `false_alarm_rate`) are hardcoded in backend code and **must be rendered as `NOT YET MEASURED`** on screen.
- **Response Schema:**
  ```typescript
  interface AdvisoryActionItem {
    action: string;
    why: string;
    timing: string;
    confidence: "High" | "Medium" | "Low";
  }

  interface FullAdvisoryResponse {
    gp_code: number;
    panchayat_name: string;
    block_name: string;
    date: string;
    actions: AdvisoryActionItem[];
    // Historical verification is unverified telemetry:
    verification_status: "NOT_YET_MEASURED";
  }
  ```

---

## 5. Severe Weather & CAP 1.2 Disaster Alert Endpoints

### 5.1 `GET /panchayats/{gp_code}/alerts`
- **Canonical Route:** `GET /panchayats/{gp_code}/alerts`
- **Response Schema:**
  ```typescript
  interface PanchayatAlertItem {
    alert_id: string;
    gp_code: number;
    panchayat_name: string;
    block_name: string;
    severity: "Advisory" | "Watch" | "Warning";
    hazard_type: string;
    headline: string;
    description: string;
    effective_from: string;
    expires_at: string;
    cap_xml_url: string;         // e.g. "/panchayats/111722/cap-alert.xml"
  }
  ```

### 5.2 `GET /panchayats/{gp_code}/cap-alert.xml`
- **Canonical Route:** `GET /panchayats/{gp_code}/cap-alert.xml`
- **Format:** OASIS Common Alerting Protocol v1.2 XML (`application/xml`).

---

## 6. Scientific Evidence & Model Validation Endpoints

### 6.1 `GET /model/metrics`
- **Canonical Route:** `GET /model/metrics`
- **Response Schema:**
  ```typescript
  interface ModelMetricsResponse {
    status: string;
    records: Array<{
      Variable: "RAINFALL" | "TEMPERATURE" | "HUMIDITY" | "WIND_SPEED" | "EVAPOTRANSPIRATION";
      Method: string;
      N: number;
      MAE: number;
      RMSE: number;
      Bias: number;
      "Pearson r": number;
      "Skill Score (RMSE %)": string;
      "Skill Score (MAE %)": string;
    }>;
  }
  ```
- **UI Rendering Rule:**
  - `TEMPERATURE` and `HUMIDITY` rows must be labeled:  
    `"Not independent validation (target derived from the same lapse-rate formula)"`.
  - `RAINFALL` row must state:  
    `"Evaluated against elevation-parameterized pseudo-target; in-situ station validation pending."`
  - Critical Success Index (CSI): Display as `NOT YET MEASURED` (not present in repo).

### 6.2 `GET /analytics/coverage-map`
- **Canonical Route:** `GET /analytics/coverage-map`
- **Response:** Distance from each Gram Panchayat centroid in Dhanbad to nearest official weather station.

---

## 7. Past Events (Archived 2024 Model Runs) Endpoints

### 7.1 `GET /replay/events`
- **Canonical Route:** `GET /replay/events`
- **Backend File Location:** `backend/main.py:1311-1450` (Reading from `ml/results/predictions_test2024.parquet`).
- **Response Schema with Explicit Gaps Identified:**
  ```typescript
  interface ReplayDayStep {
    day_num: number;
    date: string;
    mean_rain_mm: number;        // Model downscaled mean
    max_rain_mm: number;         // Model downscaled peak
    peak_gp_code: number;
    ci_lower_mm: number;
    ci_upper_mm: number;
    n_gps_over_50mm: number;
    n_gps_over_80mm: number;
    narration: string;
    
    // BACKEND GAPS (Not present in parquet step data):
    observed_rainfall_mm: null;  // Flagged as NOT RECORDED IN TEST ARCHIVE
    coarse_baseline_mm: null;    // Flagged as NOT RECORDED IN TEST ARCHIVE
  }

  interface ReplayEventItem {
    id: "sep2024_deluge" | "aug2024_inundation" | "jul2024_sowing_spell" | "idukki_kerala";
    title: string;
    location: string;
    subtitle: string;
    dates: string[];
    summary: string;
    days_data: ReplayDayStep[];
    focus_day_idx: number;
  }
  ```
- **UI Rule:** Since parquet events do not supply in-situ observations, the chart shows model prediction distributions and 80% CI bands across Panchayats, with ground observations explicitly marked as `NOT RECORDED IN TEST ARCHIVE`.
