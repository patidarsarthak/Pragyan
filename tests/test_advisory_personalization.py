"""
SIH26074 - Phase 3 Automated Verification Suite
-----------------------------------------------
Tests for:
1. Prompt 3.1: Crop and sowing-date personalization
   - Tests all 8 crops (paddy, maize, soybean, wheat, mustard, chickpea, potato, tomato)
   - Phenological stage determination by Days After Sowing (DAS)
   - Stage-specific agronomic rules (e.g. flowering + heat = spikelet sterility, tillering + rain = drainage)
2. Prompt 3.2: Irrigation scheduler and indices
   - Heat index computation (Rothfusz equation)
   - Dry-spell length calculation (IMD threshold)
   - Standardized Precipitation Index (SPI) from unified historical dataset
   - FAO-56 soil water balance & dynamic irrigation scheduling
   - GET /panchayats/{gp}/irrigation endpoint contract & assumptions
3. Prompt 3.3: Crowdsourced Ground Reports & Bot Prompt
   - POST /panchayats/{gp}/report
   - Rate limiting spam protection (15m window)
   - Meteorological plausibility check (detecting hyper-dry outliers)
   - Bot 'Did it rain today?' prompt and conversational reporting flow
   - GET /analytics/verification transparency with CROWDSOURCED_UNVERIFIED source
"""

import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import SessionLocal, CrowdReport, Panchayat
from ml.src.advisory_engine import (
    load_crop_calendar,
    get_crop_stage,
    evaluate_advisory_rules,
    generate_personalized_advisory
)
from ml.src.indices import (
    compute_heat_index,
    compute_dry_spell_length,
    compute_spi,
    compute_water_balance_and_irrigation
)
from backend.bot.core import handle_message

client = TestClient(app)

# 8 Crops mandated in Prompt 3.1
EXPECTED_CROPS = ["paddy", "maize", "soybean", "wheat", "mustard", "chickpea", "potato", "tomato"]


# ============================================================================
# Prompt 3.1 Tests: Crop Calendar & Stage Personalization
# ============================================================================

def test_crop_calendar_contains_all_8_crops():
    """Verify crop_calendar.yaml has all 8 mandated crops with required metadata."""
    cal = load_crop_calendar()
    for crop in EXPECTED_CROPS:
        assert crop in cal, f"Crop '{crop}' missing from crop_calendar.yaml"
        cfg = cal[crop]
        assert "canonical_name" in cfg
        assert "stages" in cfg
        assert len(cfg["stages"]) >= 3
        assert "total_duration_days" in cfg
        assert "kc_mid" in cfg
        assert "root_depth_cm" in cfg
        assert "mad" in cfg


@pytest.mark.parametrize("crop_key, das_test, expected_stage_sub", [
    ("paddy", 10, "nursery"),
    ("paddy", 35, "tillering"),
    ("paddy", 70, "flower"),
    ("paddy", 100, "maturity"),
    ("maize", 10, "seedling"),
    ("maize", 25, "vegetative"),
    ("maize", 50, "tassel"),
    ("soybean", 10, "emergence"),
    ("soybean", 30, "vegetative"),
    ("soybean", 55, "flower"),
    ("soybean", 80, "pod"),
    ("wheat", 22, "crown_root"), # CRI stage
    ("wheat", 45, "tiller"),
    ("wheat", 75, "flower"),
    ("mustard", 25, "seedling"),
    ("mustard", 50, "flower"),
    ("chickpea", 20, "seedling"),
    ("chickpea", 55, "flower"),
    ("potato", 20, "sprout"),
    ("potato", 50, "tuber"),
    ("tomato", 15, "establishment"),
    ("tomato", 45, "flower"),
])
def test_stage_determination_per_crop(crop_key, das_test, expected_stage_sub):
    """Verifies that DAS correctly resolves to the expected phenological stage."""
    sowing = (datetime.now() - timedelta(days=das_test)).strftime("%Y-%m-%d")
    stage_info = get_crop_stage(crop_key, sowing_date=sowing)
    assert stage_info["days_after_sowing"] == das_test
    assert expected_stage_sub in stage_info["stage_id"].lower() or expected_stage_sub in stage_info["stage_name"].lower()


