import urllib.request
import pandas as pd
import io
import os
import json

def find_mp_stations():
    url = "https://www.ncei.noaa.gov/pub/data/noaa/isd-history.csv"
    print("Fetching NOAA NCEI isd-history.csv...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    content = urllib.request.urlopen(req, timeout=30).read()
    df = pd.read_csv(io.BytesIO(content), dtype=str)

    df["LAT_NUM"] = pd.to_numeric(df["LAT"], errors="coerce")
    df["LON_NUM"] = pd.to_numeric(df["LON"], errors="coerce")
    df["END_DATE"] = pd.to_numeric(df["END"], errors="coerce")
    df["BEGIN_DATE"] = pd.to_numeric(df["BEGIN"], errors="coerce")

    # MP Bounding box with 0.5 deg buffer: Lat [20.5, 27.2], Lon [73.5, 83.5]
    # Active in 2023-2024 (BEGIN <= 20230101, END >= 20230101)
    mp_stations = df[
        (df["CTRY"] == "IN")
        & (df["LAT_NUM"] >= 20.5)
        & (df["LAT_NUM"] <= 27.2)
        & (df["LON_NUM"] >= 73.5)
        & (df["LON_NUM"] <= 83.5)
        & (df["END_DATE"] >= 20230101)
        & (df["BEGIN_DATE"] <= 20231231)
    ].copy()

    print(f"\nFound {len(mp_stations)} Verified Active Stations in/near Madhya Pradesh:")
    results = []
    for _, r in mp_stations.iterrows():
        st_dict = {
            "usaf": r["USAF"],
            "wban": r["WBAN"],
            "name": r["STATION NAME"].strip(),
            "ctry": r["CTRY"],
            "lat": float(r["LAT_NUM"]),
            "lon": float(r["LON_NUM"]),
            "elev_m": float(r["ELEV(M)"]) if pd.notnull(r["ELEV(M)"]) else None,
            "begin": r["BEGIN"],
            "end": r["END"]
        }
        results.append(st_dict)
        print(f"  USAF: {r['USAF']}, Name: {r['STATION NAME'].strip():<25}, Lat: {r['LAT']}, Lon: {r['LON']}, Elev: {r['ELEV(M)']}m, Range: {r['BEGIN']}-{r['END']}")

    out_dir = os.path.join("data", "validation", "real")
    os.makedirs(out_dir, exist_ok=True)
    out_csv = os.path.join(out_dir, "mp_verified_isd_stations.csv")
    mp_stations.to_csv(out_csv, index=False)
    print(f"\nSaved MP stations to {out_csv}")
    return results

if __name__ == "__main__":
    find_mp_stations()
