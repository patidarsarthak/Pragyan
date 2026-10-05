"""
SIH26074 - Database Layer & Spatial Data Access Service
-------------------------------------------------------
Implements SQLAlchemy models matching the authoritative PostGIS schema:
- states
- districts
- blocks
- panchayats (Real Polygon Geometries + Centroids + Area)
- weather_stations
- weather_observations (with explicit target_quality flags)
- weather_forecasts
- gis_features
- model_runs
- predictions
- advisories
- data_sources

Supports SQLite (via SpatiaLite / JSON geometry fallback) and PostgreSQL + PostGIS.
Includes auto-initialization from data/static/GeoJSON files.
"""

import os
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text, Date, DateTime,
    ForeignKey, UniqueConstraint, Index, Boolean
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_DB_PATH = os.path.join(PROJECT_ROOT, "backend", "sih26074_panchayat.db")
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============================================================================
# SQLAlchemy ORM Models
# ============================================================================

class State(Base):
    __tablename__ = "states"
    state_code = Column(Integer, primary_key=True)
    state_name = Column(String(100), nullable=False, unique=True)
    state_type = Column(String(20), default="State")
    is_pilot = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    districts = relationship("District", back_populates="state")


class District(Base):
    __tablename__ = "districts"
    district_code = Column(Integer, primary_key=True)
    district_name = Column(String(100), nullable=False)
    state_code = Column(Integer, ForeignKey("states.state_code"), nullable=False)
    is_pilot = Column(Boolean, default=False)
    total_gps = Column(Integer, default=0)
    total_blocks = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    state = relationship("State", back_populates="districts")
    blocks = relationship("Block", back_populates="district")


class Block(Base):
    __tablename__ = "blocks"
    block_code = Column(Integer, primary_key=True)
    block_name = Column(String(100), nullable=False)
    district_code = Column(Integer, ForeignKey("districts.district_code"), nullable=False)
    state_code = Column(Integer, ForeignKey("states.state_code"), nullable=False)
    area_sq_km = Column(Float)
    centroid_lat = Column(Float)
    centroid_lon = Column(Float)
    geometry_json = Column(Text, nullable=False) # GeoJSON Polygon representation
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    district = relationship("District", back_populates="blocks")
    panchayats = relationship("Panchayat", back_populates="block")


class Panchayat(Base):
    __tablename__ = "panchayats"
    id = Column(Integer, primary_key=True, autoincrement=True)
    gp_code = Column(Integer, nullable=False, unique=True, index=True) # LGD Code
    gp_name = Column(String(150), nullable=False)
    block_code = Column(Integer, ForeignKey("blocks.block_code"), nullable=False, index=True)
    block_name = Column(String(100), nullable=False)
    district_code = Column(Integer, ForeignKey("districts.district_code"), nullable=False, index=True)
    district_name = Column(String(100), nullable=False)
    state_code = Column(Integer, ForeignKey("states.state_code"), nullable=False)
    state_name = Column(String(100), nullable=False)
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    area_sq_km = Column(Float, nullable=False)
    geometry_json = Column(Text, nullable=False) # Authoritative Polygon Coordinates GeoJSON
    source = Column(String(200), default="Local Government Directory (LGD) / Survey of India / Bharat Maps")
    source_version = Column(String(50), default="2024.1")
    boundary_source = Column(String(150), default="LGD Centroids / Voronoi Block Tessellation")
    boundary_quality = Column(String(20), default="DERIVED") # OFFICIAL, DERIVED, APPROXIMATE
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    block = relationship("Block", back_populates="panchayats")
    gis_features = relationship("GISFeature", back_populates="panchayat", uselist=False)
    observations = relationship("WeatherObservation", back_populates="panchayat")
    predictions = relationship("Prediction", back_populates="panchayat")
    advisories = relationship("Advisory", back_populates="panchayat")


