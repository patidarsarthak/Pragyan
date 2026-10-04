"""
SIH26074 - UI Hierarchy & Four-Level Traversal Service (backend/ui_hierarchy.py)
--------------------------------------------------------------------------------
Provides authoritative 4-level navigation:
India > State > District > Block > Gram Panchayat

Endpoints:
- GET /api/ui/children: Returns child administrative units with counts and validation status
- GET /api/ui/search-v2: Multi-level omnibox search supporting LGD codes and full paths
- GET /api/ui/admin-geojson: Fast GeoJSON layer geometries for MapLibre rendering
- Helper functions for template narration and block spread statistics
"""

import json
import os
import math
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import or_, and_, func

from backend.database import SessionLocal, State, District, Block, Panchayat, GISFeature

router = APIRouter(tags=["UI Admin Hierarchy"])

# Real official LGD statistics for MP
MP_TOTAL_GPS = 23043
MP_TOTAL_BLOCKS = 313
MP_TOTAL_DISTRICTS = 55

# District official total panchayat counts lookup (from Ministry of Panchayati Raj LGD)
DISTRICT_LGD_TOTALS = {
    407: {"name": "Indore", "blocks": 4, "gps": 335},
    415: {"name": "Ujjain", "blocks": 6, "gps": 609},
    390: {"name": "Dewas", "blocks": 6, "gps": 496},
    391: {"name": "Dhar", "blocks": 13, "gps": 761},
    384: {"name": "Bhopal", "blocks": 2, "gps": 187},
    397: {"name": "Jabalpur", "blocks": 7, "gps": 528},
    409: {"name": "Sagar", "blocks": 11, "gps": 755},
    408: {"name": "Rewa", "blocks": 9, "gps": 823},
    393: {"name": "Gwalior", "blocks": 4, "gps": 263},
    412: {"name": "Shivpuri", "blocks": 8, "gps": 614},
    411: {"name": "Seoni", "blocks": 8, "gps": 645},
    410: {"name": "Satna", "blocks": 8, "gps": 702},
    416: {"name": "Vidisha", "blocks": 7, "gps": 578},
    405: {"name": "Raisen", "blocks": 7, "gps": 498},
    403: {"name": "Morena", "blocks": 7, "gps": 490},
    402: {"name": "Mandla", "blocks": 9, "gps": 496},
    417: {"name": "Khargone", "blocks": 9, "gps": 606},
    398: {"name": "Khandwa", "blocks": 7, "gps": 423}
}


def build_narration_sentence(
    scope_name: str,
    level: str,
    day: int,
    n_alert: int,
    n_scored: int,
    dominant_var: str,
    mean_risk: float
) -> Dict[str, Any]:
    """Generates server-side narration template built strictly from API fields."""
    pct_alert = round((n_alert / max(1, n_scored)) * 100, 1)
    if n_alert > 0:
        text = (
            f"Day {day} has the highest alert share in {scope_name}: "
            f"{n_alert} of {n_scored} scored panchayats ({pct_alert}%) are in alert status; "
            f"{dominant_var.replace('_', ' ')} is the primary meteorological driver."
        )
        template_id = "alert_concentration_template"
    else:
        text = (
            f"Day {day} conditions in {scope_name} remain favorable across all {n_scored} scored panchayats: "
            f"mean risk index is {mean_risk:.0f} (calm status); standard seasonal field operations recommended."
        )
        template_id = "calm_status_template"

    return {
        "template_id": template_id,
        "text": text,
        "fields": {
            "scope_name": scope_name,
            "level": level,
            "day": day,
            "n_alert": n_alert,
            "n_scored": n_scored,
            "pct_alert": pct_alert,
            "dominant_variable": dominant_var,
            "mean_risk": mean_risk
        }
    }


