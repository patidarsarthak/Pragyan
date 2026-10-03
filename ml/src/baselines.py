#!/usr/bin/env python3
"""
SIH26074 - Machine Learning Downscaling Baselines
-------------------------------------------------
Implements three classical, transparent benchmarks for GP-level weather downscaling:
1. BilinearInterpolationBaseline:
   2D spatial interpolation from coarse grid coordinates to Gram Panchayat centroids.
2. LapseRateBaseline:
   Environmental lapse rate physical adjustment (6.5 °C / km) using GP mean elevation.
3. EmpiricalQuantileMappingBaseline:
   Non-parametric empirical quantile mapping (EQM) fitted per variable and per calendar month.
"""

import numpy as np
import pandas as pd
from scipy.interpolate import griddata

TARGET_VARS = [
    "RAINFALL",
    "TEMPERATURE",
    "HUMIDITY",
    "WIND_SPEED",
    "EVAPOTRANSPIRATION"
]

class BilinearInterpolationBaseline:
    """
    Baseline A: Spatial Bilinear Interpolation.
    Interpolates coarse grid cell values to high-resolution Gram Panchayat centroids (lat, lon).
    Uses 2D Delaunay / linear interpolation with nearest-neighbor extrapolation on boundary margins.
    """
    def __init__(self):
        self.name = "Bilinear_Interpolation"

    def fit(self, train_df=None):
        """Stateless spatial method; fitting is not strictly required."""
        return self

    def predict(self, df):
        """
        df must contain:
        - LATITUDE, LONGITUDE (GP centroid coordinates)
        - COARSE_LAT, COARSE_LON (or coarse cell reference)
        - DATE
        - COARSE_<VAR>
        """
        preds = {var: np.zeros(len(df), dtype=float) for var in TARGET_VARS}
        
        # Check if latitude/longitude exist
        if "LATITUDE" not in df.columns or "LONGITUDE" not in df.columns:
            # Fallback directly to coarse values if coordinates are missing
            for var in TARGET_VARS:
                c_col = f"COARSE_{var}" if f"COARSE_{var}" in df.columns else f"forecast_{var.lower()}"
                preds[var] = df[c_col].values.copy()
            return preds

        # Group by DATE to interpolate per-day spatial surfaces
        dates = df["DATE"].unique()
        coarse_lat_col = "COARSE_LAT" if "COARSE_LAT" in df.columns else None
        coarse_lon_col = "COARSE_LON" if "COARSE_LON" in df.columns else None

        # If COARSE_LAT/LON not explicit, deduce from rounded lat/lon
        if coarse_lat_col is None or coarse_lon_col is None:
            c_lats = np.round(df["LATITUDE"].values, 1)
            c_lons = np.round(df["LONGITUDE"].values, 1)
        else:
            c_lats = df[coarse_lat_col].values
            c_lons = df[coarse_lon_col].values

        gp_coords = np.column_stack([df["LATITUDE"].values, df["LONGITUDE"].values])
        
        for date in dates:
            date_mask = (df["DATE"] == date).values
            date_indices = np.where(date_mask)[0]
            
            sub_c_coords = np.column_stack([c_lats[date_mask], c_lons[date_mask]])
            sub_gp_coords = gp_coords[date_mask]
            
            for var in TARGET_VARS:
                c_col = f"COARSE_{var}" if f"COARSE_{var}" in df.columns else f"forecast_{var.lower()}"
                if c_col not in df.columns:
                    continue
                c_vals = df[c_col].values[date_mask]
                
                # Get unique coarse grid points for this date
                _, unique_idx = np.unique(sub_c_coords, axis=0, return_index=True)
                grid_pts = sub_c_coords[unique_idx]
                grid_vals = c_vals[unique_idx]
                
                if len(grid_pts) >= 4:
                    # Bilinear / 2D linear interpolation
                    interp_linear = griddata(grid_pts, grid_vals, sub_gp_coords, method="linear")
                    # Fallback to nearest neighbor for points outside the convex hull
                    nan_mask = np.isnan(interp_linear)
                    if np.any(nan_mask):
                        interp_nearest = griddata(grid_pts, grid_vals, sub_gp_coords[nan_mask], method="nearest")
                        interp_linear[nan_mask] = interp_nearest
                    interp_vals = interp_linear
                else:
                    # If insufficient grid points, fallback to coarse
                    interp_vals = c_vals
                
                # Physical bounds
                if var == "RAINFALL":
                    interp_vals = np.maximum(0.0, interp_vals)
                elif var == "TEMPERATURE":
                    interp_vals = np.clip(interp_vals, -10.0, 60.0)
                elif var == "HUMIDITY":
                    interp_vals = np.clip(interp_vals, 0.0, 100.0)
                elif var == "WIND_SPEED":
                    interp_vals = np.clip(interp_vals, 0.0, 50.0)
                elif var == "EVAPOTRANSPIRATION":
                    interp_vals = np.clip(interp_vals, 0.0, 15.0)
                
                preds[var][date_indices] = interp_vals

        return preds


