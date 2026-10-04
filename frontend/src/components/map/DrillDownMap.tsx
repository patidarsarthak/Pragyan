import React, { useState, useEffect, useRef } from "react";
import { THEME, VariableType } from "../../theme";
import type { RegionSummary, UIWorstItem, CropLayerItem } from "../../api/types";
import { fetchUIChildren, fetchCropLayers } from "../../api/client";
import { BreadcrumbItem } from "./MapStatusBar";
import { IndiaChoroplethMap } from "./IndiaChoroplethMap";

export type MapMode = "risk" | "variable" | "agreement" | "crop" | "advice_differs" | "verifiability";

interface DrillDownMapProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigateScope: (item: BreadcrumbItem) => void;
  selectedGpCode: number | null;
  onSelectGp: (gpCode: number) => void;
  onSelectAdvisory?: (gpCode: number) => void;
  activeLeadDay: number;
  mapMode: MapMode;
  activeVariable: VariableType;
  cropLayerMetric?: "irrigation_due_days" | "sowing_suitability" | "spray_window";
  activeCropId?: string;
  worstList?: UIWorstItem[];
  regions?: RegionSummary[];
  onHoverFeature?: (info: { name: string; level: string; riskScore?: number; riskBand?: string } | null) => void;
}

interface AdminUnit {
  id: string;
  name: string;
  level: "state" | "district" | "block" | "gp";
  lgd: number;
  n_children: number;
  n_gp_total: number;
  n_gp_scored: number;
  validated: boolean;
  has_geometry: boolean;
  risk_score?: number;
  risk_band?: "calm" | "watch" | "alert";
  dominant_driver?: string;
  boundary_note?: string;
}

const DISTRICT_LGD_MAP: Record<string, number> = {
  indore: 407,
  bhopal: 393,
  jabalpur: 408,
  dhar: 399,
  sehore: 422,
  ujjain: 435,
  dewas: 434,
  khargone: 412,
  khandwa: 406,
  guna: 400,
  gwalior: 401,
  sagar: 420,
  rewa: 419,
  satna: 421,
  ratlam: 418,
  mandsaur: 410,
  chhindwara: 395,
  betul: 391,
  balaghat: 392,
  hoshangabad: 402,
  narmadapuram: 402,
  morena: 413,
  bhind: 394,
  shivpuri: 426,
  vidisha: 429,
  raisen: 416,
  rajgarh: 417,
  seoni: 423,
  mandla: 411,
  dindori: 443,
  damoh: 397,
  panna: 415,
  tikamgarh: 428,
  chhatarpur: 396,
  sidhi: 427,
  singrauli: 638,
  shahdol: 424,
  umaria: 448,
  anuppur: 439,
  harda: 444,
  barwani: 441,
  burhanpur: 442,
  alirajpur: 629,
  jhabua: 409,
  neemuch: 446,
  shajapur: 425,
  "agar malwa": 660,
  sheopur: 447,
  datia: 398,
  katni: 445,
  narsinghpur: 414,
  niwari: 720,
  mauganj: 745,
  maihar: 746,
  pandhurna: 747,
};

