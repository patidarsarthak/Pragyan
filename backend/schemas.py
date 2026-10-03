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
    meta: Optional[Dict[str, Any]] = Field(None, description="Standardized data freshness and provenance metadata")


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
    meta: Optional[Dict[str, Any]] = Field(None, description="Standardized data freshness and provenance metadata")



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


# Administrative Hierarchy Schemas
class StateItem(BaseModel):
    state_code: int
    state_name: str
    state_type: str = "State"
    is_pilot: bool = False
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None


class DistrictItem(BaseModel):
    district_code: int
    district_name: str
    state_code: int
    is_pilot: bool = False
    total_gps: int = 0
    total_blocks: int = 0
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None


class BlockItem(BaseModel):
    block_code: int
    block_name: str
    district_code: int
    state_code: int
    area_sq_km: Optional[float] = None
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None


class ModelPredictRequest(BaseModel):
    gp_codes: Optional[List[int]] = Field(None, description="Optional list of LGD GP codes. If omitted, runs for all pilot Panchayats.")
    forecast_date: Optional[str] = Field(None, description="Target forecast date (YYYY-MM-DD)")
    coarse_rainfall: float = Field(..., description="Coarse / NWP rainfall (mm/day)")
    coarse_temperature: float = Field(..., description="Coarse / NWP temperature (°C)")
    coarse_humidity: float = Field(..., description="Coarse / NWP relative humidity (%)")
    coarse_wind_speed: float = Field(..., description="Coarse / NWP wind speed (m/s or km/h)")


from pydantic import BaseModel, Field, model_validator


class CrowdReportCreate(BaseModel):
    rain: Optional[str] = Field(None, description="Observed rainfall intensity: 'none', 'light', 'moderate', 'heavy'")
    intensity: Optional[str] = Field(None, description="Alternative field name for rain intensity")
    amount_mm: Optional[float] = Field(None, description="Optional measured or estimated rainfall depth in mm")
    photo_url: Optional[str] = Field(None, description="Optional photo URL of rain gauge or flooded field")
    device_hash: Optional[str] = Field(None, description="Anonymous device fingerprint hash")
    timestamp: Optional[str] = Field(None, description="ISO timestamp of observation (defaults to current time)")

    @model_validator(mode="before")
    @classmethod
    def check_rain_intensity(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("rain") and data.get("intensity"):
                data["rain"] = data.get("intensity")
            elif not data.get("intensity") and data.get("rain"):
                data["intensity"] = data.get("rain")
            if not data.get("rain"):
                data["rain"] = "none"
        return data


class CrowdReportOut(BaseModel):
    id: int
    gp_code: int
    rain_category: str
    rainfall_amount_mm: Optional[float] = None
    photo_url: Optional[str] = None
    timestamp: str
    source: str = "CROWDSOURCED_UNVERIFIED"
    is_plausible: bool
    plausibility_reason: Optional[str] = None

