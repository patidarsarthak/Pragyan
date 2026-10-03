#!/usr/bin/env python3
"""
SIH26074 - National Scalability Benchmark Suite
------------------------------------------------
Measures computational performance across three GP scales:
  - 239 Panchayats (Dhanbad Pilot)
  - 5,000 Panchayats (Jharkhand State Scale)
  - 50,000 Panchayats (Regional Multi-State Scale)

METRICS CAPTURED:
  1. Prediction Time (seconds)
  2. Inference Throughput (GPs / second)
  3. Peak Memory Allocation (MB) via Python tracemalloc
  4. API Endpoint Latency (/map/point-query) [avg & p95 ms]
  5. API Endpoint Latency (/panchayats/{gp}/weather) [avg & p95 ms]

All inputs for N > 239 are strictly labelled SYNTHETIC_BENCHMARK_TIMING_ONLY
and are utilized exclusively for hardware execution benchmarking.

Outputs:
  - ml/results/scale_benchmark.csv
"""

import sys
import os
import time
import tracemalloc
from datetime import datetime, timezone
from typing import Dict, List, Any

import numpy as np
import pandas as pd
from starlette.testclient import TestClient

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.predict import predict_weather
from backend.main import app


BENCHMARK_SCALES = [239, 5000, 50000]
OUTPUT_CSV_PATH = os.path.join(PROJECT_ROOT, "ml", "results", "scale_benchmark.csv")


def generate_synthetic_gp_inputs(n: int, seed: int = 42) -> pd.DataFrame:
    """
    Generates n synthetic Gram Panchayat atmospheric and topographic records
    for timing and memory profiling only.
    """
    rng = np.random.default_rng(seed)
    
    gpcodes = np.arange(100001, 100001 + n, dtype=int)
    latitudes = rng.uniform(8.4, 34.5, size=n)
    longitudes = rng.uniform(69.0, 96.0, size=n)
    elevations = rng.uniform(15.0, 1400.0, size=n)
    slopes = rng.uniform(0.0, 18.0, size=n)
    landcovers = rng.integers(1, 6, size=n)
    
    rain = rng.uniform(0.0, 45.0, size=n)
    temp = rng.uniform(18.0, 38.0, size=n)
    hum = rng.uniform(30.0, 95.0, size=n)
    wind = rng.uniform(0.5, 12.0, size=n)
    et0 = rng.uniform(1.5, 6.5, size=n)
    
    df = pd.DataFrame({
        "GPCODE": gpcodes,
        "DATE": "2026-10-01",
        "LATITUDE": np.round(latitudes, 4),
        "LONGITUDE": np.round(longitudes, 4),
        "ELEVATION_M": np.round(elevations, 1),
        "SLOPE_DEG": np.round(slopes, 2),
        "LANDCOVER_CLASS": landcovers,
        "COARSE_RAINFALL": np.round(rain, 2),
        "COARSE_TEMPERATURE": np.round(temp, 2),
        "COARSE_HUMIDITY": np.round(hum, 1),
        "COARSE_WIND_SPEED": np.round(wind, 2),
        "COARSE_EVAPOTRANSPIRATION": np.round(et0, 2),
        "BENCHMARK_FLAG": "SYNTHETIC_BENCHMARK_TIMING_ONLY"
    })
    return df


def benchmark_inference(n_gps: int, num_runs: int = 3) -> Dict[str, float]:
    """
    Measures prediction execution time and peak memory footprint for N GPs.
    """
    print(f"\n[BENCHMARK] Generating {n_gps:,} synthetic GP records...")
    df_synthetic = generate_synthetic_gp_inputs(n_gps)
    
    # Warmup pass
    _ = predict_weather(coarse_inputs=df_synthetic.head(min(10, n_gps)))
    
    durations = []
    peak_memories = []
    
    for r in range(num_runs):
        tracemalloc.start()
        t0 = time.perf_counter()
        
        preds = predict_weather(coarse_inputs=df_synthetic)
        
        elapsed = time.perf_counter() - t0
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        durations.append(elapsed)
        peak_memories.append(peak / (1024.0 * 1024.0)) # MB
        print(f"  Run {r+1}/{num_runs}: {elapsed:.3f}s, Peak RAM: {peak_memories[-1]:.2f} MB ({len(preds):,} output predictions)")
    
    avg_duration = float(np.mean(durations))
    avg_peak_mem = float(np.mean(peak_memories))
    throughput = float(n_gps / avg_duration) if avg_duration > 0 else 0.0
    
    return {
        "scale_n_gps": n_gps,
        "inference_time_sec": round(avg_duration, 4),
        "inference_throughput_gps_per_sec": round(throughput, 1),
        "peak_memory_mb": round(avg_peak_mem, 2),
        "output_rows": n_gps * 5
    }


