/**
 * SIH26074 - Smart Panchayat Climate & Geospatial Intelligence Platform
 * Frontend Interactive Dashboard Application Logic
 * Consumes Phase 5 FastAPI backend service (http://127.0.0.1:8000)
 */

// Auto-detect API base URL (supports port 8000 backend direct hosting or external origin)
const API_BASE = window.location.origin.includes(":8000") 
  ? window.location.origin 
  : "http://127.0.0.1:8000";

// Application State
const state = {
  panchayats: [],
  panchayatsByCode: new Map(),
  selectedGPCODE: null,
  selectedDate: null,
  availableDates: [],
  selectedLayer: "rainfall_risk",
  selectedCrop: "",
  selectedBlock: "",
  districtSummary: null,
  forecast10Days: [],
  activeMarker: null
};

// Leaflet Map & Layer References
let map = null;
let markersLayerGroup = null;
const markerMap = new Map(); // GPCODE -> L.CircleMarker

// Color Palettes for Map Thematic Layers
const PALETTES = {
  rainfall_risk: {
    "No Rain": "#94a3b8",
    "Very Light Rain": "#38bdf8",
    "Light Rain": "#0ea5e9",
    "Moderate Rain": "#2563eb",
    "Heavy Rain": "#f59e0b",
    "Very Heavy Rain": "#dc2626"
  },
  heat_stress: {
    "Normal": "#10b981",
    "Moderate Heat Stress": "#f59e0b",
    "Severe Heat Stress": "#ef4444",
    "Dry Heatwave Stress": "#b91c1c",
    "Cold / Frost Alert": "#3b82f6"
  },
  spray_window: {
    "Favorable (Morning/Evening Window)": "#10b981",
    "Caution (Marginal Conditions)": "#f59e0b",
    "Suspended (Drift/Washout Risk)": "#ef4444"
  }
};

// --------------------------------------------------------------------------
// Initialization Routine
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  setupEventListeners();
  await checkSystemStatus();
  await loadPanchayatRegistry();
  await loadDistrictSummary();
});

// --------------------------------------------------------------------------
// Leaflet GIS Map Setup
// --------------------------------------------------------------------------
function initMap() {
  // Center of Dhanbad District (approx 23.82° N, 86.38° E)
  map = L.map("gisMap", {
    center: [23.82, 86.38],
    zoom: 11,
    minZoom: 9,
    maxZoom: 16,
    zoomControl: false
  });

  // Reposition zoom control to top-left
  L.control.zoom({ position: "topleft" }).addTo(map);

  // CartoDB Positron Light Tiles (blends seamlessly with the clean white UI theme)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(map);

  markersLayerGroup = L.layerGroup().addTo(map);
}

// --------------------------------------------------------------------------
// API Calls & Data Ingestion
// --------------------------------------------------------------------------

