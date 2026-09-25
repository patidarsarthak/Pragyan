# 🌾 SIH26074 Agricultural Reference & Agro-Meteorological Rule Base

**Project:** Smart Panchayat Climate & Geospatial Intelligence Platform (SIH26074)  
**Target Domain:** Dhanbad District, Jharkhand, India (Central and North Eastern Plateau Zone, Agro-Climatic Zone IV)  
**Administrative Span:** 239 Gram Panchayats across 10 Blocks  
**Authoritative Sources:**
1. **ICAR-KVK Dhanbad** (Krishi Vigyan Kendra, Baliapur, under Birsa Agricultural University, Ranchi)
2. **Birsa Agricultural University (BAU)**, Kanke, Ranchi — Directorate of Extension Education
3. **IMD Agromet Advisory Service (AAS)** / Gramin Krishi Mausam Sewa (GKMS), Dhanbad District Bulletins
4. **ICAR-CRIDA** (Central Research Institute for Dryland Agriculture), Hyderabad — District Agriculture Contingency Plan: Dhanbad
5. **FAO Irrigation and Drainage Paper No. 56** (Crop Evapotranspiration and Water Requirements)

---

## 1. Agro-Ecological Context of Dhanbad District

Dhanbad district is characterized by an undulating plateau topography with three primary land-topography classes:
- **Tanr (Upland, ~42% cultivated area):** Shallow, red gravelly-sandy loam soils, acidic (pH 5.0–5.8), low organic matter, highly drought-prone with fast percolation. Primarily suitable for upland rice (direct seeded), maize, pulses (arhar/urad), and oilseeds (mustard/niger).
- **Baad (Medium land, ~33% cultivated area):** Moderate water-holding capacity, suited for medium-duration paddy and rabi vegetables.
- **Don (Lowland, ~25% cultivated area):** Clay loam to heavy clay, high water retention, subject to monsoon waterlogging along the Damodar and Barakar river catchments. Suited for long-duration lowland paddy.

Average annual rainfall is ~1,300 mm, with >82% received during the Southwest Monsoon (mid-June to September). Inter-seasonal dry spells and post-monsoon terminal moisture stress represent the critical yield-limiting risks.

---

## 2. Dhanbad District Crop Calendar & Growth Stages

The following crops represent the verified crop basket of Dhanbad district based on KVK Dhanbad frontline demonstrations and the District Agriculture Contingency Plan:

### A. Kharif Season (Monsoon: June – October / November)

| Crop | Local Relevance | Typical Sowing / Transplanting | Growth Stages & Critical Water Periods | Primary Varieties (KVK Dhanbad) |
| :--- | :--- | :--- | :--- | :--- |
| **Paddy / Rice** *(Oryza sativa)* | Staple crop; >75% of net cultivated area | **Nursery:** June 15 – July 10 <br>**Transplanting:** July 15 – August 15 | 1. Nursery / Seedling (0–25 DAS)<br>2. Active Tillering (25–50 DAS)<br>3. Panicle Initiation to Flowering (50–85 DAS - **Critical**)<br>4. Grain Filling & Maturity (85–125 DAS) | Sahbhagi Dhan, CR Dhan 310, CR Dhan 320, DRR 48, Lalat, Abhishek |
| **Maize** *(Zea mays)* | Dominant upland crop in Baghmara, Tundi, Purvi Tundi | **Sowing:** June 20 – July 15 | 1. Germination & Seedling (0–15 DAS)<br>2. Knee-high Vegetative (15–35 DAS)<br>3. Tasseling & Silking (35–60 DAS - **Critical**)<br>4. Grain Filling & Maturity (60–90 DAS) | Birsa Vikas Makka 1, Kanchan, Suwan 1, HQPM 1 |
| **Pigeonpea / Arhar** *(Cajanus cajan)* | Deep-rooted upland pulse; intercropped with maize | **Sowing:** June 15 – July 10 | 1. Vegetative Establishment (0–60 DAS)<br>2. Branching (60–110 DAS)<br>3. Flowering & Pod Formation (110–150 DAS - **Critical**)<br>4. Pod Maturation (150–180 DAS) | Birsa Arhar 1, UPAS 120, Bahar, Narendra Arhar 1 |

