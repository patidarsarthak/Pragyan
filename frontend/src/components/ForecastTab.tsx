import React, { useState, useMemo, useEffect, useRef } from "react";
import { Language, t } from "../lib/i18n";
import { THEME, VariableType } from "../theme";
import {
  fetchUIOverview,
  fetchUIHero,
  fetchUIGP,
  fetchUITenDay,
  fetchUIWorst,
  fetchRegionsByLeadDay,
} from "../api/client";
import type {
  UIHeroResponse,
  UIOverviewResponse,
  UIGPDetailResponse,
  UITenDayCompactResponse,
  UIWorstItem,
  RegionSummary,
  UISearchV2Result,
} from "../api/types";
import { HeroSection } from "./dashboard/HeroSection";
import { DayRail } from "./dashboard/DayRail";
import { PanchayatDetailPanel } from "./detail/PanchayatDetailPanel";
import { TenDayForecastCard } from "./dashboard/TenDayForecastCard";
import { MapStatusBar, BreadcrumbItem } from "./map/MapStatusBar";
import { OmniboxSearch } from "./map/OmniboxSearch";
import { DrillDownMap, MapMode } from "./map/DrillDownMap";
import { FarmerAdvisoryModal } from "./farmer/FarmerAdvisoryModal";

interface ForecastTabProps {
  lang: Language;
}