/** Check backend health */
async function checkSystemStatus() {
  const badge = document.getElementById("systemStatusBadge");
  const text = document.getElementById("systemStatusText");
  const runTimestamp = document.getElementById("activeRunTimestamp");

  try {
    const res = await fetch(`${API_BASE}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    text.textContent = "Live API Online (Phase 5)";
    badge.className = "badge live-badge";
    if (data.forecast_status) {
      runTimestamp.textContent = data.forecast_status.replace("Online (Latest snapshot: ", "").replace(".parquet)", "");
    }
  } catch (err) {
    console.error("Backend health check failed:", err);
    text.textContent = "API Offline (127.0.0.1:8000)";
    badge.className = "badge neutral-badge";
  }
}

/** Load all 239 Gram Panchayats */
async function loadPanchayatRegistry() {
  try {
    const res = await fetch(`${API_BASE}/panchayats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.panchayats = data.panchayats;
    state.panchayats.forEach(p => state.panchayatsByCode.set(p.gpcode, p));
    console.log(`Loaded ${state.panchayats.length} Panchayats.`);
  } catch (err) {
    console.error("Failed to load Panchayats registry:", err);
  }
}

/** Load District Risk Summary for current date */
async function loadDistrictSummary(targetDate = null) {
  try {
    const url = targetDate 
      ? `${API_BASE}/forecast/district-summary?date=${targetDate}`
      : `${API_BASE}/forecast/district-summary`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.districtSummary = data;
    state.selectedDate = data.date;

    // Populate available dates if first run
    if (state.availableDates.length === 0) {
      await fetchAvailableDates();
    }

    updateKpiBanner(data);
    renderPanchayatMarkers(data.panchayat_risk_assessments);
    updateLegend();

    // If a Panchayat is already selected, refresh its side panel for the new date
    if (state.selectedGPCODE) {
      loadPanchayatDetail(state.selectedGPCODE);
    }
  } catch (err) {
    console.error("Failed to load district summary:", err);
  }
}

/** Retrieve all dates available in forecast horizon */
async function fetchAvailableDates() {
  if (state.panchayats.length === 0) return;
  const sampleCode = state.panchayats[0].gpcode;
  try {
    const res = await fetch(`${API_BASE}/forecast/${sampleCode}`);
    if (!res.ok) return;
    const data = await res.json();
    state.availableDates = data.forecasts.map(f => f.date);
    
    // Populate date dropdown
    const dateSelect = document.getElementById("dateSelect");
    dateSelect.innerHTML = "";
    state.availableDates.forEach((d, idx) => {
      const opt = document.createElement("option");
      opt.value = d;
      const label = idx === 0 ? `${d} (Today / Day 1)` : `${d} (+${idx}d)`;
      opt.textContent = label;
      if (d === state.selectedDate) opt.selected = true;
      dateSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to fetch available dates:", err);
  }
}

/** Load individual Panchayat forecast & advisory */
async function loadPanchayatDetail(gpcode) {
  state.selectedGPCODE = gpcode;
  const pInfo = state.panchayatsByCode.get(gpcode);
  if (!pInfo) return;

  // Show sidebar content and hide placeholder
  document.getElementById("sidebarPlaceholder").classList.add("hidden");
  document.getElementById("sidebarContent").classList.remove("hidden");

  // Populate static header
  document.getElementById("pName").textContent = pInfo.gpname;
  document.getElementById("pBlock").textContent = `${pInfo.block} Block`;
  document.getElementById("pMeta").textContent = `LGD GPCODE: ${pInfo.gpcode} • Lat: ${pInfo.latitude}, Lon: ${pInfo.longitude}`;
  document.getElementById("pElevation").textContent = `${pInfo.elevation_m} m`;
  document.getElementById("pSlope").textContent = `${pInfo.slope_deg}°`;
  document.getElementById("pLandcover").textContent = pInfo.landcover_name;
  document.getElementById("pForecastDate").textContent = state.selectedDate || "--";

  // Fetch 10-day forecast for this Panchayat
  try {
    const fcRes = await fetch(`${API_BASE}/forecast/${gpcode}`);
    if (fcRes.ok) {
      const fcData = await fcRes.json();
      state.forecast10Days = fcData.forecasts;
      
      // Find forecast matching current selected date
      const currentDayFc = fcData.forecasts.find(f => f.date === state.selectedDate) || fcData.forecasts[0];
      if (currentDayFc && currentDayFc.predictions) {
        renderWeatherGrid(currentDayFc.predictions);
      }
      renderTrendSparkline(fcData.forecasts);
    }
  } catch (err) {
    console.error(`Failed to load forecast for ${gpcode}:`, err);
  }

  // Fetch advisories for this Panchayat
  await loadPanchayatAdvisories(gpcode, state.selectedDate, state.selectedCrop);

  // Highlight active marker on map
  highlightMarker(gpcode);
}

/** Fetch and render crop advisories */
async function loadPanchayatAdvisories(gpcode, date, crop) {
  const container = document.getElementById("advisoriesContainer");
  container.innerHTML = '<div class="advisory-loading">Loading agro-advisories...</div>';

  try {
    let url = `${API_BASE}/advisory/${gpcode}?date=${date}`;
    if (crop) {
      url += `&crop=${encodeURIComponent(crop)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      container.innerHTML = `<div class="advisory-loading">No advisories recorded for ${date}.</div>`;
      return;
    }
    const data = await res.json();

    if (!data.advisories || data.advisories.length === 0) {
      container.innerHTML = `<div class="advisory-loading">No matching advisories found for selected filter.</div>`;
      return;
    }

    container.innerHTML = "";
    data.advisories.forEach(adv => {
      const card = createAdvisoryCard(adv);
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load advisories:", err);
    container.innerHTML = '<div class="advisory-loading">Error loading advisory service.</div>';
  }
}

// --------------------------------------------------------------------------
// UI Rendering Functions
// --------------------------------------------------------------------------

/** Render 5-variable weather grid */
function renderWeatherGrid(preds) {
  // Rainfall
  if (preds.RAINFALL) {
    document.getElementById("valRain").textContent = preds.RAINFALL.predicted_value.toFixed(1);
    document.getElementById("ciRain").textContent = `${preds.RAINFALL.uncertainty_lower.toFixed(1)} – ${preds.RAINFALL.uncertainty_upper.toFixed(1)} mm`;
  }
  // Temperature
  if (preds.TEMPERATURE) {
    document.getElementById("valTemp").textContent = preds.TEMPERATURE.predicted_value.toFixed(1);
    document.getElementById("ciTemp").textContent = `${preds.TEMPERATURE.uncertainty_lower.toFixed(1)} – ${preds.TEMPERATURE.uncertainty_upper.toFixed(1)} °C`;
  }
  // Humidity
  if (preds.HUMIDITY) {
    document.getElementById("valHum").textContent = preds.HUMIDITY.predicted_value.toFixed(1);
    document.getElementById("ciHum").textContent = `${preds.HUMIDITY.uncertainty_lower.toFixed(1)} – ${preds.HUMIDITY.uncertainty_upper.toFixed(1)} %`;
  }
  // Wind Speed
  if (preds.WIND_SPEED) {
    document.getElementById("valWind").textContent = preds.WIND_SPEED.predicted_value.toFixed(1);
    document.getElementById("ciWind").textContent = `${preds.WIND_SPEED.uncertainty_lower.toFixed(1)} – ${preds.WIND_SPEED.uncertainty_upper.toFixed(1)} m/s`;
  }
  // Evapotranspiration
  if (preds.EVAPOTRANSPIRATION) {
    document.getElementById("valET").textContent = preds.EVAPOTRANSPIRATION.predicted_value.toFixed(1);
    document.getElementById("ciET").textContent = `${preds.EVAPOTRANSPIRATION.uncertainty_lower.toFixed(1)} – ${preds.EVAPOTRANSPIRATION.uncertainty_upper.toFixed(1)} mm/day`;
  }
}

/** Render 10-day rainfall sparkline */
function renderTrendSparkline(forecasts) {
  const wrap = document.getElementById("trendBarsWrap");
  wrap.innerHTML = "";

  const rainValues = forecasts.map(f => f.predictions?.RAINFALL?.predicted_value || 0.0);
  const maxRain = Math.max(...rainValues, 10.0);

  forecasts.forEach(f => {
    const rain = f.predictions?.RAINFALL?.predicted_value || 0.0;
    const heightPct = Math.max(8, Math.min(100, (rain / maxRain) * 100));
    const dayLabel = f.date.split("-").slice(1).join("/");

    const col = document.createElement("div");
    col.className = "trend-bar-col";
    if (f.date === state.selectedDate) {
      col.classList.add("trend-bar-active");
    }

    col.title = `${f.date}: ${rain.toFixed(1)} mm`;
    col.innerHTML = `
      <div class="trend-bar-fill" style="height: ${heightPct}%;"></div>
      <span class="trend-bar-date">${dayLabel}</span>
    `;

    // Click bar to jump to that forecast date
    col.addEventListener("click", () => {
      document.getElementById("dateSelect").value = f.date;
      onDateChange(f.date);
    });

    wrap.appendChild(col);
  });
}

/** Create Advisory Card element */
function createAdvisoryCard(adv) {
  const card = document.createElement("div");
  card.className = "advisory-card";

  // Determine badge style
  let badgeClass = "badge-irrigation";
  let badgeLabel = "Water Balance";
  if (adv.triggering_variables.includes("WIND")) {
    badgeClass = "badge-spray";
    badgeLabel = "Spray Window";
  } else if (adv.triggering_variables.includes("TEMPERATURE") && !adv.triggering_variables.includes("HUMIDITY")) {
    badgeClass = "badge-heat";
    badgeLabel = "Thermal";
  } else if (adv.triggering_variables.includes("HUMIDITY") && adv.triggering_variables.includes("TEMPERATURE")) {
    badgeClass = "badge-disease";
    badgeLabel = "Disease Alert";
  }

  card.innerHTML = `
    <div class="advisory-card-header">
      <span class="crop-name">${escapeHtml(adv.crop)}</span>
      <span class="advisory-category-badge ${badgeClass}">${badgeLabel}</span>
    </div>
    <div class="advisory-body">${escapeHtml(adv.advisory_text)}</div>
    <div class="advisory-footer">
      <span>Triggers:</span>
      <span class="trigger-tag">${escapeHtml(adv.triggering_variables)}</span>
    </div>
  `;
  return card;
}

/** Update top KPI summary cards */
function updateKpiBanner(data) {
  const rainSum = data.rainfall_summary;
  document.getElementById("kpiAvgRain").textContent = `${rainSum.mean_mm.toFixed(1)} mm`;
  document.getElementById("kpiRainSpread").textContent = `Min: ${rainSum.min_mm} / Max: ${rainSum.max_mm} mm`;
  document.getElementById("kpiHeavyRainCount").textContent = `${rainSum.panchayats_heavy_rain} / ${data.total_panchayats}`;

  // Compute average temperature from items
  const items = data.panchayat_risk_assessments;
  if (items.length > 0) {
    const avgT = items.reduce((acc, i) => acc + i.temperature_c, 0) / items.length;
    document.getElementById("kpiAvgTemp").textContent = `${avgT.toFixed(1)} °C`;
    
    // Check spray window counts
    const favorableCount = items.filter(i => i.spray_window_status.includes("Favorable")).length;
    const suspendedCount = items.filter(i => i.spray_window_status.includes("Suspended")).length;
    
    if (suspendedCount > items.length * 0.5) {
      document.getElementById("kpiSprayStatus").textContent = "Mostly Suspended";
      document.getElementById("kpiSprayStatus").style.color = "#ef4444";
    } else if (favorableCount > items.length * 0.5) {
      document.getElementById("kpiSprayStatus").textContent = "Favorable Window";
      document.getElementById("kpiSprayStatus").style.color = "#10b981";
    } else {
      document.getElementById("kpiSprayStatus").textContent = "Caution / Mixed";
      document.getElementById("kpiSprayStatus").style.color = "#f59e0b";
    }
  }
}

// --------------------------------------------------------------------------
// Leaflet Thematic Circle Markers
// --------------------------------------------------------------------------

/** Render or update 239 circle markers */
function renderPanchayatMarkers(assessments) {
  markersLayerGroup.clearLayers();
  markerMap.clear();

  const layer = state.selectedLayer;

  assessments.forEach(item => {
    // Block filter check
    if (state.selectedBlock && item.block !== state.selectedBlock) {
      return;
    }

    const color = getMarkerColor(item, layer);

    const marker = L.circleMarker([item.latitude, item.longitude], {
      radius: 6,
      fillColor: color,
      color: "#ffffff",
      weight: 1.5,
      opacity: 1.0,
      fillOpacity: 0.88
    });

    // Tooltip popup on hover
    const tooltipContent = `
      <div style="font-size: 12px; font-weight: 600; color: #0f172a;">${item.panchayat}</div>
      <div style="font-size: 11px; color: #64748b;">${item.block} Block • LGD: ${item.gpcode}</div>
      <div style="font-size: 11px; color: #2563eb; margin-top: 3px;">
        <strong>Rainfall:</strong> ${item.rainfall_mm} mm (${item.rainfall_risk_level})<br>
        <strong>Temp:</strong> ${item.temperature_c} °C | <strong>Wind:</strong> ${item.wind_speed_ms} m/s
      </div>
    `;
    marker.bindTooltip(tooltipContent, { direction: "top", offset: [0, -5] });

    // Click handler to open detail side panel
    marker.on("click", () => {
      loadPanchayatDetail(item.gpcode);
    });

    marker.addTo(markersLayerGroup);
    markerMap.set(item.gpcode, marker);
  });
}

/** Determines marker color based on selected theme layer */
function getMarkerColor(item, layer) {
  if (layer === "rainfall_risk") {
    return PALETTES.rainfall_risk[item.rainfall_risk_level] || "#94a3b8";
  } else if (layer === "rainfall_mm") {
    const r = item.rainfall_mm;
    if (r < 1.0) return "#94a3b8";
    if (r < 10.0) return "#38bdf8";
    if (r < 25.0) return "#2563eb";
    if (r < 45.0) return "#f59e0b";
    return "#dc2626";
  } else if (layer === "temperature") {
    const t = item.temperature_c;
    if (t < 20.0) return "#38bdf8";
    if (t < 28.0) return "#10b981";
    if (t < 35.0) return "#f59e0b";
    return "#ef4444";
  } else if (layer === "heat_stress") {
    return PALETTES.heat_stress[item.heat_stress_level] || "#10b981";
  } else if (layer === "spray_window") {
    return PALETTES.spray_window[item.spray_window_status] || "#f59e0b";
  } else if (layer === "wind_speed") {
    return item.wind_speed_ms >= 4.17 ? "#ef4444" : (item.wind_speed_ms >= 3.0 ? "#f59e0b" : "#10b981");
  } else if (layer === "et") {
    return item.evapotranspiration_mm >= 4.5 ? "#ea580c" : (item.evapotranspiration_mm >= 3.0 ? "#3b82f6" : "#0284c7");
  }
  return "#2563eb";
}

/** Highlights selected marker and zooms */
function highlightMarker(gpcode) {
  if (state.activeMarker) {
    state.activeMarker.setRadius(6);
    state.activeMarker.setStyle({ weight: 1.5 });
  }

  const m = markerMap.get(gpcode);
  if (m) {
    m.setRadius(10);
    m.setStyle({ weight: 3, color: "#0f172a" });
    m.bringToFront();
    state.activeMarker = m;
    map.panTo(m.getLatLng(), { animate: true, duration: 0.5 });
  }
}

/** Updates Map Legend display */
function updateLegend() {
  const title = document.getElementById("legendTitle");
  const items = document.getElementById("legendItems");
  items.innerHTML = "";

  const layer = state.selectedLayer;

  if (layer === "rainfall_risk") {
    title.textContent = "Rainfall Risk Level";
    Object.entries(PALETTES.rainfall_risk).forEach(([name, color]) => {
      items.innerHTML += `
        <div class="legend-row">
          <div class="legend-swatch" style="background-color: ${color};"></div>
          <span>${name}</span>
        </div>
      `;
    });
  } else if (layer === "heat_stress") {
    title.textContent = "Heat Stress Index";
    Object.entries(PALETTES.heat_stress).forEach(([name, color]) => {
      items.innerHTML += `
        <div class="legend-row">
          <div class="legend-swatch" style="background-color: ${color};"></div>
          <span>${name}</span>
        </div>
      `;
    });
  } else if (layer === "spray_window") {
    title.textContent = "Chemical Spray Window";
    Object.entries(PALETTES.spray_window).forEach(([name, color]) => {
      items.innerHTML += `
        <div class="legend-row">
          <div class="legend-swatch" style="background-color: ${color};"></div>
          <span>${name}</span>
        </div>
      `;
    });
  } else if (layer === "rainfall_mm") {
    title.textContent = "Rainfall Volume (mm)";
    const bins = [
      { name: "0 – 1 mm", color: "#94a3b8" },
      { name: "1 – 10 mm", color: "#38bdf8" },
      { name: "10 – 25 mm", color: "#2563eb" },
      { name: "25 – 45 mm", color: "#f59e0b" },
      { name: "> 45 mm", color: "#dc2626" }
    ];
    bins.forEach(b => {
      items.innerHTML += `
        <div class="legend-row">
          <div class="legend-swatch" style="background-color: ${b.color};"></div>
          <span>${b.name}</span>
        </div>
      `;
    });
  } else {
    title.textContent = "Relative Scale";
    items.innerHTML = `
      <div class="legend-row"><div class="legend-swatch" style="background-color: #10b981;"></div><span>Low / Favorable</span></div>
      <div class="legend-row"><div class="legend-swatch" style="background-color: #f59e0b;"></div><span>Moderate</span></div>
      <div class="legend-row"><div class="legend-swatch" style="background-color: #ef4444;"></div><span>Elevated / Hazard</span></div>
    `;
  }
}

// --------------------------------------------------------------------------
// Event Listeners & Interaction
// --------------------------------------------------------------------------
function setupEventListeners() {
  // Date Selector Change
  document.getElementById("dateSelect").addEventListener("change", (e) => {
    onDateChange(e.target.value);
  });

  // Layer Selector Change
  document.getElementById("layerSelect").addEventListener("change", (e) => {
    state.selectedLayer = e.target.value;
    if (state.districtSummary) {
      renderPanchayatMarkers(state.districtSummary.panchayat_risk_assessments);
      updateLegend();
    }
  });

  // Crop Selector Change
  document.getElementById("cropSelect").addEventListener("change", (e) => {
    state.selectedCrop = e.target.value;
    if (state.selectedGPCODE) {
      loadPanchayatAdvisories(state.selectedGPCODE, state.selectedDate, state.selectedCrop);
    }
  });

  // Block Filter Change
  document.getElementById("blockSelect").addEventListener("change", (e) => {
    state.selectedBlock = e.target.value;
    if (state.districtSummary) {
      renderPanchayatMarkers(state.districtSummary.panchayat_risk_assessments);
      fitDistrictBounds();
    }
  });

  // Search Input Typeahead
  const searchInput = document.getElementById("searchPanchayat");
  const searchDropdown = document.getElementById("searchResultsDropdown");

  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (q.length < 1) {
      searchDropdown.classList.add("hidden");
      return;
    }

    const matches = state.panchayats.filter(p => 
      p.gpname.toLowerCase().includes(q) || String(p.gpcode).includes(q)
    ).slice(0, 8);

    if (matches.length === 0) {
      searchDropdown.innerHTML = '<div class="search-dropdown-item">No matching Panchayats</div>';
    } else {
      searchDropdown.innerHTML = matches.map(p => `
        <div class="search-dropdown-item" data-gpcode="${p.gpcode}">
          <strong>${p.gpname}</strong>
          <span style="color: #64748b;">${p.block} (${p.gpcode})</span>
        </div>
      `).join("");

      searchDropdown.querySelectorAll(".search-dropdown-item").forEach(item => {
        item.addEventListener("click", () => {
          const code = parseInt(item.getAttribute("data-gpcode"), 10);
          searchInput.value = item.querySelector("strong").textContent;
          searchDropdown.classList.add("hidden");
          loadPanchayatDetail(code);
        });
      });
    }
    searchDropdown.classList.remove("hidden");
  });

  // Close search dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-group")) {
      searchDropdown.classList.add("hidden");
    }
  });

  // Reset View & Fit District Buttons
  document.getElementById("btnResetView").addEventListener("click", () => {
    map.setView([23.82, 86.38], 11);
  });

  document.getElementById("btnFitBounds").addEventListener("click", () => {
    fitDistrictBounds();
  });

  // Close Sidebar Button
  document.getElementById("btnCloseSidebar").addEventListener("click", () => {
    document.getElementById("sidebarContent").classList.add("hidden");
    document.getElementById("sidebarPlaceholder").classList.remove("hidden");
    state.selectedGPCODE = null;
    if (state.activeMarker) {
      state.activeMarker.setRadius(6);
      state.activeMarker.setStyle({ weight: 1.5 });
      state.activeMarker = null;
    }
  });

  // Sample Panchayat Button
  document.getElementById("btnSelectSamplePanchayat").addEventListener("click", () => {
    loadPanchayatDetail(111722); // BAGDAHA
  });

  // Copy Advisory Button
  document.getElementById("btnCopyAdvisory").addEventListener("click", () => {
    const textCards = Array.from(document.querySelectorAll(".advisory-card")).map(c => {
      const crop = c.querySelector(".crop-name").textContent;
      const text = c.querySelector(".advisory-body").textContent;
      return `[${crop}]\n${text}`;
    }).join("\n\n");

    if (textCards) {
      navigator.clipboard.writeText(textCards).then(() => {
        alert("Advisory bulletin copied to clipboard!");
      });
    }
  });
}

function onDateChange(newDate) {
  state.selectedDate = newDate;
  loadDistrictSummary(newDate);
}

function fitDistrictBounds() {
  const visibleMarkers = Array.from(markerMap.values());
  if (visibleMarkers.length > 0) {
    const group = L.featureGroup(visibleMarkers);
    map.fitBounds(group.getBounds().pad(0.08));
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
