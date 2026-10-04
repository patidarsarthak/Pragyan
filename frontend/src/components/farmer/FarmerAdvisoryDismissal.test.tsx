import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { App } from "../../App";
import { FarmerModeCard } from "./FarmerModeCard";
import { FarmerAdvisoryModal } from "./FarmerAdvisoryModal";

// Mock api client to avoid network errors
vi.mock("../../api/client", () => ({
  fetchHealth: vi.fn().mockResolvedValue({ status: "ok" }),
  currentSnapshotState: { isSnapshot: false },
  fetchUIHero: vi.fn().mockResolvedValue({
    issue_date: "4 OCT 2026",
    active_run: "ECMWF IFS 00z",
    severe_count_day1: 0,
    lead_time_days: 10,
    headline: "Normal Seasonal Patterns",
    status_label: "OPERATIONAL",
  }),
  fetchUIOverview: vi.fn().mockResolvedValue({
    day: 1,
    date: "2026-10-04",
    regions: [],
  }),
  fetchUIWorst: vi.fn().mockResolvedValue([]),
  fetchRegionsByLeadDay: vi.fn().mockResolvedValue([]),
  fetchUIChildren: vi.fn().mockResolvedValue([]),
  fetchUISearchV2: vi.fn().mockResolvedValue([]),
  fetchCropLayers: vi.fn().mockResolvedValue([]),
  fetchCrops: vi.fn().mockResolvedValue([
    { crop_id: "durum_wheat", crop_name: "Durum Wheat", vernacular_hi: "कठिया गेहूं" },
  ]),
  fetchAdvisoryDossier: vi.fn().mockResolvedValue(null),
  fetchAdvisoryCohorts: vi.fn().mockResolvedValue(null),
  fetchAdvisoryExplain: vi.fn().mockResolvedValue(null),
  saveFarmerProfile: vi.fn().mockResolvedValue({ status: "success" }),
}));

describe("Advisory Popup Dismissal & Anti-Recurrence Guarantees", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("does NOT auto-launch Farmer Advisory popup on startup even if ?farmer=true was present in URL", () => {
    // Simulate starting with ?farmer=true in the URL
    window.history.replaceState({}, "", "/?farmer=true");
    render(<App />);

    // FarmerModeCard overlay should NOT be present on start
    expect(screen.queryByRole("dialog", { name: /Farmer Mode Agro-Advisory/i })).not.toBeInTheDocument();

    // Query string 'farmer' must be completely stripped from the URL
    expect(window.location.search).not.toContain("farmer=true");
  });

  it("FarmerModeCard closes when close button is clicked and triggers onClose", () => {
    const handleClose = vi.fn();
    render(
      <FarmerModeCard
        lang="en"
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /Exit Farmer Mode/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("FarmerModeCard closes when pressing the Escape key", () => {
    const handleClose = vi.fn();
    render(
      <FarmerModeCard
        lang="en"
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("FarmerModeCard closes when clicking outside the card on the backdrop overlay", () => {
    const handleClose = vi.fn();
    render(
      <FarmerModeCard
        lang="en"
        onClose={handleClose}
      />
    );

    const overlay = screen.getByRole("dialog", { name: /Farmer Mode Agro-Advisory/i });
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("FarmerAdvisoryModal closes when pressing the Escape key", () => {
    const handleClose = vi.fn();
    render(
      <FarmerAdvisoryModal
        gpCode={133203}
        gpName="Sanwer"
        lang="en"
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("FarmerAdvisoryModal closes when clicking the outer backdrop", () => {
    const handleClose = vi.fn();
    render(
      <FarmerAdvisoryModal
        gpCode={133203}
        gpName="Sanwer"
        lang="en"
        onClose={handleClose}
      />
    );

    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