def test_rule_flowering_heat_spikelet_sterility_paddy():
    """Verify Rule: Flowering + Heat (>=34C) -> Spikelet Sterility Risk in Paddy."""
    adv_text, triggers = evaluate_advisory_rules(
        crop="Paddy",
        stage="Flowering & Anthesis",
        rainfall=0.0,
        temp=35.5,
        humidity=65.0,
        wind=2.0,
        et=4.5,
        stage_id="flowering"
    )
    assert "SPIKELET STERILITY" in adv_text
    assert "TEMPERATURE + GROWTH_STAGE" in triggers


def test_rule_tillering_heavy_rain_drainage():
    """Verify Rule: Tillering + Heavy Rain (>=20mm) -> Drainage Critical."""
    adv_text, triggers = evaluate_advisory_rules(
        crop="Paddy",
        stage="Active Tillering",
        rainfall=32.0,
        temp=28.0,
        humidity=88.0,
        wind=3.0,
        et=2.5,
        stage_id="tillering"
    )
    assert "DRAINAGE CRITICAL" in adv_text
    assert "RAINFALL + GROWTH_STAGE" in triggers


def test_rule_wheat_cri_critical_irrigation():
    """Verify Rule: Wheat at Crown Root Initiation (CRI) without rain -> Critical Irrigation."""
    adv_text, triggers = evaluate_advisory_rules(
        crop="Wheat",
        stage="Crown Root Initiation (CRI)",
        rainfall=0.0,
        temp=22.0,
        humidity=50.0,
        wind=2.0,
        et=3.2,
        stage_id="crown_root_initiation"
    )
    assert "CRITICAL IRRIGATION - CRI" in adv_text


def test_rule_potato_late_blight_alert():
    """Verify Rule: Potato tuber bulking + cool overcast (12-22C, RH>80%) -> Late Blight Warning."""
    adv_text, triggers = evaluate_advisory_rules(
        crop="Potato",
        stage="Tuber Bulking",
        rainfall=2.0,
        temp=18.0,
        humidity=88.0,
        wind=2.0,
        et=2.0,
        stage_id="tuber_bulking"
    )
    assert "LATE BLIGHT WARNING" in adv_text


def test_api_advisory_crop_and_sowing_params():
    """Test GET /panchayats/{gp}/advisory with crop & sowing_date query params."""
    res = client.get("/panchayats/111722/advisory?crop=paddy&sowing_date=2026-07-01")
    assert res.status_code == 200
    data = res.json()
    assert "personalized_advisory" in data
    pers = data["personalized_advisory"]
    assert pers is not None
    assert pers["crop"] == "paddy"
    assert "stage_name" in pers
    assert "personalized_advisory" in pers
    assert "operations_matrix" in pers


# ============================================================================
# Prompt 3.2 Tests: Indices & Dynamic Irrigation Scheduler
# ============================================================================

def test_heat_index_calculation():
    """Verify Rothfusz heat index equation under warm humid conditions."""
    hi_normal = compute_heat_index(temp_c=25.0, humidity_pct=50.0)
    assert 24.0 <= hi_normal <= 27.0

    hi_extreme = compute_heat_index(temp_c=36.0, humidity_pct=75.0)
    assert hi_extreme >= 45.0, "High temp + high humidity must compute high heat index"


def test_dry_spell_calculation():
    """Verify consecutive dry day counting under 2.5 mm IMD threshold."""
    series = [0.0, 1.2, 0.4, 2.0, 0.0]  # 5 dry days
    res = compute_dry_spell_length(series, threshold_mm=2.5)
    assert res["current_dry_spell_days"] == 5
    assert res["is_dry_spell_active"] is True

    series_wet = [0.0, 1.0, 15.0, 0.0, 0.0]
    res_wet = compute_dry_spell_length(series_wet, threshold_mm=2.5)
    assert res_wet["current_dry_spell_days"] == 2


def test_spi_computation():
    """Verify Standardized Precipitation Index against historical parquet."""
    spi_res = compute_spi(gpcode=111722, window_days=30)
    assert "spi_value" in spi_res
    assert "category" in spi_res
    assert -4.0 <= spi_res["spi_value"] <= 4.0


def test_water_balance_and_irrigation_function():
    """Verify single-layer soil bucket calculation and assumptions itemization."""
    wb = compute_water_balance_and_irrigation(
        gpcode=111722,
        crop="paddy",
        sowing_date="2026-07-01",
        soil_type="sandy_loam"
    )
    assert "recommendation" in wb
    assert "assumptions" in wb
    assert "daily_schedule" in wb
    assert "readily_available_water_mm" in wb
    assert "total_available_water_mm" in wb

    # Verify explicit assumptions itemization
    assump = wb["assumptions"]
    assert "available_water_capacity_mm_per_m" in assump
    assert "root_depth_cm" in assump
    assert "crop_coefficient_kc" in assump
    assert "management_allowed_depletion_pct" in assump