export const ForecastTab: React.FC<ForecastTabProps> = ({ lang }) => {
  // Global Selection State
  const [activeLeadDay, setActiveLeadDay] = useState<number>(1);
  const [mapMode, setMapMode] = useState<MapMode>("risk");
  const [activeVariable, setActiveVariable] = useState<VariableType>("rainfall");
  const [cropLayerMetric, setCropLayerMetric] = useState<"irrigation_due_days" | "sowing_suitability" | "spray_window">(
    "irrigation_due_days"
  );
  const [activeCropId, setActiveCropId] = useState<string>("durum_wheat");

  // 4-Level Breadcrumbs State (Starts at All India national level)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { level: "india", id: "IN", name: "India" },
  ]);

  const [selectedGpCode, setSelectedGpCode] = useState<number | null>(null); // Spec 13: No default panchayat
  const [scopeSummary, setScopeSummary] = useState<any>(null);
  const [hoverFeature, setHoverFeature] = useState<{
    name: string;
    level: string;
    riskScore?: number;
    riskBand?: string;
  } | null>(null);

  // Farmer Advisory Modal State
  const [advisoryModalGp, setAdvisoryModalGp] = useState<number | null>(null);

  // Remote Data State
  const [heroData, setHeroData] = useState<UIHeroResponse | null>(null);
  const [overviewData, setOverviewData] = useState<UIOverviewResponse | null>(null);
  const [gpData, setGpData] = useState<UIGPDetailResponse | null>(null);
  const [tenDayData, setTenDayData] = useState<UITenDayCompactResponse | null>(null);
  const [worstList, setWorstList] = useState<UIWorstItem[]>([]);
  const [isLoadingGP, setIsLoadingGP] = useState<boolean>(false);

  const opsGridRef = useRef<HTMLDivElement>(null);

  // Derived current scope from breadcrumbs
  const currentScope = breadcrumbs[breadcrumbs.length - 1];

  // Read initial URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dayParam = params.get("day");
    if (dayParam && !isNaN(Number(dayParam))) {
      const d = Math.max(1, Math.min(10, Number(dayParam)));
      setActiveLeadDay(d);
    }
    const gpParam = params.get("gp");
    if (gpParam && !isNaN(Number(gpParam))) {
      setSelectedGpCode(Number(gpParam));
    }
  }, []);

  // Sync state to URL params (without reload)
  const updateUrlParams = (day: number, gpCode: number | null) => {
    const url = new URL(window.location.href);
    url.searchParams.set("day", String(day));
    if (gpCode) url.searchParams.set("gp", String(gpCode));
    else url.searchParams.delete("gp");
    window.history.replaceState({}, "", url.toString());
  };

  // 1. Fetch Hero Data
  useEffect(() => {
    let mounted = true;
    fetchUIHero().then((res) => {
      if (mounted && res) setHeroData(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Fetch Scope Summary for active level and day
  useEffect(() => {
    let mounted = true;
    const scopeId = currentScope.id || "IN";
    fetch(`/api/ui/scope/summary?level=${currentScope.level}&id=${encodeURIComponent(scopeId)}&day=${activeLeadDay}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data) setScopeSummary(data);
      })
      .catch((err) => console.error("Failed to load scope summary:", err));

    return () => {
      mounted = false;
    };
  }, [currentScope.level, currentScope.id, activeLeadDay]);

  // 3. Fetch Overview Data & Worst List scoped to active level
  useEffect(() => {
    let mounted = true;
    const scopeId = currentScope.id || "IN";
    Promise.all([
      fetchUIOverview(activeLeadDay),
      fetch(`/api/ui/worst?day=${activeLeadDay}&scope=${currentScope.level}&id=${encodeURIComponent(scopeId)}&limit=20`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    ]).then(([overview, worst]) => {
      if (!mounted) return;
      if (overview) setOverviewData(overview);
      if (worst) setWorstList(worst);
    });

    return () => {
      mounted = false;
    };
  }, [activeLeadDay, currentScope.level, currentScope.id]);

  // 3. Fetch Selected Panchayat Data & Ten-Day Compact Data
  useEffect(() => {
    if (!selectedGpCode) {
      setGpData(null);
      setTenDayData(null);
      return;
    }
    let mounted = true;
    setIsLoadingGP(true);
    Promise.all([fetchUIGP(selectedGpCode), fetchUITenDay(selectedGpCode)])
      .then(([gpRes, tenDayRes]) => {
        if (!mounted) return;
        setGpData(gpRes);
        setTenDayData(tenDayRes);
        setIsLoadingGP(false);
      })
      .catch(() => {
        if (mounted) setIsLoadingGP(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedGpCode]);

  // Handle Day Selection
  const handleSelectDay = (day: number) => {
    setActiveLeadDay(day);
    updateUrlParams(day, selectedGpCode);
  };

  // Handle Breadcrumb Jump Click
  const handleBreadcrumbClick = (item: BreadcrumbItem, index: number) => {
    setSelectedGpCode(null);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  // Handle Map Scope Navigation Drill-down (strictly enforces single-level hierarchy without duplicates)
  const handleNavigateScope = (nextItem: BreadcrumbItem) => {
    setSelectedGpCode(null);

    setBreadcrumbs((prev) => {
      const current = prev[prev.length - 1];
      if (
        current &&
        current.level === nextItem.level &&
        (current.id === nextItem.id || current.name.toLowerCase() === nextItem.name.toLowerCase())
      ) {
        return prev;
      }

      const LEVEL_ORDER: Record<string, number> = {
        india: 0,
        country: 0,
        state: 1,
        district: 2,
        block: 3,
        gp: 4,
      };

      const targetOrder = LEVEL_ORDER[nextItem.level] ?? 2;
      const cutIdx = prev.findIndex((item) => (LEVEL_ORDER[item.level] ?? 0) >= targetOrder);

      if (cutIdx !== -1) {
        return [...prev.slice(0, cutIdx), nextItem];
      }

      return [...prev, nextItem];
    });
  };

  // Handle Search Result Select
  const handleSelectSearchResult = (result: UISearchV2Result) => {
    if (result.path && result.path.length > 0) {
      const newBc: BreadcrumbItem[] = [
        { level: "india", id: "IN", name: "India" },
        ...result.path.map((p) => ({
          level: p.level as any,
          id: p.id,
          name: p.name,
        })),
      ];
      setBreadcrumbs(newBc);
    }

    if (result.level === "gp") {
      setSelectedGpCode(result.lgd);
      updateUrlParams(activeLeadDay, result.lgd);
    }
  };

  // Handle Panchayat Click (from worst list or search)
  const handleSelectPanchayat = (lgdCode: number) => {
    setSelectedGpCode(lgdCode);
    updateUrlParams(activeLeadDay, lgdCode);
  };

  // Scroll smoothly down to the Operations Grid
  const scrollToMap = () => {
    opsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Active level calculation
  const isValidated =
    currentScope.id === "IN-MP" ||
    currentScope.id === "IN-23" ||
    String(currentScope.id).startsWith("district:") ||
    String(currentScope.id).startsWith("block:") ||
    String(currentScope.id).startsWith("gp:");

  const alertCount = worstList.filter((w) => w.risk_band === "alert").length;

  // Map overviewData.regions to RegionSummary objects matching IndiaChoroplethMap topojson keys
  const mappedRegions: RegionSummary[] = useMemo(() => {
    if (!overviewData?.regions) return [];
    return overviewData.regions.map((r: any) => {
      let regionId = r.id || r.region_id;
      if (r.state === "Madhya Pradesh" || String(r.id || "").includes("MP")) {
        const n = (r.name || "").toLowerCase();
        if (n.includes("east nimar") || n.includes("khandwa")) regionId = "IN-MP-EASTNIMAR";
        else if (n.includes("west nimar") || n.includes("khargone")) regionId = "IN-MP-WESTNIMAR";
        else if (n.includes("hoshangabad") || n.includes("narmadapuram")) regionId = "IN-MP-HOSHANGABAD";
        else if (n.includes("narsimhapur") || n.includes("narsinghpur")) regionId = "IN-MP-NARSIMHAPUR";
        else {
          const alpha = (r.name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
          regionId = `IN-MP-${alpha}`;
        }
      }

      return {
        region_id: regionId,
        region_name: r.name || r.region_name,
        state_id: r.state === "Madhya Pradesh" ? "IN-MP" : (r.state_id || "IN-MP"),
        state_name: r.state || r.state_name || "Madhya Pradesh",
        risk_score:
          typeof r.mean_risk === "number"
            ? r.mean_risk / 100
            : typeof r.risk_score === "number"
            ? r.risk_score > 1
              ? r.risk_score / 100
              : r.risk_score
            : 0.35,
        risk_band:
          r.band === "alert"
            ? "high"
            : r.band === "watch"
            ? "medium"
            : r.band === "calm"
            ? "low"
            : (r.risk_band as any) || "low",
        confidence: r.mean_agreement ?? r.confidence ?? 0.85,
        dominant_variable: r.dominant_variable ?? "rainfall",
        data_available: r.data_available ?? true,
      };
    });
  }, [overviewData]);

  return (
    <div className="sk-page-layout">
      {/* 1. Opening Screen / Hero Section */}
      <HeroSection
        heroData={heroData}
        day={activeLeadDay}
        onExploreMap={scrollToMap}
        onSelectDay={handleSelectDay}
        lang={lang}
      />

      {/* 2. Feed Freshness Strip */}
      <div className="sk-freshness-bar" id="operations-grid" ref={opsGridRef}>
        <div className="sk-fresh-item">
          <span className="sk-fresh-dot" />
          <span className="sk-fresh-text">
            {t("feedOperational", lang)}
          </span>
        </div>
        <div className="sk-fresh-item sk-mono-meta">
          {t("feedValidity", lang, { day: String(activeLeadDay) })}
        </div>
      </div>

      {/* 3. Operations 3-Column Grid: [ Map Column | Day Rail | Detail Panel ] */}
      <div className="sk-ops-grid">
        {/* Left Column: Map Card & Toolbar */}
        <section className="sk-map-column">
          {/* Map Toolbar with 4 Mode Toggles */}
          <div className="sk-map-toolbar">
            <div className="sk-toggle-group" role="radiogroup" aria-label="Map Display Layers">
              <button
                className={`sk-toggle-btn ${mapMode === "risk" ? "is-active" : ""}`}
                onClick={() => setMapMode("risk")}
                role="radio"
                aria-checked={mapMode === "risk"}
              >
                {t("mapModeRisk", lang)}
              </button>
              <button
                className={`sk-toggle-btn ${mapMode === "variable" ? "is-active" : ""}`}
                onClick={() => setMapMode("variable")}
                role="radio"
                aria-checked={mapMode === "variable"}
              >
                {t("mapModeVariable", lang)}
              </button>
              <button
                className={`sk-toggle-btn ${mapMode === "agreement" ? "is-active" : ""}`}
                onClick={() => setMapMode("agreement")}
                role="radio"
                aria-checked={mapMode === "agreement"}
              >
                {t("mapModeAgreement", lang)}
              </button>
              <button
                className={`sk-toggle-btn ${mapMode === "crop" ? "is-active" : ""}`}
                onClick={() => setMapMode("crop")}
                role="radio"
                aria-checked={mapMode === "crop"}
                style={{ fontWeight: 700, color: mapMode === "crop" ? "#16A34A" : undefined }}
              >
                {t("mapModeCrop", lang)}
              </button>
              <button
                className={`sk-toggle-btn ${mapMode === "advice_differs" ? "is-active" : ""}`}
                onClick={() => setMapMode("advice_differs")}
                role="radio"
                aria-checked={mapMode === "advice_differs"}
                style={{ fontWeight: 600, color: mapMode === "advice_differs" ? "#D97706" : undefined }}
              >
                {lang === "hi" ? "ब्लॉक विचलन" : "Advice Differs"}
              </button>
              <button
                className={`sk-toggle-btn ${mapMode === "verifiability" ? "is-active" : ""}`}
                onClick={() => setMapMode("verifiability")}
                role="radio"
                aria-checked={mapMode === "verifiability"}
                style={{ fontWeight: 600, color: mapMode === "verifiability" ? "#059669" : undefined }}
              >
                {lang === "hi" ? "सत्यापनीयता" : "Verifiability"}
              </button>
            </div>

            {/* Variable Pills (when variable mode is active) */}
            {mapMode === "variable" && (
              <div className="sk-var-pills">
                {(
                  [
                    { id: "rainfall", label: t("varRainfall", lang) },
                    { id: "temperature", label: t("varTemperature", lang) },
                    { id: "humidity", label: t("varHumidity", lang) },
                    { id: "wind", label: t("varWind", lang) },
                    { id: "et0", label: t("varET0", lang) },
                  ] as Array<{ id: VariableType; label: string }>
                ).map((v) => (
                  <button
                    key={v.id}
                    className={`sk-var-pill ${activeVariable === v.id ? "is-active" : ""}`}
                    onClick={() => setActiveVariable(v.id)}
                  >
                    {v.label.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Crop Mode Sub-selectors (when crop mode is active) */}
            {mapMode === "crop" && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "8px" }}>
                <select
                  value={activeCropId}
                  onChange={(e) => setActiveCropId(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "12px",
                    background: "#FFFFFF",
                  }}
                >
                  <option value="durum_wheat">{t("cropDurumWheat", lang)}</option>
                  <option value="bread_wheat">{t("cropBreadWheat", lang)}</option>
                  <option value="chickpea">{t("cropChickpea", lang)}</option>
                  <option value="mustard">{t("cropMustard", lang)}</option>
                  <option value="soybean">{t("cropSoybean", lang)}</option>
                  <option value="maize">{t("cropMaize", lang)}</option>
                  <option value="cotton">{t("cropCotton", lang)}</option>
                </select>

                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    className={`sk-var-pill ${cropLayerMetric === "irrigation_due_days" ? "is-active" : ""}`}
                    onClick={() => setCropLayerMetric("irrigation_due_days")}
                  >
                    {t("cropMetricIrrigation", lang)}
                  </button>
                  <button
                    type="button"
                    className={`sk-var-pill ${cropLayerMetric === "sowing_suitability" ? "is-active" : ""}`}
                    onClick={() => setCropLayerMetric("sowing_suitability")}
                  >
                    {t("cropMetricSowing", lang)}
                  </button>
                  <button
                    type="button"
                    className={`sk-var-pill ${cropLayerMetric === "spray_window" ? "is-active" : ""}`}
                    onClick={() => setCropLayerMetric("spray_window")}
                  >
                    {t("cropMetricSpray", lang)}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Omnibox Search Above Map */}
          <div style={{ marginBottom: "10px" }}>
            <OmniboxSearch
              onSelectResult={handleSelectSearchResult}
              placeholder={t("searchPlaceholder", lang)}
              lang={lang}
            />
          </div>

          {/* Live Map Status Bar */}
          <MapStatusBar
            breadcrumbs={breadcrumbs}
            onBreadcrumbClick={handleBreadcrumbClick}
            activeLevelName={currentScope.name}
            scoredCount={scopeSummary?.n_gp_scored ?? (currentScope.level === "india" ? 603 : 10)}
            totalCount={scopeSummary?.n_gp_total ?? (currentScope.level === "india" ? 255000 : (currentScope.name.includes("Panna") ? 395 : 23043))}
            alertCount={scopeSummary?.pills?.n_alert ?? alertCount}
            leadDay={activeLeadDay}
            dominantVariable={scopeSummary?.rail?.[activeLeadDay - 1]?.dominant_variable ?? "rainfall"}
            meanRisk={scopeSummary?.rail?.[activeLeadDay - 1]?.mean_risk ?? 36}
            isValidated={isValidated}
            boundaryNote={
              currentScope.level === "india"
                ? (lang === "hi" ? "अखिल भारत · 36 में से 1 राज्य में एमएल (मध्य प्रदेश पायलट मूल्यांकन बेसिन)" : "ALL INDIA · 1 OF 36 STATES WITH ML (Madhya Pradesh Pilot Evaluation Basin)")
                : currentScope.level === "district"
                ? t("blockOutlineNotice", lang)
                : undefined
            }
            hoverInfo={hoverFeature}
            lang={lang}
          />

          {/* Drill-Down Paper Style Map Card */}
          <div className="sk-card sk-map-card" style={{ padding: 0, overflow: "hidden" }}>
            <DrillDownMap
              breadcrumbs={breadcrumbs}
              onNavigateScope={handleNavigateScope}
              selectedGpCode={selectedGpCode}
              onSelectGp={handleSelectPanchayat}
              onSelectAdvisory={(lgd) => setAdvisoryModalGp(lgd)}
              activeLeadDay={activeLeadDay}
              mapMode={mapMode}
              activeVariable={activeVariable}
              cropLayerMetric={cropLayerMetric}
              activeCropId={activeCropId}
              worstList={worstList}
              regions={mappedRegions}
              onHoverFeature={setHoverFeature}
            />

            {/* Map Legend */}
            <div className="sk-map-legend" style={{ padding: "10px 14px" }}>
              <span className="sk-legend-title">
                {mapMode === "risk"
                  ? t("legendRiskTitle", lang)
                  : mapMode === "agreement"
                  ? t("mapModeAgreement", lang) + ":"
                  : mapMode === "crop"
                  ? t("mapModeCrop", lang) + ":"
                  : mapMode === "advice_differs"
                  ? (lang === "hi" ? "ब्लॉक से सलाह विचलन:" : "Advice Differs from Block:")
                  : mapMode === "verifiability"
                  ? (lang === "hi" ? "वेधशाला निकटता / सत्यापनीयता:" : "Verifiability / Station Proximity:")
                  : t("mapModeVariable", lang) + ":"}
              </span>
              <div className="sk-legend-swatches">
                {mapMode === "advice_differs" ? (
                  <>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: "#94A3B8" }} />
                      Same as Block
                    </span>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: "#F59E0B" }} />
                      Advice Differs
                    </span>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: "#DC2626" }} />
                      Robust Differs (|ΔP| ≥ 10%)
                    </span>
                  </>
                ) : mapMode === "verifiability" ? (
                  <>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: "#059669" }} />
                      Well Verifiable (≤30km)
                    </span>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: "#D97706" }} />
                      Partial (30-80km)
                    </span>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: "#DC2626" }} />
                      Poorly Verifiable (&gt;80km)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: THEME.calm }} />
                      {t("legendCalm", lang)}
                    </span>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: THEME.watch }} />
                      {t("legendWatch", lang)}
                    </span>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: THEME.alert }} />
                      {t("legendAlert", lang)}
                    </span>
                    <span className="sk-legend-swatch-item">
                      <span className="sk-swatch-box" style={{ background: THEME.nodata }} />
                      {t("legendNoData", lang)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Center Column: Center 10-Day Rail */}
        <section className="sk-rail-column">
          <DayRail currentDay={activeLeadDay} onSelectDay={handleSelectDay} lang={lang} />
        </section>

        {/* Right Column: Detail Panel or Top 20 Worst */}
        <section className="sk-panel-column">
          <PanchayatDetailPanel
            gpData={gpData}
            worstList={worstList}
            selectedDay={activeLeadDay}
            scopeLevel={currentScope.level}
            scopeName={currentScope.name}
            onSelectGP={handleSelectPanchayat}
            onOpenAdvisory={(lgd) => setAdvisoryModalGp(lgd)}
            onClose={() => setSelectedGpCode(null)}
            lang={lang}
          />
        </section>
      </div>

      {/* 4. Full-Width Ten-Day Multi-Variable Forecast Card */}
      <section className="sk-fullwidth-section">
        <TenDayForecastCard
          tenDayData={tenDayData}
          selectedDay={activeLeadDay}
          onSelectDay={handleSelectDay}
          lang={lang}
        />
      </section>

      {/* 5. Farmer Advisory Modal */}
      {advisoryModalGp && (
        <FarmerAdvisoryModal
          gpCode={advisoryModalGp}
          gpName={gpData?.gp_name || "Sanwer Gram Panchayat"}
          lang={lang}
          onClose={() => {
            setAdvisoryModalGp(null);
            const url = new URL(window.location.href);
            if (url.searchParams.has("advisory") || url.searchParams.has("farmer")) {
              url.searchParams.delete("advisory");
              url.searchParams.delete("farmer");
              window.history.replaceState({}, "", url.toString());
            }
          }}
        />
      )}
    </div>
  );
};

export default ForecastTab;
