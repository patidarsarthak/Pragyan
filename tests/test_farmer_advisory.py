"""
Unit tests for Crop-Wise Farmer Advisory System (Prompt 10)
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_crops_catalog():
    """Verify /api/crops returns authentic Madhya Pradesh prioritized crops."""
    res = client.get("/api/crops?state_code=23")
    assert res.status_code == 200
    data = res.json()
    crops = data["crops"]
    assert len(crops) >= 6

    crop_ids = [c["crop_id"] for c in crops]
    assert "soybean" in crop_ids
    assert "durum_wheat" in crop_ids
    assert "chickpea" in crop_ids
    assert "mustard" in crop_ids


def test_farmer_advisory_dossier():
    """Verify /api/advisory/{lgd} returns FAO-56 moisture and rule-based actions with no brand names."""
    res = client.get(
        "/api/advisory/133203?crop_id=durum_wheat&sowing_date=2026-10-15&soil_class=vertisols"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["panchayat_id"] == 133203
    assert "actions" in data
    assert len(data["actions"]) > 0

    # Strict guardrail check: NO chemical brands / dosages
    forbidden_terms = ["bayer", "syngenta", "coromandel", "confidor", "roundup", "litres/acre", "ml/acre"]
    for act in data["actions"]:
        act_text = (act["action"] + " " + act["why"]).lower()
        for term in forbidden_terms:
            assert term not in act_text, f"Forbidden chemical commercial term '{term}' found in advisory!"


def test_advisory_cohorts():
    """Verify /api/advisory/{lgd}/cohorts evaluates early, normal, and late cohorts."""
    res = client.get("/api/advisory/133203/cohorts?crop_id=durum_wheat")
    assert res.status_code == 200
    data = res.json()
    assert data["crop_id"] == "durum_wheat"
    assert len(data["cohorts"]) == 3
    cohort_names = [c["cohort"] for c in data["cohorts"]]
    assert "early" in cohort_names
    assert "normal" in cohort_names
    assert "late" in cohort_names


def test_advisory_explainer_divergence():
    """Verify /api/advisory/{lgd}/explain returns physics explanation comparing 1km downscaled vs coarse NWP."""
    res = client.get("/api/advisory/133203/explain?crop_id=durum_wheat")
    assert res.status_code == 200
    data = res.json()
    assert "panchayat_rain_10d_mm" in data
    assert "block_mean_rain_10d_mm" in data
    assert "divergence_reason" in data
    assert len(data["divergence_reason"]) > 10