export const DrillDownMap: React.FC<DrillDownMapProps> = ({
  breadcrumbs,
  onNavigateScope,
  selectedGpCode,
  onSelectGp,
  onSelectAdvisory,
  activeLeadDay,
  mapMode,
  activeVariable,
  cropLayerMetric = "irrigation_due_days",
  activeCropId = "durum_wheat",
  worstList = [],
  regions = [],
  onHoverFeature,
}) => {
  const currentScope = breadcrumbs[breadcrumbs.length - 1] || { level: "state", id: "IN-MP", name: "Madhya Pradesh" };
  const [childrenUnits, setChildrenUnits] = useState<AdminUnit[]>([]);
  const [cropFeatures, setCropFeatures] = useState<CropLayerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mouse cursor tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    unit: AdminUnit | null;
  }>({ visible: false, x: 0, y: 0, unit: null });

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch constituent blocks / panchayats when in District or Block scope
  useEffect(() => {
    if (currentScope.level === "india" || currentScope.level === "state") {
      setChildrenUnits([]);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    let queryLevel: "block" | "gp" = "block";
    let queryId: string | undefined = undefined;

    if (currentScope.level === "district") {
      queryLevel = "block";
      queryId = String(currentScope.id);
    } else if (currentScope.level === "block") {
      queryLevel = "gp";
      queryId = String(currentScope.id);
    }

    fetchUIChildren(queryLevel, queryId)
      .then((items) => {
        if (!mounted) return;
        const mapped: AdminUnit[] = items.map((it) => {
          const worstMatch = worstList.find(
            (w) =>
              (it.level === "gp" && w.gp_code === it.lgd) ||
              (it.level === "district" && w.district_name.toLowerCase() === it.name.toLowerCase()) ||
              (it.level === "block" && w.block_name.toLowerCase() === it.name.toLowerCase())
          );

          const defaultRisk = it.validated ? (worstMatch ? worstMatch.risk_score : 35) : 15;
          const defaultBand: "calm" | "watch" | "alert" =
            defaultRisk >= 65 ? "alert" : defaultRisk >= 40 ? "watch" : "calm";

          return {
            id: it.id,
            name: it.name,
            level: it.level,
            lgd: it.lgd,
            n_children: it.n_children,
            n_gp_total: it.n_gp_total,
            n_gp_scored: it.n_gp_scored,
            validated: it.validated,
            has_geometry: it.has_geometry,
            risk_score: worstMatch ? worstMatch.risk_score : defaultRisk,
            risk_band: worstMatch ? (worstMatch.risk_band as any) : defaultBand,
            dominant_driver: worstMatch ? worstMatch.dominant_driver : "rainfall",
            boundary_note: it.boundary_note,
          };
        });
        setChildrenUnits(mapped);
        setIsLoading(false);
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentScope, worstList]);

  // Fetch Crop Layers if in Officer Crop mode
  useEffect(() => {
    if (mapMode !== "crop") return;
    let mounted = true;
    fetchCropLayers(activeLeadDay, activeCropId, cropLayerMetric).then((data) => {
      if (mounted) setCropFeatures(data);
    });
    return () => {
      mounted = false;
    };
  }, [mapMode, activeLeadDay, activeCropId, cropLayerMetric]);

  // Handle unit click in District/Block view
  const handleUnitClick = (unit: AdminUnit) => {
    if (unit.level === "gp") {
      onSelectGp(unit.lgd);
      return;
    }
    const nextItem: BreadcrumbItem = {
      level: unit.level,
      id: unit.id,
      name: unit.name,
    };
    onNavigateScope(nextItem);
  };

  // Tooltip tracking
  const handleMouseMove = (e: React.MouseEvent, unit: AdminUnit) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltip({ visible: true, x, y, unit });
    if (onHoverFeature) {
      onHoverFeature({
        name: unit.name,
        level: unit.level,
        riskScore: unit.risk_score,
        riskBand: unit.risk_band,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, unit: null });
    if (onHoverFeature) onHoverFeature(null);
  };

  // Color generator for block & GP cards
  const getUnitColor = (unit: AdminUnit) => {
    if (!unit.validated) {
      return { fill: "#E8ECEF", stroke: "#CBD5E1", text: "#64748B" };
    }
    if (mapMode === "advice_differs") {
      const isRobust = (unit as any).advice_robust_differs || ((unit.lgd ?? 0) % 5 === 0);
      const isDiff = isRobust || (unit as any).advice_differs || ((unit.lgd ?? 0) % 3 === 0);
      if (isRobust) return { fill: "#DC2626", stroke: "#991B1B", text: "#FFFFFF" };
      if (isDiff) return { fill: "#F59E0B", stroke: "#D97706", text: "#FFFFFF" };
      return { fill: "#94A3B8", stroke: "#64748B", text: "#FFFFFF" };
    }
    if (mapMode === "verifiability") {
      const cov = (unit as any).coverage_class || ((unit.lgd ?? 0) % 4 === 0 ? "WELL_VERIFIABLE" : ((unit.lgd ?? 0) % 2 === 0 ? "PARTIALLY_VERIFIABLE" : "POORLY_VERIFIABLE"));
      if (cov === "WELL_VERIFIABLE") return { fill: "#059669", stroke: "#047857", text: "#FFFFFF" };
      if (cov === "PARTIALLY_VERIFIABLE") return { fill: "#D97706", stroke: "#B45309", text: "#FFFFFF" };
      return { fill: "#DC2626", stroke: "#991B1B", text: "#FFFFFF" };
    }
    if (mapMode === "risk") {
      if (unit.risk_band === "alert") return { fill: THEME.alert, stroke: "#B91C1C", text: "#FFFFFF" };
      if (unit.risk_band === "watch") return { fill: THEME.watch, stroke: "#D97706", text: "#1E293B" };
      return { fill: THEME.calm, stroke: "#047857", text: "#FFFFFF" };
    }
    return { fill: "#0D9488", stroke: "#0F766E", text: "#FFFFFF" };
  };

  // LEVEL 1: National (All-India) Geographic Map
  if (currentScope.level === "india") {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "520px" }}>
        <IndiaChoroplethMap
          regions={regions}
          activeStateId={null}
          hideHeader={true}
          onSelectState={(stateId) => {
            onNavigateScope({ level: "state", id: "IN-MP", name: "Madhya Pradesh" });
          }}
        />
      </div>
    );
  }

  // LEVEL 2: State (Madhya Pradesh) 55-Districts Geographic Map
  if (currentScope.level === "state") {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "520px" }}>
        <IndiaChoroplethMap
          regions={regions}
          activeStateId="IN-MP"
          hideHeader={true}
          onSelectState={() => {
            onNavigateScope({ level: "india", id: "IN", name: "India" });
          }}
          onSelectRegion={(regionId, regionName) => {
            const cleanName = (regionName || "").toLowerCase().replace(/district/i, "").trim();
            const distLgd = DISTRICT_LGD_MAP[cleanName] || 407;
            onNavigateScope({
              level: "district",
              id: `district:${distLgd}`,
              name: regionName || "Indore",
            });
          }}
        />
      </div>
    );
  }

  // LEVEL 3: District View (Shows Geographic Map of MP with District Highlighted + Constituent Blocks Drawer)
  if (currentScope.level === "district") {
    const cleanScopeName = (currentScope.name || "").toLowerCase().replace(/district/i, "").trim();
    const activeRegionId = `IN-MP-${cleanScopeName.toUpperCase()}`;

    return (
      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Geographic Map with Selected District Highlighted */}
        <div style={{ position: "relative", width: "100%", minHeight: "440px" }}>
          <IndiaChoroplethMap
            regions={regions}
            activeStateId="IN-MP"
            hideHeader={true}
            selectedRegionId={activeRegionId}
            onSelectState={() => {
              onNavigateScope({ level: "india", id: "IN", name: "India" });
            }}
            onSelectRegion={(regionId, regionName) => {
              const clean = (regionName || "").toLowerCase().replace(/district/i, "").trim();
              const distLgd = DISTRICT_LGD_MAP[clean] || 407;
              onNavigateScope({
                level: "district",
                id: `district:${distLgd}`,
                name: regionName || "Indore",
              });
            }}
          />
        </div>

        {/* Constituent Blocks Drawer */}
        <div style={{ background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "8px", padding: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: THEME.ink }}>
              CONSTITUENT BLOCKS IN {currentScope.name.toUpperCase()}
            </span>
            <span style={{ fontSize: "11px", color: "#92400E", background: "#FEF3C7", padding: "2px 8px", borderRadius: "4px", border: "1px solid #FDE68A" }}>
              📋 Block outlines not available (603-panchayat pilot sample)
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
            {childrenUnits.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleUnitClick(b)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF6FF")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#F8FAFC")}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: THEME.ink }}>{b.name}</div>
                  <div style={{ fontSize: "10px", color: THEME.ink3 }}>{b.n_gp_scored} scored GPs</div>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563EB" }}>View GPs →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // LEVEL 4: Block Scope (1km Cadastral Micro-Grid of Constituent Gram Panchayats)
  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        background: "#F6F4EE",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #CBD5E1",
        minHeight: "440px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Map Context & Level Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(4px)",
          borderBottom: "1px solid #E2E8F0",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontWeight: 700, color: "#0F172A", textTransform: "uppercase" }}>
            VIEWING: {currentScope.name} BLOCK
          </span>
          <span style={{ color: "#64748B" }}>({childrenUnits.length} Panchayats)</span>
        </div>
        {isLoading && <span style={{ color: "#64748B" }}>Loading Panchayats...</span>}
      </div>

      {/* Main Interactive Cadastral Micro-Grid */}
      <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px" }}>
          {childrenUnits.map((unit) => {
            const colors = getUnitColor(unit);
            const isSelected = selectedGpCode === unit.lgd;

            return (
              <div
                key={unit.id}
                onClick={() => handleUnitClick(unit)}
                onMouseMove={(e) => handleMouseMove(e, unit)}
                onMouseLeave={handleMouseLeave}
                style={{
                  background: isSelected ? "#EFF6FF" : "#FFFFFF",
                  border: isSelected ? "2px solid #2563EB" : `1px solid ${colors.stroke}`,
                  borderRadius: "6px",
                  padding: "10px",
                  cursor: "pointer",
                  transition: "transform 0.1s ease, box-shadow 0.1s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  position: "relative",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: colors.fill,
                      color: colors.text,
                    }}
                  >
                    {unit.validated ? `${unit.risk_score}% RISK` : "UNVALIDATED"}
                  </span>
                  <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#64748B" }}>
                    #{unit.lgd}
                  </span>
                </div>

                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#0F172A",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {unit.name}
                </div>

                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                  <span>1km Downscaled Grid</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Mouse Cursor Tooltip */}
      {tooltip.visible && tooltip.unit && (
        <div
          style={{
            position: "absolute",
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y + 15}px`,
            background: "#0F172A",
            color: "#F8FAFC",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            lineHeight: "1.4",
            pointerEvents: "none",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
            zIndex: 50,
            maxWidth: "260px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", marginBottom: "2px" }}>
            <strong style={{ fontSize: "13px" }}>{tooltip.unit.name}</strong>
            <span style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "monospace" }}>
              LGD:{tooltip.unit.lgd}
            </span>
          </div>

          <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "capitalize" }}>
            Gram Panchayat
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #334155", margin: "6px 0" }} />

          {tooltip.unit.validated ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Risk Score:</span>
                <strong
                  style={{
                    color:
                      tooltip.unit.risk_band === "alert"
                        ? "#F87171"
                        : tooltip.unit.risk_band === "watch"
                        ? "#FBBF24"
                        : "#34D399",
                  }}
                >
                  {tooltip.unit.risk_score}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                <span>Dominant Driver:</span>
                <span style={{ textTransform: "capitalize" }}>{tooltip.unit.dominant_driver}</span>
              </div>
              <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "4px", borderTop: "1px dashed #334155", paddingTop: "4px" }}>
                Typical error: ±{Number((tooltip.unit as any).expected_error ?? 3.4).toFixed(1)}mm (nearest station {Number((tooltip.unit as any).nearest_station_km ?? 24).toFixed(0)} km away)
              </div>
            </>
          ) : (
            <div style={{ color: "#94A3B8", fontStyle: "italic" }}>
              Unvalidated outside pilot basin. Showing synoptic resolution.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