### B. Rabi Season (Winter: October – March)

| Crop | Local Relevance | Typical Sowing / Planting | Growth Stages & Critical Periods | Primary Varieties (KVK Dhanbad) |
| :--- | :--- | :--- | :--- | :--- |
| **Mustard / Rapeseed** *(Brassica juncea)* | Primary rabi oilseed; cultivated on residual moisture | **Sowing:** October 10 – November 15 | 1. Seedling & Rosette (0–25 DAS)<br>2. Vegetative Branching (25–45 DAS)<br>3. Flowering & Siliqua Formation (45–75 DAS - **Critical**)<br>4. Seed Maturation (75–110 DAS) | Pusa Bold, Shivani, Varuna, PM 26 |
| **Potato** *(Solanum tuberosum)* | High-value commercial cash crop in Baliapur & Govindpur | **Planting:** October 20 – November 25 | 1. Emergence (0–20 DAP)<br>2. Stolon & Tuber Initiation (20–45 DAP - **Critical**)<br>3. Tuber Bulking (45–75 DAP - **Critical**)<br>4. Skin Hardening & Maturity (75–95 DAP) | Kufri Jyoti, Kufri Pukhraj, Kufri Ashoka |
| **Winter Vegetables** *(Tomato, Brinjal, Chilli, Cabbage)* | Commercial peri-urban belt supplying Dhanbad city | **Transplanting:** September 15 – November 15 | 1. Transplanting & Establishment<br>2. Vegetative Growth & Flowering<br>3. Fruit Development & Multiple Pickings | Swarna Sampatti (Tomato), Swarna Pratibha (Brinjal), Pusa Jwala (Chilli) |

### C. Zaid Season (Summer: March – June)

| Crop | Local Relevance | Typical Sowing | Growth Stages | Primary Varieties |
| :--- | :--- | :--- | :--- | :--- |
| **Summer Moong** *(Vigna radiata)* | Catch crop following rabi harvest under irrigation | **Sowing:** March 05 – March 30 | 1. Vegetative (0–25 DAS)<br>2. Flowering & Podding (25–55 DAS)<br>3. Maturity (55–65 DAS) | SML 668, Samrat, Pusa Vishal |
| **Summer Vegetables** *(Okra, Bottle Gourd, Bitter Gourd)* | Riverbed & pond-irrigated cultivation | **Sowing:** February 20 – March 25 | 1. Vegetative vine growth<br>2. Flowering & continuous fruiting | Kashi Kranti (Okra), Pusa Naveen (Bottle Gourd) |

---

## 3. Multi-Variable Rule Base & Threshold Specifications

Every advisory rule strictly combines **two or more atmospheric variables** from Phase 3's locked forecast schema (`RAINFALL`, `TEMPERATURE`, `HUMIDITY`, `WIND_SPEED`, `EVAPOTRANSPIRATION`, plus `CONFIDENCE_PCT` / uncertainty spread).

### Rule Category 1: Crop Water Balance & Irrigation Scheduling

*Combines: `RAINFALL` + `EVAPOTRANSPIRATION`*

