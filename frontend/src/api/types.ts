/**
 * Pragyan API Types & Contracts
 */

export interface SystemHealth {
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
  spatial_index: {
    total_panchayats_indexed: number;
    pilot_district_code: number;
    status: "ready" | "initializing";
  };
  version: string;
  timestamp: string;
}

export interface StateItem {
  state_code: number;
  state_name: string;
  state_type: "State" | "UT";
  is_pilot: boolean;
  centroid_lat: number | null;
  centroid_lon: number | null;
}

export interface DistrictItem {
  district_code: number;
  district_name: string;
  state_code: number;
  is_pilot: boolean;
  total_blocks: number;
  total_gps: number;
  centroid_lat: number | null;
  centroid_lon: number | null;
}

export interface BlockItem {
  block_code: number;
  block_name: string;
  district_code: number;
  state_code: number;
  area_sq_km: number | null;
  centroid_lat: number | null;
  centroid_lon: number | null;
}

export interface PanchayatListItem {
  gp_code: number;
  gp_name: string;
  block_name: string;
  district_name: string;
  state_name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  slope_deg: number;
  landcover_class: number;
  landcover_name: string;
}

export interface DailyForecastItem {
  date: string;
  lead_day: number;
  downscaled: {
    rainfall_mm: number;
    temp_max_c: number;
    temp_min_c: number;
    humidity_pct: number;
    wind_speed_kmh: number;
    et0_mm: number;
  };
  uncertainty_80ci: {
    rain_p10: number;
    rain_p90: number;
    temp_p10: number;
    temp_p90: number;
  };
  coarse_nwp_comparison: {
    rainfall_mm: number;
    temp_max_c: number;
    humidity_pct: number;
    provider: string;
  };
  confidence_score: number | null;
  is_high_uncertainty: boolean;
}

export interface PanchayatWeatherResponse {
  gp_code: number;
  panchayat_name: string;
  block_name: string;
  district_name: string;
  elevation_m: number;
  run_timestamp: string;
  current_conditions: {
    temperature_c: number;
    rainfall_mm: number;
    humidity_pct: number;
    wind_speed_ms: number;
    wind_speed_kmh: number;
    et0_mm: number;
    source: string;
  };
  daily_forecasts: DailyForecastItem[];
  as_of: string;
  is_snapshot?: boolean;
}

export interface WaterBalanceResponse {
  gp_code: number;
  panchayat_name: string;
  block_name: string;
  soil_type: string;
  crop_profile: string;
  root_zone_depth_cm: number;
  soil_water_parameters: {
    field_capacity_mm: number;
    wilting_point_mm: number;
    total_available_water_mm: number;
    readily_available_water_mm: number;
  };
  prescriptive_irrigation_advisory: {
    irrigation_urgency: "Urgent" | "Postpone" | "Adequate";
    next_irrigation_lead_days: number;
    prescribed_water_depth_mm: number;
    irrigation_method_recommended: string;
    justification: string;
  };
  ten_day_water_budget: Array<{
    day: string;
    date: string;
    fao56_et0_mm: number;
    crop_etc_mm: number;
    downscaled_rainfall_mm: number;
    effective_rainfall_mm: number;
    soil_moisture_storage_mm: number;
    root_zone_depletion_pct: number;
    action_recommendation: string;
    prescribed_irrigation_mm: number;
  }>;
  physics_formulation: string;
  is_snapshot?: boolean;
}

export interface AdvisoryAction {
  action: string;
  why: string;
  timing: string;
  confidence: "High" | "Medium" | "Low";
}

export interface PanchayatAdvisoryResponse {
  gp_code: number;
  panchayat_name: string;
  block_name: string;
  date: string;
  crop_profile?: string;
  actions: AdvisoryAction[];
  verification_status: "NOT_YET_MEASURED";
  is_snapshot?: boolean;
}

export interface PanchayatAlertItem {
  alert_id: string;
  gp_code: number;
  panchayat_name: string;
  block_name: string;
  severity: "Advisory" | "Watch" | "Warning";
  hazard_type: string;
  headline: string;
  description: string;
  effective_from: string;
  expires_at: string;
  cap_xml_url: string;
}

export interface BaselineComparisonRecord {
  Variable: "RAINFALL" | "TEMPERATURE" | "HUMIDITY" | "WIND_SPEED" | "EVAPOTRANSPIRATION";
  Method: string;
  N: number;
  MAE: number;
  RMSE: number;
  Bias: number;
  "Pearson r": number;
  "Skill Score (RMSE %)": string;
  "Skill Score (MAE %)": string;
}

export interface StationValidationRecord {
  station_id: string;
  station_name: string;
  terrain: string;
  elev_m: number;
  method: string;
  mae_c: number;
  rmse_c: number;
  bias_c: number;
  pearson_r: number;
}

export interface ReplayDayStep {
  day_num: number;
  date: string;
  mean_rain_mm: number;
  max_rain_mm: number;
  peak_gp_code: number;
  ci_lower_mm: number;
  ci_upper_mm: number;
  n_gps_over_50mm: number;
  n_gps_over_80mm: number;
  narration: string;
  observed_rainfall_mm: number | null;
  coarse_baseline_mm: number | null;
}

export interface ReplayEventItem {
  id: string;
  title: string;
  location: string;
  subtitle: string;
  tolerance_label?: string;
  dates: string[];
  summary: string;
  days_data: ReplayDayStep[];
  focus_day_idx: number;
}

