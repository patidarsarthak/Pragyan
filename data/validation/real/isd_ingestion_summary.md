# Verified NOAA ISD Surface Station Ingestion Summary

- **Total Observation Days Available:** 4,280 station-days across 6 stations (2023-01-01 to 2024-12-31).
- **Target Calendar Period:** 731 days (365 days in 2023 + 366 days in 2024 leap year).
- **Day Definition:** UTC calendar day (00:00:00Z to 23:59:59Z).
- **Daily Aggregation Logic:**
  - `obs_temp_mean_c`: Arithmetic mean of all valid quality-controlled (`QC in ["1", "5"]`) temperature readings in the UTC day.
  - `obs_temp_max_c`: Maximum valid temperature reading in the UTC day.
  - `obs_temp_min_c`: Minimum valid temperature reading in the UTC day.
  - **Minimum hourly observations required to produce a day:** 1 valid observation. (If $\ge 1$ observation exists, a daily row was formed).

### Station-by-Station Coverage & Actual Missing Days Breakdown

| Station Name | USAF-WBAN | Distance to Dhanbad | Elevation (m) | Available Days (Rows) | Actual Missing Days (vs 731) | Completeness % | Avg Obs/Day | Diurnal Sampling Limitation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Gaya Airport** | 425910-99999 | 158 km NW | 115.8 m | 722 | **9 missing** | 98.8% | 33.6 obs/day | Full hourly + METAR |
| **Ranchi Airport** | 427010-99999 | 114 km SW | 654.7 m | 721 | **10 missing** | 98.6% | 46.2 obs/day | Full hourly + SPECI |
| **Jamshedpur Airport** | 427980-99999 | 112 km S | 153.9 m | 721 | **10 missing** | 98.6% | 21.0 obs/day | Hourly airport METAR |
| **Bankura Observatory** | 427060-99999 | 80 km SE | 100.0 m | 717 | **14 missing** | 98.1% | 7.9 obs/day | 3-hourly synoptic (8/day) |
| **Shanti Niketan** | 427080-99999 | 131 km E | 59.0 m | 714 | **17 missing** | 97.7% | 3.9 obs/day | 6-hourly synoptic (4/day) |
| **Purulia Observatory** | 427050-99999 | 52 km S | 255.0 m | 685 | **46 missing** | 93.7% | 1.9 obs/day | **Severe under-sampling**: only 1-2 synoptic obs/day (min/max does not capture full diurnal peak/trough) |

### Important Honest Assessment
1. **Reporting "0 missing" was inaccurate**: No station had 731 days. Actual gaps ranged from 9 days (Gaya) to 46 days (Purulia).
2. **Purulia Sampling Caveat**: Purulia is geographically the closest station to Dhanbad (36.8 km from south Dhanbad, 52 km from centroid), but with only 1.9 readings/day, daily min and max are strongly attenuated and should not be used as gold-standard extreme-temperature verification.