def benchmark_api_endpoints(client: TestClient, iterations: int = 25) -> Dict[str, float]:
    """
    Measures endpoint latency for /map/point-query and /panchayats/{gp}/weather.
    """
    print("\n[BENCHMARK] Measuring FastAPI Endpoint Latencies...")
    
    # 1. Benchmark /map/point-query
    point_latencies = []
    # Test coordinates across Dhanbad
    test_coords = [
        (23.7957, 86.4304),
        (23.8120, 86.4100),
        (23.7500, 86.3500),
        (23.8500, 86.5000),
        (23.7000, 86.2500)
    ]
    
    # Warmup
    _ = client.get("/map/point-query?lat=23.7957&lon=86.4304")
    
    for i in range(iterations):
        lat, lon = test_coords[i % len(test_coords)]
        t0 = time.perf_counter()
        resp = client.get(f"/map/point-query?lat={lat}&lon={lon}")
        lat_ms = (time.perf_counter() - t0) * 1000.0
        if resp.status_code == 200:
            point_latencies.append(lat_ms)
            
    point_avg = float(np.mean(point_latencies)) if point_latencies else 0.0
    point_p95 = float(np.percentile(point_latencies, 95)) if point_latencies else 0.0
    
    # 2. Benchmark /panchayats/{gp}/weather
    weather_latencies = []
    test_gps = [111722, 111723, 111724, 111725, 5001]
    
    # Warmup
    _ = client.get("/panchayats/111722/weather")
    
    for i in range(iterations):
        gp = test_gps[i % len(test_gps)]
        t0 = time.perf_counter()
        resp = client.get(f"/panchayats/{gp}/weather")
        lat_ms = (time.perf_counter() - t0) * 1000.0
        if resp.status_code in [200, 404]:
            weather_latencies.append(lat_ms)
            
    weather_avg = float(np.mean(weather_latencies)) if weather_latencies else 0.0
    weather_p95 = float(np.percentile(weather_latencies, 95)) if weather_latencies else 0.0
    
    print(f"  /map/point-query: Mean={point_avg:.2f}ms, P95={point_p95:.2f}ms")
    print(f"  /panchayats/{{gp}}/weather: Mean={weather_avg:.2f}ms, P95={weather_p95:.2f}ms")
    
    return {
        "point_query_avg_ms": round(point_avg, 2),
        "point_query_p95_ms": round(point_p95, 2),
        "panchayat_weather_avg_ms": round(weather_avg, 2),
        "panchayat_weather_p95_ms": round(weather_p95, 2)
    }


def main():
    print("=" * 70)
    print("SIH26074 - NATIONAL SCALABILITY BENCHMARK SUITE")
    print("=" * 70)
    
    os.makedirs(os.path.dirname(OUTPUT_CSV_PATH), exist_ok=True)
    
    # Initialize TestClient
    client = TestClient(app)
    
    # Run API endpoint benchmarks
    api_metrics = benchmark_api_endpoints(client, iterations=30)
    
    # Run inference benchmarks across scales
    results = []
    for n in BENCHMARK_SCALES:
        # Use 3 runs for 239 and 5,000; 2 runs for 50,000 for timing efficiency
        runs = 3 if n <= 5000 else 2
        inf_metrics = benchmark_inference(n_gps=n, num_runs=runs)
        
        row = {
            "scale_n_gps": n,
            "benchmark_data_type": "SYNTHETIC_BENCHMARK_TIMING_ONLY",
            "inference_time_sec": inf_metrics["inference_time_sec"],
            "inference_throughput_gps_per_sec": inf_metrics["inference_throughput_gps_per_sec"],
            "peak_memory_mb": inf_metrics["peak_memory_mb"],
            "output_predictions_count": inf_metrics["output_rows"],
            "point_query_avg_ms": api_metrics["point_query_avg_ms"],
            "point_query_p95_ms": api_metrics["point_query_p95_ms"],
            "panchayat_weather_avg_ms": api_metrics["panchayat_weather_avg_ms"],
            "panchayat_weather_p95_ms": api_metrics["panchayat_weather_p95_ms"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        results.append(row)
        
    df_results = pd.DataFrame(results)
    df_results.to_csv(OUTPUT_CSV_PATH, index=False)
    print(f"\n[COMPLETED] Saved scale benchmark results to: {OUTPUT_CSV_PATH}")
    print("\nBenchmark Summary Table:")
    print(df_results.to_string(index=False))


if __name__ == "__main__":
    main()
