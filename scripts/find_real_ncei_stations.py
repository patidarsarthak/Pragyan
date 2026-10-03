import urllib.request
import pandas as pd
import io

url = "https://www.ncei.noaa.gov/pub/data/noaa/isd-history.csv"
print("Reading isd-history.csv...")
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
content = urllib.request.urlopen(req, timeout=30).read()
df = pd.read_csv(io.BytesIO(content), dtype=str)

df["LAT_NUM"] = pd.to_numeric(df["LAT"], errors="coerce")
df["LON_NUM"] = pd.to_numeric(df["LON"], errors="coerce")
df["END_DATE"] = pd.to_numeric(df["END"], errors="coerce")

# Filter for active stations near Jharkhand/Dhanbad: Lat 22.0 to 25.5, Lon 84.5 to 88.0, active in 2023-2024
reg = df[
    (df["CTRY"] == "IN")
    & (df["LAT_NUM"] >= 22.0)
    & (df["LAT_NUM"] <= 25.5)
    & (df["LON_NUM"] >= 84.5)
    & (df["LON_NUM"] <= 88.0)
    & (df["END_DATE"] >= 20230101)
]

print(f"\nFound {len(reg)} Verified Active Stations in the Region (Active 2023-2024+):")
for _, r in reg.iterrows():
    print(
        f"USAF: {r['USAF']}, Name: {r['STATION NAME'].strip()}, Lat: {r['LAT']}, Lon: {r['LON']}, Elev: {r['ELEV(M)']}m, Active: {r['BEGIN']} to {r['END']}"
    )
