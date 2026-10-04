"""
SIH26074 - Compute Verifiability and Spatial Coverage for Panchayats (data_pipeline/22_compute_coverage.py)
---------------------------------------------------------------------------------------------------------
Computes distance, elevation difference, and coverage tier for every Gram Panchayat in Madhya Pradesh
relative to the 8 certified NOAA ISD synoptic weather stations.
Saves results to data/mp/panchayat_coverage.json for instant UI caching and API lookups.
"""

import os
import json
import sqlite3
from typing import Dict, Any, List
from ml.src.skill_vs_distance import get_nearest_ground_station, get_expected_error

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "backend", "sih26074_panchayat.db")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "mp", "panchayat_coverage.json")


def compute_all_panchayat_coverage() -> Dict[str, Any]:
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Query all panchayats in MP
    cursor.execute("""
        SELECT p.gp_code, p.gp_name, p.block_name, p.district_name, p.centroid_lat, p.centroid_lon,
               COALESCE(g.elevation_mean, 350.0) as elevation
        FROM panchayats p
        LEFT JOIN gis_features g ON p.gp_code = g.gp_code
        WHERE p.state_name = 'Madhya Pradesh'
    """)
    rows = cursor.fetchall()
    conn.close()

    results = {}
    tier_counts = {"WELL_VERIFIABLE": 0, "PARTIALLY_VERIFIABLE": 0, "POORLY_VERIFIABLE": 0}

    for gp_code, gp_name, block_name, district_name, lat, lon, elev in rows:
        st_info = get_nearest_ground_station(lat, lon, elev)
        rain_err = get_expected_error(st_info["distance_km"], "rainfall")
        temp_err = get_expected_error(st_info["distance_km"], "temperature")

        tier_counts[st_info["coverage_class"]] = tier_counts.get(st_info["coverage_class"], 0) + 1

        results[str(gp_code)] = {
            "gp_code": gp_code,
            "gp_name": gp_name,
            "block_name": block_name,
            "district_name": district_name,
            "latitude": lat,
            "longitude": lon,
            "elevation_m": elev,
            "nearest_station_name": st_info["nearest_station"]["name"],
            "distance_to_station_km": st_info["distance_km"],
            "elevation_difference_m": st_info["elevation_difference_m"],
            "coverage_class": st_info["coverage_class"],
            "coverage_label": st_info["coverage_label"],
            "color": st_info["color"],
            "truth_class": st_info["truth_class"],
            "expected_rain_error_mm": rain_err["expected_error"],
            "expected_temp_error_c": temp_err["expected_error"],
            "tooltip_text": f"Typical error: ±{rain_err['expected_error']}mm / ±{temp_err['expected_error']}°C (nearest station {st_info['distance_km']} km away)"
        }

    output_payload = {
        "total_panchayats": len(rows),
        "tier_summary": tier_counts,
        "panchayats": results
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)

    print(f"Computed coverage for {len(rows)} panchayats: {tier_counts}. Saved to {OUTPUT_PATH}")
    return output_payload


if __name__ == "__main__":
    compute_all_panchayat_coverage()
