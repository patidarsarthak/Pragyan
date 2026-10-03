import type { RegionSummary, RiskBand } from "../api/types";

export const TOOLTIP_MAX_W = 260;
const GAP = 12;

export function tooltipPlacement(x: number, y: number, wrapWidth: number):
  { left: number; top: number; flip: boolean } {
  const flip = x + GAP + TOOLTIP_MAX_W > wrapWidth;
  return { left: flip ? Math.max(10, x - GAP) : x + GAP, top: y + GAP, flip };
}

export function bandLabel(band: RiskBand | string | null): string {
  if (!band) return "Unmeasured";
  switch (band) {
    case "low":
      return "Low Risk";
    case "medium":
      return "Watch";
    case "high":
      return "High Risk";
    default:
      return String(band);
  }
}

export function districtTooltipLines(region: RegionSummary, band: RiskBand | null): string[] {
  const lines: string[] = [];
  if (region.risk_score != null) {
    lines.push(`Weather risk: ${(region.risk_score * 100).toFixed(1)}% (${bandLabel(band)})`);
  }
  if (region.dominant_variable) {
    const varLabel = String(region.dominant_variable).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`Primary Driver: ${varLabel}`);
  }
  if (region.confidence != null) {
    lines.push(`Confidence: ${(region.confidence * 100).toFixed(0)}%`);
  }
  if (region.status_badge) {
    lines.push(`Status: ${region.status_badge}`);
  }
  return lines;
}