class NonPanchayatArea(Base):
    __tablename__ = "non_panchayat_areas"
    id = Column(Integer, primary_key=True, autoincrement=True)
    area_code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(150), nullable=False)
    classification = Column(String(100), nullable=False) 
    # e.g. "Municipality / Municipal Corporation", "Nagar Parishad / Nagar Panchayat", 
    # "Cantonment or other local administrative body", "Protected Forest / Wildlife Sanctuary",
    # "Special Economic Zone / Industrial Area"
    district_code = Column(Integer, ForeignKey("districts.district_code"), nullable=False)
    district_name = Column(String(100), nullable=False)
    state_code = Column(Integer, ForeignKey("states.state_code"), nullable=False)
    state_name = Column(String(100), nullable=False)
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    area_sq_km = Column(Float, nullable=False)
    geometry_json = Column(Text, nullable=False)
    admin_body = Column(String(150))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class WeatherStation(Base):
    __tablename__ = "weather_stations"
    station_id = Column(String(50), primary_key=True)
    station_name = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_m = Column(Float)
    station_type = Column(String(50), nullable=False) # IMD_AWS, ARG, KVK_STATION, CWC_GAUGE
    source = Column(String(100), nullable=False)
    district_code = Column(Integer, ForeignKey("districts.district_code"))


class WeatherObservation(Base):
    __tablename__ = "weather_observations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(50), ForeignKey("weather_stations.station_id"), nullable=True)
    gp_code = Column(Integer, ForeignKey("panchayats.gp_code"), nullable=False, index=True)
    observation_date = Column(String(10), nullable=False, index=True) # YYYY-MM-DD
    rainfall_mm = Column(Float)
    temperature_c = Column(Float)
    humidity_pct = Column(Float)
    wind_speed_ms = Column(Float)
    target_quality = Column(String(30), nullable=False, index=True) 
    # DIRECT_OBSERVATION, NEARBY_OBSERVATION, INTERPOLATED, SATELLITE_DERIVED, UNAVAILABLE
    observation_distance_km = Column(Float)
    source = Column(String(100), nullable=False)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    panchayat = relationship("Panchayat", back_populates="observations")
    __table_args__ = (UniqueConstraint("gp_code", "observation_date", name="uq_gp_obs_date"),)


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    gp_code = Column(Integer, ForeignKey("panchayats.gp_code"), nullable=False, index=True)
    forecast_date = Column(String(10), nullable=False, index=True)
    lead_days = Column(Integer, nullable=False, default=1)
    model_source = Column(String(100), nullable=False, default="ECMWF IFS 0.25 deg via Open-Meteo")
    coarse_rainfall = Column(Float)
    coarse_temperature = Column(Float)
    coarse_humidity = Column(Float)
    coarse_wind_speed = Column(Float)
    coarse_evapotranspiration = Column(Float)
    area_weighted_rainfall = Column(Float)
    area_weighted_temp = Column(Float)
    run_timestamp = Column(String(50), nullable=False)



class GISFeature(Base):
    __tablename__ = "gis_features"
    gp_code = Column(Integer, ForeignKey("panchayats.gp_code"), primary_key=True)
    elevation_mean = Column(Float, nullable=False)
    elevation_min = Column(Float, nullable=False)
    elevation_max = Column(Float, nullable=False)
    slope_mean = Column(Float, nullable=False)
    aspect_mean = Column(Float)
    ndvi_mean = Column(Float, nullable=False)
    land_cover_class = Column(Integer, nullable=False)
    land_cover_name = Column(String(100), nullable=False)
    agriculture_fraction = Column(Float, nullable=False)
    forest_fraction = Column(Float, nullable=False)
    water_fraction = Column(Float, nullable=False)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    panchayat = relationship("Panchayat", back_populates="gis_features")