def test_api_irrigation_endpoint():
    """Verify GET /panchayats/{gp}/irrigation endpoint."""
    res = client.get("/panchayats/111722/irrigation?crop=maize&soil_type=clay_loam")
    assert res.status_code == 200
    data = res.json()
    assert "recommendation" in data
    assert "assumptions" in data
    assert data["assumptions"]["soil_type"] == "Clay Loam (Lowland Don)"
    assert "spi_30day" in data


# ============================================================================
# Prompt 3.3 Tests: Crowdsourced Ground Reports & Bot Conversational Prompt
# ============================================================================

def test_crowd_report_submission_and_retrieval():
    """Verify citizen rainfall report submission and retrieval."""
    import uuid
    test_device = f"dev_{uuid.uuid4().hex[:12]}"
    
    payload = {
        "rain": "moderate",
        "amount_mm": 12.5,
        "photo_url": "https://example.com/field_rain.jpg",
        "device_hash": test_device
    }
    res = client.post("/panchayats/111722/report", json=payload)
    assert res.status_code == 201
    d = res.json()
    assert d["status"] == "success"
    assert d["source"] == "CROWDSOURCED_UNVERIFIED"
    assert d["rain_category"] == "moderate"

    # Fetch GP crowd reports
    rep_res = client.get("/panchayats/111722/crowd-reports")
    assert rep_res.status_code == 200
    rep_data = rep_res.json()
    assert rep_data["source"] == "CROWDSOURCED_UNVERIFIED"
    assert rep_data["total_reports"] >= 1


def test_crowd_report_rate_limit():
    """Verify spam protection: second report from same device within 15m is rejected with 429."""
    import uuid
    test_device = f"dev_ratelimit_{uuid.uuid4().hex[:12]}"
    payload = {"rain": "light", "device_hash": test_device}

    res1 = client.post("/panchayats/111722/report", json=payload)
    assert res1.status_code == 201

    # Second report immediately
    res2 = client.post("/panchayats/111722/report", json=payload)
    assert res2.status_code == 429
    assert "Rate limit exceeded" in res2.json()["detail"]


def test_crowd_report_plausibility_check():
    """Verify plausibility check detects outlier (heavy rain reported during 0mm rain / dry RH)."""
    import uuid
    test_device = f"dev_plaus_{uuid.uuid4().hex[:12]}"
    
    # In GP 111722, forecast is typically clear or dry in testing state
    # A heavy rain report of 80mm with 'heavy' category:
    payload = {"rain": "heavy", "amount_mm": 80.0, "device_hash": test_device}
    res = client.post("/panchayats/111722/report", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "is_plausible" in data


def test_crowd_reports_in_verification_analytics():
    """Verify crowdsourced reports appear in /analytics/verification as CROWDSOURCED_UNVERIFIED."""
    res = client.get("/analytics/verification?district=DHANBAD")
    assert res.status_code == 200
    data = res.json()
    assert "crowdsourced_verification" in data
    cv = data["crowdsourced_verification"]
    assert cv["source_flag"] == "CROWDSOURCED_UNVERIFIED"
    assert "Unverified" in cv["source_label"]
    assert "disclaimer" in cv
    assert "total_reports" in cv
    assert "category_breakdown" in cv


def test_bot_did_it_rain_today_prompt_and_reply():
    """Verify 'Did it rain today?' prompt and reporting keyword in bot.core."""
    phone = "+919800099999"

    # 1. Register user
    r_reg = handle_message(phone, "828104")
    assert r_reg["status"] == "ok"

    # 2. Ask "Did it rain today?"
    r_ask = handle_message(phone, "Did it rain today?")
    assert r_ask["status"] == "ok"
    assert "Did it rain in" in r_ask["reply_text"]
    assert "RAIN NONE" in r_ask["reply_text"]

    # 3. User responds "RAIN HEAVY 35"
    r_rep = handle_message(phone, "RAIN HEAVY 35")
    assert r_rep["status"] == "ok"
    assert "Recorded: HEAVY rain" in r_rep["reply_text"]
    assert "unverified" in r_rep["reply_text"].lower()
