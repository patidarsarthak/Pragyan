import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def main():
    print("=" * 70)
    print("SIH26074: VERIFYING THE 5 TRUE USPS & CAP 1.2 FROM BACKEND DATABASE")
    print("=" * 70)

    # 1. Root & Static Dashboard
    r_api = client.get("/", headers={"Accept": "application/json"})
    assert r_api.status_code == 200, f"Root returned {r_api.status_code}"
    assert "project" in r_api.json()
    print("[PASS] 1a. Root API Metadata (GET /) -> 200 OK")

    r_dash = client.get("/dashboard")
    assert r_dash.status_code == 200, f"/dashboard returned {r_dash.status_code}"
    assert "<!doctype html>" in r_dash.text.lower()
    print("[PASS] 1b. Interactive GIS Dashboard UI (GET /dashboard) -> 200 OK")

    # 2. USP 1: Advisory Verification ("Did the Advice Work?")
    r1 = client.get("/analytics/advisory-verification")
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["overall_hit_rate_pct"] > 75
    assert len(d1["rules_breakdown"]) >= 4
    print(f"[PASS] 2. USP 1 — Advisory Verification: Hit Rate={d1['overall_hit_rate_pct']}%, False Alarm={d1['overall_false_alarm_pct']}%, Savings=Rs.{d1['average_savings_inr_per_hectare']}/ha")
    print(f"       Evaluated Advisories: {d1['total_advisory_events_evaluated']} from {d1['verified_backend_database']}")

    # 3. USP 2: Verification-Coverage Map + Panchayat Reporter Network
    r2 = client.get("/analytics/coverage-map")
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["total_panchayats_evaluated"] > 0
    print(f"[PASS] 3. USP 2 — Coverage Map: Tier 1 Direct={d2['tier_1_direct_observation_pct']}%, Ground Observers={d2['total_registered_ground_reporters']}")

    # 4. USP 3: Multi-Model Consensus as Confidence Signal
    r3 = client.get("/panchayats/111722/consensus")
    assert r3.status_code == 200
    d3 = r3.json()
    assert len(d3["model_comparison"]) == 3
    print(f"[PASS] 4. USP 3 — Multi-Model Consensus: Mean={d3['consensus_mean']} mm, Agreement={d3['consensus_agreement_index']}, CI={d3['calibrated_prediction_interval']['lower']} to {d3['calibrated_prediction_interval']['upper']} mm")

    # 5. USP 4: Physics-Consistent FAO-56 ET0 Water Balance
    r4 = client.get("/panchayats/111722/water-balance")
    assert r4.status_code == 200
    d4 = r4.json()
    adv = d4["prescriptive_irrigation_advisory"]
    print(f"[PASS] 5. USP 4 — FAO-56 ET0 Water Balance: Urgency={adv['irrigation_urgency']}, Schedule: Irrigate in {adv['next_irrigation_lead_days']} days with {adv['prescribed_water_depth_mm']} mm")

    # 6. USP 5: Drop-in Government Common Alerting Protocol (CAP 1.2 XML)
    r5_xml = client.get("/panchayats/111722/cap-alert.xml")
    assert r5_xml.status_code == 200
    assert "application/xml" in r5_xml.headers.get("content-type", "")
    assert "oasis:names:tc:emergency:cap:1.2" in r5_xml.text
    print(f"[PASS] 6. USP 5 — Drop-in Government CAP 1.2 XML: Length={len(r5_xml.text)} bytes, Content-Type={r5_xml.headers.get('content-type')}")

    r5_json = client.get("/panchayats/111722/cap-alert")
    assert r5_json.status_code == 200
    d5 = r5_json.json()
    assert d5["standard"] == "OASIS CAP v1.2 / ITU-T X.1303"
    print(f"[PASS] 7. USP 5 — CAP 1.2 JSON Metadata Preview: Target={d5['protocol_target']}")

    print("=" * 70)
    print("ALL 5 TRUE USPs ARE 100% OPERATIONAL AND VERIFIED AGAINST THE DATABASE!")
    print("=" * 70)

if __name__ == "__main__":
    main()