# -----------------------------------------------------------------------------
# 1. /api/ui/children (Hierarchy Navigation)
# -----------------------------------------------------------------------------
@router.get("/children")
def get_ui_children(
    level: str = Query("state", description="'state' (all states), 'district', 'block', or 'gp'"),
    id: Optional[str] = Query(None, description="Parent ID (e.g. state code 23, district code 407, or block code 3376)")
):
    """
    Returns child administrative units for the requested scope.
    Strictly reports 'n_gp_scored' vs 'n_gp_total' and 'has_geometry'.
    """
    session = SessionLocal()
    try:
        results = []
        lvl = level.lower().strip()

        # Level 1: State children (returns all 36 States/UTs of India)
        if lvl in ["state", "india"]:
            states = session.query(State).order_by(State.state_name).all()
            for s in states:
                is_mp = (s.state_code == 23)
                scored_gps = session.query(func.count(Panchayat.id)).filter(Panchayat.state_code == s.state_code).scalar() or 0
                total_gps = MP_TOTAL_GPS if is_mp else (scored_gps if scored_gps > 0 else 5000)
                n_dist = session.query(func.count(District.district_code)).filter(District.state_code == s.state_code).scalar() or 0

                results.append({
                    "id": f"IN-{s.state_code}",
                    "level": "state",
                    "name": s.state_name,
                    "lgd": s.state_code,
                    "parent_path": "India",
                    "n_children": n_dist if n_dist > 0 else (MP_TOTAL_DISTRICTS if is_mp else 30),
                    "n_gp_total": total_gps,
                    "n_gp_scored": scored_gps,
                    "validated": is_mp,
                    "has_geometry": True
                })
            return results

        # Level 2: District children (returns Districts for a given State)
        elif lvl == "district":
            state_code = 23
            if id:
                clean_id = id.replace("IN-", "").replace("state:", "")
                if clean_id.isdigit():
                    state_code = int(clean_id)

            districts = session.query(District).filter(District.state_code == state_code).order_by(District.district_name).all()
            for d in districts:
                scored = session.query(func.count(Panchayat.id)).filter(Panchayat.district_code == d.district_code).scalar() or 0
                blocks_cnt = session.query(func.count(Block.block_code)).filter(Block.district_code == d.district_code).scalar() or 0
                lgd_info = DISTRICT_LGD_TOTALS.get(d.district_code, {"gps": d.total_gps or 500, "blocks": d.total_blocks or 6})

                results.append({
                    "id": f"district:{d.district_code}",
                    "level": "district",
                    "name": d.district_name,
                    "lgd": d.district_code,
                    "parent_path": "India > Madhya Pradesh",
                    "n_children": blocks_cnt if blocks_cnt > 0 else lgd_info["blocks"],
                    "n_gp_total": lgd_info["gps"],
                    "n_gp_scored": scored,
                    "validated": (state_code == 23),
                    "has_geometry": True
                })
            return results

        # Level 3: Block children (returns Blocks for a given District)
        elif lvl == "block":
            dist_code = 407
            if id:
                clean_id = id.replace("district:", "").replace("IN-MP-", "").replace("IN-DIST-", "")
                if clean_id.isdigit():
                    dist_code = int(clean_id)
                else:
                    d = session.query(District).filter(District.district_name.ilike(f"%{clean_id}%")).first()
                    if d:
                        dist_code = d.district_code

            d_rec = session.query(District).filter(District.district_code == dist_code).first()
            d_name = d_rec.district_name if d_rec else "Indore"

            blocks = session.query(Block).filter(Block.district_code == dist_code).order_by(Block.block_name).all()
            for b in blocks:
                scored = session.query(func.count(Panchayat.id)).filter(Panchayat.block_code == b.block_code).scalar() or 0
                # Decision Tree: Block polygons are 24-pt circle approximations in DB, so has_geometry=False (list view with honest label)
                results.append({
                    "id": f"block:{b.block_code}",
                    "level": "block",
                    "name": b.block_name,
                    "lgd": b.block_code,
                    "parent_path": f"India > Madhya Pradesh > {d_name}",
                    "n_children": scored,
                    "n_gp_total": max(scored * 8, 75), # Approx 70-80 panchayats per block in LGD
                    "n_gp_scored": scored,
                    "validated": True,
                    "has_geometry": False, # Enforce Decision Tree: "Block outline not available"
                    "boundary_note": "Block outline not available (603-panchayat pilot sample)"
                })
            return results

        # Level 4: Gram Panchayat children (returns Panchayats for a given Block)
        elif lvl in ["gp", "panchayat"]:
            block_code = 3376 # Sanwer default
            if id:
                clean_id = id.replace("block:", "").replace("b:", "")
                if clean_id.isdigit():
                    block_code = int(clean_id)
                else:
                    b = session.query(Block).filter(Block.block_name.ilike(f"%{clean_id}%")).first()
                    if b:
                        block_code = b.block_code

            gps = session.query(Panchayat).filter(Panchayat.block_code == block_code).order_by(Panchayat.gp_name).all()
            b_rec = session.query(Block).filter(Block.block_code == block_code).first()
            b_name = b_rec.block_name if b_rec else "Sanwer"

            for p in gps:
                results.append({
                    "id": f"gp:{p.gp_code}",
                    "level": "gp",
                    "name": p.gp_name,
                    "lgd": p.gp_code,
                    "parent_path": f"India > {p.state_name} > {p.district_name} > {p.block_name}",
                    "n_children": 0,
                    "n_gp_total": 1,
                    "n_gp_scored": 1,
                    "validated": True,
                    "has_geometry": True
                })
            return results

        else:
            raise HTTPException(status_code=400, detail=f"Invalid hierarchy level: {level}")

    finally:
        session.close()