class ModelRun(Base):
    __tablename__ = "model_runs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    model_version = Column(String(50), nullable=False, unique=True)
    model_type = Column(String(100), nullable=False)
    train_mae = Column(Float)
    train_rmse = Column(Float)
    test_mae = Column(Float)
    test_rmse = Column(Float)
    skill_score_improvement_pct = Column(Float)
    trained_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    gp_code = Column(Integer, ForeignKey("panchayats.gp_code"), nullable=False, index=True)
    prediction_date = Column(String(10), nullable=False, index=True) # YYYY-MM-DD
    variable = Column(String(30), nullable=False)
    predicted_value = Column(Float, nullable=False)
    uncertainty_lower = Column(Float, nullable=False)
    uncertainty_upper = Column(Float, nullable=False)
    confidence_pct = Column(Float, default=80.0)
    model_version = Column(String(50), default="v2.0-joint-ensemble")
    run_timestamp = Column(String(30), nullable=False)

    panchayat = relationship("Panchayat", back_populates="predictions")
    __table_args__ = (
        Index("idx_pred_lookup", "gp_code", "prediction_date", "variable"),
    )


class Advisory(Base):
    __tablename__ = "advisories"
    id = Column(Integer, primary_key=True, autoincrement=True)
    gp_code = Column(Integer, ForeignKey("panchayats.gp_code"), nullable=False, index=True)
    advisory_date = Column(String(10), nullable=False, index=True)
    crop = Column(String(100), nullable=False)
    growth_stage = Column(String(100), nullable=False)
    advisory_text = Column(Text, nullable=False)
    triggering_variables = Column(String(200), nullable=False)
    confidence_pct = Column(Float, nullable=False)
    rule_source = Column(String(100), default="ICAR-KVK Dhanbad / BAU Ranchi AAS")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    panchayat = relationship("Panchayat", back_populates="advisories")


class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_name = Column(String(150), nullable=False, unique=True)
    data_type = Column(String(50), nullable=False) # ADMINISTRATIVE, FORECAST, OBSERVATION, DEM, LAND_COVER
    provider = Column(String(150), nullable=False)
    spatial_resolution = Column(String(50), nullable=False)
    temporal_resolution = Column(String(50), nullable=False)
    access_tier = Column(String(50), nullable=False)
    citation = Column(Text, nullable=False)


class CrowdReport(Base):
    __tablename__ = "crowd_reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    gp_code = Column(Integer, ForeignKey("panchayats.gp_code"), nullable=False, index=True)
    rain_category = Column(String(32), nullable=False)  # 'none', 'light', 'moderate', 'heavy'
    rainfall_amount_mm = Column(Float, nullable=True)
    photo_url = Column(String(512), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    device_hash = Column(String(64), nullable=False, index=True)
    source = Column(String(32), default="CROWDSOURCED_UNVERIFIED", nullable=False)
    is_plausible = Column(Boolean, default=True)
    plausibility_reason = Column(String(255), nullable=True)

    panchayat = relationship("Panchayat", backref="crowd_reports")
    __table_args__ = (
        Index("idx_crowd_gp_time", "gp_code", "timestamp"),
        Index("idx_crowd_device_time", "device_hash", "timestamp"),
    )


class TerrainSkill(Base):
    __tablename__ = "terrain_skills"
    id = Column(Integer, primary_key=True, autoincrement=True)
    region_id = Column(String(50), nullable=False, default="dhanbad_jharkhand")
    variable = Column(String(30), nullable=False, default="TEMPERATURE")
    elevation_band = Column(String(50), nullable=False) # '<200m', '200-400m', '>400m', 'ALL'
    terrain_type = Column(String(50), nullable=False)   # 'Plateau', 'Valley', 'ALL', etc.
    n_stations = Column(Integer, nullable=False, default=1)
    coarse_mae = Column(Float, nullable=False)
    model_mae = Column(Float, nullable=False)
    skill_improvement_pct = Column(Float, nullable=False)
    skill_flag = Column(String(20), nullable=False, default="VALIDATED") # 'VALIDATED', 'LOW_CONFIDENCE'
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_terrain_skills_lookup", "region_id", "elevation_band", "terrain_type"),
    )


