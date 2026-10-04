"""
SIH26074 - Panchayat-vs-Block Advisory Divergence Explainer
----------------------------------------------------------
Quantifies and explains the agronomic value of hyper-local downscaling:
Evaluates rules twice for each (Panchayat, Crop, Day):
1. Using coarse block-level synoptic forecast
2. Using Pragyan 1km cadastral downscaled forecast

Tracks:
- Advisory change events (e.g. Block says 'Routine', Panchayat says 'Drainage Alert')
- Root meteorological variable causing the divergence (Rainfall, Wind, Temp)
- Share of panchayat-days where downscaled intelligence changes farmer action
"""

import os
from typing import Dict, Any, List, Optional, Tuple

def compare_advice(
    gp_weather: Dict[str, float],
    block_weather: Dict[str, float],
    crop: str,
    stage_id: str
) -> Dict[str, Any]:
    """
    Compares agronomic advice generated under GP vs Block meteorological conditions.
    """
    gp_rain = float(gp_weather.get("rainfall_mm", 0.0))
    block_rain = float(block_weather.get("rainfall_mm", 0.0))

    gp_wind = float(gp_weather.get("wind_speed_ms", 2.0))
    block_wind = float(block_weather.get("wind_speed_ms", 2.0))

    gp_temp = float(gp_weather.get("temp_c", 26.0))
    block_temp = float(block_weather.get("temp_c", 26.0))

    diff_detected = False
    dominant_delta_var = "rainfall"
    delta_val = 0.0
    gp_action = "Standard seasonal operations."
    block_action = "Standard seasonal operations."
    divergence_reason = "No material divergence in agronomic threshold."

    # 1. Rainfall / Drainage threshold divergence (e.g. 25mm threshold for drainage)
    if (gp_rain >= 25.0 and block_rain < 25.0) or (gp_rain < 25.0 and block_rain >= 25.0):
        diff_detected = True
        dominant_delta_var = "rainfall"
        delta_val = round(gp_rain - block_rain, 1)
        if gp_rain >= 25.0:
            gp_action = "Open drainage furrows immediately; high root inundation risk."
            block_action = "No drainage action required (coarse block forecast < 25 mm)."
            divergence_reason = (
                f"Localized orographic rainfall ({gp_rain:.1f} mm) exceeds block average ({block_rain:.1f} mm) "
                f"by +{delta_val} mm, crossing the Vertisol saturation threshold."
            )
        else:
            gp_action = "Conserve in-situ moisture; rainfall within plot holding capacity."
            block_action = "Precautionary drainage indicated by coarse regional grid."
            divergence_reason = (
                f"Panchayat is shielded in lee of ridge ({gp_rain:.1f} mm vs block {block_rain:.1f} mm), "
                f"avoiding the excessive runoff anticipated by the coarse model."
            )

    # 2. Wind / Spray window divergence (15 km/h = 4.17 m/s threshold)
    elif (gp_wind >= 4.17 and block_wind < 4.17) or (gp_wind < 4.17 and block_wind >= 4.17):
        diff_detected = True
        dominant_delta_var = "wind"
        delta_val = round(gp_wind * 3.6 - block_wind * 3.6, 1) # km/h
        if gp_wind >= 4.17:
            gp_action = "Withhold all foliar sprays due to chemical drift risk."
            block_action = "Foliar spraying permitted under coarse synoptic wind."
            divergence_reason = (
                f"Exposed plateau ridge accelerates localized wind speed ({gp_wind * 3.6:.1f} km/h) "
                f"above the 15 km/h safety cutoff, despite gentle regional block forecast ({block_wind * 3.6:.1f} km/h)."
            )
        else:
            gp_action = "Safe spray window open in sheltered valley terrain."
            block_action = "Spray postponed by regional wind gust forecast."
            divergence_reason = (
                f"Valley topography shelters the panchayat canopy ({gp_wind * 3.6:.1f} km/h), "
                f"providing a safe operational window not visible on the 25km NWP grid."
            )

    # 3. Thermal stress divergence (32C or 35C threshold)
    elif (gp_temp >= 32.0 and block_temp < 32.0) or (gp_temp < 32.0 and block_temp >= 32.0):
        diff_detected = True
        dominant_delta_var = "temperature"
        delta_val = round(gp_temp - block_temp, 1)
        divergence_reason = (
            f"Elevation gradient divergence: Panchayat temperature ({gp_temp:.1f}°C) vs block centroid ({block_temp:.1f}°C) "
            f"changes heat stress status during sensitive {stage_id} phase."
        )

    return {
        "crop": crop,
        "stage": stage_id,
        "advice_differs": diff_detected,
        "dominant_delta_var": dominant_delta_var,
        "delta_value": delta_val,
        "divergence_reason": divergence_reason,
        "panchayat_guidance": gp_action,
        "block_guidance": block_action,
        "metrics": {
            "gp_weather": gp_weather,
            "block_weather": block_weather
        }
    }
