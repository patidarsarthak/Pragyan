/**
 * Pragyan Robust API Client
 * Connects to live FastAPI backend with automatic daily snapshot fallback.
 */

import snapshotData from "../data/snapshot_daily.json";
import type {
  SystemHealth,
  StateItem,
  DistrictItem,
  BlockItem,
  PanchayatListItem,
  PanchayatWeatherResponse,
  WaterBalanceResponse,
  PanchayatAdvisoryResponse,
  PanchayatAlertItem,
  BaselineComparisonRecord,
  StationValidationRecord,
  ReplayEventItem,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");
const REQUEST_TIMEOUT_MS = 2500;

export interface SnapshotMeta {
  isSnapshot: boolean;
  source: string;
  vintage: string;
  asOf: string;
}

export let currentSnapshotState: SnapshotMeta = {
  isSnapshot: false,
  source: "Live FastAPI Backend (http://127.0.0.1:8000)",
  vintage: "ECMWF IFS 0.25° NWP Forcing",
  asOf: new Date().toISOString(),
};

async function fetchWithTimeout(url: string, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function fetchHealth(): Promise<SystemHealth> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/health`, 1500);
    if (res.ok) {
      currentSnapshotState.isSnapshot = false;
      return await res.json();
    }
  } catch {
    // Fallback
  }
  currentSnapshotState.isSnapshot = true;
  currentSnapshotState.source = snapshotData.meta.source;
  currentSnapshotState.vintage = snapshotData.meta.vintage;
  return {
    status: "ok",
    database: "connected",
    spatial_index: {
      total_panchayats_indexed: snapshotData.meta.total_gps,
      pilot_district_code: 336,
      status: "ready",
    },
    version: "3.0.0 (Snapshot)",
    timestamp: snapshotData.meta.generated_at,
  };
}

export async function fetchStates(): Promise<StateItem[]> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/states`);
    if (res.ok) return await res.json();
  } catch {}
  return [
    { state_code: 20, state_name: "Jharkhand", state_type: "State", is_pilot: true, centroid_lat: 23.61, centroid_lon: 85.27 },
    { state_code: 23, state_name: "Madhya Pradesh", state_type: "State", is_pilot: false, centroid_lat: 22.97, centroid_lon: 78.65 },
    { state_code: 9, state_name: "Uttar Pradesh", state_type: "State", is_pilot: false, centroid_lat: 26.84, centroid_lon: 80.94 },
    { state_code: 8, state_name: "Rajasthan", state_type: "State", is_pilot: false, centroid_lat: 27.02, centroid_lon: 74.21 },
    { state_code: 7, state_name: "Delhi", state_type: "UT", is_pilot: false, centroid_lat: 28.70, centroid_lon: 77.10 },
  ];
}

