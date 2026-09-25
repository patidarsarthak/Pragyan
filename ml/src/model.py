#!/usr/bin/env python3
"""
SIH26074 - Phase 2: Joint Multi-Output Model & Bootstrap Uncertainty Engine
--------------------------------------------------------------------------
Implements:
1. Semi-Parametric Gradient-Boosted Multi-Output Architecture:
   - Shared Linear Ridge Trunk: Models macroscopic thermodynamic lapse rates,
     elevation cooling, and radiation-driven physical baselines.
   - Gradient-Boosted Decision Trees (HistGradientBoosting): Fits localized microclimatic
     residuals, non-linear orographic relief, and land cover interactions.
   - Output Heads:
     * RAINFALL: Residual formulation (predicts fine - coarse, point = coarse + residual)
     * TEMPERATURE: Direct downscaling with elevation lapse rate & urban heat island
     * HUMIDITY: Direct downscaling with relief moisture & elevation cooling
     * WIND_SPEED: Direct downscaling with topographic slope exposure & roughness
     * EVAPOTRANSPIRATION: Direct downscaling with thermal radiation dynamics
2. Bagging bootstrap ensemble (N=12) for standardized uncertainty quantification
   (10th to 90th percentile across ensemble members = nominal 80% confidence interval)
3. Physical consistency post-processing (clamping non-physical values and reporting clamp metrics)
4. Locked output contract serialization:
   GPCODE | DATE | VARIABLE | PREDICTED_VALUE | UNCERTAINTY_LOWER | UNCERTAINTY_UPPER | CONFIDENCE_PCT
"""

import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor

TARGET_NAMES = [
    "RAINFALL",
    "TEMPERATURE",
    "HUMIDITY",
    "WIND_SPEED",
    "EVAPOTRANSPIRATION"
]


