import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { EvidenceTab } from "./EvidenceTab";

vi.mock("../api/client", () => ({
  fetchModelMetrics: vi.fn().mockResolvedValue([
    {
      Variable: "TEMPERATURE",
      Method: "Coarse_Unadjusted_NWP",
      N: 15372,
      MAE: 0.8205,
      RMSE: 1.3192,
      "Pearson r": 0.9823,
      "Skill Score (MAE %)": "0.0%",
    },
    {
      Variable: "RAINFALL",
      Method: "Coarse_Unadjusted_NWP",
      N: 15372,
      MAE: 0.5652,
      RMSE: 2.1963,
      "Pearson r": 0.9892,
      "Skill Score (MAE %)": "0.0%",
    },
  ]),
  fetchStationValidation: vi.fn().mockResolvedValue([
    {
      station_id: "42591099999",
      station_name: "Bokaro Steel City Aerodrome Observatory",
      terrain: "Plateau",
      elev_m: 210,
      method: "Joint_Ensemble_Model",
      mae_c: 0.162,
      rmse_c: 0.204,
      bias_c: 0.012,
      pearson_r: 0.9991,
    },
  ]),
  fetchUIModel: vi.fn().mockResolvedValue(null),
}));

describe("EvidenceTab Component", () => {
  it("renders honest scientific disclosures and baseline ladder", async () => {
    render(<EvidenceTab lang="en" />);

    expect(screen.getByText(/Scientific Honesty & Data-Leakage Disclosure/i)).toBeInTheDocument();
    expect(screen.getByText(/Downscaling Baseline Ladder Comparison/i)).toBeInTheDocument();
    expect(screen.getAllByText(/NOT YET MEASURED/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getAllByText(/Not independent validation/i).length).toBeGreaterThan(0);
    });
  });

  it("displays regional airport station consistency check section", async () => {
    render(<EvidenceTab lang="en" />);
    expect(screen.getByText(/Regional Station Consistency Check/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/Bokaro Steel City/i).length).toBeGreaterThan(0);
    });
  });
});