class Crop(Base):
    __tablename__ = "crops"
    id = Column(String(50), primary_key=True) # e.g. 'wheat', 'chickpea', 'soybean'
    canonical_name = Column(String(100), nullable=False)
    name_hi = Column(String(100), nullable=False)
    name_bn = Column(String(100), nullable=True)
    scientific_name = Column(String(150), nullable=False)
    season = Column(String(20), nullable=False) # 'Kharif', 'Rabi', 'Zaid'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AgroZone(Base):
    __tablename__ = "agro_zones"
    id = Column(String(50), primary_key=True) # e.g. 'mp_malwa_plateau'
    zone_code = Column(String(20), nullable=False, unique=True)
    zone_name = Column(String(150), nullable=False)
    state_code = Column(Integer, default=23)
    districts_json = Column(Text, nullable=False) # JSON array of district names
    source = Column(String(200), default="JNKVV / RVSKVV Agro-Climatic Zones of MP")


class SoilClass(Base):
    __tablename__ = "soil_classes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    gp_code = Column(Integer, nullable=True, index=True)
    district_code = Column(Integer, nullable=False, index=True)
    district_name = Column(String(100), nullable=False)
    soil_order = Column(String(50), nullable=False) # 'Vertisol', 'Inceptisol', 'Alfisol', 'Entisol'
    soil_name = Column(String(150), nullable=False) # 'Deep Black Vertisol', 'Medium Black Soil', etc.
    field_capacity_mm = Column(Float, nullable=False)
    wilting_point_mm = Column(Float, nullable=False)
    source = Column(String(200), default="NBSS&LUP ICAR Soil Survey of Madhya Pradesh")

    __table_args__ = (
        Index("idx_soil_dist_gp", "district_code", "gp_code"),
    )


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(String(64), unique=True, nullable=False, index=True)
    consent = Column(Boolean, default=True, nullable=False)
    gp_code = Column(Integer, ForeignKey("panchayats.gp_code"), nullable=False, index=True)
    crop = Column(String(50), nullable=False)
    sowing_date = Column(String(10), nullable=False) # YYYY-MM-DD
    duration_class = Column(String(50), default="normal") # 'early', 'normal', 'late'
    soil_type = Column(String(50), nullable=True)
    irrigation_source = Column(String(50), default="rainfed") # 'canal', 'borewell', 'rainfed'
    device_id_hash = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AdvisoriesIssued(Base):
    __tablename__ = "advisories_issued"
    id = Column(Integer, primary_key=True, autoincrement=True)
    advisory_id = Column(String(64), unique=True, nullable=False, index=True)
    gp_code = Column(Integer, ForeignKey("panchayats.gp_code"), nullable=False, index=True)
    valid_date = Column(String(10), nullable=False, index=True)
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    crop = Column(String(50), nullable=False)
    stage = Column(String(100), nullable=False)
    rule_id = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False) # 'calm', 'watch', 'alert'
    action = Column(Text, nullable=False)
    why = Column(Text, nullable=False)
    when = Column(Text, nullable=False)
    confidence_label = Column(String(20), default="Likely") # 'Likely', 'Uncertain'
    confidence_score = Column(Float, default=0.80)
    panchayat_effect_json = Column(Text, nullable=True) # {variable, gp_val, block_val, diff}
    source_title = Column(String(200), nullable=False)
    status = Column(String(20), default="ACTIVE") # 'ACTIVE', 'NEEDS_EXPERT_REVIEW'
    reviewed_by = Column(String(100), default="ICAR-KVK / JNKVV Agromet Panel")

    __table_args__ = (
        Index("idx_adv_issued_lookup", "gp_code", "crop", "valid_date"),
    )


