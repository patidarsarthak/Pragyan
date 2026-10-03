import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature, merge } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";
import type {
  GeometryCollection,
  MultiPolygon as TopoMultiPolygon,
  Polygon as TopoPolygon,
  Topology,
} from "topojson-specification";
import topoData from "../../assets/geo/india_districts.topojson?url";
import claimedTerritoryUrl from "../../assets/geo/claimed_territory.geojson?url";
import type { RegionSummary, RiskBand, RiskCuts } from "../../api/types";
import { tooltipPlacement, bandLabel } from "../../lib/mapTooltip";
import { inferRiskCuts, isScoredRegion, riskBandForProbability, riskBandForRegion } from "../../lib/riskBands";

const WIDTH = 620;
const HEIGHT = 680;
const MAX_SUGGESTIONS = 8;
const MARKER_MIN_AREA = 30;
const MARKER_R = 5;

function circleSubpath(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0Z`;
}

function markerAnchor(path: ReturnType<typeof geoPath>, g: Geometry): [number, number] {
  if (g.type === "MultiPolygon" && g.coordinates.length > 1) {
    let best: Geometry | null = null;
    let bestArea = -1;
    for (const coordinates of g.coordinates) {
      const part: Geometry = { type: "Polygon", coordinates };
      const area = path.area(part as never);
      if (area > bestArea) {
        bestArea = area;
        best = part;
      }
    }
    if (best) return path.centroid(best as never) as [number, number];
  }
  return path.centroid(g as never) as [number, number];
}

interface DistrictProps {
  region_id: string;
  region_name: string;
  state_id: string;
  state_name: string;
}

export type Aggregation = "worst" | "mean";

function districtLabel(p: DistrictProps): string {
  const rName = String(p.region_name || "");
  const sName = String(p.state_name || "");
  return rName.toLowerCase() === sName.toLowerCase()
    ? rName
    : `${rName}, ${sName}`;
}

type HoverTarget =
  | { kind: "claimed" }
  | { kind: "state"; id: string }
  | { kind: "district"; id: string };

interface IndiaChoroplethMapProps {
  regions?: RegionSummary[];
  selectedRegionId?: string | null;
  onSelectRegion?: (regionId: string, regionName?: string) => void;
  onSelectState?: (stateId: string | null) => void;
  activeStateId?: string | null;
}

export const IndiaChoroplethMap: React.FC<IndiaChoroplethMapProps> = ({
  regions = [],
  selectedRegionId = null,
  onSelectRegion,
  onSelectState,
  activeStateId = null,
}) => {
  const [topology, setTopology] = useState<Topology | null>(null);
  const [claimedTerritory, setClaimedTerritory] = useState<Feature<Geometry, unknown> | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; w: number; target: HoverTarget } | null>(null);
  const [query, setQuery] = useState("");
  const [localActiveState, setLocalActiveState] = useState<string | null>(activeStateId);
  const [aggregation, setAggregation] = useState<Aggregation>("worst");

  const wrapRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);

  const activeState = activeStateId ?? localActiveState;

  // Handle active state changes
  const handleSetActiveState = (stateId: string | null) => {
    setLocalActiveState(stateId);
    if (onSelectState) onSelectState(stateId);
    setHover(null);
  };

  // Load Topology
  useEffect(() => {
    let cancelled = false;
    const resolvedTopoUrl =
      typeof window !== "undefined" && window.location?.origin
        ? new URL(topoData, window.location.origin).href
        : topoData;
    const resolvedClaimedUrl =
      typeof window !== "undefined" && window.location?.origin
        ? new URL(claimedTerritoryUrl, window.location.origin).href
        : claimedTerritoryUrl;

    fetch(resolvedTopoUrl)
      .then((r) => r.json())
      .then((data: Topology) => {
        if (!cancelled) setTopology(data);
      })
      .catch((err) => console.error("Error loading india_districts.topojson:", err));

    fetch(resolvedClaimedUrl)
      .then((r) => r.json())
      .then((fc: FeatureCollection) => {
        if (!cancelled) setClaimedTerritory(fc.features[0] ?? null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const byRegionId = useMemo(() => {
    const m = new Map<string, RegionSummary>();
    regions.forEach((r) => m.set(r.region_id, r));
    return m;
  }, [regions]);

  const cuts: RiskCuts = useMemo(() => inferRiskCuts(regions), [regions]);

  // Extract districts and merged state features
  const { districts, states } = useMemo(() => {
    if (!topology) return { districts: [], states: [] };
    const obj = topology.objects.districts as GeometryCollection<DistrictProps>;
    const fc = feature(topology, obj) as unknown as FeatureCollection<Geometry, DistrictProps>;

    type Areal = TopoPolygon<DistrictProps> | TopoMultiPolygon<DistrictProps>;
    const grouped = new Map<string, { name: string; geoms: Areal[] }>();
    obj.geometries.forEach((g) => {
      if (g.type !== "Polygon" && g.type !== "MultiPolygon") return;
      const p = g.properties as DistrictProps;
      const entry = grouped.get(p.state_id) ?? { name: p.state_name, geoms: [] };
      entry.geoms.push(g as Areal);
      grouped.set(p.state_id, entry);
    });

    const stateFeatures = [...grouped.entries()].map(([stateId, { name, geoms }]) => ({
      type: "Feature" as const,
      properties: { state_id: stateId, state_name: name },
      geometry: merge(topology, geoms) as MultiPolygon | Polygon,
    }));
    return { districts: fc.features, states: stateFeatures };
  }, [topology]);

  // Aggregate state metrics
  const stateRollup = useMemo(() => {
    const acc = new Map<
      string,
      {
        probs: number[];
        worst: RegionSummary | null;
        bands: RiskBand[];
      }
    >();

    districts.forEach((f) => {
      const r = byRegionId.get(f.properties.region_id);
      if (!r || !isScoredRegion(r)) return;
      const score = r.risk_score;
      const e = acc.get(f.properties.state_id) ?? { probs: [], worst: null, bands: [] };
      e.probs.push(score);
      const band = riskBandForRegion(r, cuts);
      if (band) e.bands.push(band);
      const currentWorstScore = e.worst ? (e.worst.risk_score ?? 0) : -1;
      if (!e.worst || currentWorstScore < score) {
        e.worst = r;
      }
      acc.set(f.properties.state_id, e);
    });

    const out = new Map<
      string,
      {
        value: number;
        worst: RegionSummary | null;
        n: number;
        band: RiskBand | null;
      }
    >();

    acc.forEach((e, k) => {
      const value =
        aggregation === "worst"
          ? Math.max(...e.probs)
          : e.probs.reduce((a, b) => a + b, 0) / e.probs.length;
      const sameBand =
        e.bands.length > 0 && e.bands.every((band) => band === e.bands[0]) ? e.bands[0] : null;
      const band =
        aggregation === "worst" && e.worst
          ? riskBandForRegion(e.worst, cuts)
          : riskBandForProbability(value, cuts) ?? sameBand;
      out.set(k, { value, worst: e.worst, n: e.probs.length, band });
    });
    return out;
  }, [districts, byRegionId, aggregation, cuts]);

  const shown = useMemo(
    () => (activeState ? districts.filter((f) => f.properties.state_id === activeState) : []),
    [districts, activeState],
  );

  // SVG Projection
  const pathFor = useMemo(() => {
    if (!topology) return () => "";
    const fitTo: Feature<Geometry, unknown>[] = activeState
      ? shown
      : claimedTerritory
      ? [...(states as never[]), claimedTerritory]
      : (states as never[]);
    if (!fitTo.length) return () => "";
    const fc = { type: "FeatureCollection", features: fitTo } as FeatureCollection;
    const projection = geoMercator().fitSize([WIDTH, HEIGHT], fc);
    const path = geoPath(projection);

    return (g: Geometry) => {
      const d = path(g) ?? "";
      if (!d) return "";

      if (path.area(g as never) < MARKER_MIN_AREA) {
        const [cx, cy] = markerAnchor(path, g);
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return d;
        return `${d}${circleSubpath(cx, cy, MARKER_R)}`;
      }

      if (activeState && g.type === "MultiPolygon") {
        const parts = g.coordinates.map((coordinates) => {
          const part: Geometry = { type: "Polygon", coordinates };
          return { part, area: path.area(part as never) };
        });
        if (parts.some((p) => p.area >= MARKER_MIN_AREA)) return d;
        let out = d;
        for (const { part } of parts) {
          const [cx, cy] = path.centroid(part as never);
          if (Number.isFinite(cx) && Number.isFinite(cy)) {
            out += circleSubpath(cx, cy, MARKER_R);
          }
        }
        return out;
      }
      return d;
    };
  }, [topology, activeState, shown, states, claimedTerritory]);

  const track = (target: HoverTarget) => (e: MouseEvent<SVGPathElement>) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setHover({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, target });
  };

  const suggestions = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: DistrictProps[] = [];
    for (const f of districts) {
      const p = f.properties;
      const rLower = String(p.region_name || "").toLowerCase();
      const sLower = String(p.state_name || "").toLowerCase();
      if (rLower.includes(q) || sLower.includes(q)) {
        hits.push(p);
        if (hits.length >= MAX_SUGGESTIONS) break;
      }
    }
    return hits;
  }, [deferredQuery, districts]);

  const activeStateName = activeState
    ? states.find((s) => s.properties.state_id === activeState)?.properties.state_name
    : null;

  const tip = hover ? tooltipFor(hover.target) : null;
  function tooltipFor(t: HoverTarget): { title: string; subtitle?: string; badge?: string; body: string[] } | null {
    if (t.kind === "claimed") {
      return {
        title: "Claimed Territory",
        badge: "SURVEY OF INDIA COMPLIANT",
        body: [
          "Non-administered territory (Survey of India alignment)",
          "Outlines depicted strictly for cartographic integrity",
          "No ground station or panchayat grid deployed",
        ],
      };
    }
    if (t.kind === "state") {
      const f = states.find((x) => x.properties.state_id === t.id);
      if (!f) return null;
      const isMP = t.id === "IN-MP";
      const roll = stateRollup.get(t.id);
      return {
        title: f.properties.state_name,
        badge: isMP ? "OPERATIONAL ML PILOT" : "OFF-GRID / SYNOPTIC",
        body: roll
          ? [
              `${aggregation === "worst" ? "Worst district" : "Mean of districts"}: ${(roll.value * 100).toFixed(1)}%`,
              roll.worst ? `Worst: ${roll.worst.region_name}` : "",
              `${roll.n} districts mapped`,
              isMP
                ? "Click to drill down into 55 MP Districts & Gram Panchayats"
                : "Click to inspect district boundaries",
            ].filter(Boolean)
          : [
              isMP
                ? "Operational Pilot Area (55 Districts, Gram Panchayat Resolution)"
                : "Off-Grid: Reanalysis / Coarse synoptic coverage only",
              "Click to view districts",
            ],
      };
    }
    const f = shown.find((x) => x.properties.region_id === t.id);
    if (!f) return null;
    const region = byRegionId.get(t.id);
    const scored = region ? isScoredRegion(region) : false;
    const isMP = f.properties.state_id === "IN-MP";

    return {
      title: districtLabel(f.properties),
      badge: isMP ? "PANCHAYAT DOWNSCALING READY" : "OFF-GRID",
      body: scored && region
        ? [
            `Weather risk: ${((region.risk_score ?? 0) * 100).toFixed(1)}%`,
            region.dominant_variable ? `Key driver: ${region.dominant_variable}` : "",
            isMP ? "Click to open Panchayat Micro-Weather Grid" : "Coarse reanalysis only",
          ].filter(Boolean)
        : [
            isMP
              ? "Gram Panchayat downscaling calibrated for this district. Click to inspect."
              : "Off-grid district: High-resolution downscaling coming in Phase 3.",
          ],
    };
  }

  if (!topology) {
    return (
      <div className="gm-map-loading">
        <div className="gm-spinner" />
        <p>Loading Survey of India Compliant All-India Map…</p>
      </div>
    );
  }

  return (
    <div className="gm-map-card" ref={wrapRef}>
      {/* Search Header */}
      <div className="gm-map-header">
        <div className="gm-map-search">
          <input
            type="search"
            value={query}
            placeholder={activeState ? `Search district in ${activeStateName}…` : "Find any district in India…"}
            aria-label="Find any district in India"
            onChange={(e) => setQuery(e.target.value)}
          />
          {suggestions.length > 0 && (
            <ul className="gm-map-search-results" role="listbox">
              {suggestions.map((p) => (
                <li key={p.region_id}>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetActiveState(p.state_id);
                      if (onSelectRegion) onSelectRegion(p.region_id, p.region_name);
                      setQuery("");
                    }}
                  >
                    <span>{districtLabel(p)}</span>
                    <span className="gm-search-badge">
                      {p.state_id === "IN-MP" ? "Operational" : "Synoptic"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Level & Controls Row */}
        <div className="gm-map-controls-row">
          {activeState ? (
            <button
              type="button"
              className="gm-map-back-btn"
              onClick={() => handleSetActiveState(null)}
            >
              ← All India
            </button>
          ) : (
            <span className="gm-map-subheading">
              ALL INDIA · {states.length} STATES AND UTS
            </span>
          )}

          {!activeState ? (
            <div className="gm-map-toggle-group" role="group" aria-label="District aggregation mode">
              <button
                type="button"
                className={aggregation === "worst" ? "active" : ""}
                onClick={() => setAggregation("worst")}
              >
                Worst district
              </button>
              <button
                type="button"
                className={aggregation === "mean" ? "active" : ""}
                onClick={() => setAggregation("mean")}
              >
                Mean of districts
              </button>
            </div>
          ) : (
            <span className="gm-map-subheading">
              {activeStateName} · {shown.length} DISTRICT{shown.length === 1 ? "" : "S"}
              {activeState === "IN-MP" && (
                <span className="gm-badge-operational ml-2">ML Downscaling Operational</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* SVG Map */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="gm-map-svg"
        role="group"
        aria-label={activeState ? `${activeStateName} by district` : "India weather intelligence by state"}
      >
        <g>
          {/* Claimed territory (Jammu & Kashmir / Ladakh north border) */}
          {!activeState && claimedTerritory && (
            <path
              className="gm-region gm-region-claimed"
              d={pathFor(claimedTerritory.geometry)}
              role="img"
              aria-label="Claimed territory, Survey of India compliant alignment"
              onMouseMove={track({ kind: "claimed" })}
              onMouseLeave={() => setHover(null)}
            />
          )}

          {/* National View: States */}
          {!activeState &&
            states.map((f) => {
              const roll = stateRollup.get(f.properties.state_id);
              const band = roll?.band ?? null;
              const isMP = f.properties.state_id === "IN-MP";

              let fillClass = "gm-region-nodata";
              if (isMP) {
                fillClass = band ? `gm-region-${band}` : "gm-region-operational";
              } else if (band) {
                fillClass = `gm-region-${band}`;
              }

              return (
                <path
                  key={f.properties.state_id}
                  d={pathFor(f.geometry)}
                  className={`gm-region ${fillClass} ${isMP ? "gm-region-mp" : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${f.properties.state_name}${band ? `, ${bandLabel(band)}` : ""}`}
                  onClick={() => handleSetActiveState(f.properties.state_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSetActiveState(f.properties.state_id);
                    }
                  }}
                  onMouseMove={track({ kind: "state", id: f.properties.state_id })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}

          {/* Drilled-down View: Districts of active state */}
          {activeState &&
            shown.map((f) => {
              const p = f.properties;
              const region = byRegionId.get(p.region_id);
              const scored = region ? isScoredRegion(region) : false;
              const band = scored && region ? riskBandForRegion(region, cuts) : null;
              const isSelected = p.region_id === selectedRegionId;
              const isMP = activeState === "IN-MP";

              return (
                <path
                  key={p.region_id}
                  d={pathFor(f.geometry)}
                  className={`gm-region ${band ? `gm-region-${band}` : "gm-region-nodata"} ${
                    isSelected ? "gm-region-selected" : ""
                  }`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${districtLabel(p)}${band ? `, ${bandLabel(band)}` : ""}`}
                  onClick={() => {
                    if (onSelectRegion) onSelectRegion(p.region_id, p.region_name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (onSelectRegion) onSelectRegion(p.region_id, p.region_name);
                    }
                  }}
                  onMouseMove={track({ kind: "district", id: p.region_id })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
        </g>
      </svg>

      {/* Floating Tooltip */}
      {tip && hover && (() => {
        const at = tooltipPlacement(hover.x, hover.y, hover.w);
        return (
          <div
            className="gm-map-tooltip"
            style={{
              left: at.left,
              top: at.top,
              transform: at.flip ? "translateX(-100%)" : undefined,
            }}
          >
            <div className="gm-tooltip-title-row">
              <strong>{tip.title}</strong>
              {tip.badge && <span className="gm-tooltip-badge">{tip.badge}</span>}
            </div>
            {tip.body.map((line, i) => (
              <div key={i} className="gm-tooltip-line">
                {line}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default IndiaChoroplethMap;