export async function fetchDistricts(stateId: number = 20): Promise<DistrictItem[]> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/states/${stateId}/districts`);
    if (res.ok) return await res.json();
  } catch {}
  return [
    { district_code: 336, district_name: "Dhanbad", state_code: 20, is_pilot: true, total_blocks: 10, total_gps: 239, centroid_lat: 23.795, centroid_lon: 86.430 },
    { district_code: 337, district_name: "Bokaro", state_code: 20, is_pilot: false, total_blocks: 9, total_gps: 200, centroid_lat: 23.669, centroid_lon: 86.151 },
    { district_code: 338, district_name: "Ranchi", state_code: 20, is_pilot: false, total_blocks: 18, total_gps: 305, centroid_lat: 23.344, centroid_lon: 85.309 },
  ];
}

export async function fetchBlocks(districtId: number = 336): Promise<BlockItem[]> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/districts/${districtId}/blocks`);
    if (res.ok) return await res.json();
  } catch {}
  return [
    { block_code: 2354, block_name: "Baghmara", district_code: 336, state_code: 20, area_sq_km: 260.4, centroid_lat: 23.805, centroid_lon: 86.208 },
    { block_code: 2355, block_name: "Baliapur", district_code: 336, state_code: 20, area_sq_km: 195.2, centroid_lat: 23.736, centroid_lon: 86.535 },
    { block_code: 2356, block_name: "Dhanbad", district_code: 336, state_code: 20, area_sq_km: 165.8, centroid_lat: 23.795, centroid_lon: 86.430 },
    { block_code: 2357, block_name: "Govindpur", district_code: 336, state_code: 20, area_sq_km: 310.5, centroid_lat: 23.835, centroid_lon: 86.520 },
    { block_code: 2358, block_name: "Jharia", district_code: 336, state_code: 20, area_sq_km: 125.0, centroid_lat: 23.742, centroid_lon: 86.415 },
    { block_code: 2359, block_name: "Nirsa", district_code: 336, state_code: 20, area_sq_km: 290.1, centroid_lat: 23.785, centroid_lon: 86.715 },
    { block_code: 2360, block_name: "Purvi Tundi", district_code: 336, state_code: 20, area_sq_km: 180.2, centroid_lat: 23.955, centroid_lon: 86.480 },
    { block_code: 2361, block_name: "Topchanchi", district_code: 336, state_code: 20, area_sq_km: 220.8, centroid_lat: 23.905, centroid_lon: 86.205 },
    { block_code: 2362, block_name: "Tundi", district_code: 336, state_code: 20, area_sq_km: 255.4, centroid_lat: 23.990, centroid_lon: 86.350 },
    { block_code: 2364, block_name: "Kaliasol", district_code: 336, state_code: 20, area_sq_km: 155.0, centroid_lat: 23.715, centroid_lon: 86.680 },
  ];
}

export async function fetchPanchayatMapPolygons(): Promise<any> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/map/panchayats`, 3500);
    if (res.ok) return await res.json();
  } catch {}
  return (snapshotData as any).dhanbad_panchayats_geojson;
}

export async function fetchForecastFrames(days: number = 10): Promise<any> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/map/forecast-frames?days=${days}`);
    if (res.ok) return await res.json();
  } catch {}
  return (snapshotData as any).forecast_frames;
}

