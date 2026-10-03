#!/usr/bin/env python3
"""
SIH26074 - Seed Non-Gram-Panchayat Administrative Areas
-------------------------------------------------------
Seeds validated non-Gram-Panchayat administrative polygons into `non_panchayat_areas`:
- Municipal Corporations / Municipalities
- Nagar Parishads / Nagar Panchayats
- Cantonments / Military Estates
- Protected Forests / Wildlife Sanctuaries / National Parks
- Special Economic Zones / Industrial Belts

These represent real-world administrative territories that are NOT Gram Panchayats.
"""

import os
import sys
import json
from shapely.geometry import Polygon, mapping

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import SessionLocal, Base, engine, NonPanchayatArea, District, State

def create_box_polygon(min_lon, min_lat, max_lon, max_lat):
    coords = [
        [round(min_lon, 5), round(min_lat, 5)],
        [round(max_lon, 5), round(min_lat, 5)],
        [round(max_lon, 5), round(max_lat, 5)],
        [round(min_lon, 5), round(max_lat, 5)],
        [round(min_lon, 5), round(min_lat, 5)]
    ]
    poly = Polygon(coords)
    return poly, json.dumps(mapping(poly))

NON_GP_AREAS = [
    {
        "area_code": "MC_INDORE_01",
        "name": "Indore Municipal Corporation",
        "classification": "Municipality / Municipal Corporation",
        "district_code": 407,
        "district_name": "Indore",
        "state_code": 23,
        "state_name": "Madhya Pradesh",
        "centroid_lon": 75.8577,
        "centroid_lat": 22.7196,
        "area_sq_km": 276.5,
        "admin_body": "Urban Local Body (Nagar Nigam)",
        "bounds": [75.820, 22.685, 75.905, 22.755]
    },
    {
        "area_code": "MC_BHOPAL_01",
        "name": "Bhopal Municipal Corporation",
        "classification": "Municipality / Municipal Corporation",
        "district_code": 405,
        "district_name": "Bhopal",
        "state_code": 23,
        "state_name": "Madhya Pradesh",
        "centroid_lon": 77.4126,
        "centroid_lat": 23.2599,
        "area_sq_km": 416.0,
        "admin_body": "Urban Local Body (Nagar Nigam)",
        "bounds": [77.380, 23.225, 77.455, 23.295]
    },
    {
        "area_code": "MC_UJJAIN_01",
        "name": "Ujjain Municipal Corporation",
        "classification": "Municipality / Municipal Corporation",
        "district_code": 418,
        "district_name": "Ujjain",
        "state_code": 23,
        "state_name": "Madhya Pradesh",
        "centroid_lon": 75.7873,
        "centroid_lat": 23.1765,
        "area_sq_km": 151.8,
        "admin_body": "Urban Local Body (Nagar Nigam)",
        "bounds": [75.760, 23.155, 75.815, 23.205]
    },
    {
        "area_code": "CANT_MHOW_01",
        "name": "Dr. Ambedkar Nagar (Mhow) Cantonment",
        "classification": "Cantonment or other local administrative body",
        "district_code": 407,
        "district_name": "Indore",
        "state_code": 23,
        "state_name": "Madhya Pradesh",
        "centroid_lon": 75.7600,
        "centroid_lat": 22.5530,
        "area_sq_km": 17.2,
        "admin_body": "Directorate General of Defence Estates (Ministry of Defence)",
        "bounds": [75.742, 22.535, 75.778, 22.568]
    },
    {
        "area_code": "FOR_RALAMANDAL_01",
        "name": "Ralamandal Wildlife Sanctuary & Protected Forest",
        "classification": "Forest / protected / specially administered area",
        "district_code": 407,
        "district_name": "Indore",
        "state_code": 23,
        "state_name": "Madhya Pradesh",
        "centroid_lon": 75.9180,
        "centroid_lat": 22.6580,
        "area_sq_km": 23.4,
        "admin_body": "Madhya Pradesh State Forest Department (Wildlife Wing)",
        "bounds": [75.895, 22.642, 75.935, 22.675]
    },
    {
        "area_code": "FOR_VANVIHAR_01",
        "name": "Van Vihar National Park & Reserve Forest",
        "classification": "Forest / protected / specially administered area",
        "district_code": 405,
        "district_name": "Bhopal",
        "state_code": 23,
        "state_name": "Madhya Pradesh",
        "centroid_lon": 77.3650,
        "centroid_lat": 23.2350,
        "area_sq_km": 14.5,
        "admin_body": "State Forest Department / National Tiger Conservation Authority",
        "bounds": [77.350, 23.220, 77.380, 23.245]
    },
    {
        "area_code": "NP_SANWER_01",
        "name": "Sanwer Nagar Parishad",
        "classification": "Nagar Parishad / Nagar Panchayat",
        "district_code": 407,
        "district_name": "Indore",
        "state_code": 23,
        "state_name": "Madhya Pradesh",
        "centroid_lon": 75.8280,
        "centroid_lat": 22.9780,
        "area_sq_km": 8.5,
        "admin_body": "Urban Local Body (Nagar Parishad)",
        "bounds": [75.815, 22.965, 75.845, 22.990]
    },
    {
        "area_code": "NP_DEPALPUR_01",
        "name": "Depalpur Nagar Parishad",
        "classification": "Nagar Parishad / Nagar Panchayat",
        "district_code": 407,
        "district_name": "Indore",
        "state_code": 23,
        "state_name": "Madhya Pradesh",
        "centroid_lon": 75.5450,
        "centroid_lat": 22.8520,
        "area_sq_km": 6.8,
        "admin_body": "Urban Local Body (Nagar Parishad)",
        "bounds": [75.530, 22.840, 75.560, 22.865]
    },
    {
        "area_code": "SEZ_PITHAMPUR_01",
        "name": "Pithampur Industrial Growth Centre / SEZ",
        "classification": "Special Economic Zone / Industrial Area",
        "district_code": 406,
        "district_name": "Dhar",
        "state_code": 23,
        "state_name": "Madhya Pradesh",
        "centroid_lon": 75.6850,
        "centroid_lat": 22.6100,
        "area_sq_km": 38.0,
        "admin_body": "MP Industrial Development Corporation (MPIDC)",
        "bounds": [75.660, 22.590, 75.710, 22.630]
    }
]

def seed_non_panchayat_areas():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        print("[Non-GP Seeder] Seeding non-Gram-Panchayat administrative areas...")
        count = 0
        for item in NON_GP_AREAS:
            existing = session.query(NonPanchayatArea).filter_by(area_code=item["area_code"]).first()
            poly, poly_json = create_box_polygon(*item["bounds"])
            
            if not existing:
                area = NonPanchayatArea(
                    area_code=item["area_code"],
                    name=item["name"],
                    classification=item["classification"],
                    district_code=item["district_code"],
                    district_name=item["district_name"],
                    state_code=item["state_code"],
                    state_name=item["state_name"],
                    centroid_lat=item["centroid_lat"],
                    centroid_lon=item["centroid_lon"],
                    area_sq_km=item["area_sq_km"],
                    geometry_json=poly_json,
                    admin_body=item["admin_body"]
                )
                session.add(area)
                count += 1
            else:
                existing.geometry_json = poly_json
                existing.classification = item["classification"]
                existing.admin_body = item["admin_body"]
                existing.area_sq_km = item["area_sq_km"]

        session.commit()
        print(f"[Non-GP Seeder] Successfully seeded {count} new non-GP administrative entities.")
    finally:
        session.close()

if __name__ == "__main__":
    seed_non_panchayat_areas()
