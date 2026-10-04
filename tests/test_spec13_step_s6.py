#!/usr/bin/env python3
"""
Test Suite for Step S6 Winning Features:
- F7: System Health & Data Quality
- F3: "How unusual is this?" Climatological Return-Period Meter
- F4: Drought & Dry-Spell Layer
- F2: Season Command Centre & Printable Briefing
- F6: Public API, Embeddable Widget & Open Data Exports
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_f7_system_health_and_data_quality():
    """F7: Test System Health & Data Quality diagnostic report."""
    res = client.get("/api/ui/health/data-quality")
    assert res.status_code == 200
    data = res.json()
    assert data["overall_status"] == "OPERATIONAL"
    assert len(data["upstream_sources"]) >= 4
    
    # Ingest freshness checks
    ecmwf = next(s for s in data["upstream_sources"] if s["id"] == "ecmwf_ifs")
    assert ecmwf["status"] == "HEALTHY"
    assert ecmwf["latency_hours"] > 0
    
    # Cryptographic ledger verification in health report
    ledger = data["ledger_verification"]
    assert ledger["chain_status"] == "VALID"
    assert ledger["total_blocks"] >= 7
    
    # 7-day residual drift
    drift = data["residual_drift"]
    assert drift["status"] == "STABLE"
    assert len(drift["lead_day_residuals"]) == 7
    
    # Model card & limitations
    card = data["model_card"]
    assert "Ridge-Lasso Hybrid" in card["architecture"]
    assert len(card["limitations"]) >= 3


def test_f3_climatological_unusualness_meter():
    """F3: Test 'How unusual is this?' return-period meter."""
    # Test typical rainfall
    res1 = client.get("/api/ui/unusualness?rainfall_mm=8.5&day=1")
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["climatological_percentile"] < 75.0
    assert d1["alert_level"] == "CALM"
    assert d1["sample_size_years"] == 44
    assert "CHIRPS" in d1["baseline_dataset"]

    # Test extreme monsoon surge
    res2 = client.get("/api/ui/unusualness?rainfall_mm=95.0&day=1")
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["climatological_percentile"] >= 95.0
    assert d2["return_period_years"] >= 5.0
    assert d2["alert_level"] == "ALERT"


def test_f4_drought_and_dry_spell_layer():
    """F4: Test Drought & Dry-Spell indices calculation."""
    res = client.get("/api/ui/drought?cumulative_30d_rain_mm=120.0")
    assert res.status_code == 200
    data = res.json()
    assert "spi_30" in data
    assert "consecutive_dry_days" in data
    assert "soil_moisture_stress_pct" in data
    assert -3.0 <= data["spi_30"] <= 3.0
    assert data["standard_reference"] == "IMD / WMO Drought Severity Classification"


def test_f2_season_command_centre():
    """F2: Test Season Command Centre officer summary & brief generation."""
    res = client.get("/api/ui/command-centre?scope_level=district&scope_id=Panna")
    assert res.status_code == 200
    data = res.json()
    assert data["scope_id"] == "Panna"
    assert len(data["risk_calendar_7day"]) == 7
    assert len(data["crop_stage_cohorts"]) >= 2
    assert len(data["priority_action_queue"]) >= 1

    # Brief generation
    brief_res = client.get("/api/ui/command-centre/brief.html?scope_level=district&scope_id=Panna")
    assert brief_res.status_code == 200
    assert "text/html" in brief_res.headers["content-type"]
    assert "PRAGYAN" in brief_res.text
    assert "Weekly Agro-Meteorological Officer Operational Briefing" in brief_res.text
    # Verify forbidden tagline is NOT present
    assert "Localized Weather Intelligence for Better Agricultural Decisions" not in brief_res.text


def test_f6_public_embeddable_widget_and_open_data():
    """F6: Test embeddable kiosk widget and open data export."""
    # Widget endpoint
    w_res = client.get("/api/v1/widget/panchayat/133338.html")
    assert w_res.status_code == 200
    assert "text/html" in w_res.headers["content-type"]
    assert "PRAGYAN" in w_res.text
    assert "Verified Ledger Hash" in w_res.text
    # Verify forbidden tagline is NOT present
    assert "Localized Weather Intelligence for Better Agricultural Decisions" not in w_res.text

    # Open Data CSV export
    csv_res = client.get("/api/ui/export/data?format=csv&scope=district&id=Panna")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "lgd_code,panchayat_name" in csv_res.text
    assert "CC-BY-4.0" in csv_res.text

    # Open Data JSON export
    json_res = client.get("/api/ui/export/data?format=json&scope=district&id=Panna")
    assert json_res.status_code == 200
    j_data = json_res.json()
    assert "metadata" in j_data
    assert "license" in j_data["metadata"]
    assert len(j_data["records"]) > 0