export async function fetchPanchayatWeather(gpCode: number): Promise<PanchayatWeatherResponse> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/panchayats/${gpCode}/weather`);
    if (res.ok) {
      const data = await res.json();
      return {
        gp_code: data.gp_code || data.gpcode || gpCode,
        panchayat_name: data.panchayat_name || data.panchayat || `Panchayat ${gpCode}`,
        block_name: data.block_name || data.block || "Dhanbad Block",
        district_name: data.district_name || data.district || "Dhanbad",
        elevation_m: data.elevation_m || 220,
        run_timestamp: data.run_timestamp || new Date().toISOString(),
        current_conditions: {
          temperature_c: data.current_conditions?.temperature_c ?? 28.4,
          rainfall_mm: data.current_conditions?.rainfall_mm ?? 14.2,
          humidity_pct: data.current_conditions?.humidity_pct ?? 82,
          wind_speed_ms: data.current_conditions?.wind_speed_ms ?? 3.4,
          wind_speed_kmh: data.current_conditions?.wind_speed_kmh ?? 12.2,
          et0_mm: data.current_conditions?.et0_mm ?? 3.8,
          source: "MODEL_GENERATED",
        },
        daily_forecasts: (data.daily_forecasts || []).map((d: any, idx: number) => ({
          date: d.date || `2024-09-${15 + idx}`,
          lead_day: d.lead_day || idx + 1,
          downscaled: {
            rainfall_mm: d.downscaled?.rainfall_mm ?? (d.rainfall_mm || 0),
            temp_max_c: d.downscaled?.temp_max_c ?? (d.temp_max_c || 31),
            temp_min_c: d.downscaled?.temp_min_c ?? (d.temp_min_c || 24),
            humidity_pct: d.downscaled?.humidity_pct ?? (d.humidity_pct || 78),
            wind_speed_kmh: d.downscaled?.wind_speed_kmh ?? (d.wind_speed_kmh || 12),
            et0_mm: d.downscaled?.et0_mm ?? (d.et0_mm || 3.8),
          },
          uncertainty_80ci: {
            rain_p10: d.uncertainty_80ci?.rain_p10 ?? Math.max(0, (d.rainfall_mm || 0) * 0.7),
            rain_p90: d.uncertainty_80ci?.rain_p90 ?? (d.rainfall_mm || 0) * 1.35 + 1.2,
            temp_p10: d.uncertainty_80ci?.temp_p10 ?? 23,
            temp_p90: d.uncertainty_80ci?.temp_p90 ?? 32,
          },
          coarse_nwp_comparison: {
            rainfall_mm: d.coarse_nwp_comparison?.rainfall_mm ?? 18.0,
            temp_max_c: d.coarse_nwp_comparison?.temp_max_c ?? 32.5,
            humidity_pct: d.coarse_nwp_comparison?.humidity_pct ?? 75,
            provider: "ECMWF_ERA5_0.25",
          },
          confidence_score: d.confidence_score ?? null,
          is_high_uncertainty: d.is_high_uncertainty ?? false,
        })),
        as_of: data.as_of || "2024-09-15T00:00:00Z",
        is_snapshot: false,
      };
    }
  } catch {}

  // Snapshot fallback
  const s = (snapshotData as any).sample_panchayat_weather;
  return {
    gp_code: gpCode,
    panchayat_name: s?.panchayat || `Panchayat ${gpCode}`,
    block_name: s?.block || "Topchanchi",
    district_name: "Dhanbad",
    elevation_m: 245,
    run_timestamp: snapshotData.meta.generated_at,
    current_conditions: {
      temperature_c: 27.8,
      rainfall_mm: 18.4,
      humidity_pct: 84,
      wind_speed_ms: 3.5,
      wind_speed_kmh: 12.6,
      et0_mm: 3.65,
      source: "MODEL_GENERATED",
    },
    daily_forecasts: (s?.forecasts || []).map((f: any, idx: number) => {
      const p = f.predictions || {};
      const r = p.RAINFALL?.predicted_value || 12.0;
      return {
        date: f.date,
        lead_day: idx + 1,
        downscaled: {
          rainfall_mm: r,
          temp_max_c: p.TEMPERATURE?.predicted_value || 30.5,
          temp_min_c: (p.TEMPERATURE?.predicted_value || 30.5) - 6.5,
          humidity_pct: p.HUMIDITY?.predicted_value || 80,
          wind_speed_kmh: Math.round((p.WIND_SPEED?.predicted_value || 3.2) * 3.6),
          et0_mm: p.EVAPOTRANSPIRATION?.predicted_value || 3.8,
        },
        uncertainty_80ci: {
          rain_p10: p.RAINFALL?.uncertainty_lower || Math.max(0, r * 0.7),
          rain_p90: p.RAINFALL?.uncertainty_upper || r * 1.35 + 1.5,
          temp_p10: p.TEMPERATURE?.uncertainty_lower || 24,
          temp_p90: p.TEMPERATURE?.uncertainty_upper || 33,
        },
        coarse_nwp_comparison: {
          rainfall_mm: r * 1.25 + 0.8,
          temp_max_c: 32.0,
          humidity_pct: 76,
          provider: "ECMWF_ERA5_0.25",
        },
        confidence_score: null,
        is_high_uncertainty: idx > 6,
      };
    }),
    as_of: snapshotData.meta.generated_at,
    is_snapshot: true,
  };
}

export async function fetchPanchayatWaterBalance(gpCode: number): Promise<WaterBalanceResponse> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/panchayats/${gpCode}/water-balance`);
    if (res.ok) {
      const data = await res.json();
      return { ...data, is_snapshot: false };
    }
  } catch {}

  const s = (snapshotData as any).sample_panchayat_water_balance;
  return {
    gp_code: gpCode,
    panchayat_name: s?.panchayat_name || `Panchayat ${gpCode}`,
    block_name: s?.block_name || "Topchanchi",
    soil_type: s?.soil_type || "Deep Black Vertisol (Clay 48%, Organic C 0.58%)",
    crop_profile: s?.crop_profile || "Paddy (Rice) - Panicle Initiation Phase (Kc = 1.15)",
    root_zone_depth_cm: 60,
    soil_water_parameters: s?.soil_water_parameters || {
      field_capacity_mm: 140.0,
      wilting_point_mm: 65.0,
      total_available_water_mm: 75.0,
      readily_available_water_mm: 37.5,
    },
    prescriptive_irrigation_advisory: s?.prescriptive_irrigation_advisory || {
      irrigation_urgency: "Postpone",
      next_irrigation_lead_days: 4,
      prescribed_water_depth_mm: 18.0,
      irrigation_method_recommended: "Furrow / Check Basin with open drainage exits",
      justification: "Expected rainfall and soil reserve satisfy root-zone demand for next 4 days.",
    },
    ten_day_water_budget: s?.ten_day_water_budget || [],
    physics_formulation: "FAO-56 Penman-Monteith Combination Equation with Aerodynamic and Surface Resistance.",
    is_snapshot: true,
  };
}

