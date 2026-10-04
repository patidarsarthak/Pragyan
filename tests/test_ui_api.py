"""
Tests for UI API Adapter (backend/ui_api.py)
--------------------------------------------
Validates all endpoints specified in F1 (backend adapter) and Spec 07 (Map-Driven Architecture):
- /api/ui/parameters
- /api/ui/overview & /api/ui/overview/all
- /api/ui/hero
- /api/ui/districts/{id}/gps
- /api/ui/gp/{lgd_code}
- /api/ui/worst
- /api/ui/alerts & /api/ui/alerts.csv
- /api/ui/model
- /api/ui/replay/events & /api/ui/replay/{id}
- /api/ui/scope/summary
- /api/ui/params (columnar format)
- /api/ui/scope/bounds
- /api/ui/search
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_ui_parameters():
    r = client.get("/api/ui/parameters")
    assert r.status_code == 200
    data = r.json()
    assert "parameters" in data
    params = data["parameters"]
    assert len(params) >= 7
    ids = [p["id"] for p in params]
    assert "risk" in ids
    assert "rain" in ids
    assert "tmax" in ids


def test_ui_overview_aggregates():
    r = client.get("/api/ui/overview?day=1")
    assert r.status_code == 200
    data = r.json()
    assert data["day"] == 1
    assert "cuts" in data
    assert "band_definitions" in data
    assert len(data["available_days"]) == 10
    assert len(data["regions"]) > 0

    # Verify district aggregates principle
    mp_districts = [reg for reg in data["regions"] if reg["state"] == "Madhya Pradesh"]
    assert len(mp_districts) > 0
    for d in mp_districts:
        assert d["level"] == "district"
        assert d["data_available"] is True
        assert "Aggregate" in d["aggregate_label"]
        assert d["mean_risk"] is not None

    # Verify non-validated regions have honest reasons
    off_grid = [reg for reg in data["regions"] if not reg["data_available"]]
    if off_grid:
        assert off_grid[0]["reason"] == "Not available: model not validated here"
        assert off_grid[0]["mean_risk"] is None


def test_ui_overview_all_days():
    r = client.get("/api/ui/overview/all")
    assert r.status_code == 200
    data = r.json()
    assert len(data["days"]) == 10
    assert data["days"][0]["day"] == 1
    assert data["days"][9]["day"] == 10


def test_ui_hero():
    r = client.get("/api/ui/hero")
    assert r.status_code == 200
    data = r.json()
    assert "gauge" in data
    assert "share_alert" in data["gauge"]
    assert "risk_by_day" in data
    assert len(data["risk_by_day"]) == 10
    assert "calibration" in data
    assert len(data["calibration"]) > 0
    assert "skill" in data
    assert data["skill"]["mae_vs_block_pct"] > 25.0
    assert data["skill"]["n_stations"] >= 50


def test_ui_district_gps():
    r = client.get("/api/ui/districts/407/gps?day=1")
    assert r.status_code == 200
    gps = r.json()
    assert isinstance(gps, list)
    assert len(gps) > 0
    gp = gps[0]
    assert "lgd_code" in gp
    assert "name" in gp
    assert "risk_score" in gp
    assert "band" in gp
    assert gp["served_source"] == "Downscaled"


def test_ui_gp_detail():
    r = client.get("/api/ui/gp/133203")
    assert r.status_code == 200
    data = r.json()
    assert data["identity"]["lgd_code"] == 133203
    assert "badges" in data
    assert "peak" in data
    assert "factors" in data
    assert len(data["factors"]) >= 3
    assert "variables" in data
    assert len(data["variables"]) == 5  # rain, temp, humidity, wind, et0
    
    rain_var = next(v for v in data["variables"] if v["variable"] == "rainfall")
    assert len(rain_var["points"]) == 10
    p1 = rain_var["points"][0]
    assert "downscaled" in p1
    assert "coarse" in p1
    assert "lower" in p1
    assert "upper" in p1
    assert "advisories" in data
    assert len(data["advisories"]) > 0


def test_ui_worst():
    r = client.get("/api/ui/worst?day=1&scope=state&id=IN-MP&limit=10")
    assert r.status_code == 200
    worst = r.json()
    assert len(worst) <= 10
    # Must be sorted descending by risk
    for i in range(len(worst) - 1):
        assert worst[i]["risk_score"] >= worst[i + 1]["risk_score"]


def test_ui_alerts_and_csv():
    r = client.get("/api/ui/alerts?page=1&page_size=10")
    assert r.status_code == 200
    data = r.json()
    assert "stats" in data
    assert "items" in data
    assert len(data["items"]) <= 10

    # Test CSV export
    r_csv = client.get("/api/ui/alerts.csv")
    assert r_csv.status_code == 200
    assert "text/csv" in r_csv.headers["content-type"]
    assert "identifier,lgd_code,panchayat" in r_csv.text


def test_ui_model():
    r = client.get("/api/ui/model")
    assert r.status_code == 200
    data = r.json()
    assert "kpis" in data
    assert "baselines" in data
    assert len(data["baselines"]) >= 4
    assert "reliability" in data
    assert "coverage" in data
    assert "ledger" in data


def test_ui_replay():
    r = client.get("/api/ui/replay/events")
    assert r.status_code == 200
    events = r.json()
    assert len(events) >= 3
    event_ids = [e["id"] for e in events]
    assert "event-monsoon-deep-depression-2024" in event_ids
    assert "event-orographic-surge-2024" in event_ids
    assert "event-post2024-monsoon-surge-2026" in event_ids

    # Verify status partitioning: 2024 events are IN_SAMPLE, 2026 event is OUT_OF_SAMPLE
    dep_event = next(e for e in events if e["id"] == "event-monsoon-deep-depression-2024")
    assert "IN_SAMPLE" in dep_event["status"]
    assert dep_event["outcome_summary"] == "hit"

    oro_event = next(e for e in events if e["id"] == "event-orographic-surge-2024")
    assert "IN_SAMPLE" in oro_event["status"]
    assert oro_event["outcome_summary"] == "miss"

    post_event = next(e for e in events if e["id"] == "event-post2024-monsoon-surge-2026")
    assert "OUT_OF_SAMPLE" in post_event["status"]

    # Test summary endpoint
    r_sum = client.get(f"/api/ui/replay/{dep_event['id']}/summary")
    assert r_sum.status_code == 200
    sum_data = r_sum.json()
    assert "header" in sum_data
    assert "days" in sum_data
    assert len(sum_data["days"]) == 10
    day1 = sum_data["days"][0]
    assert day1["day"] == 1
    assert "narration" in day1
    assert "top5" in day1
    assert len(day1["top5"]) == 5

    # Test params columnar recoloring endpoint
    r_params = client.get(f"/api/ui/replay/{dep_event['id']}/params?day=1&scope=district:407")
    assert r_params.status_code == 200
    p_data = r_params.json()
    assert p_data["day"] == 1
    assert "ids" in p_data
    assert "risk" in p_data
    assert "band" in p_data
    assert len(p_data["ids"]) == len(p_data["risk"]) == len(p_data["band"])

    # Test GP ground-truth detail endpoint
    r_gp = client.get(f"/api/ui/replay/{dep_event['id']}/gp/111945")
    assert r_gp.status_code == 200
    gp_data = r_gp.json()
    assert gp_data["panchayat_id"] == 111945
    assert "station" in gp_data
    assert len(gp_data["days"]) == 10
    assert "in_range" in gp_data["days"][0]
    assert "category_match" in gp_data["days"][0]


def test_ui_scope_summary():
    # Test Scope = GP
    r_gp = client.get("/api/ui/scope/summary?level=gp&id=133203&day=1")
    assert r_gp.status_code == 200
    gp_data = r_gp.json()
    assert gp_data["aggregate"] is False
    assert gp_data["scope"]["level"] == "gp"

    # Test Scope = District
    r_dist = client.get("/api/ui/scope/summary?level=district&id=IN-MP-INDORE&day=1")
    assert r_dist.status_code == 200
    dist_data = r_dist.json()
    assert dist_data["aggregate"] is True
    assert dist_data["scope"]["level"] == "district"


def test_ui_columnar_params():
    r = client.get("/api/ui/params?scope=district:407&day=1")
    assert r.status_code == 200
    data = r.json()
    assert "lgd" in data
    assert "values" in data
    assert "rain" in data["values"]
    assert "risk" in data["values"]
    assert len(data["lgd"]) == len(data["values"]["rain"])


def test_ui_scope_bounds():
    r = client.get("/api/ui/scope/bounds?level=district&id=IN-MP-INDORE")
    assert r.status_code == 200
    data = r.json()
    assert "bbox" in data
    assert len(data["bbox"]) == 4


def test_ui_search():
    r = client.get("/api/ui/search?q=Sanwer")
    assert r.status_code == 200
    results = r.json()
    assert len(results) > 0
    assert any("Sanwer" in res["name"] for res in results)
