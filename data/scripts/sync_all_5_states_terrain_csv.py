#!/usr/bin/env python3
"""
Sync all Gram Panchayats across the 5 States into data/static/panchayat_terrain_landcover.csv
"""

import os
import sys
import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.database import SessionLocal, Panchayat, GISFeature

def main():
    session = SessionLocal()
    try:
        gps = session.query(Panchayat).all()
        rows = []
        for p in gps:
            gis = session.query(GISFeature).filter_by(gp_code=p.gp_code).first()
            elev = gis.elevation_mean if gis and gis.elevation_mean is not None else 220.0
            slope = gis.slope_mean if gis and gis.slope_mean is not None else 2.5
            lc_class = gis.land_cover_class if gis and gis.land_cover_class is not None else 12
            lc_name = gis.land_cover_name if gis and gis.land_cover_name is not None else "Cropland"
            
            rows.append({
                "GPCODE": p.gp_code,
                "GPNAME": p.gp_name,
                "BLOCK": p.block_name,
                "DISTRICT": p.district_name,
                "STATE": p.state_name,
                "LATITUDE": p.centroid_lat,
                "LONGITUDE": p.centroid_lon,
                "ELEVATION_M": elev,
                "SLOPE_DEG": slope,
                "LANDCOVER_CLASS": lc_class,
                "LANDCOVER_NAME": lc_name
            })
            
        df = pd.DataFrame(rows)
        out_csv = os.path.join(PROJECT_ROOT, "data", "static", "panchayat_terrain_landcover.csv")
        df.to_csv(out_csv, index=False)
        print(f"Successfully synced {len(df)} Panchayats across {df['STATE'].nunique()} States into {out_csv}!")
        print(df["STATE"].value_counts())
    finally:
        session.close()

if __name__ == "__main__":
    main()
