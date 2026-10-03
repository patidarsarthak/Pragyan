# Dhanbad Micro-Precipitation Independent Ground Truth & Validation Plan

**Document Version:** 1.0.0  
**Target Pilot:** Dhanbad District, Jharkhand (Bounding Box: 23.62° N – 24.08° N, 86.05° E – 86.88° E; 239 Gram Panchayats across 10 Blocks)  
**Objective:** Replace circular synthetic rainfall targets with verified, open-access, independent precipitation reference datasets and in-situ observation telemetry.

---

## 1. Executive Summary & Problem Analysis

In the current repository baseline, precipitation downscaling targets were algebraically manufactured using coarse ERA5-Land reanalysis scaled by an elevation factor (`v * (1.0 + (elev - 200.0) / 1000.0) + 0.05` in `data/scripts/build_unified_dataset.py:192`). While this models macroscopic orographic uplift, it **does not represent real micro-scale rainfall ground truth**, resulting in circular validation metrics ($MAE = 0.0975\text{ mm}$).

To establish an authoritative, scientifically defensible evaluation pipeline, this data plan specifies three external gridded reference benchmarks and an in-situ rain gauge acquisition strategy for Dhanbad.

---

## 2. Independent Precipitation Datasets: Specification & Verification

| Dataset | Provider / Source | Spatial Resolution | Temporal Resolution | Dhanbad Pilot Coverage | Access Method & Endpoint | Data License / Terms |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IMD Gridded Rainfall (0.25° × 0.25°)** | India Meteorological Department (National Climate Centre, Pune) | $0.25^\circ \times 0.25^\circ$ (~27 km) | Daily (08:30 IST to 08:30 IST accumulation) | Direct coverage; ~4 grid points intersect Dhanbad district footprint. | Direct download via IMD Pune Data Supply Portal / Python `imdpune` library / OpenData portal (Binary `.grd` format). | Open government data for academic, research, and non-commercial public interest (Attribution required). |
| **CHIRPS Daily (v2.0 Final)** | Climate Hazards Center (UC Santa Barbara / USGS) | $0.05^\circ \times 0.05^\circ$ (~5.3 km) | Daily (1981–present, 2-week latency for Final; 2-day for Preliminary) | **Optimal satellite-gauge proxy.** Yields ~36 independent grid points across Dhanbad district. | Cloud-optimized GeoTIFFs via HTTP/FTP: `https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05/` or via Google Earth Engine (`UCSB-CHG/CHIRPS/DAILY`). | Public Domain / Open Access (Attribution to Funk et al., 2015, *Scientific Data*). |
| **NASA GPM IMERG (V07B Final Run)** | NASA Goddard Space Flight Center / PMM | $0.1^\circ \times 0.1^\circ$ (~10 km) | Half-hourly and Daily accumulations | Yields ~9 independent grid points across Dhanbad district. | NASA Earthdata GES DISC (OPeNDAP / HTTPS REST API / `earthaccess` Python library). | Free and open data under NASA Earth Science Data Policy (Creative Commons zero / Open Attribution). |

---

## 3. Comparative Trade-Off Analysis for Dhanbad Downscaling

1. **CHIRPS 0.05° (~5.3 km) — Recommended Primary Target:**
   * *Strengths:* Highest spatial resolution available globally for daily precipitation. Blends multi-satellite infrared/microwave with available regional station gauges. At 5.3 km, it resolves distinct precipitation gradients between Topchanchi hills (elevation ~312–648 m) and the Damodar River valley (~120–140 m).
   * *Implementation:* Use CHIRPS 0.05° as the high-resolution regression target for training the spatial residual model, replacing the synthetic elevation formula.
2. **NASA GPM IMERG 0.1° (~10 km) — Recommended Cross-Validation Benchmark:**
   * *Strengths:* Dual-frequency Precipitation Radar (DPR) calibration provides superior convective rainfall burst detection during the Indian Summer Monsoon (June–September).
   * *Use Case:* Independent cross-sensor benchmark to verify whether downscaled extreme alerts correspond to radar-observed convective cells.
3. **IMD Gridded Rainfall 0.25° (~27 km) — Synoptic Boundary Reference:**
   * *Strengths:* Official sovereign ground-truth standard in India.
   * *Limitations:* At 27 km resolution, the entire Dhanbad district is covered by fewer than 4 cells, making it too coarse for Gram Panchayat downscaling, but essential as a regional mass-conservation check.

---

## 4. Local In-Situ Sensor Telemetry Roadmap

To graduate from satellite proxy verification to genuine in-situ ground truth:

1. **Dhanbad Automatic Weather Stations (AWS):**
   * IMD Station Dhanbad (`IMD_DHN_01`, Lat 23.795° N, Lon 86.430° E, Elev 227 m).
   * Maithon Dam Hydromet Station (`IMD_MAITHON_02`, DVC/IMD).
   * Panchet Dam Observatory (`IMD_PANCHET_03`, CWC/IMD).
   * Krishi Vigyan Kendra (KVK) Baliapur Agro-Met Station (`KVK_BALIAPUR_04`).
2. **Panchayat Rain Gauge Instrumentation:**
   * Jharkhand State Disaster Management Authority (JSDMA) and Department of Agriculture Block-level Automatic Rain Gauges (ARGs).
   * Integration protocol: Ingest 24-hour tipping-bucket accumulations via state hydromet API or manual daily tehsildar records.

---

## 5. Execution Pipeline Integration (`data_pipeline/15_station_validation.py`)

The validation pipeline script already contains the modular CLI flag for external precipitation evaluation:
```bash
python data_pipeline/15_station_validation.py \
  --variable rainfall \
  --observations-file data/validation/chirps_station_eval.parquet \
  --output-csv ml/results/chirps_rainfall_validation.csv
```
When executed against CHIRPS or real ARG telemetry, the system will output authentic Critical Success Index (CSI), Threat Score (TS), False Alarm Ratio (FAR), and Mean Absolute Error (MAE) without circular dependencies.
