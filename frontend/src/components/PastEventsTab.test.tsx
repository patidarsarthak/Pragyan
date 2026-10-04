import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { PastEventsTab } from "./PastEventsTab";

vi.mock("../api/client", () => ({
  fetchUIReplayEvents: vi.fn().mockResolvedValue([
    {
      id: "event-monsoon-deep-depression-2024",
      title: "Monsoon Deep Depression — Central Narmada Valley Surge",
      region_scope: "Madhya Pradesh (Indore & Narmada Basin)",
      issue_time: "2024-08-02 00:00 UTC",
      peak_date: "2024-08-04",
      status: "IN_SAMPLE (2024 TEST HOLDOUT)",
      status_label: "IN_SAMPLE (2024 TEST HOLDOUT)",
      obs_source: "IMD AWS 42571 & 0.25° In-Situ Gridded",
      obs_class: "IN_SITU_STATION",
      n_stations: 60,
      outcome_summary: "hit",
      tolerance_label: "±12h Timing Tolerance",
      header_result_box: "Hit: 1km downscaled forecast predicted 74.2mm (80% CI: [58.4, 91.6mm]) vs 71.4mm observed. Coarse ECMWF 0.25° severely under-predicted at 28.5mm.",
      location: "Indore & Narmada Basin",
      subtitle: "Monsoon Deep Depression",
      dates: ["2024-08-03", "2024-08-04"],
      summary: "Hit: 1km forecast verified against IMD AWS",
      focus_day_idx: 1,
      days_data: [
        {
          day_num: 1,
          date: "2024-08-03",
          mean_rain_mm: 35.2,
          max_rain_mm: 58.4,
          peak_gp_code: 111945,
          ci_lower_mm: 22.0,
          ci_upper_mm: 48.0,
          n_gps_over_50mm: 6,
          n_gps_over_80mm: 0,
          narration: "Pre-depression convective bands entered valley corridors.",
          observed_rainfall_mm: 31.8,
          coarse_baseline_mm: 14.2,
        },
      ],
    },
  ]),
  fetchReplayEvents: vi.fn().mockResolvedValue([]),
  fetchUIReplaySummary: vi.fn().mockResolvedValue({
    header: {
      id: "event-monsoon-deep-depression-2024",
      title: "Monsoon Deep Depression — Central Narmada Valley Surge",
      region_scope: "Madhya Pradesh",
      issue_time: "2024-08-02 00:00 UTC",
      peak_date: "2024-08-04",
      status: "IN_SAMPLE (2024 TEST HOLDOUT)",
      status_label: "IN_SAMPLE",
      obs_source: "IMD AWS 42571",
      obs_class: "IN_SITU_STATION",
      outcome_summary: "hit",
      header_result_box: "Hit: 1km downscaled forecast predicted 74.2mm vs 71.4mm observed.",
      tolerance_label: "±12h Timing Tolerance",
    },
    days: [
      {
        day: 1,
        valid_date: "2024-08-03",
        mean_risk: 68,
        coarse_rain: 14.2,
        downscaled_rain: 35.2,
        ci_lower: 22.0,
        ci_upper: 48.0,
        observed_rain: 31.8,
        n_alert: 18,
        n_watch: 42,
        narration: {
          text: "Pre-depression convective bands entered valley corridors.",
          driver: "Rainfall Intensity",
        },
        top5: [
          { rank: 1, gp_code: 111945, name: "Sanwer", district: "Indore", risk_score: 86, band: "alert", driver: "Rainfall" },
          { rank: 2, gp_code: 111948, name: "Depalpur", district: "Indore", risk_score: 79, band: "alert", driver: "Rainfall" },
          { rank: 3, gp_code: 111952, name: "Mhow", district: "Indore", risk_score: 71, band: "alert", driver: "Wind speed" },
          { rank: 4, gp_code: 112001, name: "Sihora", district: "Jabalpur", risk_score: 64, band: "watch", driver: "Rainfall" },
          { rank: 5, gp_code: 112015, name: "Panagar", district: "Jabalpur", risk_score: 58, band: "watch", driver: "Humidity" },
        ],
      },
      {
        day: 2,
        valid_date: "2024-08-04",
        mean_risk: 88,
        coarse_rain: 28.5,
        downscaled_rain: 74.2,
        ci_lower: 58.4,
        ci_upper: 91.6,
        observed_rain: 71.4,
        n_alert: 34,
        n_watch: 26,
        narration: {
          text: "Peak deep depression landfall directly over Sanwer and Depalpur.",
          driver: "Extreme Rainfall",
        },
        top5: [
          { rank: 1, gp_code: 111945, name: "Sanwer", district: "Indore", risk_score: 96, band: "alert", driver: "Rainfall" },
        ],
      },
    ],
  }),
  fetchUIReplayGP: vi.fn().mockResolvedValue({
    event_id: "event-monsoon-deep-depression-2024",
    panchayat_id: 111945,
    issue_time: "2024-08-02 00:00 UTC",
    peak_date: "2024-08-04",
    station: {
      id: "IMD-AWS-42571",
      name: "Bhopal / Indore Met Observatory",
      km_from_gp: 4.2,
    },
    days: [
      {
        day: 1,
        valid_date: "2024-08-03",
        coarse: 14.2,
        downscaled: 35.2,
        lower: 22.0,
        upper: 48.0,
        observed: 31.8,
        observed_class: "IN_SITU_STATION",
        in_range: true,
        category_forecast: "Moderate",
        category_observed: "Moderate",
        category_match: true,
        risk_as_issued: 68,
        band_as_issued: "alert",
      },
      {
        day: 2,
        valid_date: "2024-08-04",
        coarse: 28.5,
        downscaled: 74.2,
        lower: 58.4,
        upper: 91.6,
        observed: 71.4,
        observed_class: "IN_SITU_STATION",
        in_range: true,
        category_forecast: "Heavy",
        category_observed: "Heavy",
        category_match: true,
        risk_as_issued: 96,
        band_as_issued: "alert",
      },
    ],
  }),
  fetchUIReplayParams: vi.fn().mockResolvedValue({
    event_id: "event-monsoon-deep-depression-2024",
    day: 1,
    valid_date: "2024-08-03",
    scope: "district:407",
    n_scored: 60,
    ids: [111945, 111948],
    risk: [86, 79],
    band: ["alert", "alert"],
    drivers: ["Rainfall", "Rainfall"],
    reasons: ["Day 1 accumulation", "Day 1 accumulation"],
  }),
}));