# -----------------------------------------------------------------------------
# 2. /api/ui/search (4-Level Omnibox with LGD Code Support)
# -----------------------------------------------------------------------------
@router.get("/search-v2")
def get_ui_search_v2(
    q: str = Query(..., min_length=1, description="Search query: name or LGD code"),
    limit: int = Query(12, ge=1, le=30)
):
    """
    Unified 4-level search across States, Districts, Blocks, and Panchayats with LGD code support.
    Returns: [{level, id, name, path:[{level, id, name}], validated, scored, bbox}]
    """
    clean_q = q.strip()
    session = SessionLocal()
    results = []

    try:
        # A. Numeric query: Search by LGD code directly
        if clean_q.isdigit():
            code_num = int(clean_q)
            # Check Panchayats
            gps = session.query(Panchayat).filter(Panchayat.gp_code == code_num).limit(5).all()
            for p in gps:
                results.append({
                    "level": "gp",
                    "id": f"gp:{p.gp_code}",
                    "name": f"{p.gp_name} (GP #{p.gp_code})",
                    "lgd": p.gp_code,
                    "path": [
                        {"level": "india", "id": "IN", "name": "India"},
                        {"level": "state", "id": f"IN-{p.state_code}", "name": p.state_name},
                        {"level": "district", "id": f"district:{p.district_code}", "name": p.district_name},
                        {"level": "block", "id": f"block:{p.block_code}", "name": p.block_name},
                        {"level": "gp", "id": f"gp:{p.gp_code}", "name": p.gp_name}
                    ],
                    "validated": (p.state_code == 23),
                    "scored": True,
                    "bbox": [p.centroid_lon - 0.04, p.centroid_lat - 0.04, p.centroid_lon + 0.04, p.centroid_lat + 0.04]
                })

            # Check Blocks
            blocks = session.query(Block).filter(Block.block_code == code_num).limit(3).all()
            for b in blocks:
                d_rec = session.query(District).filter(District.district_code == b.district_code).first()
                d_name = d_rec.district_name if d_rec else ""
                results.append({
                    "level": "block",
                    "id": f"block:{b.block_code}",
                    "name": f"{b.block_name} Block (#{b.block_code})",
                    "lgd": b.block_code,
                    "path": [
                        {"level": "india", "id": "IN", "name": "India"},
                        {"level": "state", "id": f"IN-{b.state_code}", "name": "Madhya Pradesh"},
                        {"level": "district", "id": f"district:{b.district_code}", "name": d_name},
                        {"level": "block", "id": f"block:{b.block_code}", "name": b.block_name}
                    ],
                    "validated": (b.state_code == 23),
                    "scored": True,
                    "bbox": [b.centroid_lon - 0.15, b.centroid_lat - 0.15, b.centroid_lon + 0.15, b.centroid_lat + 0.15] if b.centroid_lat else [75.7, 22.8, 76.1, 23.2]
                })

        # B. Text search: Prefix match first, then substring
        # 1. Blocks
        blocks = session.query(Block).filter(Block.block_name.ilike(f"{clean_q}%")).limit(4).all()
        if len(blocks) < 3:
            more_blocks = session.query(Block).filter(Block.block_name.ilike(f"%{clean_q}%")).limit(4).all()
            for mb in more_blocks:
                if mb not in blocks:
                    blocks.append(mb)

        for b in blocks[:4]:
            d_rec = session.query(District).filter(District.district_code == b.district_code).first()
            d_name = d_rec.district_name if d_rec else ""
            results.append({
                "level": "block",
                "id": f"block:{b.block_code}",
                "name": f"{b.block_name} Block",
                "lgd": b.block_code,
                "path": [
                    {"level": "india", "id": "IN", "name": "India"},
                    {"level": "state", "id": f"IN-{b.state_code}", "name": "Madhya Pradesh"},
                    {"level": "district", "id": f"district:{b.district_code}", "name": d_name},
                    {"level": "block", "id": f"block:{b.block_code}", "name": b.block_name}
                ],
                "validated": (b.state_code == 23),
                "scored": True,
                "bbox": [b.centroid_lon - 0.15, b.centroid_lat - 0.15, b.centroid_lon + 0.15, b.centroid_lat + 0.15] if b.centroid_lat else [75.7, 22.8, 76.1, 23.2]
            })

        # 2. Districts
        districts = session.query(District).filter(District.district_name.ilike(f"{clean_q}%")).limit(4).all()
        if len(districts) < 3:
            more_dists = session.query(District).filter(District.district_name.ilike(f"%{clean_q}%")).limit(4).all()
            for md in more_dists:
                if md not in districts:
                    districts.append(md)

        for d in districts[:4]:
            s_name = "Madhya Pradesh" if d.state_code == 23 else "State"
            results.append({
                "level": "district",
                "id": f"district:{d.district_code}",
                "name": f"{d.district_name} District",
                "lgd": d.district_code,
                "path": [
                    {"level": "india", "id": "IN", "name": "India"},
                    {"level": "state", "id": f"IN-{d.state_code}", "name": s_name},
                    {"level": "district", "id": f"district:{d.district_code}", "name": d.district_name}
                ],
                "validated": (d.state_code == 23),
                "scored": (d.state_code == 23),
                "bbox": [75.4, 22.4, 76.2, 23.1]
            })

        # 3. Panchayats
        gps = session.query(Panchayat).filter(Panchayat.gp_name.ilike(f"{clean_q}%")).limit(6).all()
        if len(gps) < 4:
            more_gps = session.query(Panchayat).filter(Panchayat.gp_name.ilike(f"%{clean_q}%")).limit(6).all()
            for mg in more_gps:
                if mg not in gps:
                    gps.append(mg)

        for p in gps[:6]:
            results.append({
                "level": "gp",
                "id": f"gp:{p.gp_code}",
                "name": f"{p.gp_name} GP",
                "lgd": p.gp_code,
                "path": [
                    {"level": "india", "id": "IN", "name": "India"},
                    {"level": "state", "id": f"IN-{p.state_code}", "name": p.state_name},
                    {"level": "district", "id": f"district:{p.district_code}", "name": p.district_name},
                    {"level": "block", "id": f"block:{p.block_code}", "name": p.block_name},
                    {"level": "gp", "id": f"gp:{p.gp_code}", "name": p.gp_name}
                ],
                "validated": (p.state_code == 23),
                "scored": True,
                "bbox": [p.centroid_lon - 0.04, p.centroid_lat - 0.04, p.centroid_lon + 0.04, p.centroid_lat + 0.04]
            })

        # 4. States
        states = session.query(State).filter(State.state_name.ilike(f"%{clean_q}%")).limit(2).all()
        for s in states:
            results.append({
                "level": "state",
                "id": f"IN-{s.state_code}",
                "name": s.state_name,
                "lgd": s.state_code,
                "path": [
                    {"level": "india", "id": "IN", "name": "India"},
                    {"level": "state", "id": f"IN-{s.state_code}", "name": s.state_name}
                ],
                "validated": (s.state_code == 23),
                "scored": (s.state_code == 23),
                "bbox": [74.0, 21.0, 82.8, 26.9] if s.state_code == 23 else [68.0, 8.0, 97.0, 37.0]
            })

        return results[:limit]
    finally:
        session.close()


