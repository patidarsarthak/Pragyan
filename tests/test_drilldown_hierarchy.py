"""
Unit tests for 4-Level Drill-Down Hierarchy & Search API (Prompt 09)
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_children_states():
    """Verify level=state returns 36 States/UTs with MP validated and others unvalidated."""
    res = client.get("/api/ui/children?level=state")
    assert res.status_code == 200
    states = res.json()
    assert len(states) >= 30

    mp = next((s for s in states if s["lgd"] == 23), None)
    assert mp is not None
    assert mp["name"] == "Madhya Pradesh"
    assert mp["validated"] is True
    assert mp["n_gp_scored"] == 603
    assert mp["n_gp_total"] == 23043

    # Non-pilot state check
    raj = next((s for s in states if s["lgd"] == 8), None)
    if raj:
        assert raj["validated"] is False


def test_children_districts():
    """Verify level=district for MP returns districts with honest scored counts."""
    res = client.get("/api/ui/children?level=district&id=IN-23")
    assert res.status_code == 200
    districts = res.json()
    assert len(districts) >= 10

    indore = next((d for d in districts if d["name"] == "Indore"), None)
    assert indore is not None
    assert indore["validated"] is True
    assert indore["n_gp_scored"] > 0


def test_children_blocks_decision_tree():
    """Verify level=block decision tree: block outlines not available label and has_geometry=False."""
    res = client.get("/api/ui/children?level=block&id=district:407")
    assert res.status_code == 200
    blocks = res.json()
    assert len(blocks) > 0

    sanwer = next((b for b in blocks if b["name"] == "Sanwer"), None)
    assert sanwer is not None
    assert sanwer["has_geometry"] is False
    assert "Block outline not available" in sanwer["boundary_note"]


def test_search_v2_by_name_and_lgd():
    """Verify unified search supports both textual names and numeric LGD codes."""
    # Text search
    res = client.get("/api/ui/search-v2?q=Sanwer")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert any("Sanwer" in item["name"] for item in data)

    # Numeric LGD code search
    res_lgd = client.get("/api/ui/search-v2?q=133203")
    assert res_lgd.status_code == 200
    data_lgd = res_lgd.json()
    assert len(data_lgd) > 0
    assert data_lgd[0]["lgd"] == 133203
    assert data_lgd[0]["level"] == "gp"


def test_crop_layers_endpoint():
    """Verify /api/ui/crop-layers returns scored features for officer map view."""
    res = client.get("/api/ui/crop-layers?lead_day=1&crop_id=durum_wheat&metric=irrigation_due_days")
    assert res.status_code == 200
    data = res.json()
    assert data["crop_id"] == "durum_wheat"
    assert data["metric"] == "irrigation_due_days"
    assert len(data["features"]) > 0
