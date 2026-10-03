# 📂 Independent Validation Data Directory

> [!WARNING]
> **SYNTHETIC TEST SUITE NOTICE**: The files in `data/validation/synthetic/` (`synthetic_station_observations.parquet`, `synthetic_stations.csv`) were generated programmatically during an earlier automated testing session on 2026-09-30 as synthetic pipeline consistency checks. They are **NOT** real NOAA or IMD observations and must never be cited or described as real meteorological observations. Real ingested data resides exclusively in `data/validation/real/`.

Place your independent, held-out validation dataset in this folder (`data/validation/real/` or root `data/validation/`).

### Supported File Formats:
- `.parquet` (Recommended)
- `.csv`
- `.json`

### Supported Schema / Column Conventions:
The evaluation script (`data_pipeline/14_independent_validation.py`) automatically maps your columns:

| Field | Accepted Column Names | Description |
| :--- | :--- | :--- |
| **GP Identifier** | `GPCODE`, `gp_code`, `station_id`, `id` | Unique identifier for Panchayat or Station |
| **Date** | `DATE`, `date`, `time`, `datetime` | Date format: `YYYY-MM-DD` |
| **Coordinates** (Optional) | `LATITUDE`, `LONGITUDE`, `lat`, `lon` | Decimal degrees |
| **Observed Rainfall** | `actual_rainfall`, `FINE_RAINFALL`, `obs_rainfall`, `rain_mm`, `precipitation` | Ground truth precipitation (mm/day) |
| **Observed Temperature** | `actual_temperature`, `TARGET_TEMPERATURE`, `obs_temperature`, `temp_c`, `temperature_2m` | Ground truth temperature (°C) |
| **Observed Humidity** | `actual_humidity`, `TARGET_HUMIDITY`, `obs_humidity`, `humidity_pct`, `relative_humidity_2m` | Ground truth relative humidity (%) |
| **Observed Wind Speed** | `actual_wind_speed`, `TARGET_WIND_SPEED`, `obs_wind`, `wind_speed_ms`, `wind_speed_10m` | Ground truth wind speed (m/s) |
| **Observed ET0** | `actual_evapotranspiration`, `TARGET_EVAPOTRANSPIRATION`, `obs_et`, `et0_fao` | Ground truth evapotranspiration (mm/day) |
| **Coarse NWP Input** (Optional) | `COARSE_<VAR>` or `forecast_<var>` | If omitted, coarse ERA5-Land values from `data/raw` will be matched by date and location. |

Once your file is placed here, run:
```bash
python data_pipeline/14_independent_validation.py
```
Outputs will be generated at:
- `ml/results/baseline_comparison.csv`
- `ml/results/baseline_comparison_summary.md`
- `data_pipeline/reports/INDEPENDENT_VALIDATION_REPORT.md`