class LapseRateBaseline:
    """
    Baseline B: Environmental Lapse Rate Only (6.5 °C / km = 0.0065 °C / m).
    Physically downscales temperature using standard hydrostatic elevation lapse rate
    relative to reference baseline elevation (200 m).
    For non-temperature variables, uses uncorrected coarse input to provide an honest
    single-physics benchmark.
    """
    def __init__(self, lapse_rate_c_per_m=0.0065, ref_elevation_m=200.0):
        self.name = "Lapse_Rate_Only"
        self.lapse_rate = lapse_rate_c_per_m
        self.ref_elevation = ref_elevation_m

    def fit(self, train_df=None):
        return self

    def predict(self, df):
        preds = {}
        elev = df["ELEVATION_M"].values if "ELEVATION_M" in df.columns else np.full(len(df), self.ref_elevation)
        
        for var in TARGET_VARS:
            c_col = f"COARSE_{var}" if f"COARSE_{var}" in df.columns else f"forecast_{var.lower()}"
            coarse_vals = df[c_col].values.copy()
            
            if var == "TEMPERATURE":
                # Standard physical lapse rate: T_gp = T_coarse - (Elevation - Reference) * 0.0065
                delta_elev = elev - self.ref_elevation
                pred_temp = coarse_vals - (delta_elev * self.lapse_rate)
                preds[var] = np.clip(pred_temp, -10.0, 60.0)
            elif var == "RAINFALL":
                # Pure coarse unadjusted (lapse-rate baseline only adjusts temperature)
                preds[var] = np.maximum(0.0, coarse_vals)
            elif var == "HUMIDITY":
                preds[var] = np.clip(coarse_vals, 0.0, 100.0)
            elif var == "WIND_SPEED":
                preds[var] = np.clip(coarse_vals, 0.0, 50.0)
            elif var == "EVAPOTRANSPIRATION":
                preds[var] = np.clip(coarse_vals, 0.0, 15.0)
                
        return preds


