-- ============================================================================
-- SIH26074: High-Scale PostGIS Table Partitioning by State
-- Migration: backend/schema_postgis_partitioned.sql (Optional / Production Scalability)
-- Compatible with PostgreSQL 16+ and PostGIS 3.4+
-- ============================================================================
-- RATIONALE:
-- Scaling from 239 Gram Panchayats (Dhanbad) to ~255,000 Gram Panchayats nationwide
-- generates over 250,000 polygon geometries and millions of forecast rows daily.
-- Partitioning by state_code (LGD state code) enforces declarative partition pruning,
-- keeps spatial GIST index sizes within RAM cache per state, and avoids index bloat.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------------------------------
-- 1. Partitioned Master Table: Gram Panchayats (List Partitioned by state_code)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS panchayats_partitioned (
    id BIGSERIAL,
    gp_code INTEGER NOT NULL,
    gp_name VARCHAR(150) NOT NULL,
    block_code INTEGER NOT NULL,
    block_name VARCHAR(100) NOT NULL,
    district_code INTEGER NOT NULL,
    district_name VARCHAR(100) NOT NULL,
    state_code INTEGER NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    geometry GEOMETRY(Geometry, 4326) NOT NULL,
    centroid_lat NUMERIC(9, 6) NOT NULL,
    centroid_lon NUMERIC(9, 6) NOT NULL,
    area_sq_km NUMERIC(10, 3) NOT NULL,
    source VARCHAR(200) NOT NULL DEFAULT 'LGD / Survey of India / Bharat Maps',
    source_version VARCHAR(50) NOT NULL DEFAULT '2024.1',
    boundary_source VARCHAR(150) NOT NULL DEFAULT 'LGD / Survey of India / Bharat Maps',
    boundary_quality VARCHAR(20) NOT NULL DEFAULT 'DERIVED' CHECK (boundary_quality IN ('OFFICIAL', 'DERIVED', 'APPROXIMATE')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_panchayats_partitioned PRIMARY KEY (state_code, gp_code)
) PARTITION BY LIST (state_code);

-- ----------------------------------------------------------------------------
-- 2. State Partitions (Pilot & Expansion States)
-- ----------------------------------------------------------------------------

-- State 20: Jharkhand (Dhanbad Pilot + 23 Districts) ~4,350 GPs
CREATE TABLE IF NOT EXISTS panchayats_jharkhand PARTITION OF panchayats_partitioned
    FOR VALUES IN (20);
CREATE INDEX IF NOT EXISTS idx_panchayats_jharkhand_geom ON panchayats_jharkhand USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_panchayats_jharkhand_gpcode ON panchayats_jharkhand(gp_code);
CREATE INDEX IF NOT EXISTS idx_panchayats_jharkhand_block ON panchayats_jharkhand(block_code);

-- State 10: Bihar (South & North Bihar Gangetic Plains) ~8,400 GPs
CREATE TABLE IF NOT EXISTS panchayats_bihar PARTITION OF panchayats_partitioned
    FOR VALUES IN (10);
CREATE INDEX IF NOT EXISTS idx_panchayats_bihar_geom ON panchayats_bihar USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_panchayats_bihar_gpcode ON panchayats_bihar(gp_code);

-- State 21: Odisha (Plateau & Coastal Agro-Climatic Zones) ~6,800 GPs
CREATE TABLE IF NOT EXISTS panchayats_odisha PARTITION OF panchayats_partitioned
    FOR VALUES IN (21);
CREATE INDEX IF NOT EXISTS idx_panchayats_odisha_geom ON panchayats_odisha USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_panchayats_odisha_gpcode ON panchayats_odisha(gp_code);

-- State 23: Madhya Pradesh (Malwa, Bundelkhand, Mahakoshal) ~23,000 GPs
CREATE TABLE IF NOT EXISTS panchayats_mp PARTITION OF panchayats_partitioned
    FOR VALUES IN (23);
CREATE INDEX IF NOT EXISTS idx_panchayats_mp_geom ON panchayats_mp USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_panchayats_mp_gpcode ON panchayats_mp(gp_code);

-- State 08: Rajasthan (Semi-Arid & Arid Zones) ~11,300 GPs
CREATE TABLE IF NOT EXISTS panchayats_rajasthan PARTITION OF panchayats_partitioned
    FOR VALUES IN (8);
CREATE INDEX IF NOT EXISTS idx_panchayats_rajasthan_geom ON panchayats_rajasthan USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_panchayats_rajasthan_gpcode ON panchayats_rajasthan(gp_code);

-- State 09: Uttar Pradesh (Gangetic Basin) ~58,000 GPs
CREATE TABLE IF NOT EXISTS panchayats_up PARTITION OF panchayats_partitioned
    FOR VALUES IN (9);
CREATE INDEX IF NOT EXISTS idx_panchayats_up_geom ON panchayats_up USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_panchayats_up_gpcode ON panchayats_up(gp_code);

-- Default Partition: All other States & UTs across India
CREATE TABLE IF NOT EXISTS panchayats_default PARTITION OF panchayats_partitioned
    DEFAULT;
CREATE INDEX IF NOT EXISTS idx_panchayats_default_geom ON panchayats_default USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_panchayats_default_gpcode ON panchayats_default(gp_code);


-- ----------------------------------------------------------------------------
-- 3. Partitioned Forecasts Table (List Partitioned by state_code)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_forecasts_partitioned (
    id BIGSERIAL,
    state_code INTEGER NOT NULL,
    gp_code INTEGER NOT NULL,
    forecast_date DATE NOT NULL,
    lead_days INTEGER NOT NULL,
    model_source VARCHAR(50) NOT NULL,
    coarse_rainfall NUMERIC(7, 2),
    coarse_temperature NUMERIC(5, 2),
    coarse_humidity NUMERIC(5, 2),
    coarse_wind_speed NUMERIC(6, 2),
    coarse_evapotranspiration NUMERIC(6, 2),
    area_weighted_rainfall NUMERIC(7, 2),
    area_weighted_temp NUMERIC(5, 2),
    run_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_forecasts_partitioned PRIMARY KEY (state_code, gp_code, forecast_date, run_timestamp)
) PARTITION BY LIST (state_code);

CREATE TABLE IF NOT EXISTS weather_forecasts_jharkhand PARTITION OF weather_forecasts_partitioned FOR VALUES IN (20);
CREATE INDEX IF NOT EXISTS idx_wf_jharkhand_lookup ON weather_forecasts_jharkhand(gp_code, forecast_date);

CREATE TABLE IF NOT EXISTS weather_forecasts_bihar PARTITION OF weather_forecasts_partitioned FOR VALUES IN (10);
CREATE INDEX IF NOT EXISTS idx_wf_bihar_lookup ON weather_forecasts_bihar(gp_code, forecast_date);

CREATE TABLE IF NOT EXISTS weather_forecasts_mp PARTITION OF weather_forecasts_partitioned FOR VALUES IN (23);
CREATE INDEX IF NOT EXISTS idx_wf_mp_lookup ON weather_forecasts_mp(gp_code, forecast_date);

CREATE TABLE IF NOT EXISTS weather_forecasts_default PARTITION OF weather_forecasts_partitioned DEFAULT;
CREATE INDEX IF NOT EXISTS idx_wf_default_lookup ON weather_forecasts_default(gp_code, forecast_date);


-- ----------------------------------------------------------------------------
-- 4. Partitioned Predictions Table (List Partitioned by state_code)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictions_partitioned (
    id BIGSERIAL,
    state_code INTEGER NOT NULL,
    gp_code INTEGER NOT NULL,
    prediction_date DATE NOT NULL,
    variable VARCHAR(30) NOT NULL,
    predicted_value NUMERIC(8, 3) NOT NULL,
    uncertainty_lower NUMERIC(8, 3) NOT NULL,
    uncertainty_upper NUMERIC(8, 3) NOT NULL,
    confidence_pct NUMERIC(5, 2) NOT NULL DEFAULT 80.0,
    model_version VARCHAR(50) NOT NULL,
    run_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_predictions_partitioned PRIMARY KEY (state_code, gp_code, prediction_date, variable, run_timestamp)
) PARTITION BY LIST (state_code);

CREATE TABLE IF NOT EXISTS predictions_jharkhand PARTITION OF predictions_partitioned FOR VALUES IN (20);
CREATE INDEX IF NOT EXISTS idx_pred_jharkhand_lookup ON predictions_jharkhand(gp_code, prediction_date, variable);

CREATE TABLE IF NOT EXISTS predictions_bihar PARTITION OF predictions_partitioned FOR VALUES IN (10);
CREATE INDEX IF NOT EXISTS idx_pred_bihar_lookup ON predictions_bihar(gp_code, prediction_date, variable);

CREATE TABLE IF NOT EXISTS predictions_mp PARTITION OF predictions_partitioned FOR VALUES IN (23);
CREATE INDEX IF NOT EXISTS idx_pred_mp_lookup ON predictions_mp(gp_code, prediction_date, variable);

CREATE TABLE IF NOT EXISTS predictions_default PARTITION OF predictions_partitioned DEFAULT;
CREATE INDEX IF NOT EXISTS idx_pred_default_lookup ON predictions_default(gp_code, prediction_date, variable);


-- ----------------------------------------------------------------------------
-- 5. Data Migration Utility Script
-- ----------------------------------------------------------------------------
-- Execute to migrate data from unpartitioned panchayats table to partitioned table:
-- INSERT INTO panchayats_partitioned (
--     gp_code, gp_name, block_code, block_name, district_code, district_name,
--     state_code, state_name, geometry, centroid_lat, centroid_lon, area_sq_km,
--     source, source_version, boundary_source, boundary_quality, last_updated
-- )
-- SELECT 
--     gp_code, gp_name, block_code, block_name, district_code, district_name,
--     state_code, state_name, geometry, centroid_lat, centroid_lon, area_sq_km,
--     source, source_version, boundary_source, boundary_quality, last_updated
-- FROM panchayats
-- ON CONFLICT DO NOTHING;
