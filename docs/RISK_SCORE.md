# Panchayat Agro-Meteorological Risk Score Formulation

The Panchayat Risk Score ($R_{GP} \in [0, 100]$) translates multi-variable downscaled meteorological predictions into an actionable agronomic hazard and crop insurance indicator for every Gram Panchayat.

## 1. Mathematical Formulation

$$R_{GP} = 0.35 \cdot R_{\text{drought}} + 0.30 \cdot R_{\text{flood}} + 0.20 \cdot R_{\text{pest}} + 0.15 \cdot R_{\text{thermal}}$$

Where:

1. **Drought / Moisture Deficit Risk ($R_{\text{drought}}$):**
   - Compares cumulative downscaled precipitation ($P_{\text{down}}$) against FAO-56 Reference Evapotranspiration ($ET_0$):
   - If $P_{\text{down}} \ge ET_0$, $R_{\text{drought}} = 5.0$ (Moisture sufficient).
   - If $P_{\text{down}} < ET_0$, $R_{\text{drought}} = \min\left(100.0, \frac{ET_0 - P_{\text{down}}}{\max(ET_0, 1.0)} \times 90.0\right)$.

2. **Excess Inundation / Heavy Rainfall Hazard ($R_{\text{flood}}$):**
   - Evaluates daily peak precipitation against IMD agromet thresholds:
   - $P_{\text{max}} \ge 65.0\text{ mm}$: $R_{\text{flood}} = 90.0$ (Severe inundation & soil erosion risk).
   - $35.0 \le P_{\text{max}} < 65.0\text{ mm}$: $R_{\text{flood}} = 60.0$ (Moderate waterlogging).
   - $P_{\text{tot}} \ge 80.0\text{ mm}$: $R_{\text{flood}} = 45.0$.
   - Baseline: $R_{\text{flood}} = 10.0$.

3. **Pest & Fungal Disease Risk ($R_{\text{pest}}$):**
   - High relative humidity coupled with moderate temperatures promotes fungal pathogens (e.g., Phytophthora blight, rust, leaf spot):
   - If $RH \ge 80\%$ and $22^\circ\text{C} \le T_{\text{mean}} \le 30^\circ\text{C}$: $R_{\text{pest}} = 75.0$.
   - If $RH \ge 70\%$: $R_{\text{pest}} = 40.0$.
   - Otherwise: $R_{\text{pest}} = 15.0$.

4. **Thermal / Temperature Stress Risk ($R_{\text{thermal}}$):**
   - Heatwave and coldwave impact on flowering and anthesis:
   - $T_{\text{max}} \ge 38^\circ\text{C}$: $R_{\text{thermal}} = 85.0$ (Pollen sterility / heat desiccation).
   - $34^\circ\text{C} \le T_{\text{max}} < 38^\circ\text{C}$: $R_{\text{thermal}} = 50.0$.
   - $T_{\text{min}} \le 4^\circ\text{C}$: $R_{\text{thermal}} = 80.0$ (Frost hazard).
   - Otherwise: $R_{\text{thermal}} = 15.0$.

## 2. Risk Bands

| Band | Score Range | Token | Recommended Operational Posture |
|---|---|---|---|
| **CALM** | $0.0 - 24.9$ | `--calm` (`#00a882`) | Normal seasonal farm operations (sowing, regular weeding). |
| **WATCH** | $25.0 - 54.9$ | `--watch` (`#f08700`) | Precautionary mode (clean drains, prepare spray schedules). |
| **ALERT** | $55.0 - 100.0$ | `--alert` (`#f5254a`) | Urgent intervention (suspend spray, delay harvest, open drainage). |

## 3. Spatial Aggregation Principle

District and state scores displayed on the overview map are **aggregates** (mean and alert shares) computed across all evaluated Gram Panchayats within that boundary:
- $\overline{R}_{\text{district}} = \frac{1}{N} \sum_{i=1}^N R_{GP, i}$
- $\text{Share}_{\text{Alert}} = \frac{N_{\text{Alert}}}{N_{\text{evaluated}}}$

District entities are explicitly labelled with `level: "district"` and `aggregate: true`.