| Rule Code | Trigger Conditions | Agricultural Rationale | Actionable Advisory Guidance | Source Citation |
| :--- | :--- | :--- | :--- | :--- |
| **`IRR-01`** *(Irrigation Postponement / Drainage)* | Forecasted $\text{RAINFALL} \ge 15.0\text{ mm/day}$ **OR** $\text{RAINFALL} \ge (1.5 \times \text{EVAPOTRANSPIRATION})$ | Daily precipitation significantly exceeds crop evapotranspiration demand ($ET_c$). Applying additional irrigation wastes ground water and risks root asphyxiation. | **Postpone all planned irrigations.** In lowland Don paddy fields, clear peripheral field bund bundhies and open drainage outlets to evacuate standing water and prevent waterlogging. | *IMD AAS Operational Guidelines (Rulebook Section 4.2); ICAR-CRIDA Dhanbad Contingency Plan, p. 14.* |
| **`IRR-02`** *(Severe Moisture Deficit / Supplemental Irrigation)* | Forecasted $\text{RAINFALL} < 1.0\text{ mm/day}$ **AND** $\text{EVAPOTRANSPIRATION} \ge 4.5\text{ mm/day}$ for $\ge 2$ consecutive days | Cumulative atmospheric water demand ($ET_0$) depletes topsoil root-zone moisture rapidly under low humidity and moderate radiation. | **Apply supplemental light irrigation** to upland crops (maize knee-high, vegetable fruit-set, potato tuber bulking). In paddy at panicle initiation/flowering stage, maintain 3–5 cm shallow water ponding to prevent floret sterility. | *FAO Irrigation and Drainage Paper 56, Ch. 6; KVK Dhanbad Package of Practices for Field Crops, p. 28.* |
| **`IRR-03`** *(Moisture Equilibrium / Normal Maintenance)* | $1.0 \le \text{RAINFALL} < 15.0\text{ mm/day}$ **AND** $\text{RAINFALL} \approx \text{EVAPOTRANSPIRATION}$ | Natural precipitation offsets transpirational losses; soil moisture remains near field capacity. | Soil moisture balance is currently optimal. Maintain regular field inspection; no immediate irrigation intervention required. | *ICAR-CRIDA Agromet Advisory Framework, 2021.* |

---

### Rule Category 2: Thermal Heat & Moisture Stress

*Combines: `TEMPERATURE` + `HUMIDITY` (+ `EVAPOTRANSPIRATION`)*

| Rule Code | Trigger Conditions | Agricultural Rationale | Actionable Advisory Guidance | Source Citation |
| :--- | :--- | :--- | :--- | :--- |
| **`HEAT-01`** *(Severe Heat Stress / Pollen Desiccation)* | $\text{TEMPERATURE} \ge 36.0^\circ\text{C}$ **AND** $\text{HUMIDITY} \ge 60.0\%$ (Heat Index $> 42.0^\circ\text{C}$) | Synergistic high thermal load and vapor saturation impedes plant transpirational cooling, causing spikelet sterility in flowering paddy, tassel blast in maize, and flower drop in solanaceous vegetables. | **Critical heat stress warning:** Provide frequent light evening irrigations or micro-sprinkler misting to cool the microclimate canopy. In vegetable nurseries, erect green shade netting (50% shade). Ensure farm livestock have shaded shelter and electrolyte-supplemented drinking water. | *IMD Agromet Advisory Service Bulletin No. 28/2023; ICAR-IARI Division of Environmental Sciences Heat Index Advisory Matrix.* |
| **`HEAT-02`** *(Dry Heatwave / Severe Transpiration Shock)* | $\text{TEMPERATURE} \ge 38.0^\circ\text{C}$ **AND** $\text{HUMIDITY} < 30.0\%$ **AND** $\text{EVAPOTRANSPIRATION} \ge 6.0\text{ mm/day}$ | High vapor pressure deficit (VPD) forces rapid stomatal closure, leading to leaf scorching, wilting, and temporary photosynthetic cessation. | Apply paddy straw or dry grass mulching (5–7 cm thick) across vegetable rows and fruit basins to conserve soil moisture and suppress soil temperature. Restrict field manual labor between 11:30 AM and 03:30 PM. | *Birsa Agricultural University (BAU) Agro-Advisory Bulletin for South Chota Nagpur & Santhal Parganas, May 2024.* |
| **`COLD-01`** *(Cold Wave / Frost Danger - Rabi Season)* | $\text{TEMPERATURE} \le 7.0^\circ\text{C}$ **AND** $\text{HUMIDITY} \ge 85.0\%$ **AND** $\text{WIND\_SPEED} \le 1.5\text{ m/s}$ | Low nocturnal temperatures combined with calm air and high humidity induce radiation ground inversion and frost injury in potato, mustard, and tomato seedlings. | **Frost protection alert:** Irrigate fields lightly in late afternoon to increase the thermal capacity of the soil. Create smoke blankets (*thandi dhuan*) along the northern and north-western boundaries of potato and vegetable plots during night hours. | *ICAR-Central Potato Research Institute (CPRI) Frost Management Advisory; IMD GKMS Advisory for Plateau Region.* |