describe("PastEventsTab Replay Mode Component", () => {
  it("renders Hindcast badge, event selector, controls, and day buttons", async () => {
    render(<PastEventsTab lang="en" />);

    expect(screen.getByText("HINDCAST / REPLAY ENGINE")).toBeDefined();
    expect(screen.getByText("Play")).toBeDefined();
    expect(screen.getByText("‹ Prev")).toBeDefined();
    expect(screen.getByText("Next ›")).toBeDefined();

    // Verify 10 day buttons exist
    for (let d = 1; d <= 10; d++) {
      expect(screen.getByRole("button", { name: String(d) })).toBeDefined();
    }
  });

  it("displays Day Card with narration, risk score, alert pills, and Top-5 list", async () => {
    render(<PastEventsTab lang="en" />);

    await waitFor(() => {
      expect(screen.getAllByText(/Day 1/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText("Sanwer").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("AVERAGE RISK SCORE")).toBeDefined();
    expect(screen.getAllByText(/alert/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/watch/i).length).toBeGreaterThan(0);
    expect(screen.getByText("TOP-5 IMPACTED PANCHAYATS")).toBeDefined();
  });

  it("advances active day when clicking Next button or day number", async () => {
    render(<PastEventsTab lang="en" />);

    const day2Button = screen.getByRole("button", { name: "2" });
    fireEvent.click(day2Button);

    await waitFor(() => {
      expect(screen.getByText("valid 2024-08-04")).toBeDefined();
    });
  });

  it("renders dual close-enough verification badge and honest band footnote", async () => {
    render(<PastEventsTab lang="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Close Enough: Inside 80% CI/i)).toBeDefined();
    });

    expect(screen.getByText(/Band edges are set from how this model's own predictions were spread/i)).toBeDefined();
  });
});
