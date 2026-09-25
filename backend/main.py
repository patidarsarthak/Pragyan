#!/usr/bin/env python3
"""
SIH26074 - Phase 5: FastAPI Backend Service
-------------------------------------------
Smart Panchayat Climate & Geospatial Intelligence Platform (Dhanbad District)

Endpoints:
1. GET /forecast/{gpcode}?date=...      -> 5-variable hyper-local weather forecast + uncertainty
2. GET /advisory/{gpcode}?date=...&crop=... -> Multi-variable crop agro-advisories
3. GET /panchayats                      -> List of all 239 Panchayats with centroids & terrain
4. GET /forecast/district-summary?date=...  -> District-wide risk assessment for map visualization
"""

import sys
import os
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.schemas import (
    PanchayatListResponse,
    PanchayatItem,
    PanchayatForecastResponse,
    AdvisoryResponse,
    DistrictSummaryResponse
)
from backend.services import (
    get_static_panchayats,
    get_panchayat_forecast,
    get_panchayat_advisories,
    get_district_risk_summary,
    get_latest_forecast_file
)

app = FastAPI(
    title="Smart Panchayat Climate & Geospatial Intelligence API",
    description=(
        "Production-ready REST API for hyper-local climate downscaling and "
        "decision-grade agricultural advisories across all 239 Gram Panchayats "
        "of Dhanbad District, Jharkhand (SIH26074)."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for seamless frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

# Mount static frontend application
if os.path.exists(FRONTEND_DIR):
    app.mount("/dashboard", StaticFiles(directory=FRONTEND_DIR, html=True), name="dashboard")


@app.get("/", tags=["System"])
def root_status():
    """System health and metadata status."""
    try:
        latest_forecast = os.path.basename(get_latest_forecast_file())
        forecast_status = f"Online (Latest snapshot: {latest_forecast})"
    except Exception as e:
        forecast_status = f"Degraded ({e})"

    return {
        "project": "SIH26074 - Smart Panchayat Climate & Geospatial Intelligence Platform",
        "district": "Dhanbad, Jharkhand",
        "total_panchayats": 239,
        "blocks": 10,
        "dashboard_url": "/dashboard",
        "forecast_status": forecast_status,
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }


@app.get("/health", tags=["System"])
def health_check():
    """Health check endpoint for orchestration & container probes."""
    return {"status": "healthy", "service": "sih26074-backend"}


@app.get(
    "/panchayats",
    response_model=PanchayatListResponse,
    tags=["Geography & Panchayats"],
    summary="List all Gram Panchayats in Dhanbad District"
)
def list_panchayats(
    block: Optional[str] = Query(None, description="Filter Panchayats by Administrative Block (e.g. 'Topchanchi', 'Baghmara')")
):
    """
    Returns full geographic and terrain metadata for all 239 Gram Panchayats:
    - LGD GPCODE
    - Panchayat Name & Administrative Block
    - Centroid Latitude & Longitude (WGS84)
    - SRTM 30m Elevation & Slope
    - ESA WorldCover Land Cover Class
    """
    try:
        df = get_static_panchayats()
        if block:
            df = df[df["BLOCK"].str.contains(block, case=False, na=False)]
            if df.empty:
                raise HTTPException(status_code=404, detail=f"No Panchayats found in administrative block '{block}'.")

        items = []
        for _, r in df.iterrows():
            items.append(PanchayatItem(
                gpcode=int(r["GPCODE"]),
                gpname=str(r["GPNAME"]),
                block=str(r["BLOCK"]),
                district=str(r["DISTRICT"]),
                state=str(r["STATE"]),
                latitude=round(float(r["LATITUDE"]), 5),
                longitude=round(float(r["LONGITUDE"]), 5),
                elevation_m=round(float(r["ELEVATION_M"]), 1),
                slope_deg=round(float(r["SLOPE_DEG"]), 2),
                landcover_class=int(r["LANDCOVER_CLASS"]),
                landcover_name=str(r["LANDCOVER_NAME"])
            ))

        return PanchayatListResponse(total_count=len(items), panchayats=items)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load Panchayat registry: {e}")


@app.get(
    "/forecast/district-summary",
    response_model=DistrictSummaryResponse,
    tags=["Forecast & Downscaling"],
    summary="Aggregated district risk assessment across all 239 Panchayats"
)
def get_district_summary(
    date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Forecast date (YYYY-MM-DD). Defaults to earliest forecast date.")
):
    """
    Aggregates weather conditions and multi-hazard risk levels across all 239 Panchayats:
    - IMD Standard Rainfall Risk Category (`No Rain`, `Light`, `Moderate`, `Heavy`, `Very Heavy`)
    - Heat Stress Index (`Normal`, `Moderate`, `Severe Heat Stress`, `Cold Stress`)
    - Chemical Spraying Feasibility (`Favorable`, `Caution`, `Suspended`)
    - District-wide min/mean/max rainfall statistics
    """
    try:
        summary_data = get_district_risk_summary(date=date)
        return summary_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate district summary: {e}")


@app.get(
    "/forecast/{gpcode}",
    response_model=PanchayatForecastResponse,
    tags=["Forecast & Downscaling"],
    summary="Hyper-local 5-variable forecast and uncertainty for a Panchayat"
)
def get_forecast_for_panchayat(
    gpcode: int = Path(..., description="Local Government Directory (LGD) Gram Panchayat Code (e.g. 111722)", ge=100000, le=999999),
    date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Optional date filter (YYYY-MM-DD). If omitted, returns entire 10-day horizon.")
):
    """
    Retrieves the downscaled 5-variable meteorological forecast + calibrated uncertainty
    from Phase 3's live NWP inference output:
    - `RAINFALL` (mm/day)
    - `TEMPERATURE` (°C)
    - `HUMIDITY` (%)
    - `WIND_SPEED` (m/s)
    - `EVAPOTRANSPIRATION` (mm/day)
    Includes `UNCERTAINTY_LOWER`, `UNCERTAINTY_UPPER`, and `CONFIDENCE_PCT = 80.0`.
    """
    try:
        forecast_data = get_panchayat_forecast(gpcode=gpcode, date=date)
        return forecast_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve forecast for GPCODE {gpcode}: {e}")


@app.get(
    "/advisory/{gpcode}",
    response_model=AdvisoryResponse,
    tags=["Agricultural Advisories"],
    summary="Multi-variable agro-meteorological advisories for a Panchayat"
)
def get_advisory_for_panchayat(
    gpcode: int = Path(..., description="Local Government Directory (LGD) Gram Panchayat Code (e.g. 111722)", ge=100000, le=999999),
    date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Optional date filter (YYYY-MM-DD)"),
    crop: Optional[str] = Query(None, description="Optional crop keyword filter (e.g. 'Paddy', 'Maize', 'Mustard', 'Vegetables')")
):
    """
    Retrieves actionable, multi-variable agricultural advisories based on Phase 4's rule engine:
    - Irrigation management (Water balance: `RAINFALL` vs `ET`)
    - Heat / Cold thermal stress alerts (`TEMPERATURE` + `HUMIDITY`)
    - Chemical spraying & field operation windows (`WIND_SPEED` + `RAINFALL`)
    - High-humidity fungal disease predisposition (`HUMIDITY` + `TEMPERATURE` + `RAINFALL`)
    """
    try:
        advisory_data = get_panchayat_advisories(gpcode=gpcode, date=date, crop=crop)
        return advisory_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve advisories for GPCODE {gpcode}: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
