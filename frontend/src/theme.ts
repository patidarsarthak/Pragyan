/**
 * Pragyan Design System & Theme Tokens
 * Field & Forest Viridian Palette with Accessible Color-Blind-Safe Ramps
 */

export const THEME = {
  // Sanket-Style Core Tokens
  paper: "#eceff5",
  card: "#ffffff",
  card2: "#f5f7fb",
  rule: "#d5dbe6",
  rule2: "#e5e9f0",
  ink: "#0b1220",
  ink2: "#3d4a5c",
  ink3: "#7b8798",
  blue: "#2b4eff",
  blue2: "#5c78ff",
  blueWash: "#e5eaff",
  calm: "#00a882",
  watch: "#f08700",
  alert: "#f5254a",
  calmWash: "#d9f6ef",
  watchWash: "#ffefd8",
  alertWash: "#ffe2e8",
  nodata: "#dfe4ec",
  radius: "11px",
  shadow: "0 16px 34px -24px rgba(11,18,32,.42)",
  shadowLift: "0 20px 40px -22px rgba(11,18,32,.45)",

  // Legacy & Compatibility Aliases
  canvas: "#eceff5",
  surface: "#ffffff",
  surfaceSecondary: "#f5f7fb",
  borderBase: "#d5dbe6",
  borderSubtle: "#e5e9f0",
  borderFocus: "#2b4eff",
  inkDark: "#0b1220",
  inkPrimary: "#0b1220",
  inkSecondary: "#3d4a5c",
  inkMuted: "#7b8798",
  inkInverse: "#ffffff",
  accent: "#2b4eff",
  accentHover: "#1f3ccc",
  accentWash: "#e5eaff",
  accentBorder: "#a9b6d6",

  // 3-Tier Alert System (Includes Yellow Advisory)
  status: {
    favorable: {
      color: "#059669",
      wash: "#d1fae5",
      text: "#064e3b",
      label: "Favorable",
      labelHi: "अनुकूल",
    },
    advisory: {
      color: "#ca8a04",
      wash: "#fef9c3",
      text: "#713f12",
      label: "Advisory",
      labelHi: "सलाह",
    },
    watch: {
      color: "#ea580c",
      wash: "#ffedd5",
      text: "#7c2d12",
      label: "Watch",
      labelHi: "निगरानी",
    },
    warning: {
      color: "#be123c",
      wash: "#ffe4e6",
      text: "#881337",
      label: "Warning",
      labelHi: "चेतावनी",
    },
    offgrid: {
      color: "#94a3b8",
      wash: "#f1f5f9",
      text: "#475569",
      label: "Off-Grid",
      labelHi: "ऑफ-ग्रिड",
    },
  },

  // Color-Blind-Safe Sequential Ramps
  ramps: {
    // YlGnBu sequential
    rainfall: [
      { max: 2.5, color: "#f7fcf0", label: "0–2.5 mm" },
      { max: 10, color: "#ccebc5", label: "2.5–10 mm" },
      { max: 25, color: "#7bccc4", label: "10–25 mm" },
      { max: 50, color: "#4eb3d3", label: "25–50 mm" },
      { max: 80, color: "#2b8cbe", label: "50–80 mm" },
      { max: Infinity, color: "#08589e", label: "> 80 mm" },
    ],
    // Magma/Inferno warm
    temperature: [
      { max: 15, color: "#fef0d9", label: "< 15 °C" },
      { max: 22, color: "#fdcc8a", label: "15–22 °C" },
      { max: 28, color: "#fc8d59", label: "22–28 °C" },
      { max: 35, color: "#e34a33", label: "28–35 °C" },
      { max: Infinity, color: "#b30000", label: "> 35 °C" },
    ],
    // Cyan-Navy
    humidity: [
      { max: 40, color: "#e0f3f8", label: "< 40%" },
      { max: 60, color: "#abd9e9", label: "40–60%" },
      { max: 75, color: "#74add1", label: "60–75%" },
      { max: 85, color: "#4575b4", label: "75–85%" },
      { max: Infinity, color: "#313695", label: "> 85%" },
    ],
    // Purple-Indigo
    wind: [
      { max: 5, color: "#ede8f5", label: "< 5 km/h" },
      { max: 15, color: "#bcbddc", label: "5–15 km/h" },
      { max: 25, color: "#756bb1", label: "15–25 km/h" },
      { max: Infinity, color: "#54278f", label: "> 25 km/h" },
    ],
    // Warm Bronze
    et0: [
      { max: 2, color: "#ffffe5", label: "< 2 mm" },
      { max: 3.5, color: "#fff7bc", label: "2–3.5 mm" },
      { max: 5, color: "#fee391", label: "3.5–5 mm" },
      { max: 6.5, color: "#fe9929", label: "5–6.5 mm" },
      { max: Infinity, color: "#cc4c02", label: "> 6.5 mm" },
    ],
  },

  // Chart line & area variables
  chart: {
    forecast: "#2b4eff",
    observed: "#0b1220",
    error: "#f5254a",
    ensembleMember: "#a9b6d6",
    marker: "#f08700",
    rain: "#2b4eff",
    rainBar: "#2b4eff",
    tempMax: "#ea580c",
    tempMin: "#0284c7",
    humidity: "#00a882",
    wind: "#7c3aed",
    et0: "#f08700",
    grid: "#e5e9f0",
    axis: "#7b8798",
    ciEnvelope: "rgba(43, 78, 255, 0.14)",
    ciStroke: "#2b4eff",
  },
} as const;

export type VariableType = "rainfall" | "temperature" | "humidity" | "wind" | "et0";
export type AlertSeverity = "advisory" | "watch" | "warning";

export function getRampColor(val: number, variable: VariableType): string {
  const steps = THEME.ramps[variable] || THEME.ramps.rainfall;
  for (const step of steps) {
    if (val <= step.max) return step.color;
  }
  return steps[steps.length - 1].color;
}
