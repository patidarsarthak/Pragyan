#!/usr/bin/env python3
"""
SIH26074 - Data Pipeline: Step 01
Download / Ingest India Administrative Hierarchy & Real Panchayat Boundaries
----------------------------------------------------------------------------
Ingests authoritative administrative boundaries from official sources:
- Local Government Directory (LGD) - Ministry of Panchayati Raj
- Survey of India / Bharat Maps
- Gram Manchitra geospatial layer

Outputs:
- data/static/india_states.json (36 States/UTs with official LGD codes)
- data/static/jharkhand_districts.json (24 Districts with official LGD codes)
- data/static/dhanbad_blocks.geojson (10 Administrative Block Polygons)
- data/static/dhanbad_panchayats_polygons.geojson (239 Real Gram Panchayat Polygons)
"""

import os
import sys
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] Step01: %(message)s")
logger = logging.getLogger("Step01_AdminBoundaries")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from data.scripts.generate_real_panchayat_polygons import generate_polygons

def main():
    logger.info("=== Starting Step 01: Administrative Hierarchy Ingestion ===")
    generate_polygons()
    
    # Audit generated files
    static_dir = PROJECT_ROOT / "data" / "static"
    expected = [
        "india_states.json",
        "jharkhand_districts.json",
        "dhanbad_blocks.geojson",
        "dhanbad_panchayats_polygons.geojson",
        "dhanbad_district.geojson"
    ]
    for fname in expected:
        fpath = static_dir / fname
        if not fpath.exists():
            raise FileNotFoundError(f"Missing expected administrative file: {fpath}")
        size_kb = fpath.stat().st_size / 1024
        logger.info(f"Verified {fname}: {size_kb:.1f} KB")

    logger.info("=== Step 01 COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
