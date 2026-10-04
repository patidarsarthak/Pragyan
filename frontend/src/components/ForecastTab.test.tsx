import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ForecastTab } from "./ForecastTab";

vi.mock("../api/client", () => ({
  fetchUIHero: vi.fn().mockResolvedValue({
    issue_date: "3 OCT 2026",
    active_run: "ECMWF IFS 00z",
    severe_count_day1: 11,
    lead_time_days: 10,
    headline: "Active Monsoon Low Pressure System across Central India",
    status_label: "OPERATIONAL",
  }),
  fetchUIOverview: vi.fn().mockResolvedValue({
    day: 1,
    date: "2026-10-04",
    regions: [
      {
        region_id: "IN-MP-INDORE",
        region_name: "Indore",
        risk_score: 74,
        risk_band: "watch",
        confidence: 0.88,
        dominant_variable: "rainfall",
        data_available: true,
        state_id: "IN-MP",
        state_name: "Madhya Pradesh",
      },
    ],
  }),
  fetchUIWorst: vi.fn().mockResolvedValue([
    {
      rank: 1,
      gp_code: 133203,
      gp_name: "Sanwer",
      district_name: "Indore",
      rainfall_mm: 42.5,
      rainfall_delta_mm: 12.3,
      temp_c: 28.4,
      risk_score: 82,
      risk_band: "alert",
    },
  ]),
  fetchUIGP: vi.fn().mockResolvedValue({
    gp_code: 133203,
    gp_name: "Sanwer",
    district_name: "Indore",
    block_name: "Sanwer",
    state_name: "Madhya Pradesh",
    rainfall_mm: 42.5,
    rainfall_delta_mm: 12.3,
    temp_max_c: 32.1,
    temp_min_c: 24.5,
    relative_humidity_pct: 88,
    wind_speed_kmh: 18.2,
    et0_mm: 3.4,
    soil_moisture_pct: 76,
    spray_window: "POOR",
    irrigation_need: "NONE",
  }),
  fetchUITenDay: vi.fn().mockResolvedValue({
    gp_code: 133203,
    days: Array.from({ length: 10 }, (_, i) => ({
      day: i + 1,
      date: `2026-10-${String(i + 4).padStart(2, "0")}`,
      rainfall_mm: 10 + i * 2,
      temp_max_c: 30 + i * 0.5,
      temp_min_c: 22 + i * 0.3,
    })),
  }),
  fetchRegionsByLeadDay: vi.fn().mockResolvedValue([]),
  fetchUIChildren: vi.fn().mockResolvedValue([
    {
      id: "district:407",
      level: "district",
      name: "Indore",
      lgd: 407,
      n_children: 4,
      n_gp_total: 335,
      n_gp_scored: 12,
      validated: true,
      has_geometry: true,
    },
  ]),
  fetchUISearchV2: vi.fn().mockResolvedValue([]),
  fetchCropLayers: vi.fn().mockResolvedValue([]),
  fetchCrops: vi.fn().mockResolvedValue([]),
  fetchAdvisoryDossier: vi.fn().mockResolvedValue(null),
  fetchAdvisoryCohorts: vi.fn().mockResolvedValue(null),
  fetchAdvisoryExplain: vi.fn().mockResolvedValue(null),
  saveFarmerProfile: vi.fn().mockResolvedValue({ status: "success" }),
}));

describe("ForecastTab Component", () => {
  it("renders without crashing and displays hero, toolbar, and map controls", async () => {
    render(<ForecastTab lang="en" />);

    expect(screen.getByRole("radiogroup", { name: /Map Display Layers/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Risk Score/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Dominant Variable/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Model Agreement/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/VALIDITY: DAY 1/i)).toBeInTheDocument();
    });
  });
});
