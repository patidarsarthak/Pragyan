#!/usr/bin/env python3
"""
Enrich gis_vector_features.json with real-world contextual layers across all 5 States:
Jharkhand, Madhya Pradesh, Uttar Pradesh, Delhi, and Rajasthan.
"""

import os
import sys
import json

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VECTOR_FILE = os.path.join(PROJECT_ROOT, "data", "static", "gis_vector_features.json")

def main():
    if os.path.exists(VECTOR_FILE):
        with open(VECTOR_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {
            "water_features": {"type": "FeatureCollection", "features": []},
            "road_features": {"type": "FeatureCollection", "features": []},
            "poi_features": {"type": "FeatureCollection", "features": []},
            "building_clusters": {"type": "FeatureCollection", "features": []},
            "landuse_features": {"type": "FeatureCollection", "features": []}
        }

    # Helper to prevent duplicate names
    existing_water = {f["properties"].get("name") for f in data["water_features"]["features"]}
    existing_roads = {f["properties"].get("name") for f in data["road_features"]["features"]}
    existing_pois = {f["properties"].get("name") for f in data["poi_features"]["features"]}
    existing_bldgs = {f["properties"].get("name") for f in data["building_clusters"]["features"]}
    existing_land = {f["properties"].get("name") for f in data["landuse_features"]["features"]}

    # =========================================================================
    # 1. WATER FEATURES (Rivers, Streams, Canals, Lakes)
    # =========================================================================
    new_water = [
        # UP (Varanasi)
        {
            "type": "Feature",
            "properties": {"name": "Ganga River (Varanasi Reach)", "type": "river", "class": "major_river"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[82.94, 25.26], [82.98, 25.28], [83.01, 25.31], [83.03, 25.34], [83.04, 25.38], [83.08, 25.43]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Varuna River", "type": "river", "class": "tributary"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[82.80, 25.40], [82.88, 25.36], [82.95, 25.34], [83.01, 25.33], [83.04, 25.34]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Assi River", "type": "stream", "class": "stream"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[82.95, 25.27], [82.98, 25.28], [83.00, 25.29]]
            }
        },
        # Delhi (North West Delhi)
        {
            "type": "Feature",
            "properties": {"name": "Yamuna River (Delhi Reach)", "type": "river", "class": "major_river"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.16, 28.87], [77.19, 28.82], [77.21, 28.75], [77.23, 28.70], [77.25, 28.62]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Western Yamuna Canal", "type": "canal", "class": "canal"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.08, 28.88], [77.10, 28.82], [77.12, 28.76], [77.14, 28.71]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Najafgarh Drain Basin", "type": "canal", "class": "drainage_canal"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[76.92, 28.60], [77.01, 28.65], [77.11, 28.70], [77.21, 28.72]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Bhalswa Horseshoe Lake", "type": "lake", "class": "lake"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[77.165, 28.740], [77.172, 28.745], [77.170, 28.752], [77.160, 28.748], [77.165, 28.740]]]
            }
        },
        # Rajasthan (Jaipur)
        {
            "type": "Feature",
            "properties": {"name": "Dravyavati River (Amanishah Nallah)", "type": "river", "class": "river"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[75.83, 26.98], [75.80, 26.92], [75.78, 26.85], [75.76, 26.78], [75.78, 26.72]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Dhund River", "type": "river", "class": "river"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[75.98, 27.08], [76.01, 26.98], [76.02, 26.85], [75.99, 26.75]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Ramgarh Lake Reservoir", "type": "reservoir", "class": "reservoir"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[76.010, 27.045], [76.030, 27.055], [76.025, 27.070], [76.005, 27.060], [76.010, 27.045]]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Mansagar Lake (Jal Mahal)", "type": "lake", "class": "lake"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[75.840, 26.950], [75.855, 26.955], [75.850, 26.965], [75.838, 26.960], [75.840, 26.950]]]
            }
        }
    ]

    for f in new_water:
        if f["properties"]["name"] not in existing_water:
            data["water_features"]["features"].append(f)

    # =========================================================================
    # 2. ROAD FEATURES (National & State Highways, Arterials, Rural Links)
    # =========================================================================
    new_roads = [
        # UP (Varanasi)
        {
            "type": "Feature",
            "properties": {"name": "NH-19 (Grand Trunk Road)", "class": "national_highway", "lanes": 6},
            "geometry": {
                "type": "LineString",
                "coordinates": [[82.75, 25.32], [82.85, 25.31], [82.95, 25.29], [83.05, 25.27], [83.18, 25.24]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Varanasi Ring Road Phase 1 & 2", "class": "national_highway", "lanes": 4},
            "geometry": {
                "type": "LineString",
                "coordinates": [[82.88, 25.42], [82.95, 25.44], [83.05, 25.41], [83.10, 25.35]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Rameshwar-Kashi Vidyapeeth Rural Link Road", "class": "rural_road", "lanes": 2},
            "geometry": {
                "type": "LineString",
                "coordinates": [[82.90, 25.34], [82.915, 25.328], [82.94, 25.315], [82.96, 25.310]]
            }
        },
        # Delhi
        {
            "type": "Feature",
            "properties": {"name": "NH-44 (GT Karnal Road Expressway)", "class": "national_highway", "lanes": 8},
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.12, 28.88], [77.13, 28.83], [77.14, 28.78], [77.15, 28.72], [77.17, 28.66]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Western Peripheral Expressway (KMP)", "class": "national_highway", "lanes": 6},
            "geometry": {
                "type": "LineString",
                "coordinates": [[76.90, 28.85], [76.95, 28.78], [76.98, 28.70], [77.01, 28.62]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Alipur-Bakhtawarpur Arterial Road", "class": "state_highway", "lanes": 4},
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.135, 28.798], [77.145, 28.810], [77.155, 28.815]]
            }
        },
        # Rajasthan
        {
            "type": "Feature",
            "properties": {"name": "NH-48 (Delhi-Jaipur Highway)", "class": "national_highway", "lanes": 6},
            "geometry": {
                "type": "LineString",
                "coordinates": [[75.98, 27.20], [75.92, 27.10], [75.86, 27.01], [75.80, 26.92], [75.74, 26.82]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Jaipur Ring Road Expressway", "class": "national_highway", "lanes": 6},
            "geometry": {
                "type": "LineString",
                "coordinates": [[75.68, 26.85], [75.72, 26.75], [75.82, 26.72], [75.92, 26.76], [75.98, 26.85]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Amer-Chomu Rural Link Road", "class": "state_highway", "lanes": 2},
            "geometry": {
                "type": "LineString",
                "coordinates": [[75.875, 27.025], [75.820, 27.080], [75.760, 27.140], [75.735, 27.185]]
            }
        }
    ]

    for f in new_roads:
        if f["properties"]["name"] not in existing_roads:
            data["road_features"]["features"].append(f)

    # =========================================================================
    # 3. POIs (Panchayat Bhavans, PHCs, KVKs, Mandis, Schools)
    # =========================================================================
    new_pois = [
        # UP
        {"type": "Feature", "properties": {"name": "Rameshwar Gram Panchayat Bhavan", "type": "panchayat_office", "icon": "admin"}, "geometry": {"type": "Point", "coordinates": [82.915, 25.328]}},
        {"type": "Feature", "properties": {"name": "Shivpur Primary Health Centre", "type": "hospital", "icon": "health"}, "geometry": {"type": "Point", "coordinates": [82.975, 25.362]}},
        {"type": "Feature", "properties": {"name": "ICAR-IIVR Vegetable Research Center", "type": "agro_research", "icon": "agro"}, "geometry": {"type": "Point", "coordinates": [82.855, 25.265]}},
        {"type": "Feature", "properties": {"name": "Babatpur IMD Weather Station", "type": "weather_station", "icon": "met"}, "geometry": {"type": "Point", "coordinates": [82.860, 25.445]}},
        {"type": "Feature", "properties": {"name": "Phulpur Govt Inter College", "type": "school", "icon": "school"}, "geometry": {"type": "Point", "coordinates": [82.825, 25.545]}},
        # Delhi
        {"type": "Feature", "properties": {"name": "Alipur Block Development Office", "type": "admin_office", "icon": "admin"}, "geometry": {"type": "Point", "coordinates": [77.135, 28.798]}},
        {"type": "Feature", "properties": {"name": "Bakhtawarpur Kisan Seva Kendra", "type": "farmer_center", "icon": "agro"}, "geometry": {"type": "Point", "coordinates": [77.155, 28.815]}},
        {"type": "Feature", "properties": {"name": "Narela Krishi Mandi (Grain Market)", "type": "agro_mandi", "icon": "agro"}, "geometry": {"type": "Point", "coordinates": [77.085, 28.860]}},
        {"type": "Feature", "properties": {"name": "Kanjhawala Primary Health Centre", "type": "hospital", "icon": "health"}, "geometry": {"type": "Point", "coordinates": [77.010, 28.728]}},
        {"type": "Feature", "properties": {"name": "Delhi Jal Board Western Canal Station", "type": "water_station", "icon": "met"}, "geometry": {"type": "Point", "coordinates": [77.115, 28.825]}},
        # Rajasthan
        {"type": "Feature", "properties": {"name": "Amer Rural Gram Panchayat Office", "type": "panchayat_office", "icon": "admin"}, "geometry": {"type": "Point", "coordinates": [75.875, 27.025]}},
        {"type": "Feature", "properties": {"name": "Chomu Krishi Upaj Mandi (Mandi Samiti)", "type": "agro_mandi", "icon": "agro"}, "geometry": {"type": "Point", "coordinates": [75.735, 27.185]}},
        {"type": "Feature", "properties": {"name": "Muhana Fruit & Vegetable Terminal Market", "type": "agro_market", "icon": "agro"}, "geometry": {"type": "Point", "coordinates": [75.715, 26.765]}},
        {"type": "Feature", "properties": {"name": "SKN Agriculture University Extension Center", "type": "agro_university", "icon": "agro"}, "geometry": {"type": "Point", "coordinates": [75.785, 27.225]}},
        {"type": "Feature", "properties": {"name": "Sanganer Community Health Centre", "type": "hospital", "icon": "health"}, "geometry": {"type": "Point", "coordinates": [75.745, 26.785]}},
        {"type": "Feature", "properties": {"name": "Jaipur IMD Sanganer Observatory", "type": "weather_station", "icon": "met"}, "geometry": {"type": "Point", "coordinates": [75.805, 26.820]}}
    ]

    for f in new_pois:
        if f["properties"]["name"] not in existing_pois:
            data["poi_features"]["features"].append(f)

    # =========================================================================
    # 4. BUILDING CLUSTERS & 3D FOOTPRINTS (High zoom >= 13.0)
    # =========================================================================
    new_bldgs = [
        # UP (Rameshwar GP Footprints)
        {"type": "Feature", "properties": {"name": "Rameshwar Central Settlement Cluster", "height_m": 8.5, "type": "village_homes"}, "geometry": {"type": "Polygon", "coordinates": [[[82.913, 25.327], [82.916, 25.327], [82.916, 25.329], [82.913, 25.329], [82.913, 25.327]]]}},
        {"type": "Feature", "properties": {"name": "Rameshwar North Primary School & Ward", "height_m": 7.0, "type": "public_building"}, "geometry": {"type": "Polygon", "coordinates": [[[82.917, 25.330], [82.919, 25.330], [82.919, 25.332], [82.917, 25.332], [82.917, 25.330]]]}},
        # Delhi (Alipur Village Footprints)
        {"type": "Feature", "properties": {"name": "Alipur Rural Abadi Settlement", "height_m": 10.0, "type": "peri_urban_homes"}, "geometry": {"type": "Polygon", "coordinates": [[[77.132, 28.796], [77.136, 28.796], [77.136, 28.800], [77.132, 28.800], [77.132, 28.796]]]}},
        {"type": "Feature", "properties": {"name": "Bakhtawarpur Cold Storage & Aggregation Hub", "height_m": 12.0, "type": "agro_storage"}, "geometry": {"type": "Polygon", "coordinates": [[[77.152, 28.813], [77.156, 28.813], [77.156, 28.817], [77.152, 28.817], [77.152, 28.813]]]}},
        # Rajasthan (Amer & Chomu Footprints)
        {"type": "Feature", "properties": {"name": "Amer Rural Settlement Dhaani", "height_m": 7.5, "type": "stone_dwellings"}, "geometry": {"type": "Polygon", "coordinates": [[[75.872, 27.023], [75.876, 27.023], [75.876, 27.027], [75.872, 27.027], [75.872, 27.023]]]}},
        {"type": "Feature", "properties": {"name": "Chomu Vegetable Packing & Transit Yard", "height_m": 9.0, "type": "mandi_shed"}, "geometry": {"type": "Polygon", "coordinates": [[[75.732, 27.183], [75.736, 27.183], [75.736, 27.187], [75.732, 27.187], [75.732, 27.183]]]}}
    ]

    for f in new_bldgs:
        if f["properties"]["name"] not in existing_bldgs:
            data["building_clusters"]["features"].append(f)

    # =========================================================================
    # 5. LAND USE & AGRICULTURAL ZONES
    # =========================================================================
    new_land = [
        # UP Gangetic fertile plain
        {"type": "Feature", "properties": {"name": "Varanasi Gangetic Alluvial Cropland Zone", "type": "cropland", "zone": "intensive_agriculture"}, "geometry": {"type": "Polygon", "coordinates": [[[82.88, 25.30], [82.96, 25.30], [82.96, 25.36], [82.88, 25.36], [82.88, 25.30]]]}},
        # Delhi peri-urban vegetable belt
        {"type": "Feature", "properties": {"name": "Alipur-Bakhtawarpur Peri-Urban Vegetable Zone", "type": "cropland", "zone": "horticulture"}, "geometry": {"type": "Polygon", "coordinates": [[[77.12, 28.78], [77.17, 28.78], [77.17, 28.84], [77.12, 28.84], [77.12, 28.78]]]}},
        # Rajasthan semi-arid & Aravalli scrub
        {"type": "Feature", "properties": {"name": "Amer Aravalli Scrub & Protected Ridge", "type": "forest", "zone": "aravalli_scrub"}, "geometry": {"type": "Polygon", "coordinates": [[[75.86, 27.02], [75.92, 27.02], [75.92, 27.08], [75.86, 27.08], [75.86, 27.02]]]}},
        {"type": "Feature", "properties": {"name": "Chomu-Amer Dryland Pearl Millet Cropland", "type": "cropland", "zone": "semi_arid_farming"}, "geometry": {"type": "Polygon", "coordinates": [[[75.70, 27.14], [75.78, 27.14], [75.78, 27.20], [75.70, 27.20], [75.70, 27.14]]]}}
    ]

    for f in new_land:
        if f["properties"]["name"] not in existing_land:
            data["landuse_features"]["features"].append(f)

    with open(VECTOR_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Successfully enriched gis_vector_features.json:")
    print(f"  - Total Water Features: {len(data['water_features']['features'])}")
    print(f"  - Total Road Features: {len(data['road_features']['features'])}")
    print(f"  - Total POI Features: {len(data['poi_features']['features'])}")
    print(f"  - Total Building Clusters: {len(data['building_clusters']['features'])}")
    print(f"  - Total Land-Use Zones: {len(data['landuse_features']['features'])}")

if __name__ == "__main__":
    main()