export async function fetchPanchayatAdvisory(gpCode: number): Promise<PanchayatAdvisoryResponse> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/panchayats/${gpCode}/advisory`);
    if (res.ok) {
      const data = await res.json();
      return {
        gp_code: gpCode,
        panchayat_name: data.panchayat || data.panchayat_name || `Panchayat ${gpCode}`,
        block_name: data.block || data.block_name || "Topchanchi",
        date: data.date || "2024-09-15",
        actions: (data.advisories || data.actions || []).map((a: any) => ({
          action: a.action || a.advisory_text?.split(":")[0] || "Monitor Soil Moisture",
          why: a.why || a.triggering_variables || "Active monsoon rainband transition.",
          timing: a.timing || "Next 24 to 48 hours",
          confidence: a.confidence || "High",
        })),
        verification_status: "NOT_YET_MEASURED",
        is_snapshot: false,
      };
    }
  } catch {}

  const s = (snapshotData as any).sample_panchayat_advisory;
  return {
    gp_code: gpCode,
    panchayat_name: s?.panchayat || "Topchanchi",
    block_name: s?.block || "Topchanchi",
    date: "2024-09-15",
    actions: (s?.advisories || []).map((a: any) => ({
      action: a.advisory_text?.split(".")[0] || "Withhold Chemical Foliar Spray",
      why: a.triggering_variables || "Rainfall expected > 15 mm with gusty wind.",
      timing: "Next 24 to 36 hours",
      confidence: "High",
    })),
    verification_status: "NOT_YET_MEASURED",
    is_snapshot: true,
  };
}

export async function fetchPanchayatAlerts(gpCode: number): Promise<PanchayatAlertItem[]> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/panchayats/${gpCode}/alerts`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data.alerts && Array.isArray(data.alerts)) return data.alerts;
    }
  } catch {}

  const s = (snapshotData as any).sample_panchayat_alerts;
  if (s && Array.isArray(s)) return s;
  return [
    {
      alert_id: `ALT-${gpCode}-01`,
      gp_code: gpCode,
      panchayat_name: "Topchanchi",
      block_name: "Topchanchi",
      severity: "Watch",
      hazard_type: "Heavy Rainfall",
      headline: "Moderate to Heavy Rainfall Warning",
      description: "Localized downpour expected (25–45 mm). Ensure adequate drainage in standing paddy crops.",
      effective_from: "2024-09-15T06:00:00Z",
      expires_at: "2024-09-16T18:00:00Z",
      cap_xml_url: `${BASE_URL}/panchayats/${gpCode}/cap-alert.xml`,
    },
    {
      alert_id: `ALT-${gpCode}-02`,
      gp_code: gpCode,
      panchayat_name: "Topchanchi",
      block_name: "Topchanchi",
      severity: "Advisory",
      hazard_type: "Pest/Disease",
      headline: "Foliar Blast & Sheath Rot Advisory",
      description: "High relative humidity (>85%) and cloud cover promote fungal blast. Suspend spraying until dry break.",
      effective_from: "2024-09-15T00:00:00Z",
      expires_at: "2024-09-17T00:00:00Z",
      cap_xml_url: `${BASE_URL}/panchayats/${gpCode}/cap-alert.xml`,
    },
  ];
}

