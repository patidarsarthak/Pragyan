import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SystemHealthTab } from "./SystemHealthTab";
import { CommandCentreTab } from "./CommandCentreTab";
import { ApiWidgetTab } from "./ApiWidgetTab";
import { LowBandwidthView } from "./LowBandwidthView";
import { UnusualnessMeterCard } from "./detail/UnusualnessMeterCard";

describe("Step S6 Features Test Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders SystemHealthTab with operational status, upstream sources, and ledger card", async () => {
    const mockHealth = {
      overall_status: "OPERATIONAL",
      upstream_sources: [
        { id: "ecmwf_ifs", name: "ECMWF IFS Open Data", type: "NWP", status: "HEALTHY", latency_hours: 3.2, provenance: "ECMWF" },
        { id: "imd_aws", name: "IMD AWS Network", type: "Telemetry", status: "HEALTHY", latency_hours: 1.5, provenance: "IMD" },
      ],
      panchayat_data_quality: {
        total_active_panchayats: 603,
        complete_coverage_count: 589,
        complete_coverage_pct: 97.7,
        interpolated_coverage_count: 14,
        interpolated_coverage_pct: 2.3,
        missing_coverage_count: 0,
        missing_coverage_pct: 0.0,
      },
      ledger_verification: {
        chain_status: "VALID",
        total_blocks: 7,
        latest_block_hash: "abcd1234ef5678",
      },
      residual_drift: {
        status: "STABLE",
        observed_rmse_drift_sigma: 0.38,
        lead_day_residuals: [
          { day: "Day 1 (T+24h)", rainfall_rmse_mm: 4.12, temp_mae_c: 1.14, skill_pct: 39.8 },
        ],
      },
      model_card: {
        model_name: "Pragyan Topographic Downscaling Ensemble v2.4",
        architecture: "Ridge-Lasso Hybrid",
        intended_use: "Gram Panchayat agro-meteorology",
        pilot_scope: "Madhya Pradesh",
        training_period: "2020-2023",
        limitations: ["Convective micro-storms (<2km) have higher variance."],
      },
    };

    (globalThis as any).fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/health/data-quality")) {
        return Promise.resolve({ json: () => Promise.resolve(mockHealth) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<SystemHealthTab lang="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Data Quality & Model Diagnostics/i)).toBeInTheDocument();
      expect(screen.getByText(/ECMWF IFS Open Data/i)).toBeInTheDocument();
      expect(screen.getByText(/97.7%/i)).toBeInTheDocument();
      expect(screen.getByText(/Ridge-Lasso Hybrid/i)).toBeInTheDocument();
    });
  });

  it("renders CommandCentreTab with KPI strip, priority action queue, and print button", async () => {
    const mockCommand = {
      scope_id: "Panna",
      active_alerts_count: 3,
      high_risk_crop_area_ha: 1410,
      total_panchayats_monitored: 192,
      priority_action_queue: [
        {
          panchayat_name: "Kakarhati",
          lgd_code: 133338,
          block_name: "Panna",
          risk_score: 78,
          primary_threat: "Heavy Convective Rainfall (62.4 mm)",
          dominant_crop: "Soybean (Flowering)",
          action_required: "Deploy mobile pump sets to low-lying plots",
        },
      ],
      risk_calendar_7day: [
        { day: 1, label: "Today", calm: 142, watch: 38, alert: 12, high_risk_ha: 4850 },
      ],
      crop_stage_cohorts: [
        {
          crop: "Soybean",
          total_area_ha: 45000,
          stages: [{ stage: "Vegetative", pct: 45, vulnerability: "MODERATE" }],
        },
      ],
    };

    (globalThis as any).fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ json: () => Promise.resolve(mockCommand) })
    );

    render(<CommandCentreTab lang="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Season Command Centre/i)).toBeInTheDocument();
      expect(screen.getByText(/Kakarhati/i)).toBeInTheDocument();
      expect(screen.getByText(/Deploy mobile pump sets to low-lying plots/i)).toBeInTheDocument();
      expect(screen.getByText(/One-Click Officer PDF Brief/i)).toBeInTheDocument();
    });
  });

  it("renders ApiWidgetTab with live iframe preview and embed code snippet", () => {
    render(<ApiWidgetTab lang="en" />);
    expect(screen.getByText(/Public API & Embeddable Widget/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Embed Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Download Full Dataset \(CSV\)/i)).toBeInTheDocument();
  });

  it("renders LowBandwidthView with accessible table and search filter", async () => {
    const mockRecords = {
      records: [
        {
          lgd_code: 133338,
          panchayat_name: "Kakarhati",
          district: "Panna",
          block: "Panna",
          rainfall_mm: 42.5,
          temp_max_c: 31.0,
          relative_humidity_pct: 82,
          wind_speed_kmh: 14,
        },
      ],
    };

    (globalThis as any).fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ json: () => Promise.resolve(mockRecords) })
    );

    const onExit = vi.fn();
    render(<LowBandwidthView lang="en" onExit={onExit} />);

    await waitFor(() => {
      expect(screen.getByText(/ACCESSIBLE LOW-BANDWIDTH MODE/i)).toBeInTheDocument();
      expect(screen.getByText(/Kakarhati/i)).toBeInTheDocument();
      expect(screen.getByText(/42.5/i)).toBeInTheDocument();
    });

    const exitBtn = screen.getByText(/Return to Map Mode/i);
    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalled();
  });

  it("renders UnusualnessMeterCard with percentile and return period", async () => {
    const mockUnusual = {
      panchayat_name: "Kakarhati",
      lead_day: 1,
      forecast_rainfall_mm: 68.2,
      climatological_percentile: 94.2,
      return_period_years: 6.2,
      return_period_text: "1-in-6.2 year event",
      verbal_classification: "Highly Unusual Heavy Rain",
      badge_color: "#DC2626",
      baseline_dataset: "CHIRPS v2.0",
      sample_size_years: 44,
      historical_benchmarks: {
        mean_daily_mm: 12.4,
        p90_threshold_mm: 38.6,
        record_maximum_mm: 184.2,
      },
      narration: "Rainfall of 68.2 mm exceeds the 90th percentile.",
    };

    (globalThis as any).fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ json: () => Promise.resolve(mockUnusual) })
    );

    render(<UnusualnessMeterCard lgdCode={133338} selectedDay={1} lang="en" />);

    await waitFor(() => {
      expect(screen.getByText(/HISTORICAL UNUSUALNESS METER/i)).toBeInTheDocument();
      expect(screen.getByText(/Highly Unusual Heavy Rain/i)).toBeInTheDocument();
      expect(screen.getByText(/94.2th Percentile/i)).toBeInTheDocument();
      expect(screen.getByText(/1-in-6.2 year event/i)).toBeInTheDocument();
    });
  });
});