class JointMultiOutputWeatherModel:
    """
    Joint multi-output weather downscaling engine with bootstrap ensemble uncertainty.
    Uses a hybrid linear-base + gradient-boosted residual architecture to guarantee
    both continuous physical extrapolation and non-linear microclimate modeling.
    """
    def __init__(self, n_bootstrap=12, random_state=42):
        self.n_bootstrap = n_bootstrap
        self.random_state = random_state
        self.ensemble = []
        self.clamp_stats = {v: {"clamp_count": 0, "max_adjustment": 0.0} for v in TARGET_NAMES}
        self.sigma_residual = None  # Empirical residual std from validation for calibration diagnostics
        
    def fit(self, X, Y):
        """
        Fits N bootstrap ensemble members on resampled training sets.
        X: shape (N, n_features)
        Y: shape (N, 5) -> [TARGET_RESIDUAL_RAINFALL, TARGET_TEMPERATURE, TARGET_HUMIDITY, TARGET_WIND_SPEED, TARGET_EVAPOTRANSPIRATION]
        """
        N = len(X)
        self.ensemble = []
        rng = np.random.RandomState(self.random_state)
        
        print(f"Training {self.n_bootstrap} bootstrap ensemble members for Joint Multi-Output Model...")
        for b in range(self.n_bootstrap):
            # Bootstrap resample indices (subsampling 85% with replacement)
            sample_idx = rng.choice(N, size=int(0.85 * N), replace=True)
            X_b = X[sample_idx]
            Y_b = Y[sample_idx]
            
            # 1. Linear trunk for macroscopic thermodynamic scaling
            linear_base = MultiOutputRegressor(Ridge(alpha=1.0, random_state=self.random_state + b), n_jobs=-1)
            linear_base.fit(X_b, Y_b)
            
            # Compute linear residuals
            res_b = Y_b - linear_base.predict(X_b)
            
            # 2. Gradient-boosted decision trees for localized non-linear orographic residuals
            tree_estimator = HistGradientBoostingRegressor(
                max_iter=35,
                max_depth=6,
                learning_rate=0.1,
                min_samples_leaf=20,
                l2_regularization=1.0,
                random_state=self.random_state + b
            )
            tree_head = MultiOutputRegressor(tree_estimator, n_jobs=-1)
            tree_head.fit(X_b, res_b)
            
            self.ensemble.append((linear_base, tree_head))
            
        print(f"Ensemble training complete ({len(self.ensemble)} members).")
        return self

    def set_calibration_residuals(self, sigma_resid):
        """Stores validation residual standard deviations for calibration analysis."""
        self.sigma_residual = np.array(sigma_resid)

    def predict_raw(self, X):
        """
        Generates raw predictions from all ensemble members.
        Returns 3D array: shape (n_members, n_samples, 5)
        """
        all_preds = []
        for linear_base, tree_head in self.ensemble:
            y_pred = linear_base.predict(X) + tree_head.predict(X)  # (n_samples, 5)
            all_preds.append(y_pred)
        return np.array(all_preds)  # (n_members, n_samples, 5)

    def predict_with_uncertainty(self, X, coarse_rainfall):
        """
        Calculates ensemble point prediction (mean), 10th-90th percentile bounds,
        applies residual reconstruction for rainfall, and enforces physical constraints.
        
        Returns dictionary of variables with:
          - point: 1D array
          - lower: 1D array (10th percentile)
          - upper: 1D array (90th percentile)
        """
        raw_members = self.predict_raw(X)  # (n_members, n_samples, 5)
        n_samples = len(X)
        results = {}
        
        # Reset clamp stats
        self.clamp_stats = {v: {"clamp_count": 0, "max_adjustment": 0.0} for v in TARGET_NAMES}
        
        for i, var_name in enumerate(TARGET_NAMES):
            head_preds = raw_members[:, :, i]  # (n_members, n_samples)
            
            if var_name == "RAINFALL":
                # Residual reconstruction: Fine = Coarse + Predicted_Residual
                fine_members = coarse_rainfall[np.newaxis, :] + head_preds
                # Physical constraint: rainfall >= 0
                negative_mask = fine_members < 0.0
                if np.any(negative_mask):
                    adj = np.abs(fine_members[negative_mask])
                    self.clamp_stats["RAINFALL"]["clamp_count"] += int(np.sum(negative_mask))
                    self.clamp_stats["RAINFALL"]["max_adjustment"] = float(np.max(adj))
                fine_members = np.maximum(0.0, fine_members)
                
                point = np.mean(fine_members, axis=0)
                lower = np.percentile(fine_members, 10.0, axis=0)
                upper = np.percentile(fine_members, 90.0, axis=0)
                
            elif var_name == "TEMPERATURE":
                # Physical constraint: clamp to [-10, 60] °C
                clamped_members = np.clip(head_preds, -10.0, 60.0)
                clamp_mask = (head_preds < -10.0) | (head_preds > 60.0)
                if np.any(clamp_mask):
                    adj = np.abs(head_preds[clamp_mask] - clamped_members[clamp_mask])
                    self.clamp_stats["TEMPERATURE"]["clamp_count"] += int(np.sum(clamp_mask))
                    self.clamp_stats["TEMPERATURE"]["max_adjustment"] = float(np.max(adj))
                    
                point = np.mean(clamped_members, axis=0)
                lower = np.percentile(clamped_members, 10.0, axis=0)
                upper = np.percentile(clamped_members, 90.0, axis=0)
                
            elif var_name == "HUMIDITY":
                # Physical constraint: clamp to [0, 100] %
                clamped_members = np.clip(head_preds, 0.0, 100.0)
                clamp_mask = (head_preds < 0.0) | (head_preds > 100.0)
                if np.any(clamp_mask):
                    adj = np.abs(head_preds[clamp_mask] - clamped_members[clamp_mask])
                    self.clamp_stats["HUMIDITY"]["clamp_count"] += int(np.sum(clamp_mask))
                    self.clamp_stats["HUMIDITY"]["max_adjustment"] = float(np.max(adj))
                    
                point = np.mean(clamped_members, axis=0)
                lower = np.percentile(clamped_members, 10.0, axis=0)
                upper = np.percentile(clamped_members, 90.0, axis=0)
                
            elif var_name == "WIND_SPEED":
                # Physical constraint: clamp to [0, 50] m/s
                clamped_members = np.clip(head_preds, 0.0, 50.0)
                clamp_mask = (head_preds < 0.0) | (head_preds > 50.0)
                if np.any(clamp_mask):
                    adj = np.abs(head_preds[clamp_mask] - clamped_members[clamp_mask])
                    self.clamp_stats["WIND_SPEED"]["clamp_count"] += int(np.sum(clamp_mask))
                    self.clamp_stats["WIND_SPEED"]["max_adjustment"] = float(np.max(adj))
                    
                point = np.mean(clamped_members, axis=0)
                lower = np.percentile(clamped_members, 10.0, axis=0)
                upper = np.percentile(clamped_members, 90.0, axis=0)
                
            elif var_name == "EVAPOTRANSPIRATION":
                # Physical constraint: clamp to [0, 15] mm/day
                clamped_members = np.clip(head_preds, 0.0, 15.0)
                clamp_mask = (head_preds < 0.0) | (head_preds > 15.0)
                if np.any(clamp_mask):
                    adj = np.abs(head_preds[clamp_mask] - clamped_members[clamp_mask])
                    self.clamp_stats["EVAPOTRANSPIRATION"]["clamp_count"] += int(np.sum(clamp_mask))
                    self.clamp_stats["EVAPOTRANSPIRATION"]["max_adjustment"] = float(np.max(adj))
                    
                point = np.mean(clamped_members, axis=0)
                lower = np.percentile(clamped_members, 10.0, axis=0)
                upper = np.percentile(clamped_members, 90.0, axis=0)
                
            results[var_name] = {
                "point": point,
                "lower": lower,
                "upper": upper
            }
            
        return results


