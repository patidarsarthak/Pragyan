"""
Copernicus Climate Data Store (CDS) ERA5 Native 0.25° Downloader.

This script directly connects to the official Copernicus Climate Data Store (CDS) API
using the official `cdsapi` package to fetch native ERA5 0.25° reanalysis NetCDF/GRIB data.

CREDENTIAL INSTRUCTIONS FOR THE USER:
1. Register a free account at Copernicus Climate Data Store:
   https://cds.climate.copernicus.eu/
2. Accept the Terms of Service for ERA5:
   https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=download
3. Retrieve your Personal Access Token from:
   https://cds.climate.copernicus.eu/how-to-api
4. Create a file named `.cdsapirc` in your home directory (C:\\Users\\<YourUser>\\.cdsapirc):
   url: https://cds.climate.copernicus.eu/api
   key: <YOUR-PERSONAL-ACCESS-TOKEN>
5. Install cdsapi in python:
   pip install cdsapi
6. Run:
   python scripts/download_era5_cds.py
"""

import sys
import os
from pathlib import Path

def check_cds_setup():
    cdsapirc_path = Path.home() / ".cdsapirc"
    print(f"Checking for CDS API credentials at: {cdsapirc_path}")
    if not cdsapirc_path.exists():
        print("\n[!] CDS Credentials NOT FOUND.")
        print("To download directly from ECMWF Copernicus CDS:")
        print("1. Go to: https://cds.climate.copernicus.eu/")
        print("2. Sign up / Log in and get your API Key from: https://cds.climate.copernicus.eu/how-to-api")
        print(f"3. Create '{cdsapirc_path}' with contents:")
        print("   url: https://cds.climate.copernicus.eu/api")
        print("   key: <YOUR-PERSONAL-ACCESS-TOKEN>\n")
        return False
    return True

def download_era5_from_cds(years=list(range(2015, 2025)), out_dir="data/validation/real/cds_era5"):
    try:
        import cdsapi
    except ImportError:
        print("[!] 'cdsapi' python package is not installed. Run: pip install cdsapi")
        return

    c = cdsapi.Client()
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    # Dhanbad Bounding Box with buffer [North, West, South, East]
    # Native ERA5 0.25° resolution
    area = [24.5, 85.5, 23.25, 87.25]

    for yr in years:
        target_file = out_path / f"era5_dhanbad_native_025deg_{yr}.nc"
        if target_file.exists():
            print(f"File already exists: {target_file}")
            continue

        print(f"Submitting CDS request for ERA5 year {yr}...")
        c.retrieve(
            "reanalysis-era5-single-levels",
            {
                "product_type": ["reanalysis"],
                "variable": [
                    "2m_temperature",
                    "total_precipitation",
                    "2m_dewpoint_temperature",
                    "10m_u_component_of_wind",
                    "10m_v_component_of_wind"
                ],
                "year": [str(yr)],
                "month": [f"{m:02d}" for m in range(1, 13)],
                "day": [f"{d:02d}" for d in range(1, 32)],
                "time": [f"{h:02d}:00" for h in range(24)],
                "data_format": "netcdf",
                "download_format": "unarchived",
                "area": area,
            },
            str(target_file)
        )
        print(f"Successfully downloaded: {target_file}")

if __name__ == "__main__":
    if check_cds_setup():
        download_era5_from_cds()
    else:
        sys.exit(1)