export async function fetchModelMetrics(): Promise<BaselineComparisonRecord[]> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/model/metrics`);
    if (res.ok) {
      const data = await res.json();
      if (data.records && Array.isArray(data.records)) return data.records;
    }
  } catch {}
  return (snapshotData as any).baseline_comparison || [];
}

export async function fetchStationValidation(): Promise<StationValidationRecord[]> {
  const records = (snapshotData as any).station_validation || [];
  return records.map((r: any) => ({
    station_id: String(r.station_id || r["Station ID"]),
    station_name: r.name || r.station_name || r["Station Name"] || "Regional Airport",
    terrain: r.terrain_type || r.terrain || r["Terrain"] || "Plateau",
    elev_m: Number(r.elevation ?? r.elev_m ?? r["Elev (m)"] ?? 200),
    method: r.method || r["Method"] || "Joint_Ensemble_Model",
    mae_c: Number(r.mae ?? r.mae_c ?? r["MAE (°C)"] ?? 0.16),
    rmse_c: Number(r.rmse ?? r.rmse_c ?? r["RMSE (°C)"] ?? 0.20),
    bias_c: Number(r.bias ?? r.bias_c ?? r["Bias (°C)"] ?? 0.0),
    pearson_r: Number(r.pearson_r ?? r["Pearson r"] ?? 0.999),
  }));
}

export async function fetchReplayEvents(): Promise<ReplayEventItem[]> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/replay/events`);
    if (res.ok) return await res.json();
  } catch {}
  return (snapshotData as any).replay_events || [];
}

export function getCapAlertXmlUrl(gpCode: number): string {
  return `${BASE_URL}/panchayats/${gpCode}/cap-alert.xml`;
}

export async function fetchAllRegions(): Promise<import("./types").RegionsAllResponse | null> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/regions/all`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchRegionsByLeadDay(leadTimeDays: number = 1): Promise<import("./types").RegionSummary[]> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/regions?lead_time_days=${leadTimeDays}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.regions)) {
        return data.regions;
      }
    }
  } catch {}
  return [];
}

// ----------------------------------------------------------------------------
// Sanket-Style UI Adapter API Client Methods (/api/ui/*)
// ----------------------------------------------------------------------------

export async function fetchUIOverview(day: number = 1): Promise<import("./types").UIOverviewResponse | null> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/overview?day=${day}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchUIOverviewAll(): Promise<any | null> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/overview/all`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchUIHero(): Promise<import("./types").UIHeroResponse | null> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/hero`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchUIGP(lgdCode: number): Promise<import("./types").UIGPDetailResponse | null> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/gp/${lgdCode}`);
    if (res.ok) {
      const data = await res.json();
      if (!data) return null;
      const ident = data.identity || {};
      return {
        ...data,
        gp_code: Number(data.gp_code ?? ident.lgd_code ?? lgdCode),
        gp_name: String(data.gp_name ?? ident.name ?? "Panchayat"),
        block_name: String(data.block_name ?? ident.block ?? ""),
        district_name: String(data.district_name ?? ident.district ?? ""),
        state_name: String(data.state_name ?? ident.state ?? "Madhya Pradesh"),
        peak_risk: data.peak_risk || data.peak || { day: 1, score: 30, band: "calm" },
      };
    }
  } catch {}
  return null;
}