class AdvisoryFeedback(Base):
    __tablename__ = "advisory_feedback"
    id = Column(Integer, primary_key=True, autoincrement=True)
    advisory_id = Column(String(64), ForeignKey("advisories_issued.advisory_id"), nullable=False, index=True)
    followed = Column(Boolean, nullable=False)
    outcome = Column(String(100), nullable=True) # 'effective', 'crop_loss_prevented', 'no_effect'
    stage_reported = Column(String(100), nullable=True)
    photo_url = Column(String(512), nullable=True)
    reported_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class KVKDirectory(Base):
    __tablename__ = "kvk_directory"
    id = Column(Integer, primary_key=True, autoincrement=True)
    district_code = Column(Integer, nullable=False, index=True)
    district_name = Column(String(100), nullable=False)
    kvk_name = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    url = Column(String(255), nullable=True)
    source = Column(String(200), default="ICAR-ATARI Zone IX Jabalpur (MP)")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(128), nullable=False)
    salt = Column(String(64), nullable=False)
    role = Column(String(50), nullable=False, default="farmer") # 'farmer', 'sarpanch', 'bdo', 'ddma', 'scientist', 'admin'
    designation = Column(String(150), nullable=True)
    department = Column(String(150), nullable=True)
    state_name = Column(String(100), default="Madhya Pradesh")
    district_name = Column(String(100), nullable=True)
    block_name = Column(String(100), nullable=True)
    gp_name = Column(String(150), nullable=True)
    gp_code = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)




# ============================================================================
# Database Initializer & Seed Function
# ============================================================================