class EmpiricalQuantileMappingBaseline:
    """
    Baseline C: Empirical Quantile Mapping (EQM) per variable and per month.
    Non-parametrically maps coarse forecast distribution to the historical observation distribution
    by matching cumulative probability quantiles for each calendar month (1 to 12).
    """
    def __init__(self, n_quantiles=100):
        self.name = "Empirical_Quantile_Mapping"
        self.n_quantiles = n_quantiles
        self.percentiles = np.linspace(0.0, 100.0, n_quantiles)
        # Mapping dict: self.q_tables[var][month] = {"coarse_q": [...], "obs_q": [...]}
        self.q_tables = {var: {} for var in TARGET_VARS}
        self.global_fallbacks = {}

    def fit(self, train_df, target_dict=None):
        """
        train_df: DataFrame with DATE, COARSE_<VAR>
        target_dict: Optional mapping {var: array_of_true_observations}.
                     If None, looks for FINE_RAINFALL, TARGET_TEMPERATURE, etc.
        """
        date_dt = pd.to_datetime(train_df["DATE"])
        months = date_dt.dt.month.values
        
        for var in TARGET_VARS:
            c_col = f"COARSE_{var}" if f"COARSE_{var}" in train_df.columns else f"forecast_{var.lower()}"
            coarse_all = train_df[c_col].values
            
            # Identify observed target
            if target_dict and var in target_dict:
                obs_all = target_dict[var]
            else:
                if var == "RAINFALL":
                    t_col = "FINE_RAINFALL" if "FINE_RAINFALL" in train_df.columns else "actual_rainfall"
                else:
                    t_col = f"TARGET_{var}" if f"TARGET_{var}" in train_df.columns else f"actual_{var.lower()}"
                obs_all = train_df[t_col].values if t_col in train_df.columns else coarse_all
            
            # Global fallback percentiles
            valid_global = ~np.isnan(coarse_all) & ~np.isnan(obs_all)
            if np.sum(valid_global) > 10:
                self.global_fallbacks[var] = {
                    "coarse_q": np.percentile(coarse_all[valid_global], self.percentiles),
                    "obs_q": np.percentile(obs_all[valid_global], self.percentiles)
                }
            else:
                self.global_fallbacks[var] = None

            # Fit per month
            for m in range(1, 13):
                m_mask = (months == m) & ~np.isnan(coarse_all) & ~np.isnan(obs_all)
                if np.sum(m_mask) >= 10:
                    c_m = coarse_all[m_mask]
                    o_m = obs_all[m_mask]
                    self.q_tables[var][m] = {
                        "coarse_q": np.percentile(c_m, self.percentiles),
                        "obs_q": np.percentile(o_m, self.percentiles)
                    }
                else:
                    self.q_tables[var][m] = self.global_fallbacks[var]
                    
        return self

    def predict(self, df):
        date_dt = pd.to_datetime(df["DATE"])
        months = date_dt.dt.month.values
        preds = {}
        
        for var in TARGET_VARS:
            c_col = f"COARSE_{var}" if f"COARSE_{var}" in df.columns else f"forecast_{var.lower()}"
            coarse_vals = df[c_col].values
            out_vals = np.zeros(len(df), dtype=float)
            
            for m in range(1, 13):
                m_indices = np.where(months == m)[0]
                if len(m_indices) == 0:
                    continue
                
                c_sub = coarse_vals[m_indices]
                q_tab = self.q_tables[var].get(m, self.global_fallbacks.get(var))
                
                if q_tab is not None and len(q_tab["coarse_q"]) > 1:
                    c_q = q_tab["coarse_q"]
                    o_q = q_tab["obs_q"]
                    # Interpolate through quantile curve
                    # Handle flat or duplicate quantiles in coarse distribution
                    _, u_idx = np.unique(c_q, return_index=True)
                    if len(u_idx) >= 2:
                        corrected = np.interp(c_sub, c_q[u_idx], o_q[u_idx], left=o_q[0], right=o_q[-1])
                    else:
                        corrected = c_sub
                else:
                    corrected = c_sub
                    
                out_vals[m_indices] = corrected
                
            # Clamp physical constraints
            if var == "RAINFALL":
                out_vals = np.maximum(0.0, out_vals)
            elif var == "TEMPERATURE":
                out_vals = np.clip(out_vals, -10.0, 60.0)
            elif var == "HUMIDITY":
                out_vals = np.clip(out_vals, 0.0, 100.0)
            elif var == "WIND_SPEED":
                out_vals = np.clip(out_vals, 0.0, 50.0)
            elif var == "EVAPOTRANSPIRATION":
                out_vals = np.clip(out_vals, 0.0, 15.0)
                
            preds[var] = out_vals
            
        return preds