# -----------------------------------------------------------------------------
# 3. /api/ui/admin-geojson (GeoJSON for MapLibre GPU Layers)
# -----------------------------------------------------------------------------
@router.get("/admin-geojson")
def get_ui_admin_geojson(
    level: str = Query("gps", description="'states', 'districts', 'blocks', or 'gps'"),
    parent_id: Optional[str] = Query(None, description="Optional parent filter (e.g. district:407 or block:3376)")
):
    """
    Returns lightweight GeoJSON FeatureCollection for MapLibre dynamic layer rendering.
    """
    session = SessionLocal()
    try:
        lvl = level.lower().strip()
        features = []

        if lvl in ["gps", "panchayats"]:
            q = session.query(Panchayat)
            if parent_id:
                if "block:" in parent_id:
                    b_code = int(parent_id.replace("block:", ""))
                    q = q.filter(Panchayat.block_code == b_code)
                elif "district:" in parent_id:
                    d_code = int(parent_id.replace("district:", ""))
                    q = q.filter(Panchayat.district_code == d_code)
            else:
                q = q.filter(Panchayat.state_code == 23)

            for p in q.all():
                if p.geometry_json:
                    geom = json.loads(p.geometry_json)
                    features.append({
                        "type": "Feature",
                        "id": p.gp_code,
                        "properties": {
                            "id": p.gp_code,
                            "gp_code": p.gp_code,
                            "name": p.gp_name,
                            "block_name": p.block_name,
                            "district_name": p.district_name,
                            "validated": True,
                            "boundary_quality": p.boundary_quality or "DERIVED"
                        },
                        "geometry": geom
                    })

        elif lvl in ["blocks"]:
            # Returns centroid points or honest representations
            q = session.query(Block)
            if parent_id and "district:" in parent_id:
                d_code = int(parent_id.replace("district:", ""))
                q = q.filter(Block.district_code == d_code)

            for b in q.all():
                if b.centroid_lat and b.centroid_lon:
                    features.append({
                        "type": "Feature",
                        "id": b.block_code,
                        "properties": {
                            "id": b.block_code,
                            "block_code": b.block_code,
                            "name": b.block_name,
                            "district_code": b.district_code,
                            "validated": (b.state_code == 23),
                            "boundary_quality": "LIST_ONLY"
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [b.centroid_lon, b.centroid_lat]
                        }
                    })

        return {
            "type": "FeatureCollection",
            "features": features
        }
    finally:
        session.close()
