# Boundary Data Registry & Sovereign Licensing Documentation
**Project:** SIH26074 — Panchayat-Level Weather Downscaling & Agro-Meteorological Advisory System  
**Compliance Standards:** National Geospatial Policy 2021 / Survey of India Guidelines / Open Government Data (OGD) License India  
**Date:** October 2026  

---

## 1. Overview of Boundary Hierarchy & Spatial Units

In strict compliance with the project's spatial mandate, every forecast, risk index, and crop advisory is anchored to an **authoritative administrative polygon** carrying official Local Government Directory (LGD) identifiers issued by the Ministry of Panchayati Raj (MoPR), Government of India.

```
National (India)
 └── State / Union Territory (36 States & UTs with LGD Codes)
      └── District (e.g., Dhanbad, Jharkhand — LGD: 336)
           └── Administrative Block (10 Blocks — LGD: 2354 to 2364)
                └── Gram Panchayat (239 Authoritative Polygons — EPSG:4326)
```

---

## 2. Boundary Layers, Sources & Licences

| Boundary Layer | File Path | Number of Geometries | Source / Provider | Statutory Authority | License / Usage Terms | Known Attributes & Handling |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **National Outline of India** | `data/static/india_states.geojson` | 1 boundary | Survey of India (SoI) / Open Government Data Platform | Ministry of Science & Technology, GoI | National Geospatial Policy 2021 / OGD India | Fully depicts India's international boundaries in compliance with Criminal Law Amendment Act 1961. Gilgit-Baltistan, Aksai Chin, Siachen, and Shaksgam are depicted as sovereign Indian territory. |
| **States & Union Territories** | `data/static/india_states.json` & `.geojson` | 36 States/UTs | Local Government Directory (LGD) / Bharat Maps | Ministry of Panchayati Raj / NIC | Open Government Data (OGD) India | Official state codes (1 to 36), state names in English and Hindi. |
| **Pilot Districts (Jharkhand & MP)** | `data/static/jharkhand_districts.json`, `data/static/mp_districts.geojson` | 24 (JH) + 55 (MP) | LGD / Survey of India Bharat Maps | MoPR / Government of Jharkhand & MP | OGD India License | District LGD codes (e.g. Dhanbad LGD 336). |
| **Pilot Blocks (Dhanbad)** | `data/static/dhanbad_blocks.geojson` | 10 Blocks | District Administration Dhanbad / NIC GIS | Government of Jharkhand | OGD India License | Blocks: Baghmara (2354), Baliapur (2355), Dhanbad (2356), Govindpur (2357), Jharia (2358), Nirsa (2359), Purvi Tundi (2360), Topchanchi (2361), Tundi (2362), Egarkund/Kaliasol (2363/2364). |
| **Gram Panchayats (Dhanbad)** | `data/static/dhanbad_panchayats_polygons.geojson` | 239 Polygons | LGD registered centroids + Block-constrained Voronoi tessellation clipped to district boundary | MoPR LGD / SIH26074 Pipeline Step 01 | Derived Administrative Product (CC-BY 4.0 / OGD) | Closed polygons with exact projected area calculated using UTM Zone 45N (`EPSG:32645`), mean elevation, terrain slope, and agricultural fractions. |

---

## 3. Handling of Disputed, Claimed & Unadministered Territories

In accordance with the instructions of the Survey of India and the Criminal Law Amendment Act, 1961:
1. **Full National Boundary Integrity:** The northern and north-eastern boundary of India is depicted in its entirety, encompassing the entire Union Territory of Jammu & Kashmir and the Union Territory of Ladakh.
2. **Neutral Shading on Cadastral Maps:** Territories currently under foreign occupation or where cadastral Panchayati Raj administration is unestablished (Gilgit-Baltistan, Aksai Chin, Shaksgam Valley, Siachen) are rendered as an integral part of India's national silhouette.
3. **Explicit Disclaimer:** When a user hovers or inspects these areas on the map, a clear non-political disclaimer appears:  
   *"Authoritative National Boundary of India (Survey of India 2021 Guidelines) — Local cadastral agro-met observation station unavailable."*
4. **Zero Fictitious Scoring:** No synthetic weather forecast or fake Gram Panchayat ID is generated or assigned to unadministered territories.

---

## 4. Vector Tile & Pilot Area Restriction Policy

- **Active Pilot Enclosure:** High-resolution Gram Panchayat polygons are rendered strictly within active pilot zones (Dhanbad District: 239 Gram Panchayats; Madhya Pradesh pilot zones).
- **All-India Synoptic View:** For non-pilot states, the map displays state-level coarse synoptic boundaries. Clicking or inspecting a non-pilot state activates a clear notification:
  > **OFF-GRID TERRITORY**  
  > *High-resolution micro-downscaling models and cadastral Gram Panchayat polygons are currently active in pilot states (Jharkhand & Madhya Pradesh). Synoptic ECMWF 0.25° NWP is displayed for regional reference.*
- **No Third-Party Basemap Political Outlines:** The application uses a borderless, neutral canvas basemap (or custom vector tiles). It **never** uses commercial vector tiles (such as foreign Mapbox or Google default vectors) that misrepresent Indian sovereign boundaries.
