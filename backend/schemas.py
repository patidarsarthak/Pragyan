"""
SIH26074 - Phase 5: Pydantic Schemas for Backend API
----------------------------------------------------
Defines response models and data contracts for:
- /panchayats
- /forecast/{gpcode}
- /advisory/{gpcode}
- /forecast/district-summary
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PanchayatItem(BaseModel):
    gpcode: int = Field(..., description="Local Government Directory (LGD) Gram Panchayat Code")
    gpname: str = Field(..., description="Official Gram Panchayat Name")
    block: str = Field(..., description="Administrative Block Name")
    district: str = Field(..., description="District Name (Dhanbad)")
    state: str = Field(..., description="State Name (Jharkhand)")
    latitude: float = Field(..., description="Panchayat Centroid Latitude")
    longitude: float = Field(..., description="Panchayat Centroid Longitude")
    elevation_m: float = Field(..., description="SRTM 30m Elevation in meters")
    slope_deg: float = Field(..., description="Terrain Slope in degrees")
    landcover_class: int = Field(..., description="ESA WorldCover Land Cover Code")
    landcover_name: str = Field(..., description="Human-readable Land Cover Name")


class PanchayatListResponse(BaseModel):
    total_count: int
    panchayats: List[PanchayatItem]


class VariablePrediction(BaseModel):
    variable: str = Field(..., description="Meteorological parameter name")
    predicted_value: float = Field(..., description="Downscaled point estimate")
    uncertainty_lower: float = Field(..., description="10th percentile uncertainty bound")
    uncertainty_upper: float = Field(..., description="90th percentile uncertainty bound")
    confidence_pct: float = Field(..., description="Nominal confidence percentage")


class ForecastDayItem(BaseModel):
    date: str = Field(..., description="Forecast date (YYYY-MM-DD)")
    predictions: Dict[str, VariablePrediction] = Field(..., description="Map of variable names to predictions")


class PanchayatForecastResponse(BaseModel):
    gpcode: int
    panchayat: str
    block: str
    run_timestamp: Optional[str] = Field(None, description="UTC timestamp of the NWP forecast ingestion run")
    forecast_days_count: int
    forecasts: List[ForecastDayItem]


class AdvisoryItem(BaseModel):
    gpcode: int
    panchayat: str
    block: str
    date: str
    crop: str
    advisory_text: str
    triggering_variables: str
    confidence_pct: float


class AdvisoryResponse(BaseModel):
    gpcode: int
    panchayat: str
    block: str
    date_filtered: Optional[str] = None
    crop_filtered: Optional[str] = None
    total_advisories: int
    advisories: List[AdvisoryItem]


class PanchayatRiskItem(BaseModel):
    gpcode: int
    panchayat: str
    block: str
    latitude: float
    longitude: float
    rainfall_mm: float
    rainfall_risk_level: str = Field(..., description="None, Light, Moderate, Heavy, Very Heavy")
    temperature_c: float
    heat_stress_level: str = Field(..., description="Normal, Moderate, Severe Heat Stress, Cold Stress")
    humidity_pct: float
    wind_speed_ms: float
    spray_window_status: str = Field(..., description="Favorable, Caution, Suspended")
    evapotranspiration_mm: float
    confidence_pct: float


class DistrictSummaryResponse(BaseModel):
    date: str
    run_timestamp: Optional[str] = None
    total_panchayats: int
    rainfall_summary: Dict[str, Any]
    risk_distribution: Dict[str, int]
    panchayat_risk_assessments: List[PanchayatRiskItem]