class SingleVariableCoarseBaselines:
    """
    4+1 simple single-variable baseline models (Ridge per variable),
    predicting each variable directly from coarse reference alone.
    """
    def __init__(self, random_state=42):
        self.random_state = random_state
        self.models = {}
        
    def fit(self, train_df):
        print("Training single-variable coarse baseline models (Ridge from coarse reference alone)...")
        # Rainfall
        X_rain = train_df[["COARSE_RAINFALL"]].values
        y_rain = train_df["FINE_RAINFALL"].fillna(train_df["COARSE_RAINFALL"]).values
        self.models["RAINFALL"] = Ridge(alpha=1.0, random_state=self.random_state).fit(X_rain, y_rain)
        
        # Temperature
        X_temp = train_df[["COARSE_TEMPERATURE"]].values
        y_temp = train_df["TARGET_TEMPERATURE"].values
        self.models["TEMPERATURE"] = Ridge(alpha=1.0, random_state=self.random_state).fit(X_temp, y_temp)
        
        # Humidity
        X_hum = train_df[["COARSE_HUMIDITY"]].values
        y_hum = train_df["TARGET_HUMIDITY"].values
        self.models["HUMIDITY"] = Ridge(alpha=1.0, random_state=self.random_state).fit(X_hum, y_hum)
        
        # Wind Speed
        X_wind = train_df[["COARSE_WIND_SPEED"]].values
        y_wind = train_df["TARGET_WIND_SPEED"].values
        self.models["WIND_SPEED"] = Ridge(alpha=1.0, random_state=self.random_state).fit(X_wind, y_wind)
        
        # Evapotranspiration
        X_et = train_df[["COARSE_EVAPOTRANSPIRATION"]].values
        y_et = train_df["TARGET_EVAPOTRANSPIRATION"].values
        self.models["EVAPOTRANSPIRATION"] = Ridge(alpha=1.0, random_state=self.random_state).fit(X_et, y_et)
        print("Coarse baselines trained.")
        return self

    def predict(self, df):
        preds = {}
        for var in TARGET_NAMES:
            c_col = f"COARSE_{var}"
            X = df[[c_col]].values
            pred = self.models[var].predict(X)
            if var == "RAINFALL":
                pred = np.maximum(0.0, pred)
            elif var == "TEMPERATURE":
                pred = np.clip(pred, -10.0, 60.0)
            elif var == "HUMIDITY":
                pred = np.clip(pred, 0.0, 100.0)
            elif var == "WIND_SPEED":
                pred = np.clip(pred, 0.0, 50.0)
            elif var == "EVAPOTRANSPIRATION":
                pred = np.clip(pred, 0.0, 15.0)
            preds[var] = pred
        return preds


def format_to_locked_contract(gpcode_series, date_series, predictions_dict, confidence_pct=80.0):
    """
    Converts predictions dictionary to the locked output contract:
    GPCODE | DATE | VARIABLE | PREDICTED_VALUE | UNCERTAINTY_LOWER | UNCERTAINTY_UPPER | CONFIDENCE_PCT
    """
    long_records = []
    
    for var_name, data in predictions_dict.items():
        vdf = pd.DataFrame({
            "GPCODE": gpcode_series.values,
            "DATE": date_series.values,
            "VARIABLE": var_name,
            "PREDICTED_VALUE": np.round(data["point"], 3),
            "UNCERTAINTY_LOWER": np.round(data["lower"], 3),
            "UNCERTAINTY_UPPER": np.round(data["upper"], 3),
            "CONFIDENCE_PCT": float(confidence_pct)
        })
        long_records.append(vdf)
        
    out_df = pd.concat(long_records, ignore_index=True)
    return out_df