---

### Rule Category 3: Field Operation & Chemical Spraying Windows

*Combines: `WIND_SPEED` + `RAINFALL` (+ `TEMPERATURE`)*

| Rule Code | Trigger Conditions | Agricultural Rationale | Actionable Advisory Guidance | Source Citation |
| :--- | :--- | :--- | :--- | :--- |
| **`SPRAY-01`** *(Spraying & Top-Dressing Suspended)* | $\text{WIND\_SPEED} \ge 4.17\text{ m/s}$ (15 km/h) **OR** $\text{RAINFALL} \ge 2.5\text{ mm/day}$ | Wind speeds $>15\text{ km/h}$ induce chemical droplet drift away from target foliage onto non-target vegetation. Rainfall washes active ingredients off foliage into soil/streams within 24 hours. | **Postpone all foliar chemical applications** (insecticides, fungicides, liquid micronutrients) and broadcasting of Urea/MOP fertilizers. Chemical applications under these conditions will suffer severe washout and environmental runoff loss. | *IMD Agromet Advisory Bulletin Operational Guidelines; KVK Dhanbad Crop Protection Manual (2022), p. 41.* |
| **`SPRAY-02`** *(Optimal Chemical Application Window)* | $\text{WIND\_SPEED} < 3.0\text{ m/s}$ **AND** $\text{RAINFALL} < 1.0\text{ mm/day}$ **AND** $\text{TEMPERATURE} \le 32.0^\circ\text{C}$ | Calm air ensures precise droplet deposition; absence of rain guarantees droplet drying and cuticular absorption; moderate temperature prevents rapid droplet volatilization. | **Favorable weather window for plant protection sprays.** Carry out necessary herbicide, fungicide, and pesticide sprays during morning hours (07:00 AM – 10:30 AM) or late afternoon (03:30 PM – 05:30 PM). | *Central Insecticides Board & Registration Committee (CIBRC) Guidelines on Safe Pesticide Application.* |

---

### Rule Category 4: High-Humidity Disease Predisposition

*Combines: `HUMIDITY` + `TEMPERATURE` (+ `RAINFALL`)*

