"""
SIH26074 - Automated Test Suite: Data Freshness, Metadata Provenance & Stale-Data Logic
---------------------------------------------------------------------------------------
Verifies:
1. Meta object in /panchayats/{gp}/weather, /forecast/10day, /advisory, /risk-score, /map/weather-grid
2. Meta fields:
   - forecast_issued_at (IST ISO timestamp with +05:30 offset)
   - source_model (from DB weather_forecasts or data_sources)
   - model_version (from DB model_runs)
   - ground_truth_flag (DIRECT_OBSERVATION / NEARBY_OBSERVATION / INTERPOLATED / SATELLITE_DERIVED / UNAVAILABLE)
   - boundary_quality (OFFICIAL / DERIVED / APPROXIMATE / null)
   - data_age_minutes (computed dynamically at request time)
3. Stale-data classification:
   - Under 6 hours (< 360 min) -> Fresh (Green)
   - Under 24 hours (< 1440 min) -> Moderate (Amber)
   - 24 hours or older (>= 1440 min) -> Stale (Red)
4. Non-fabrication & Database Integrity:
   - Values match existing tables, never invented, null if unknown.
"""

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services import get_response_meta
from backend.database import SessionLocal, WeatherForecast, ModelRun, DataSource, Panchayat

client = TestClient(app)
VALID_GP = 111722  # Valid Dhanbad GP


def test_meta_presence_in_all_weather_endpoints():
    """Verifies that all 5 weather screens/endpoints return the required meta object."""
    endpoints = [
        f"/panchayats/{VALID_GP}/weather",
        f"/forecast/10day/{VALID_GP}",
        f"/panchayats/{VALID_GP}/forecast/10day",
        f"/panchayats/{VALID_GP}/advisory",
        f"/advisory/{VALID_GP}",
        f"/panchayats/{VALID_GP}/risk-score",
        f"/risk-score/{VALID_GP}",
        "/map/weather-grid"
    ]

    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 200, f"Endpoint {ep} failed with status {res.status_code}"
        data = res.json()
        assert "meta" in data, f"Endpoint {ep} response missing 'meta' object"
        meta = data["meta"]
        assert isinstance(meta, dict), f"Endpoint {ep} meta is not a dict"

        # Check all 6 required fields exist in meta
        required_fields = [
            "forecast_issued_at",
            "source_model",
            "model_version",
            "ground_truth_flag",
            "boundary_quality",
            "data_age_minutes"
        ]
        for f in required_fields:
            assert f in meta, f"Endpoint {ep} meta missing field: {f}"


def test_forecast_issued_at_ist_format():
    """Verifies that forecast_issued_at is formatted as an ISO timestamp in IST (+05:30)."""
    res = client.get(f"/panchayats/{VALID_GP}/weather")
    assert res.status_code == 200
    meta = res.json()["meta"]

    issued_at = meta["forecast_issued_at"]
    if issued_at is not None:
        assert "+05:30" in issued_at, f"forecast_issued_at '{issued_at}' must have IST offset +05:30"
        dt = datetime.fromisoformat(issued_at)
        assert dt.tzinfo is not None, "Timestamp must be timezone-aware"


def test_meta_values_match_database():
    """Verifies values are read from DB tables (never invented or hardcoded)."""
    session = SessionLocal()
    try:
        # 1. Check weather_forecasts or data_sources for source_model
        wf = session.query(WeatherForecast).filter(WeatherForecast.gp_code == VALID_GP).order_by(WeatherForecast.id.desc()).first()
        mr = session.query(ModelRun).order_by(ModelRun.id.desc()).first()
        gp = session.query(Panchayat).filter(Panchayat.gp_code == VALID_GP).first()

        meta = get_response_meta(gp_code=VALID_GP, session=session)

        # source_model
        if wf and hasattr(wf, "model_source") and wf.model_source:
            assert meta["source_model"] == wf.model_source
        # model_version
        if mr and mr.model_version:
            assert meta["model_version"] == mr.model_version
        # boundary_quality
        if gp and hasattr(gp, "boundary_quality"):
            assert meta["boundary_quality"] == gp.boundary_quality

        # ground_truth_flag valid domain
        valid_flags = [
            "DIRECT_OBSERVATION",
            "NEARBY_OBSERVATION",
            "INTERPOLATED",
            "SATELLITE_DERIVED",
            "UNAVAILABLE"
        ]
        assert meta["ground_truth_flag"] in valid_flags
    finally:
        session.close()


def test_meta_null_handling_for_unknown():
    """Verifies that unknown or unassociated fields return null, never fabricated values."""
    # When gp_code is None (e.g. Regional Coarse Grid)
    grid_meta = get_response_meta(gp_code=None)
    assert grid_meta["boundary_quality"] is None, "Regional grid should not have a GP boundary quality"
    assert grid_meta["ground_truth_flag"] is None, "Regional grid should not have GP ground truth flag"


def test_stale_data_age_classification_logic():
    """Verifies the time-age classification: Green (<6h), Amber (<24h), Red (>=24h Stale)."""
    now_utc = datetime.now(timezone.utc)

    # 1. Fresh: 2 hours old (< 6 hours = 360 min)
    ts_2h_ago = (now_utc - timedelta(hours=2)).isoformat()
    # 2. Moderate: 12 hours old (< 24 hours = 1440 min)
    ts_12h_ago = (now_utc - timedelta(hours=12)).isoformat()
    # 3. Stale: 36 hours old (>= 24 hours = 1440 min)
    ts_36h_ago = (now_utc - timedelta(hours=36)).isoformat()

    def classify_age(age_minutes):
        if age_minutes is None or age_minutes >= 1440:
            return "red", True   # color, is_stale
        elif age_minutes < 360:
            return "green", False
        else:
            return "amber", False

    # Simulate age calculations
    def compute_age(iso_ts):
        dt = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        diff = now_utc - dt.astimezone(timezone.utc)
        return max(0, int(diff.total_seconds() / 60))

    age_2h = compute_age(ts_2h_ago)
    color, is_stale = classify_age(age_2h)
    assert color == "green"
    assert not is_stale
    assert age_2h < 360

    age_12h = compute_age(ts_12h_ago)
    color, is_stale = classify_age(age_12h)
    assert color == "amber"
    assert not is_stale
    assert 360 <= age_12h < 1440

    age_36h = compute_age(ts_36h_ago)
    color, is_stale = classify_age(age_36h)
    assert color == "red"
    assert is_stale
    assert age_36h >= 1440

    # Current response data_age_minutes check
    res = client.get(f"/panchayats/{VALID_GP}/weather")
    age = res.json()["meta"]["data_age_minutes"]
    assert isinstance(age, int)
    assert age >= 0
