-- ============================================================================
-- SIH26074: Smart Panchayat Climate & Geospatial Intelligence Platform
-- PostgreSQL + PostGIS Authoritative Schema Definition
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. States & Union Territories
CREATE TABLE IF NOT EXISTS states (
    state_code INTEGER PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL UNIQUE,
    state_type VARCHAR(20) NOT NULL DEFAULT 'State',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Districts
CREATE TABLE IF NOT EXISTS districts (
    district_code INTEGER PRIMARY KEY,
    district_name VARCHAR(100) NOT NULL,
    state_code INTEGER NOT NULL REFERENCES states(state_code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_districts_state ON districts(state_code);

-- 3. Administrative Blocks / Tehsils
CREATE TABLE IF NOT EXISTS blocks (
    block_code INTEGER PRIMARY KEY,
    block_name VARCHAR(100) NOT NULL,
    district_code INTEGER NOT NULL REFERENCES districts(district_code) ON DELETE CASCADE,
    state_code INTEGER NOT NULL REFERENCES states(state_code) ON DELETE CASCADE,
    area_sq_km NUMERIC(10, 2),
    centroid_lat NUMERIC(9, 6),
    centroid_lon NUMERIC(9, 6),
    geometry GEOMETRY(Geometry, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blocks_district ON blocks(district_code);
CREATE INDEX IF NOT EXISTS idx_blocks_geom ON blocks USING GIST(geometry);

-- 4. Authoritative Gram Panchayats (Real Administrative Polygons)
CREATE TABLE IF NOT EXISTS panchayats (
    id SERIAL PRIMARY KEY,
    gp_code INTEGER NOT NULL UNIQUE, -- LGD Code
    gp_name VARCHAR(150) NOT NULL,
    block_code INTEGER NOT NULL REFERENCES blocks(block_code) ON DELETE CASCADE,
    block_name VARCHAR(100) NOT NULL,
    district_code INTEGER NOT NULL REFERENCES districts(district_code) ON DELETE CASCADE,
    district_name VARCHAR(100) NOT NULL,
    state_code INTEGER NOT NULL REFERENCES states(state_code) ON DELETE CASCADE,
    state_name VARCHAR(100) NOT NULL,
    geometry GEOMETRY(Geometry, 4326) NOT NULL, -- Real Polygon
    centroid_lat NUMERIC(9, 6) NOT NULL,
    centroid_lon NUMERIC(9, 6) NOT NULL,
    area_sq_km NUMERIC(10, 3) NOT NULL,
    source VARCHAR(200) NOT NULL DEFAULT 'Local Government Directory (LGD) / Survey of India / Bharat Maps',
    source_version VARCHAR(50) NOT NULL DEFAULT '2024.1',
    boundary_source VARCHAR(150) NOT NULL DEFAULT 'LGD / Survey of India / Bharat Maps',
    boundary_quality VARCHAR(20) NOT NULL DEFAULT 'DERIVED' CHECK (boundary_quality IN ('OFFICIAL', 'DERIVED', 'APPROXIMATE')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_panchayats_gp_code ON panchayats(gp_code);
CREATE INDEX IF NOT EXISTS idx_panchayats_block ON panchayats(block_code);
CREATE INDEX IF NOT EXISTS idx_panchayats_district ON panchayats(district_code);
CREATE INDEX IF NOT EXISTS idx_panchayats_geom ON panchayats USING GIST(geometry);

-- 5. Weather Observation Stations (IMD AWS, ARG, CWC, Agro-KVK)
CREATE TABLE IF NOT EXISTS weather_stations (
    station_id VARCHAR(50) PRIMARY KEY,
    station_name VARCHAR(150) NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    elevation_m NUMERIC(7, 2),
    station_type VARCHAR(50) NOT NULL, -- IMD_AWS, ARG, KVK_STATION, CWC_GAUGE
    source VARCHAR(100) NOT NULL,
    district_code INTEGER REFERENCES districts(district_code),
    geometry GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_weather_stations_geom ON weather_stations USING GIST(geometry);

-- 6. Weather Observations (Ground Truth with Explicit Target Quality Flags)
CREATE TABLE IF NOT EXISTS weather_observations (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) REFERENCES weather_stations(station_id),
    gp_code INTEGER NOT NULL REFERENCES panchayats(gp_code) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    rainfall_mm NUMERIC(7, 2),
    temperature_c NUMERIC(5, 2),
    humidity_pct NUMERIC(5, 2),
    wind_speed_ms NUMERIC(6, 2),
    target_quality VARCHAR(30) NOT NULL, -- DIRECT_OBSERVATION, NEARBY_OBSERVATION, INTERPOLATED, SATELLITE_DERIVED, UNAVAILABLE
    observation_distance_km NUMERIC(6, 2),
    source VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_gp_date_obs UNIQUE(gp_code, observation_date)
);
CREATE INDEX IF NOT EXISTS idx_weather_obs_gp_date ON weather_observations(gp_code, observation_date);
CREATE INDEX IF NOT EXISTS idx_weather_obs_quality ON weather_observations(target_quality);

-- 7. Coarse NWP Forecast Ingestions (Area-Weighted Extracted to GP)
CREATE TABLE IF NOT EXISTS weather_forecasts (
    id SERIAL PRIMARY KEY,
    gp_code INTEGER NOT NULL REFERENCES panchayats(gp_code) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    lead_days INTEGER NOT NULL,
    model_source VARCHAR(50) NOT NULL, -- ECMWF_IFS, NOAA_GFS, IMD_NCUM
    coarse_rainfall NUMERIC(7, 2),
    coarse_temperature NUMERIC(5, 2),
    coarse_humidity NUMERIC(5, 2),
    coarse_wind_speed NUMERIC(6, 2),
    coarse_evapotranspiration NUMERIC(6, 2),
    area_weighted_rainfall NUMERIC(7, 2),
    area_weighted_temp NUMERIC(5, 2),
    run_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_gp_fc_lead UNIQUE(gp_code, forecast_date, run_timestamp)
);
CREATE INDEX IF NOT EXISTS idx_forecasts_gp_date ON weather_forecasts(gp_code, forecast_date);

-- 8. Zonal GIS & Environmental Features per Panchayat Polygon
CREATE TABLE IF NOT EXISTS gis_features (
    gp_code INTEGER PRIMARY KEY REFERENCES panchayats(gp_code) ON DELETE CASCADE,
    elevation_mean NUMERIC(7, 2) NOT NULL,
    elevation_min NUMERIC(7, 2) NOT NULL,
    elevation_max NUMERIC(7, 2) NOT NULL,
    slope_mean NUMERIC(6, 3) NOT NULL,
    aspect_mean NUMERIC(6, 2),
    ndvi_mean NUMERIC(4, 3) NOT NULL,
    land_cover_class INTEGER NOT NULL,
    land_cover_name VARCHAR(100) NOT NULL,
    agriculture_fraction NUMERIC(4, 3) NOT NULL,
    forest_fraction NUMERIC(4, 3) NOT NULL,
    water_fraction NUMERIC(4, 3) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Model Runs & Training Experiments
CREATE TABLE IF NOT EXISTS model_runs (
    id SERIAL PRIMARY KEY,
    model_version VARCHAR(50) NOT NULL UNIQUE,
    model_type VARCHAR(100) NOT NULL, -- Joint_MultiOutput_Bootstrap_Ensemble
    train_mae NUMERIC(8, 4),
    train_rmse NUMERIC(8, 4),
    test_mae NUMERIC(8, 4),
    test_rmse NUMERIC(8, 4),
    skill_score_improvement_pct NUMERIC(6, 2),
    trained_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Downscaled Panchayat-Level Predictions (Locked Output Contract)
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    gp_code INTEGER NOT NULL REFERENCES panchayats(gp_code) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    variable VARCHAR(30) NOT NULL, -- RAINFALL, TEMPERATURE, HUMIDITY, WIND_SPEED, EVAPOTRANSPIRATION
    predicted_value NUMERIC(8, 3) NOT NULL,
    uncertainty_lower NUMERIC(8, 3) NOT NULL,
    uncertainty_upper NUMERIC(8, 3) NOT NULL,
    confidence_pct NUMERIC(5, 2) NOT NULL DEFAULT 80.0,
    model_version VARCHAR(50) REFERENCES model_runs(model_version),
    run_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_pred_key UNIQUE(gp_code, prediction_date, variable, run_timestamp)
);
CREATE INDEX IF NOT EXISTS idx_predictions_lookup ON predictions(gp_code, prediction_date, variable);

-- 11. Multi-Variable Agro-Meteorological Advisories
CREATE TABLE IF NOT EXISTS advisories (
    id SERIAL PRIMARY KEY,
    gp_code INTEGER NOT NULL REFERENCES panchayats(gp_code) ON DELETE CASCADE,
    advisory_date DATE NOT NULL,
    crop VARCHAR(100) NOT NULL,
    growth_stage VARCHAR(100) NOT NULL,
    advisory_text TEXT NOT NULL,
    triggering_variables VARCHAR(200) NOT NULL,
    confidence_pct NUMERIC(5, 2) NOT NULL,
    rule_source VARCHAR(100) NOT NULL DEFAULT 'ICAR-KVK Dhanbad / BAU Ranchi AAS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_advisories_gp_date ON advisories(gp_code, advisory_date);

-- 12. Data Sources & Provenance Transparency Registry
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(150) NOT NULL UNIQUE,
    data_type VARCHAR(50) NOT NULL, -- ADMINISTRATIVE, WEATHER_FORECAST, WEATHER_OBSERVATION, TERRAIN_DEM, LAND_COVER
    provider VARCHAR(150) NOT NULL,
    spatial_resolution VARCHAR(50) NOT NULL,
    temporal_resolution VARCHAR(50) NOT NULL,
    access_tier VARCHAR(50) NOT NULL, -- OPEN_ACCESS, GOVERNMENT_PORTAL, RESEARCH_TIER
    citation TEXT NOT NULL
);

-- 13. Crowdsourced Ground Reports (Unverified Citizen/Farmer Observations)
CREATE TABLE IF NOT EXISTS crowd_reports (
    id SERIAL PRIMARY KEY,
    gp_code INTEGER NOT NULL REFERENCES panchayats(gp_code) ON DELETE CASCADE,
    rain_category VARCHAR(32) NOT NULL, -- 'none', 'light', 'moderate', 'heavy'
    rainfall_amount_mm NUMERIC(6, 2),
    photo_url VARCHAR(512),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    device_hash VARCHAR(64) NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'CROWDSOURCED_UNVERIFIED',
    is_plausible BOOLEAN DEFAULT TRUE,
    plausibility_reason VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_crowd_gp_time ON crowd_reports(gp_code, timestamp);
CREATE INDEX IF NOT EXISTS idx_crowd_device_time ON crowd_reports(device_hash, timestamp);

-- 14. Terrain & Regional Downscaling Skill Verification
CREATE TABLE IF NOT EXISTS terrain_skills (
    id SERIAL PRIMARY KEY,
    region_id VARCHAR(50) NOT NULL DEFAULT 'dhanbad_jharkhand',
    variable VARCHAR(30) NOT NULL DEFAULT 'TEMPERATURE',
    elevation_band VARCHAR(50) NOT NULL, -- '<200m', '200-400m', '>400m', 'ALL'
    terrain_type VARCHAR(50) NOT NULL,   -- 'Plateau', 'Valley', 'ALL', etc.
    n_stations INTEGER NOT NULL,
    coarse_mae NUMERIC(6, 4) NOT NULL,
    model_mae NUMERIC(6, 4) NOT NULL,
    skill_improvement_pct NUMERIC(6, 2) NOT NULL,
    skill_flag VARCHAR(20) NOT NULL CHECK (skill_flag IN ('VALIDATED', 'LOW_CONFIDENCE')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_terrain_skills_lookup ON terrain_skills(region_id, elevation_band, terrain_type);

