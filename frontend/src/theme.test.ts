import { describe, it, expect } from "vitest";
import { THEME, getRampColor } from "./theme";

describe("Theme and Color-Blind Safe Palettes", () => {
  it("defines color-blind-safe ramps for each weather variable", () => {
    expect(THEME.ramps.rainfall).toBeDefined();
    expect(THEME.ramps.temperature).toBeDefined();
    expect(THEME.ramps.humidity).toBeDefined();
    expect(THEME.ramps.wind).toBeDefined();
    expect(THEME.ramps.et0).toBeDefined();
  });

  it("calculates sequential color accurately for rainfall values using YlGnBu", () => {
    const lowRainColor = getRampColor(1.0, "rainfall");
    const midRainColor = getRampColor(20.0, "rainfall");
    const heavyRainColor = getRampColor(90.0, "rainfall");

    expect(lowRainColor).toBe("#f7fcf0");
    expect(midRainColor).toBe("#7bccc4");
    expect(heavyRainColor).toBe("#08589e");
  });

  it("provides 3-tier severity colors adhering to IMD standard (Yellow Advisory, Amber Watch, Crimson Warning)", () => {
    expect(THEME.status.advisory.color).toBe("#ca8a04");
    expect(THEME.status.watch.color).toBe("#ea580c");
    expect(THEME.status.warning.color).toBe("#be123c");
  });
});
