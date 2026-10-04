"""
SIH26074 - Cost-Loss Agricultural Decision Engine (ml/src/decision.py)
---------------------------------------------------------------------
Implements the decision-theoretic cost-loss framework (Murphy 1977; Richardson 2000):
A risk-neutral agricultural producer takes protective action if and only if:
    P(hazard_event) >= Cost / Loss (C/L)

Where:
- Cost (C): Financial or operational cost of taking preventative agronomic action.
- Loss (L): Financial loss incurred if the hazard occurs unmitigated.
- P(hazard_event): Calibrated probability of the hazard crossing critical impact threshold.

Inputs:
- Panchayat (1km downscaled) meteorological distributions
- Coarse NWP block baseline distributions
- Sourced agro-advisory rules
- User cost ratio (Cheap: 0.10, Medium: 0.30, Expensive: 0.60, or continuous slider)
"""

import os
import math
import yaml
from typing import Dict, Any, List, Optional, Tuple

CONFIG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "config")
COST_PRESETS_PATH = os.path.join(CONFIG_DIR, "cost_presets.yaml")

# Load cost-loss presets
_DEFAULT_PRESETS = {
    "presets": {
        "cheap": {"ratio": 0.10, "label": "Cheap (0.10)"},
        "medium": {"ratio": 0.30, "label": "Medium (0.30)"},
        "expensive": {"ratio": 0.60, "label": "Expensive (0.60)"}
    },
    "robust_difference": {"probability_margin": 0.10}
}

