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
  onSelectState?: (stateId: string | null, stateName?: string) => void;
  activeStateId?: string | null;
  hideHeader?: boolean;
  onHoverFeature?: (info: { name: string; level: string; riskScore?: number; riskBand?: string } | null) => void;
}

export const IndiaChoroplethMap: React.FC<IndiaChoroplethMapProps> = ({
  regions = [],
  selectedRegionId = null,
  onSelectRegion,
  onSelectState,
  activeStateId = null,
  hideHeader = false,
  onHoverFeature,
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
  const handleSetActiveState = (stateId: string | null, stateName?: string) => {
    setLocalActiveState(stateId);
    if (onSelectState) onSelectState(stateId, stateName);
    setHover(null);
  };

  // Load Topology with multi-path resilience
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

    const loadData = async () => {
      // 1. Try public static /geo/ path first
      try {
        const res = await fetch("/geo/india_districts.topojson");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data && data.type === "Topology") {
            setTopology(data);
          }
        } else {
          throw new Error("HTTP " + res.status);
        }
      } catch {
        // Fallback to bundled resolvedTopoUrl
        try {
          const res2 = await fetch(resolvedTopoUrl);
          if (res2.ok) {
            const data2 = await res2.json();
            if (!cancelled && data2 && data2.type === "Topology") {
              setTopology(data2);
            }
          }
        } catch (err) {
          console.error("Error loading india_districts.topojson:", err);
        }
      }

      // 2. Load claimed territory
      try {
        const resClaimed = await fetch("/geo/claimed_territory.geojson");
        if (resClaimed.ok) {
          const fc = await resClaimed.json();
          if (!cancelled) setClaimedTerritory(fc.features?.[0] ?? null);
        } else {
          throw new Error("HTTP " + resClaimed.status);
        }
      } catch {
        try {
          const res2 = await fetch(resolvedClaimedUrl);
          if (res2.ok) {
            const fc2 = await res2.json();
            if (!cancelled) setClaimedTerritory(fc2.features?.[0] ?? null);
          }
        } catch {}
      }
    };

    loadData();

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
    if (r) {
      setHover({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, target });
      if (onHoverFeature) {
        if (target.kind === "state") {
          const s = states.find((x) => x.properties.state_id === target.id);
          if (s) {
            onHoverFeature({
              name: s.properties.state_name,
              level: target.id === "IN-MP" ? "Operational Pilot State" : "National State",
              riskScore: target.id === "IN-MP" ? 36 : undefined,
              riskBand: target.id === "IN-MP" ? "watch" : undefined,
            });
          }
        } else if (target.kind === "district") {
          const d = shown.find((x) => x.properties.region_id === target.id);
          const region = byRegionId.get(target.id);
          if (d) {
            const sc = region ? Math.round((region.risk_score ?? 0) * 100) : undefined;
            const b = sc !== undefined ? (sc >= 65 ? "alert" : sc >= 40 ? "watch" : "calm") : undefined;
            onHoverFeature({
              name: d.properties.region_name,
              level: `District (${d.properties.state_name})`,
              riskScore: sc,
              riskBand: b,
            });
          }
        }
      }
    }
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
        badge: isMP ? "OPERATIONAL ML PILOT" : "OUTSIDE ML COVERAGE",
        body: isMP
          ? [
              `State: ${f.properties.state_name} (Operational Pilot Basin)`,
              `55 Districts · 313 Blocks · 603 Evaluated Gram Panchayats`,
              `${aggregation === "worst" ? "Peak District Risk" : "Basin Mean Risk"}: ${(roll?.value ? roll.value * 100 : 36).toFixed(1)}%`,
              "Click to drill down into 55 Districts and constituent Blocks",
            ].filter(Boolean)
          : [
              `State: ${f.properties.state_name} (National Level)`,
              "Contains all constituent Districts, Blocks & Gram Panchayats.",
              "Outside active ML pilot basin (Phase 2 Roadmap).",
            ],
      };
    }
    const f = shown.find((x) => x.properties.region_id === t.id);
    if (!f) return null;
    const region = byRegionId.get(t.id);
    const scored = region ? isScoredRegion(region) : false;
    const isMP = f.properties.state_id === "IN-MP";

    return {
      title: `${f.properties.region_name} District`,
      badge: isMP ? "PANCHAYAT DOWNSCALING READY" : "OFF-GRID",
      body: scored && region
        ? [
            `State: ${f.properties.state_name} | District: ${f.properties.region_name}`,
            `Weather Risk Index: ${((region.risk_score ?? 0) * 100).toFixed(1)}%`,
            region.dominant_variable ? `Primary Meteorological Driver: ${region.dominant_variable}` : "",
            isMP ? "Click to inspect constituent Blocks and Gram Panchayats" : "Coarse synoptic view",
          ].filter(Boolean)
        : [
            `State: ${f.properties.state_name} | District: ${f.properties.region_name}`,
            isMP
              ? "All constituent Blocks & Gram Panchayats calibrated. Click to inspect."
              : "Off-grid district: High-resolution downscaling coming in Phase 2.",
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
      {!hideHeader && (
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
      )}

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
              }

              return (
                <path
                  key={f.properties.state_id}
                  d={pathFor(f.geometry)}
                  className={`gm-region ${fillClass} ${isMP ? "gm-region-mp" : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${f.properties.state_name}${band ? `, ${bandLabel(band)}` : ""}`}
                  onClick={() => handleSetActiveState(f.properties.state_id, f.properties.state_name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSetActiveState(f.properties.state_id, f.properties.state_name);
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
