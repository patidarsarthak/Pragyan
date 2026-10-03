"""
SIH26074 - Acceptance Test Suite for the 5 True USPs
----------------------------------------------------
Validates the 5 Unique Selling Propositions identified in competitive analysis:
1. USP 1: Advisory Verification ("Did the Advice Work?")
2. USP 2: Verification-Coverage Map + Panchayat Reporter Network
3. USP 3: Multi-Model Consensus as the Confidence Signal
4. USP 4: Physics-Consistent FAO-56 ET0 Water Balance & Irrigation Scheduling
5. USP 5: Drop-in Government Common Alerting Protocol (CAP 1.2 XML)
"""

import pytest
import xml.etree.ElementTree as ET
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_usp1_advisory_verification():
    """USP 1: Evaluates hit rate, false alarm rate, and economic cost-loss benefit."""
    response = client.get("/analytics/advisory-verification")
    assert response.status_code == 200
    data = response.json()

    assert data["total_advisory_events_evaluated"] >= 1000
    if data.get("status") == "NOT YET MEASURED":
        assert data["overall_hit_rate_pct"] is None
        assert "NOT YET MEASURED" in data.get("validation_methodology", "")
    else:
        assert 75.0 <= data["overall_hit_rate_pct"] <= 95.0
        assert 5.0 <= data["overall_false_alarm_pct"] <= 20.0
        assert "cost_loss_ratio" in data
        assert "average_savings_inr_per_hectare" in data
        assert len(data["rules_breakdown"]) >= 4

        # Verify specific agronomic rules evaluated
        rule_names = [r["rule_name"] for r in data["rules_breakdown"]]
        assert "Suspend Supplemental Irrigation" in rule_names
        assert "Withhold Chemical Spray (Wind / Rain Window)" in rule_names
        assert "Delay Crop Threshing / Harvest" in rule_names
        assert "Prophylactic Blight / Fungicide Spray" in rule_names


def test_usp2_verification_coverage_map():
    """USP 2: Proximity to nearest official IMD AWS/ARG station & tier breakdown."""
    response = client.get("/analytics/coverage-map")
    assert response.status_code == 200
    data = response.json()

    assert data["total_panchayats_evaluated"] > 0
    assert data["official_stations_in_network"] > 0
    assert "tier_1_direct_observation_pct" in data
    assert "tier_2_nearby_station_pct" in data
    assert "tier_3_interpolated_sparse_pct" in data
    assert len(data["coverage_sample"]) > 0

    sample = data["coverage_sample"][0]
    assert "distance_to_station_km" in sample
    assert "nearest_station_name" in sample
    assert "quality_tier" in sample
    assert sample["quality_tier"] in ["TIER_1_DIRECT", "TIER_2_NEARBY", "TIER_3_INTERPOLATED"]


def test_usp2_ground_report_flow():
    """USP 2: Kisan Mitra Ground Reporter submission and retrieval."""
    test_gp = 111722
    payload = {
        "amount_mm": 18.5,
        "intensity": "heavy",
        "photo_url": "https://sih26074.gov.in/proof/rain_obs_01.jpg"
    }
    post_res = client.post(f"/panchayats/{test_gp}/ground-report", json=payload)
    assert post_res.status_code == 200
    res_data = post_res.json()
    assert res_data["status"] == "success"
    assert res_data["gp_code"] == test_gp

    get_res = client.get(f"/panchayats/{test_gp}/ground-reports")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["source"] == "CROWDSOURCED_UNVERIFIED"
    assert len(get_data["reports"]) > 0


def test_usp3_multimodel_consensus():
    """USP 3: Multi-model consensus spread (ECMWF, GFS, AIFS) & dynamic CI."""
    response = client.get("/panchayats/111722/consensus")
    assert response.status_code == 200
    data = response.json()

    assert data["gp_code"] == 111722
    if data.get("status") == "NOT YET MEASURED":
        assert data.get("feature_status") == "DISABLED_PER_ZERO_FABRICATION_RULE"
    else:
        assert "consensus_mean" in data
        assert "consensus_agreement_index" in data
        assert "calibrated_confidence_pct" in data
        assert len(data["model_comparison"]) == 3

        model_names = [m["model_name"] for m in data["model_comparison"]]
        assert any("ECMWF IFS" in name for name in model_names)
        assert any("NOAA GFS" in name for name in model_names)
        assert any("AIFS" in name for name in model_names)

        # Dynamic interval validation
        ci = data["calibrated_prediction_interval"]
        assert ci["lower"] <= data["consensus_mean"] <= ci["upper"]


def test_usp4_fao56_water_balance():
    """USP 4: FAO-56 Penman-Monteith ET0, 2-layer soil bucket, and prescriptive irrigation."""
    response = client.get("/panchayats/111722/water-balance")
    assert response.status_code == 200
    data = response.json()

    assert data["gp_code"] == 111722
    assert "soil_type" in data
    assert "crop_profile" in data

    params = data["soil_water_parameters"]
    assert params["field_capacity_mm"] > params["wilting_point_mm"]
    assert params["total_available_water_mm"] > 0

    advisory = data["prescriptive_irrigation_advisory"]
    assert advisory["irrigation_urgency"] in ["Urgent", "Postpone"]
    assert "prescribed_water_depth_mm" in advisory
    assert advisory["prescribed_water_depth_mm"] >= 0

    budget = data["ten_day_water_budget"]
    assert len(budget) == 10
    day1 = budget[0]
    assert "fao56_et0_mm" in day1
    assert "soil_moisture_storage_mm" in day1
    assert "action_recommendation" in day1


def test_usp5_cap_alert_xml():
    """USP 5: OASIS CAP 1.2 XML compliant output with authoritative LGD geocodes and polygons."""
    response = client.get("/panchayats/111722/cap-alert.xml")
    assert response.status_code == 200
    assert "application/xml" in response.headers.get("content-type", "")

    # Parse XML
    xml_text = response.text
    root = ET.fromstring(xml_text)

    # CAP 1.2 Namespace
    assert "oasis:names:tc:emergency:cap:1.2" in root.tag

    # Check alert structure
    assert root.find("{urn:oasis:names:tc:emergency:cap:1.2}identifier") is not None
    assert root.find("{urn:oasis:names:tc:emergency:cap:1.2}sender") is not None

    infos = root.findall("{urn:oasis:names:tc:emergency:cap:1.2}info")
    assert len(infos) >= 2  # Bilingual: en-IN and hi-IN

    languages = [info.find("{urn:oasis:names:tc:emergency:cap:1.2}language").text for info in infos]
    assert "en-IN" in languages
    assert "hi-IN" in languages

    # Check polygon & LGD geocode
    en_info = next(i for i in infos if i.find("{urn:oasis:names:tc:emergency:cap:1.2}language").text == "en-IN")
    area = en_info.find("{urn:oasis:names:tc:emergency:cap:1.2}area")
    assert area is not None
    poly = area.find("{urn:oasis:names:tc:emergency:cap:1.2}polygon")
    assert poly is not None and len(poly.text.strip()) > 0
    geocode = area.find("{urn:oasis:names:tc:emergency:cap:1.2}geocode")
    assert geocode is not None
    assert geocode.find("{urn:oasis:names:tc:emergency:cap:1.2}value").text == "111722"

    # Also test JSON preview wrapper
    json_res = client.get("/panchayats/111722/cap-alert")
    assert json_res.status_code == 200
    json_data = json_res.json()
    assert json_data["standard"] == "OASIS CAP v1.2 / ITU-T X.1303"
    assert "xml_payload" in json_data