def load_cost_presets() -> Dict[str, Any]:
    if os.path.exists(COST_PRESETS_PATH):
        try:
            with open(COST_PRESETS_PATH, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or _DEFAULT_PRESETS
        except Exception:
            return _DEFAULT_PRESETS
    return _DEFAULT_PRESETS


def compute_event_probability(mean_val: float, p10: float, p90: float, threshold: float, condition: str = ">=") -> float:
    """
    Computes calibrated probability P(event) from conformal/ensemble interval [p10, p90].
    Assuming Gaussian approximation: sigma = (p90 - p10) / 2.563
    """
    spread = max(0.01, p90 - p10)
    sigma = spread / 2.5631
    z = (threshold - mean_val) / sigma

    # Standard normal cumulative distribution approximation
    # Abramowitz and Stegun formula 7.1.26
    t = 1.0 / (1.0 + 0.2316419 * abs(z))
    poly = ((((1.442744e-6 * t - 3.125275e-5) * t + 8.513813e-4) * t - 0.0101883) * t + 0.2258368) * t + 0.3193815
    pdf = math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    cdf = 1.0 - pdf * poly if z >= 0 else pdf * poly

    if condition in [">=", ">"]:
        prob = 1.0 - cdf
    else:
        prob = cdf

    return max(0.0, min(1.0, float(prob)))


def evaluate_decision(
    gp_weather: Dict[str, Any],
    block_weather: Dict[str, Any],
    crop_id: str = "durum_wheat",
    growth_stage: str = "Vegetative",
    cost_setting: str = "medium",
    custom_cost_ratio: Optional[float] = None
) -> Dict[str, Any]:
    """
    Evaluates decisions under both Panchayat (1km) and Block (25km) forecasts.
    Returns:
    - panchayat_action: "Act" | "Wait" | "Hedge"
    - block_action: "Act" | "Wait" | "Hedge"
    - advice_differs: bool
    - is_robust_difference: bool (|P_gp - P_block| >= margin)
    - prob_gp: float
    - prob_block: float
    - cost_ratio_used: float
    - trigger_variable: str
    - divergence_reason: str
    """
    cfg = load_cost_presets()
    robust_margin = cfg.get("robust_difference", {}).get("probability_margin", 0.10)

    # Resolve Cost-to-Loss ratio
    if custom_cost_ratio is not None and 0.01 <= custom_cost_ratio <= 0.99:
        c_l = float(custom_cost_ratio)
        cost_tier_label = f"Custom (C/L: {c_l:.2f})"
    else:
        preset_key = str(cost_setting).lower()
        preset = cfg.get("presets", {}).get(preset_key, cfg.get("presets", {}).get("medium", {}))
        c_l = float(preset.get("ratio", 0.30))
        cost_tier_label = preset.get("label", f"Preset ({c_l:.2f})")

    # Extract weather values
    gp_rain = float(gp_weather.get("rainfall_mm", 0.0))
    block_rain = float(block_weather.get("rainfall_mm", 0.0))
    
    gp_p10_rain = float(gp_weather.get("rainfall_p10", max(0.0, gp_rain * 0.7)))
    gp_p90_rain = float(gp_weather.get("rainfall_p90", gp_rain * 1.3 + 1.0))
    
    block_p10_rain = float(block_weather.get("rainfall_p10", max(0.0, block_rain * 0.7)))
    block_p90_rain = float(block_weather.get("rainfall_p90", block_rain * 1.3 + 1.0))

    gp_wind = float(gp_weather.get("wind_speed_ms", 2.5))
    block_wind = float(block_weather.get("wind_speed_ms", 2.5))

    gp_temp = float(gp_weather.get("temp_c", 28.0))
    block_temp = float(block_weather.get("temp_c", 28.0))

    # Evaluate against core agromet hazard: Excessive rain / waterlogging risk (>20mm)
    # Threshold varies by crop: Vertisol wheat/chickpea waterlogging threshold is 20mm
    RAIN_HAZARD_THRESHOLD = 20.0
    prob_rain_gp = compute_event_probability(gp_rain, gp_p10_rain, gp_p90_rain, RAIN_HAZARD_THRESHOLD, ">=")
    prob_rain_block = compute_event_probability(block_rain, block_p10_rain, block_p90_rain, RAIN_HAZARD_THRESHOLD, ">=")

    # Primary hazard evaluation
    p_gp = prob_rain_gp
    p_blk = prob_rain_block
    hazard_name = "Heavy Rain / Inundation (>20mm)"
    trigger_var = "rainfall"
    delta_val = round(gp_rain - block_rain, 1)

    # Determine action for GP vs Block
    # Murphy Cost-Loss Rule: Act if P >= C/L
    # Hedge band: within +/- 0.05 of threshold
    hedge_margin = 0.04

    def decide(p: float, ratio: float) -> Tuple[str, str]:
        if p >= ratio + hedge_margin:
            return "Act", f"P({p*100:.0f}%) exceeds cost-to-loss threshold ({ratio*100:.0f}%): immediate protective defense indicated."
        elif p <= ratio - hedge_margin:
            return "Wait", f"P({p*100:.0f}%) is below cost-to-loss threshold ({ratio*100:.0f}%): action cost outweighs expected loss."
        else:
            return "Hedge", f"P({p*100:.0f}%) is close to cost-to-loss threshold ({ratio*100:.0f}%): low-cost partial mitigation recommended."

    gp_act, gp_why = decide(p_gp, c_l)
    blk_act, blk_why = decide(p_blk, c_l)

    advice_differs = (gp_act != blk_act)
    prob_diff = abs(p_gp - p_blk)
    is_robust = advice_differs and (prob_diff >= robust_margin)

    # Narrative explanation strictly from fields
    if advice_differs:
        if gp_act == "Act" and blk_act in ["Wait", "Hedge"]:
            divergence_reason = (
                f"Downscaled 1km forecast ({gp_rain:.1f} mm, P={p_gp*100:.0f}%) crosses the critical {c_l*100:.0f}% "
                f"cost-loss threshold, whereas coarse block average ({block_rain:.1f} mm, P={p_blk*100:.0f}%) "
                f"underestimates localized risk by {delta_val:+.1f} mm."
            )
        elif gp_act in ["Wait", "Hedge"] and blk_act == "Act":
            divergence_reason = (
                f"Block average ({block_rain:.1f} mm, P={p_blk*100:.0f}%) suggests unnecessary expenditure, "
                f"while 1km cadastral downscaling ({gp_rain:.1f} mm, P={p_gp*100:.0f}%) proves plot risk remains "
                f"below the {c_l*100:.0f}% action cutoff."
            )
        else:
            divergence_reason = (
                f"Action recommendation shifted from {blk_act} to {gp_act} due to {delta_val:+.1f} mm localized rainfall divergence."
            )
    else:
        divergence_reason = (
            f"Both 1km downscaled (P={p_gp*100:.0f}%) and block model (P={p_blk*100:.0f}%) agree on {gp_act} "
            f"at cost-to-loss ratio C/L={c_l:.2f}."
        )

    return {
        "crop": crop_id,
        "stage": growth_stage,
        "hazard_evaluated": hazard_name,
        "cost_ratio_used": round(c_l, 2),
        "cost_tier_label": cost_tier_label,
        "panchayat_action": gp_act,
        "panchayat_probability": round(p_gp, 3),
        "panchayat_why": gp_why,
        "block_action": blk_act,
        "block_probability": round(p_blk, 3),
        "block_why": blk_why,
        "advice_differs": advice_differs,
        "is_robust_difference": is_robust,
        "probability_difference": round(prob_diff, 3),
        "robust_margin_used": robust_margin,
        "trigger_variable": trigger_var,
        "panchayat_value": gp_rain,
        "block_value": block_rain,
        "delta_value": delta_val,
        "divergence_reason": divergence_reason,
        "source_attribution": "Murphy (1977) Cost-Loss Decision Model; IMD ICAR AAS Agromet SOP",
        "assumption_notice": "Cost-loss ratios are calibrated operational assumptions (ASSUMPTION)."
    }


def evaluate_panchayat_decision(
    panchayat_code: int = 133203,
    p_downscaled: float = 0.40,
    p_coarse: float = 0.20,
    cost_ratio: float = 0.30,
    event_type: str = "heavy_rain"
) -> Dict[str, Any]:
    """Helper wrapper for direct probability evaluation."""
    cfg = load_cost_presets()
    robust_margin = cfg.get("robust_difference", {}).get("probability_margin", 0.10)

    act_gp = "ACT" if p_downscaled >= cost_ratio else "WAIT"
    act_coarse = "ACT" if p_coarse >= cost_ratio else "WAIT"
    advice_differs = bool(act_gp != act_coarse)
    prob_diff = abs(p_downscaled - p_coarse)
    is_robust = bool(advice_differs and prob_diff >= robust_margin)

    return {
        "panchayat_code": panchayat_code,
        "cost_ratio": cost_ratio,
        "downscaled": {"action": act_gp, "probability": p_downscaled},
        "coarse": {"action": act_coarse, "probability": p_coarse},
        "advice_differs": advice_differs,
        "advice_robust_differs": is_robust,
        "probability_difference": round(prob_diff, 3)
    }