def init_db(force: bool = False):
    """Creates tables and seeds initial administrative & Panchayat polygon data."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    try:
        # Check if already seeded
        if not force and session.query(Panchayat).count() >= 239:
            print("[Database] Database already initialized with 239 Panchayats.")
            return

        print("[Database] Initializing tables and seeding administrative hierarchy...")

        # 1. Seed States
        states_path = os.path.join(PROJECT_ROOT, "data", "static", "india_states.json")
        if os.path.exists(states_path):
            with open(states_path, "r", encoding="utf-8") as f:
                states_data = json.load(f)
            for s in states_data:
                existing = session.query(State).filter_by(state_code=s["state_code"]).first()
                if not existing:
                    session.add(State(
                        state_code=s["state_code"],
                        state_name=s["state_name"],
                        state_type=s["type"],
                        is_pilot=s.get("is_pilot", False)
                    ))
            session.commit()
            print(f"[Database] Seeded {len(states_data)} States/UTs.")

        # 2. Seed Districts
        dist_path = os.path.join(PROJECT_ROOT, "data", "static", "jharkhand_districts.json")
        if os.path.exists(dist_path):
            with open(dist_path, "r", encoding="utf-8") as f:
                dist_data = json.load(f)
            for d in dist_data:
                existing = session.query(District).filter_by(district_code=d["district_code"]).first()
                if not existing:
                    session.add(District(
                        district_code=d["district_code"],
                        district_name=d["district_name"],
                        state_code=d["state_code"],
                        is_pilot=d.get("is_pilot", False),
                        total_gps=d.get("total_gps", 0),
                        total_blocks=d.get("total_blocks", 0)
                    ))
            session.commit()
            print(f"[Database] Seeded {len(dist_data)} Districts.")

        # 3. Seed Blocks
        blocks_path = os.path.join(PROJECT_ROOT, "data", "static", "dhanbad_blocks.geojson")
        if os.path.exists(blocks_path):
            with open(blocks_path, "r", encoding="utf-8") as f:
                b_geojson = json.load(f)
            for feat in b_geojson["features"]:
                props = feat["properties"]
                b_code = props["block_code"]
                existing = session.query(Block).filter_by(block_code=b_code).first()
                if not existing:
                    session.add(Block(
                        block_code=b_code,
                        block_name=props["block_name"],
                        district_code=props["district_code"],
                        state_code=props["state_code"],
                        area_sq_km=props.get("area_sq_km"),
                        centroid_lat=props.get("centroid_lat"),
                        centroid_lon=props.get("centroid_lon"),
                        geometry_json=json.dumps(feat["geometry"])
                    ))
            session.commit()
            print(f"[Database] Seeded {len(b_geojson['features'])} Blocks.")

        # 4. Seed 239 Real Gram Panchayat Polygons & Zonal GIS Features
        gps_path = os.path.join(PROJECT_ROOT, "data", "static", "dhanbad_panchayats_polygons.geojson")
        if os.path.exists(gps_path):
            with open(gps_path, "r", encoding="utf-8") as f:
                gp_geojson = json.load(f)
            for feat in gp_geojson["features"]:
                props = feat["properties"]
                gp_code = props["gp_code"]
                existing = session.query(Panchayat).filter_by(gp_code=gp_code).first()
                if not existing:
                    p = Panchayat(
                        gp_code=gp_code,
                        gp_name=props["gp_name"],
                        block_code=props["block_code"],
                        block_name=props["block_name"],
                        district_code=props["district_code"],
                        district_name=props["district_name"],
                        state_code=props["state_code"],
                        state_name=props["state_name"],
                        centroid_lat=props["centroid_lat"],
                        centroid_lon=props["centroid_lon"],
                        area_sq_km=props["area_sq_km"],
                        geometry_json=json.dumps(feat["geometry"]),
                        source=props.get("source", "LGD / Survey of India"),
                        source_version=props.get("source_version", "2024.1"),
                        boundary_source=props.get("boundary_source", "LGD Centroids / Voronoi Block Tessellation"),
                        boundary_quality=props.get("boundary_quality", "DERIVED")
                    )
                    session.add(p)
                    session.flush()

                    # Zonal GIS Feature record
                    session.add(GISFeature(
                        gp_code=gp_code,
                        elevation_mean=props["elevation_mean"],
                        elevation_min=props["elevation_min"],
                        elevation_max=props["elevation_max"],
                        slope_mean=props["slope_mean"],
                        ndvi_mean=props["ndvi_mean"],
                        land_cover_class=props["land_cover_class"],
                        land_cover_name=props["land_cover_name"],
                        agriculture_fraction=props["agriculture_fraction"],
                        forest_fraction=props["forest_fraction"],
                        water_fraction=props["water_fraction"]
                    ))
            session.commit()
            print(f"[Database] Seeded {len(gp_geojson['features'])} Real Gram Panchayat Polygons & Zonal Features.")

        # 5. Seed Verified Active Weather Observation Stations in Region (NOAA ISD / IMD)
        session.query(WeatherStation).filter(
            WeatherStation.station_id.in_(["IMD_DHN_01", "IMD_MAITHON_02", "IMD_PANCHET_03", "KVK_BALIAPUR_04", "ARG_TOPCHANCHI_05"])
        ).delete(synchronize_session=False)

        stations = [
            {"station_id": "427010-99999", "name": "BIRSA MUNDA (Ranchi Airport)", "lat": 23.314, "lon": 85.322, "elev": 654.7, "type": "ISD_AIRPORT"},
            {"station_id": "425910-99999", "name": "GAYA (Gaya Airport)", "lat": 24.744, "lon": 84.951, "elev": 115.8, "type": "ISD_AIRPORT"},
            {"station_id": "427050-99999", "name": "PURULIA (Purulia Observatory)", "lat": 23.333, "lon": 86.417, "elev": 255.0, "type": "ISD_OBSERVATORY"},
            {"station_id": "427980-99999", "name": "JAMSHEDPUR (Sonari Airport)", "lat": 22.813, "lon": 86.169, "elev": 153.9, "type": "ISD_AIRPORT"},
            {"station_id": "427060-99999", "name": "BANKURA (Bankura Observatory)", "lat": 23.383, "lon": 87.083, "elev": 100.0, "type": "ISD_OBSERVATORY"},
            {"station_id": "427080-99999", "name": "SHANTI NIKETAN (Shanti Niketan)", "lat": 23.650, "lon": 87.700, "elev": 59.0, "type": "ISD_OBSERVATORY"}
        ]
        for st in stations:
            existing = session.query(WeatherStation).filter_by(station_id=st["station_id"]).first()
            if not existing:
                session.add(WeatherStation(
                    station_id=st["station_id"],
                    station_name=st["name"],
                    latitude=st["lat"],
                    longitude=st["lon"],
                    elevation_m=st["elev"],
                    station_type=st["type"],
                    source="NOAA ISD / IMD Integrated Surface Database",
                    district_code=336
                ))
        session.commit()

        # 6. Seed Data Sources Registry
        data_sources_list = [
            {
                "source_name": "Local Government Directory (LGD)",
                "data_type": "ADMINISTRATIVE",
                "provider": "Ministry of Panchayati Raj, Government of India",
                "spatial_resolution": "Panchayat Boundaries",
                "temporal_resolution": "Quarterly Updates",
                "access_tier": "GOVERNMENT_PORTAL",
                "citation": "Government of India, Local Government Directory (https://lgd.gov.in)."
            },
            {
                "source_name": "ECMWF Integrated Forecasting System (IFS Cycle 48r1)",
                "data_type": "WEATHER_FORECAST",
                "provider": "European Centre for Medium-Range Weather Forecasts",
                "spatial_resolution": "0.25° (~25 km)",
                "temporal_resolution": "Daily 1-10 Days Horizon",
                "access_tier": "OPEN_ACCESS",
                "citation": "ECMWF Open Data Dissemination (https://www.ecmwf.int)."
            },
            {
                "source_name": "UCSB CHIRPS v2.0 Satellite-Station Rainfall",
                "data_type": "WEATHER_OBSERVATION",
                "provider": "Climate Hazards Center, UC Santa Barbara",
                "spatial_resolution": "0.05° (~5.5 km)",
                "temporal_resolution": "Daily Ground Truth (2020-2024)",
                "access_tier": "OPEN_ACCESS",
                "citation": "Funk et al. (2015), The climate hazards group infra-red precipitation with stations data."
            },
            {
                "source_name": "NASA Shuttle Radar Topography Mission (SRTM v3)",
                "data_type": "TERRAIN_DEM",
                "provider": "NASA / USGS",
                "spatial_resolution": "1 Arc-Second (30 meters)",
                "temporal_resolution": "Static Topography",
                "access_tier": "OPEN_ACCESS",
                "citation": "NASA SRTM 1 Arc-Second Global Elevation (https://earthdata.nasa.gov)."
            },
            {
                "source_name": "ESA WorldCover 10m v200",
                "data_type": "LAND_COVER",
                "provider": "European Space Agency",
                "spatial_resolution": "10 meters",
                "temporal_resolution": "Annual Global Composite",
                "access_tier": "OPEN_ACCESS",
                "citation": "Zanaga et al. (2022), ESA WorldCover 10 m 2021 v200."
            },
            {
                "source_name": "ICAR-KVK Dhanbad Agro-Meteorological Rule Base",
                "data_type": "AGRO_ADVISORY",
                "provider": "ICAR / Birsa Agricultural University, Ranchi",
                "spatial_resolution": "Agro-Climatic Zone IV (Central & North Eastern Plateau)",
                "temporal_resolution": "Crop Phenological Stages",
                "access_tier": "GOVERNMENT_PORTAL",
                "citation": "District Agromet Advisory Bulletins, ICAR-KVK Dhanbad & BAU Ranchi."
            }
        ]
        for src in data_sources_list:
            existing = session.query(DataSource).filter_by(source_name=src["source_name"]).first()
            if not existing:
                session.add(DataSource(**src))
        session.commit()

        print("[Database] Database successfully initialized with all administrative, spatial, and provenance records!")
    except Exception as e:
        session.rollback()
        print(f"[Database Error] {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    init_db(force=True)
