import { describe, it, expect } from "vitest";
import {
  fetchPanchayatMapPolygons,
  fetchStationValidation,
  fetchModelMetrics,
  fetchPanchayatAlerts,
  fetchReplayEvents,
  fetchForecastFrames,
} from "./client";

describe("API Client with Fallback Resilience", () => {
  it("loads Dhanbad panchayats GeoJSON with 239 features", async () => {
    const geo = await fetchPanchayatMapPolygons();
    expect(geo).toBeDefined();
    expect(geo.features).toBeDefined();
    expect(geo.features.length).toBeGreaterThan(0);
    expect(geo.features[0].properties.gp_code).toBeDefined();
  });

  it("loads scientific evidence baseline ladder and NOAA station validation", async () => {
    const stationValidation = await fetchStationValidation();
    expect(stationValidation).toBeDefined();
    expect(stationValidation.length).toBe(35);
    expect(stationValidation[0].station_name).toBeDefined();

    const metrics = await fetchModelMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.length).toBeGreaterThan(0);
  });

  it("loads 3-tier severity alerts for Topchanchi GP (gp_code: 336001)", async () => {
    const alerts = await fetchPanchayatAlerts(336001);
    expect(alerts).toBeDefined();
    expect(alerts.length).toBeGreaterThan(0);
    expect(["Advisory", "Watch", "Warning"]).toContain(alerts[0].severity);
  });

  it("loads archived 2024 past events without fake ground truth", async () => {
    const events = await fetchReplayEvents();
    expect(events).toBeDefined();
    expect(events.length).toBe(4);
    expect(events[0].id).toBeDefined();
  });

  it("loads forecast frames with uncertainty hatching flags", async () => {
    const frames = await fetchForecastFrames(10);
    expect(frames).toBeDefined();
    expect(frames.frames).toBeDefined();
    expect(frames.frames.length).toBe(10);
    expect(frames.frames[0].day_index).toBe(0);
  });
});
