import type { RegionSummary, RiskBand, RiskCuts } from "../api/types";

export type { RiskCuts };

const VALID_BANDS: readonly RiskBand[] = ["low", "medium", "high"];

export function isScoredProbability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isScoredRegion(
  region: RegionSummary,
): region is RegionSummary & { risk_score: number } {
  return region.data_available !== false && isScoredProbability(region.risk_score);
}

export function asRiskBand(value: unknown): RiskBand | null {
  return typeof value === "string" && (VALID_BANDS as readonly string[]).includes(value)
    ? (value as RiskBand)
    : null;
}

export function riskBandForProbability(
  probability: number | null | undefined,
  cuts?: RiskCuts | null,
): RiskBand | null {
  const valid = cuts ? normaliseCuts(cuts) : { medium: 0.20, high: 0.40 };
  if (!isScoredProbability(probability) || !valid) return null;
  if (probability >= valid.high) return "high";
  if (probability >= valid.medium) return "medium";
  return "low";
}

export function riskBandForRegion(
  region: RegionSummary,
  cuts?: RiskCuts | null,
): RiskBand | null {
  if (!isScoredRegion(region)) return null;
  return asRiskBand(region.risk_band) ?? riskBandForProbability(region.risk_score, cuts);
}

export function inferRiskCuts(regions: RegionSummary[]): RiskCuts {
  const scored = regions
    .filter(isScoredRegion)
    .map((r) => r.risk_score)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (scored.length < 5) return { medium: 0.20, high: 0.40 };
  const p67 = scored[Math.floor(scored.length * 0.67)];
  const p90 = scored[Math.floor(scored.length * 0.90)];
  return { medium: Number(p67.toFixed(3)), high: Number(p90.toFixed(3)) };
}

function normaliseCuts(source: Partial<RiskCuts>): RiskCuts | undefined {
  const medium = source.medium;
  const high = source.high;
  if (typeof medium !== "number" || typeof high !== "number") return undefined;
  if (!Number.isFinite(medium) || !Number.isFinite(high)) return undefined;
  if (medium < 0 || high > 1 || medium >= high) return undefined;
  return { medium, high };
}
