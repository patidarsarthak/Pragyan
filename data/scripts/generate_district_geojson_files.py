#!/usr/bin/env python3
"""
Generate District GeoJSON layers for Uttar Pradesh, Delhi, and Rajasthan.
"""

import os
import sys
import json
import math
import numpy as np
from pyproj import Transformer

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.database import SessionLocal, District

def create_district_polygon(center_lon, center_lat, radius_km=35.0, n_vertices=24, jitter_scale=0.18):
    zone = 44 if center_lon > 82.0 else 43
    to_utm = Transformer.from_crs("EPSG:4326", f"EPSG:326{zone}", always_xy=True)
    to_wgs = Transformer.from_crs(f"EPSG:326{zone}", "EPSG:4326", always_xy=True)
    
    cx, cy = to_utm.transform(center_lon, center_lat)
    angles = np.linspace(0, 2 * np.pi, n_vertices, endpoint=False)
    
    seed = int((abs(center_lat) * 1000 + abs(center_lon) * 100) % 10000)
    rng = np.random.RandomState(seed)
    jitter = 1.0 + jitter_scale * np.sin(3 * angles) + 0.08 * np.cos(4 * angles) + rng.uniform(-0.06, 0.06, n_vertices)
    
    coords = []
    radius_m = radius_km * 1000.0
    for a, j in zip(angles, jitter):
        r = radius_m * j
        x = cx + r * np.cos(a)
        y = cy + r * np.sin(a)
        lon, lat = to_wgs.transform(x, y)
        coords.append([round(lon, 5), round(lat, 5)])
    
    coords.append(coords[0])
    return coords

def build_geojson(state_code, state_name, default_radius_km=30.0):
    session = SessionLocal()
    try:
        districts = session.query(District).filter_by(state_code=state_code).all()
        features = []
        
        # Approximate centroids if not explicitly known
        centroids = {
            # UP
            188: (82.9739, 25.3176),
            168: (80.9462, 26.8467),
            134: (81.8463, 25.4358),
            152: (83.3732, 26.7606),
            126: (78.0081, 27.1767),
            171: (77.7064, 28.9845),
            162: (80.3319, 26.4499),
            142: (82.1998, 26.7922),
            # Delhi
            88: (77.0800, 28.7300),
            89: (77.1700, 28.6900),
            95: (77.2100, 28.5300),
            96: (76.9900, 28.5700),
            97: (77.0700, 28.6400),
            92: (77.2090, 28.6139),
            90: (77.2300, 28.6500),
            # Rajasthan
            107: (75.7873, 26.9124),
            109: (73.0243, 26.2389),
            122: (73.7125, 24.5854),
            112: (75.8648, 25.2138),
            101: (73.3119, 28.0229),
            99: (74.6399, 26.4499),
            100: (76.6346, 27.5530),
            108: (70.9083, 26.9157),
            120: (75.1399, 27.6094),
        }
        
        for d in districts:
            lon, lat = centroids.get(d.district_code, (77.0, 26.0))
            rad = 8.0 if state_code == 7 else (50.0 if d.district_code in [108, 101] else default_radius_km)
            poly_coords = create_district_polygon(lon, lat, radius_km=rad)
            
            features.append({
                "type": "Feature",
                "id": d.district_code,
                "properties": {
                    "district_code": d.district_code,
                    "district_name": d.district_name,
                    "state_code": state_code,
                    "state_name": state_name,
                    "is_pilot": d.is_pilot,
                    "total_blocks": d.total_blocks,
                    "total_gps": d.total_gps,
                    "centroid_lat": lat,
                    "centroid_lon": lon
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [poly_coords]
                }
            })
            
        return {
            "type": "FeatureCollection",
            "name": f"{state_name.replace(' ', '_')}_Districts",
            "features": features
        }
    finally:
        session.close()

def main():
    static_dir = os.path.join(PROJECT_ROOT, "data", "static")
    os.makedirs(static_dir, exist_ok=True)
    
    # 1. UP
    up_data = build_geojson(9, "Uttar Pradesh", default_radius_km=32.0)
    with open(os.path.join(static_dir, "up_districts.geojson"), "w", encoding="utf-8") as f:
        json.dump(up_data, f, indent=2)
    print(f"Generated up_districts.geojson with {len(up_data['features'])} districts.")
    
    # 2. Delhi
    delhi_data = build_geojson(7, "Delhi", default_radius_km=7.5)
    with open(os.path.join(static_dir, "delhi_districts.geojson"), "w", encoding="utf-8") as f:
        json.dump(delhi_data, f, indent=2)
    print(f"Generated delhi_districts.geojson with {len(delhi_data['features'])} districts.")
    
    # 3. Rajasthan
    rj_data = build_geojson(8, "Rajasthan", default_radius_km=38.0)
    with open(os.path.join(static_dir, "rajasthan_districts.geojson"), "w", encoding="utf-8") as f:
        json.dump(rj_data, f, indent=2)
    print(f"Generated rajasthan_districts.geojson with {len(rj_data['features'])} districts.")

if __name__ == "__main__":
    main()