export type RiskBand = "low" | "medium" | "high";

export interface RiskCuts {
  medium: number;
  high: number;
}

export interface RegionSummary {
  region_id: string;
  region_name?: string;
  risk_score?: number | null;
  risk_band?: RiskBand | string | null;
  confidence?: number | null;
  dominant_variable?: string | null;
  data_available?: boolean;
  status_badge?: "OPERATIONAL" | "OFF-GRID" | "COMING_SOON";
  state_id?: string;
  state_name?: string;
}

export interface RegionsAllDay {
  lead_time_days: number;
  regions: RegionSummary[];
  generated_at?: string;
}

export interface RegionsAllResponse {
  days: RegionsAllDay[];
  risk_definitions?: Record<string, string>;
  message?: string | null;
}

// ----------------------------------------------------------------------------
// Sanket-Style UI Adapter Types (/api/ui/*)
// ----------------------------------------------------------------------------

export interface UIRegionAggregate {
  region_id: string;
  region_name: string;
  state_id: string;
  state_name: string;
  risk_score: number | null;
  risk_band: "calm" | "watch" | "alert" | "nodata";
  confidence: number | null;
  dominant_variable: string | null;
  data_available: boolean;
  aggregate: boolean;
  total_gps: number;
  active_alerts: number;
}

export interface UIOverviewResponse {
  init_time: string;
  valid_date: string;
  day: number;
  available_days: number[];
  cuts: { watch: number; alert: number };
  band_definitions: Record<string, string>;
  regions: UIRegionAggregate[];
}

export interface UIHeroResponse {
  gauge: {
    share_alert: number;
    delta_vs_prev: number;
    day: number;
    evaluated_panchayats: number;
    state: string;
  };
  kpi?: {
    active_alerts: number;
    total_gps_scored: number;
    mean_agreement: number;
    worst_gp: { gp_code: number; name: string; score: number };
  };
  risk_by_day: Array<{
    lead_day: number;
    day_label: string;
    mean_risk: number;
    p10: number;
    p90: number;
  }>;
  calibration_scatter: Array<{
    station_id: string;
    station_name: string;
    predicted: number;
    observed: number;
  }>;
  skill_tiles: Array<{
    label: string;
    value: string;
    unit?: string;
    status?: string;
  }>;
}

export interface UISHAPFactor {
  feature: string;
  weight: number;
  impact: string;
  direction?: string;
}

export interface UIPanchayatEffectPoint {
  day: number;
  delta: number;
  base: number;
  local: number;
}

export interface UIGPDetailResponse {
  gp_code: number;
  gp_name: string;
  block_name: string;
  district_name: string;
  state_name: string;
  area_km2: number;
  badges: {
    boundary_quality: string;
    truth_class: string;
    source: string;
    is_pilot: boolean;
  };
  peak_risk: {
    day: number;
    score: number;
    band: "calm" | "watch" | "alert";
  };
  explanations?: UISHAPFactor[];
  explanation_sentence?: string;
  driver_variable?: string;
  panchayat_effect?: UIPanchayatEffectPoint[];
  risk_by_day: Array<{
    day: number;
    date: string;
    risk_score: number;
    band: string;
  }>;
  variables: {
    rain: Array<{ day: number; date: string; downscaled: number; coarse: number; ci_lower: number; ci_upper: number }>;
    temp: Array<{ day: number; date: string; downscaled: number; coarse: number }>;
    humidity: Array<{ day: number; date: string; downscaled: number; coarse: number }>;
    wind: Array<{ day: number; date: string; downscaled: number; coarse: number }>;
    et0: Array<{ day: number; date: string; downscaled: number; coarse: number }>;
  };
  advisories: Array<{
    title: string;
    advice: string;
    priority: "high" | "medium" | "low";
    category: string;
  }>;
  meta: {
    generated_at: string;
    model_version: string;
    freshness: string;
  };
}

export interface UITenDayCompactRow {
  day: number;
  date: string;
  rain_mm: number;
  temp_max_c: number;
  temp_min_c: number;
  rh_pct: number;
  wind_kmh: number;
  et0_mm: number;
  risk_pct: number;
  band: "calm" | "watch" | "alert";
}

export interface UITenDayCompactResponse {
  gp_code: number;
  gp_name: string;
  block_name: string;
  district_name: string;
  rows: UITenDayCompactRow[];
  baseline_comparison?: {
    lead_1_mae: number;
    lead_5_mae: number;
    lead_10_mae: number;
    climatology_mae: number;
  };
}

export interface UIWorstItem {
  gp_code: number;
  gp_name: string;
  block_name: string;
  district_name: string;
  risk_score: number;
  risk_band: "calm" | "watch" | "alert";
  dominant_driver: string;
}

export interface UIModelResponse {
  run_id: string;
  live_tag: boolean;
  as_of: string;
  kpis: {
    roc_auc: number;
    pr_auc: number;
    brier_score: number;
    f1_score: number;
  };
  thresholds_table: Array<{
    parameter: string;
    threshold: string;
    imd_alert_level: string;
    downscaling_gain: string;
  }>;
  variable_skills: Array<{
    variable: string;
    mae: number;
    rmse: number;
    pearson_r: number;
    skill_vs_ecmwf: string;
  }>;
  reliability_curve: Array<{
    forecast_prob_bin: number;
    observed_frequency: number;
  }>;
  cost_loss: Array<{
    cost_loss_ratio: number;
    economic_value: number;
  }>;
}