| Rule Code | Trigger Conditions | Pathogen / Disease Complex | Actionable Advisory Guidance | Source Citation |
| :--- | :--- | :--- | :--- | :--- |
| **`DIS-01`** *(Paddy Blast & Brown Spot Warning)* | $\text{HUMIDITY} \ge 85.0\%$ **AND** $22.0^\circ\text{C} \le \text{TEMPERATURE} \le 29.0^\circ\text{C}$ **AND** $\text{RAINFALL} \ge 0.5\text{ mm/day}$ | *Magnaporthe oryzae* (Blast) and *Bipolaris oryzae* (Brown Spot) spores germinate under prolonged leaf wetness ($>8\text{ hours}$) and moderate temperatures. | High microclimate predisposition for **Rice Blast**. Scout fields for spindle-shaped lesions with grey centers. If detected and spray window opens (`SPRAY-02`), apply prophylactic spray of Tricyclazole 75% WP @ 0.6 g/L or Kasugamycin 3% SL @ 2.0 mL/L water. | *ICAR-National Rice Research Institute (NRRI) Disease Forecasting Matrix; BAU Ranchi Department of Plant Pathology Bulletin.* |
| **`DIS-02`** *(Late Blight of Potato & Tomato Downy Mildew)* | $\text{HUMIDITY} \ge 90.0\%$ **AND** $12.0^\circ\text{C} \le \text{TEMPERATURE} \le 20.0^\circ\text{C}$ (Overcast / Drizzling) | *Phytophthora infestans* (Late Blight). Free moisture on foliage coupled with cool overcast conditions triggers rapid sporulation. | **Late Blight alert in Potato and Tomato:** Inspect underside of lower leaves for water-soaked lesions with white downy growth. Spray protective contact fungicide Mancozeb 75% WP @ 2.5 g/L water immediately prior to rain events. | *ICAR-CPRI Late Blight Warning Service; KVK Dhanbad Horticulture Advisory.* |
| **`DIS-03`** *(Mustard Aphid & Powdery Mildew Alert)* | $\text{HUMIDITY} \ge 75.0\%$ **AND** $18.0^\circ\text{C} \le \text{TEMPERATURE} \le 26.0^\circ\text{C}$ **AND** $\text{RAINFALL} < 1.0\text{ mm/day}$ | *Lipaphis erysimi* (Mustard Aphid) population explodes under humid, cloudy, non-rainy conditions during flowering and siliqua formation. | Scout terminal shoots and inflorescence of mustard. If aphid count exceeds Economic Threshold Level (ETL: 25–30 aphids/10 cm central twig), spray Thiamethoxam 25% WG @ 0.3 g/L or Dimethoate 30% EC @ 1.5 mL/L during calm morning hours. | *ICAR-Directorate of Rapeseed-Mustard Research (DRMR) Bharatpur; BAU GKMS Advisory for Jharkhand.* |

---

### Rule Category 5: Uncertainty & Probabilistic Guidance

*Combines: `CONFIDENCE_PCT` + Uncertainty Range Width $(\text{UPPER} - \text{LOWER})$*

| Rule Code | Trigger Conditions | Linguistic Adaptation & Operational Logic | Source Citation |
| :--- | :--- | :--- | :--- |
| **`UNC-01`** *(High Confidence / Deterministic Tone)* | $\text{CONFIDENCE\_PCT} \ge 80.0\%$ **AND** Rain Interval Spread $(\text{UPPER} - \text{LOWER}) \le 5.0\text{ mm}$ | Use **deterministic, assertive directive language**: *"Heavy rainfall of 25–30 mm is expected on [DATE]. Suspend irrigation and drain excess water."* | *WMO Guidelines on Multi-Hazard Weather-Impact Forecasting (WMO-No. 1150).* |
| **`UNC-02`** *(Moderate / Broad Spread Softened Tone)* | $\text{CONFIDENCE\_PCT} < 80.0\%$ **OR** Rain Interval Spread $(\text{UPPER} - \text{LOWER}) > 15.0\text{ mm}$ | Use **probabilistic, advisory-cautious language**: *"There is a moderate probability of isolated heavy showers. Farmers are advised to maintain drainage preparedness without undertaking irreversible field measures."* | *IMD Standard Operating Procedure for Agromet Advisory Services (2020).* |

---

## 4. Current Seasonal Context (September / October - Kharif Late Season)

At the current forecast ingestion timeline (late September / early October):
- **Paddy** is in the **Panicle Initiation to Flowering stage** (water-sensitive critical window; blast monitoring active).
- **Maize** is in the **Cob Development & Harvesting stage** (susceptible to lodging from high winds $>6\text{ m/s}$ and grain rot if heavy rain occurs during drying).
- **Vegetables (Tomato, Brinjal, Chilli)** are in **Active Vegetative & Early Fruiting stage** (susceptible to damping-off and fruit borer).
- **Early Mustard / Potato Land Preparation** is commencing on upland Tanr fields (sensitive to soil workable moisture).
