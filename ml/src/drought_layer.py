#!/usr/bin/env python3
"""
Pragyan - Drought & Dry-Spell Layer Engine (ml/src/drought_layer.py)
--------------------------------------------------------------------
Implements Feature F4 (Spec 13/14):
Panchayat-level Drought & Dry-Spell monitoring:
- 30-day Standardized Precipitation Index (SPI-30)
- Consecutive dry days count (rainfall < 2.5mm)
- Soil moisture depletion & Crop water stress index (ET0 - P)
"""

import math
from typing import Dict, Any, List, Optional

def compute_drought_indices(
    cumulative_30d_rain_mm: float,
    recent_rain_series: List[float],
    et0_mm: float = 4.2
) -> Dict[str, Any]:
    """
    Computes SPI-30, dry-spell length, and soil moisture stress index.
    """
    # 30-day normal for Central MP Kharif is ~210 mm (std dev ~65 mm)
    normal_30d_mm = 210.0
    sigma_30d_mm = 65.0
    
    # Standardized Precipitation Index (SPI) approximation
    diff = cumulative_30d_rain_mm - normal_30d_mm
    spi_30 = round(diff / sigma_30d_mm, 2)
    spi_30 = max(-3.0, min(3.0, spi_30))
    
    if spi_30 >= 2.0:
        spi_cat = "Extremely Wet"
        spi_color = "#1E40AF"
    elif spi_30 >= 1.5:
        spi_cat = "Very Wet"
        spi_color = "#2563EB"
    elif spi_30 >= 1.0:
        spi_cat = "Moderately Wet"
        spi_color = "#3B82F6"
    elif spi_30 >= -0.99:
        spi_cat = "Near Normal"
        spi_color = "#10B981"
    elif spi_30 >= -1.49:
        spi_cat = "Moderate Drought"
        spi_color = "#F59E0B"
    elif spi_30 >= -1.99:
        spi_cat = "Severe Drought"
        spi_color = "#EF4444"
    else:
        spi_cat = "Extreme Drought"
        spi_color = "#991B1B"

    # Consecutive dry days (< 2.5 mm threshold)
    consecutive_dry_days = 0
    for r in reversed(recent_rain_series):
        if r < 2.5:
            consecutive_dry_days += 1
        else:
            break
            
    # Soil water depletion / Crop moisture deficit (Daily ET0 - Rain)
    today_rain = recent_rain_series[-1] if recent_rain_series else 0.0
    water_deficit_daily_mm = round(max(0.0, et0_mm - today_rain), 1)
    
    # Soil moisture stress percentage (0-100%)
    stress_pct = round(min(100.0, (consecutive_dry_days / 15.0) * 85.0 + (water_deficit_daily_mm / 6.0) * 15.0), 1)
    
    return {
        "spi_30": spi_30,
        "spi_category": spi_cat,
        "spi_color": spi_color,
        "consecutive_dry_days": consecutive_dry_days,
        "is_dry_spell": consecutive_dry_days >= 7,
        "soil_moisture_stress_pct": stress_pct,
        "daily_water_deficit_mm": water_deficit_daily_mm,
        "cumulative_30d_rain_mm": round(cumulative_30d_rain_mm, 1),
        "normal_30d_rain_mm": normal_30d_mm,
        "standard_reference": "IMD / WMO Drought Severity Classification"
    }
