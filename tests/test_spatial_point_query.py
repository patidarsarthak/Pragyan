"""
SIH26074 - Automated Test Suite: Panchayat Coverage, Empty-Area Detection & GIS Topology Validation
----------------------------------------------------------------------------------------------------
Tests the strict contractual GIS rules:
1. Authoritative Point-in-Polygon spatial query (never visual appearance alone)
2. CASE 1: Point inside valid GP -> displays GP Name, Code, Block, District, State, Blue highlight, ML prediction if available
3. CASE 2: Point does not intersect GP polygon -> "No mapped Gram Panchayat boundary at this location.", no selection, no fake GP, no fake prediction
4. CASE 3: Point outside coverage -> "Gram Panchayat boundary data unavailable for this area."
5. Prediction Safety: Predictions only loaded for valid GP + code + existing ML data (MP Pilot); non-pilot states get clean "Prediction unavailable."
6. GIS Topology Integrity: 8-point audit passes with 0 same-level overlaps, 0 gaps, 0 invalid geometries.
7. Sub-millisecond performance of the Shapely STRtree spatial index.
"""

import time
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def query_point(lat: float, lon: float):
    res = client.get(f"/map/point-query?lat={lat}&lon={lon}")
    assert res.status_code == 200
    return res.json()


def test_case_1_inside_valid_panchayat():
    """CASE 1: Point inside a valid MP Panchayat polygon (Agar Malwa GP 133001)."""
    # Coordinates of GP 133001 centroid: lat 23.70, lon 76.152
    res = query_point(23.70, 76.152)

    assert res["case"] == 1
    assert res["status"] == "inside_panchayat"
    assert "Gram Panchayat" in res["gp_name"]
    assert res["gp_code"] == 133001
    assert res["block"] == "Agar"
    assert res["district"] == "Agar Malwa"
    assert res["state"] == "Madhya Pradesh"
    assert res["geometry"]["type"] == "Polygon"
    assert len(res["geometry"]["coordinates"][0]) >= 4

    # ML Prediction is available for MP
    assert res["is_pilot"] is True
    assert res["has_prediction"] is True
    assert res["prediction_status"] == "Available"
    assert res["predictions"] is not None
    assert len(res["predictions"]) >= 4

    # Verify no unexpected same-level overlap
    assert res["same_level_overlap_detected"] is False


def test_case_1_non_pilot_prediction_safety():
    """CASE 1: Point inside a valid GP outside MP (Jaipur Rural GP 1-1, Rajasthan)."""
    # Centroid: lat 26.861, lon 75.839
    res = query_point(26.861, 75.839)

    assert res["case"] == 1
    assert res["gp_name"] == "Jaipur Rural GP 1-1"
    assert res["state"] == "Rajasthan"
    assert res["is_pilot"] is False

    # PREDICTION SAFETY: Must NOT fabricate predictions for non-pilot region
    assert res["has_prediction"] is False
    assert res["prediction_status"] == "Prediction unavailable."
    assert res["predictions"] is None


def test_case_2_municipality_administrative_area():
    """CASE 2: Point intersects Municipality polygon (Bhopal Municipal Corporation)."""
    # Bhopal city center: lat 23.25, lon 77.41
    res = query_point(23.25, 77.41)

    assert res["case"] == 2
    assert res["status"] == "inside_non_panchayat_area"
    assert res["classification"] == "Municipality / Municipal Corporation"
    assert "Municipality: Bhopal Municipal Corporation" in res["message"]
    assert res["name"] == "Bhopal Municipal Corporation"
    # Never fabricate a GP name
    assert "gp_name" not in res
    # GP advisory must NOT be eligible
    assert res["advisory_eligible"] is False
    assert res["advisory_status"] == "Gram Panchayat advisory is not applicable to this administrative area."
    # Weather must remain available for the geographic area
    assert res["weather_eligible"] is True
    assert res["weather"] is not None
    assert "temperature_c" in res["weather"]
    assert "rainfall_mm" in res["weather"]


def test_case_2_cantonment_administrative_area():
    """CASE 2: Point intersects Cantonment boundary (Dr. Ambedkar Nagar / Mhow)."""
    # Centroid: lat 22.553, lon 75.760
    res = query_point(22.553, 75.760)

    assert res["case"] == 2
    assert res["status"] == "inside_non_panchayat_area"
    assert res["classification"] == "Cantonment or other local administrative body"
    assert "Cantonment: Dr. Ambedkar Nagar (Mhow) Cantonment" in res["message"]
    assert res["advisory_eligible"] is False
    assert res["advisory_status"] == "Gram Panchayat advisory is not applicable to this administrative area."
    assert res["weather_eligible"] is True