export async function fetchUITenDay(lgdCode: number): Promise<import("./types").UITenDayCompactResponse | null> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/ten-day/${lgdCode}`);
    if (res.ok) {
      const data = await res.json();
      if (!data) return null;
      const ident = data.identity || {};
      const rows = (data.rows || []).map((r: any) => ({
        day: Number(r.day ?? 1),
        date: String(r.date ?? `Day ${r.day ?? 1}`),
        rain_mm: Number(r.rain_mm ?? r.rainfall ?? 0),
        temp_max_c: Number(r.temp_max_c ?? r.temp_max ?? 30),
        temp_min_c: Number(r.temp_min_c ?? r.temp_min ?? (Number(r.temp_max ?? 30) - 7)),
        rh_pct: Number(r.rh_pct ?? r.humidity ?? 70),
        wind_kmh: Number(r.wind_kmh ?? r.wind_speed ?? 12),
        et0_mm: Number(r.et0_mm ?? r.et0 ?? 3.5),
        risk_pct: Number(r.risk_pct ?? r.risk ?? Math.min(99, Math.round(Number(r.rainfall ?? 0) * 1.8 + 10))),
        band: (r.band ?? (Number(r.rainfall ?? 0) > 30 ? "alert" : Number(r.rainfall ?? 0) > 15 ? "watch" : "calm")) as any,
      }));
      return {
        gp_code: Number(data.gp_code ?? ident.lgd_code ?? lgdCode),
        gp_name: String(data.gp_name ?? ident.name ?? "Panchayat"),
        block_name: String(data.block_name ?? ident.block ?? ""),
        district_name: String(data.district_name ?? ident.district ?? ""),
        rows,
      };
    }
  } catch {}
  return null;
}

export async function fetchUIWorst(day: number = 1, limit: number = 20): Promise<import("./types").UIWorstItem[]> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/worst?day=${day}&limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.worst_panchayats || data.items || []);
      return list.map((item: any) => ({
        gp_code: Number(item.gp_code ?? item.lgd_code ?? 0),
        gp_name: String(item.gp_name ?? item.name ?? "Panchayat"),
        block_name: String(item.block_name ?? item.block ?? ""),
        district_name: String(item.district_name ?? item.district ?? ""),
        risk_score: Number(item.risk_score ?? item.risk ?? 0),
        risk_band: (item.risk_band ?? item.band ?? "watch") as any,
        dominant_driver: String(item.dominant_driver ?? item.dominant_variable ?? "rainfall"),
      }));
    }
  } catch {}
  return [];
}

export async function fetchUIAlerts(params?: {
  day?: number;
  severity?: string;
  district_id?: number;
  page?: number;
  limit?: number;
}): Promise<any | null> {
  try {
    const q = new URLSearchParams();
    if (params?.day) q.set("day", String(params.day));
    if (params?.severity) q.set("severity", params.severity);
    if (params?.district_id) q.set("district_id", String(params.district_id));
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));

    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/alerts?${q.toString()}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchUIModel(): Promise<import("./types").UIModelResponse | null> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/model`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchUIReplayEvents(): Promise<any[]> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/replay/events`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.events || [];
    }
  } catch {}
  return [];
}

export async function fetchUIReplayDetail(eventId: string): Promise<any | null> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/replay/${eventId}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchUIScopeSummary(
  scopeType: string = "national",
  scopeId?: string | number,
  day: number = 1
): Promise<any | null> {
  try {
    const q = new URLSearchParams({ scope_type: scopeType, day: String(day) });
    if (scopeId) q.set("scope_id", String(scopeId));
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/scope/summary?${q.toString()}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchUIDistrictsTopo(): Promise<any | null> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/districts.topojson`, 5000);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function fetchUISearch(query: string): Promise<any[]> {
  try {
    if (!query || query.trim().length < 2) return [];
    const res = await fetchWithTimeout(`${BASE_URL}/api/ui/search?q=${encodeURIComponent(query.trim())}`);
    if (res.ok) {
      const data = await res.json();
      return data.results || [];
    }
  } catch {}
  return [];
}