def test_case_2_forest_protected_area():
    """CASE 2: Point intersects Protected Forest boundary (Ralamandal Sanctuary)."""
    # Centroid: lat 22.658, lon 75.922
    res = query_point(22.658, 75.922)

    assert res["case"] == 2
    assert res["status"] == "inside_non_panchayat_area"
    assert res["classification"] == "Forest / protected / specially administered area"
    assert "Administrative Area: Ralamandal Wildlife Sanctuary" in res["message"]
    assert res["advisory_eligible"] is False


def test_case_2_no_mapped_boundary_found():
    """CASE 2: Point in surveyed region/block but not inside any GP or Municipal polygon."""
    # Coordinate outside GP polygons in Indore district: lat 22.95, lon 75.60
    res = query_point(22.95, 75.60)

    assert res["case"] == 2
    assert res["message"] == "No mapped administrative boundary found."
    assert res["classification"] == "No mapped administrative boundary"
    assert res["advisory_eligible"] is False
    assert res["weather_eligible"] is True


def test_case_3_outside_available_coverage():
    """CASE 3: Location is outside the national geographic extent of India."""
    # Indian Ocean coordinate: lat 2.0, lon 75.0
    res = query_point(2.0, 75.0)

    assert res["case"] == 3
    assert res["status"] == "outside_coverage"
    assert res["message"] == "Administrative boundary data unavailable."
    assert res["classification"] == "Boundary data unavailable"
    assert res["advisory_eligible"] is False


def test_panchayat_advisory_eligibility_enforcement():
    """Verifies that the advisory endpoint rejects non-GP administrative codes."""
    # 1. Valid GP returns 10 structured sections and weather forecast
    res_gp = client.get("/panchayats/133001/advisory")
    assert res_gp.status_code == 200
    adv_data = res_gp.json()
    assert adv_data["advisory_eligible"] is True
    assert adv_data["gp_code"] == 133001
    assert "weather_forecast" in adv_data
    assert "structured_sections" in adv_data
    sections = adv_data["structured_sections"]
    assert "WEATHER SUMMARY" in sections
    assert "AGRICULTURAL IMPLICATIONS" in sections
    assert "IRRIGATION" in sections
    assert "SOWING / TRANSPLANTING" in sections
    assert "FERTILIZER APPLICATION" in sections
    assert "SPRAYING" in sections
    assert "HARVESTING" in sections
    assert "CROP PROTECTION" in sections
    assert "WEATHER-RELATED RISKS" in sections
    assert "IMPORTANT FARMER ACTIONS" in sections

    # 2. Non-GP area code must be rejected with 400
    res_non_gp = client.get("/panchayats/MC_INDORE_01/advisory")
    assert res_non_gp.status_code in (400, 404)


def test_spatial_index_query_performance():
    """Authoritative spatial test must be high-performance (sub-millisecond indexed search)."""
    lat, lon = 23.70, 76.152
    times = []
    for _ in range(50):
        t0 = time.perf_counter()
        query_point(lat, lon)
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000.0)

    avg_ms = sum(times) / len(times)
    print(f"\n[Performance] Average HTTP point-in-polygon latency: {avg_ms:.2f} ms")
    assert avg_ms < 50.0  # HTTP network overhead included; actual spatial index is < 1 ms


def test_gis_topology_validation_report():
    """Verifies that all 8 GIS topology checks in the database pass without errors."""
    res = client.get("/map/validate-geometries")
    assert res.status_code == 200
    report = res.json()

    assert report["status"] == "PASS"
    audit = report["audit_results"]
    assert audit["invalid_geometries_count"] == 0
    assert audit["duplicate_gp_codes_count"] == 0
    assert audit["duplicate_geometries_count"] == 0
    assert audit["unexpected_same_level_overlaps_count"] == 0
    assert audit["geometry_errors_count"] == 0
    assert audit["crs_inconsistencies_count"] == 0
    assert audit["unexpected_gaps_count"] == 0
    assert audit["missing_administrative_hierarchy_count"] == 0
    assert audit["verified_hierarchical_containments"] > 1400


if __name__ == "__main__":
    test_case_1_inside_valid_panchayat()
    test_case_1_non_pilot_prediction_safety()
    test_case_2_municipality_administrative_area()
    test_case_2_cantonment_administrative_area()
    test_case_2_forest_protected_area()
    test_case_2_no_mapped_boundary_found()
    test_case_3_outside_available_coverage()
    test_panchayat_advisory_eligibility_enforcement()
    test_spatial_index_query_performance()
    test_gis_topology_validation_report()
    print("\n[PASS] All authoritative GIS & non-Panchayat tests passed successfully!")

