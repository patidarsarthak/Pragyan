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
} from "../api/types";
import { IndiaChoroplethMap } from "./map/IndiaChoroplethMap";
import { HeroSection } from "./dashboard/HeroSection";
import { DayRail } from "./dashboard/DayRail";
import { PanchayatDetailPanel } from "./detail/PanchayatDetailPanel";
import { TenDayForecastCard } from "./dashboard/TenDayForecastCard";

interface ForecastTabProps {
  lang: Language;
}

export type MapViewMode = "risk" | "variable" | "agreement";

export const ForecastTab: React.FC<ForecastTabProps> = ({ lang }) => {
  // Global Selection State
  const [activeLeadDay, setActiveLeadDay] = useState<number>(1);
  const [mapMode, setMapMode] = useState<MapViewMode>("risk");
  const [activeVariable, setActiveVariable] = useState<VariableType>("rainfall");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>("IN-MP-INDORE");
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>("Indore");
  const [selectedGpCode, setSelectedGpCode] = useState<number | null>(133203); // Sanwer
  const [activeStateId, setActiveStateId] = useState<string | null>("IN-MP");

  // Remote Data State
  const [heroData, setHeroData] = useState<UIHeroResponse | null>(null);
  const [overviewData, setOverviewData] = useState<UIOverviewResponse | null>(null);
  const [gpData, setGpData] = useState<UIGPDetailResponse | null>(null);
  const [tenDayData, setTenDayData] = useState<UITenDayCompactResponse | null>(null);
  const [worstList, setWorstList] = useState<UIWorstItem[]>([]);
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [isLoadingGP, setIsLoadingGP] = useState<boolean>(false);

  const opsGridRef = useRef<HTMLDivElement>(null);

  // Read initial URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dayParam = params.get("day");
    if (dayParam && !isNaN(Number(dayParam))) {
      const d = Math.max(1, Math.min(10, Number(dayParam)));
      setActiveLeadDay(d);
    }
    const regionParam = params.get("region");
    if (regionParam) {
      setSelectedRegionId(regionParam);
      if (regionParam.startsWith("IN-MP-")) {
        const dName = regionParam.replace("IN-MP-", "");
        if (dName) {
          setSelectedDistrictName(dName.charAt(0).toUpperCase() + dName.slice(1).toLowerCase());
        }
      }
    }
    const gpParam = params.get("gp");
    if (gpParam && !isNaN(Number(gpParam))) {
      setSelectedGpCode(Number(gpParam));
    }
  }, []);

  // Sync state to URL params (without reload)
  const updateUrlParams = (day: number, regionId: string | null, gpCode: number | null) => {
    const url = new URL(window.location.href);
    url.searchParams.set("day", String(day));
    if (regionId) url.searchParams.set("region", regionId);
    else url.searchParams.delete("region");
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
    return () => { mounted = false; };
  }, []);

  // 2. Fetch Overview Data & Worst List for current lead day
  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchUIOverview(activeLeadDay),
      fetchUIWorst(activeLeadDay, 20),
      fetchRegionsByLeadDay(activeLeadDay),
    ]).then(([overview, worst, regSummaries]) => {
      if (!mounted) return;
      if (overview) {
        setOverviewData(overview);
        // Map UI aggregates to RegionSummary format for the map
        const mapped: RegionSummary[] = overview.regions.map((r) => ({
          region_id: r.region_id,
          region_name: r.region_name,
          risk_score: r.risk_score,
          risk_band: r.risk_band,
          confidence: r.confidence,
          dominant_variable: r.dominant_variable,
          data_available: r.data_available,
          status_badge: r.data_available ? "OPERATIONAL" : "OFF-GRID",
          state_id: r.state_id,
          state_name: r.state_name,
        }));
        setRegions(mapped);
      } else if (regSummaries && regSummaries.length > 0) {
        setRegions(regSummaries);
      }
      if (worst) setWorstList(worst);
    });

    return () => { mounted = false; };
  }, [activeLeadDay]);

  // 3. Fetch Selected Panchayat Data & Ten-Day Compact Data
  useEffect(() => {
    if (!selectedGpCode) {
      setGpData(null);
      setTenDayData(null);
      return;
    }
    let mounted = true;
    setIsLoadingGP(true);
    Promise.all([
      fetchUIGP(selectedGpCode),
      fetchUITenDay(selectedGpCode),
    ])
      .then(([gpRes, tenDayRes]) => {
        if (!mounted) return;
        setGpData(gpRes);
        setTenDayData(tenDayRes);
        setIsLoadingGP(false);
      })
      .catch(() => {
        if (mounted) setIsLoadingGP(false);
      });

    return () => { mounted = false; };
  }, [selectedGpCode]);

  // Handle Day Selection
  const handleSelectDay = (day: number) => {
    setActiveLeadDay(day);
    updateUrlParams(day, selectedRegionId, selectedGpCode);
  };

  // Handle Map Region Click (Drill down into district)
  const handleSelectRegion = (regionId: string, regionName?: string) => {
    setSelectedRegionId(regionId);
    if (regionName) setSelectedDistrictName(regionName);

    // If district in MP, pick its primary pilot panchayat
    if (regionId.startsWith("IN-MP")) {
      const match = worstList.find((w) =>
        regionName ? String(w.district_name || "").toLowerCase() === regionName.toLowerCase() : false
      );
      if (match) {
        setSelectedGpCode(match.gp_code);
        updateUrlParams(activeLeadDay, regionId, match.gp_code);
        return;
      }
    }
    updateUrlParams(activeLeadDay, regionId, selectedGpCode);
  };

  // Handle Panchayat Click (from worst list or search)
  const handleSelectPanchayat = (lgdCode: number) => {
    setSelectedGpCode(lgdCode);
    updateUrlParams(activeLeadDay, selectedRegionId, lgdCode);
  };

  // Scroll smoothly down to the Operations Grid
  const scrollToMap = () => {
    opsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Re-colour regions if user chooses "Model Agreement" or "Dominant Variable"
  const displayRegions = useMemo(() => {
    if (mapMode === "risk") return regions;
    return regions.map((r) => {
      if (mapMode === "agreement") {
        const conf = r.confidence ?? 0.85;
        return {
          ...r,
          risk_band: conf >= 0.8 ? "calm" : conf >= 0.65 ? "watch" : "alert",
          risk_score: Math.round(conf * 100),
        };
      }
      return r;
    });
  }, [regions, mapMode]);

  return (
    <div className="sk-page-layout">
      {/* 1. Opening Screen / Hero Section */}
      <HeroSection
        heroData={heroData}
        day={activeLeadDay}
        onExploreMap={scrollToMap}
        onSelectDay={handleSelectDay}
      />

      {/* 2. Feed Freshness Strip */}
      <div className="sk-freshness-bar" id="operations-grid" ref={opsGridRef}>
        <div className="sk-fresh-item">
          <span className="sk-fresh-dot" />
          <span className="sk-fresh-text">
            Operational Model Run: <strong>ECMWF IFS Cycle 00z</strong> downscaled to 1km Cadastral Grid
          </span>
        </div>
        <div className="sk-fresh-item sk-mono-meta">
          VALIDITY: DAY {activeLeadDay} · 603 PILOT PANCHAYATS SCORED · 0% MISSING VALUES
        </div>
      </div>

      {/* 3. Operations 3-Column Grid: [ Map Column | Day Rail | Detail Panel ] */}
      <div className="sk-ops-grid">
        {/* Left Column: Map Card & Toolbar */}
        <section className="sk-map-column">
          {/* Map Toolbar with 3 Toggles */}
          <div className="sk-map-toolbar">
            <div className="sk-toggle-group" role="radiogroup" aria-label="Map Display Layers">
              <button
                className={`sk-toggle-btn ${mapMode === "risk" ? "is-active" : ""}`}
                onClick={() => setMapMode("risk")}
                role="radio"
                aria-checked={mapMode === "risk"}
              >
                Risk Score
              </button>
              <button
                className={`sk-toggle-btn ${mapMode === "variable" ? "is-active" : ""}`}
                onClick={() => setMapMode("variable")}
                role="radio"
                aria-checked={mapMode === "variable"}
              >
                Dominant Variable
              </button>
              <button
                className={`sk-toggle-btn ${mapMode === "agreement" ? "is-active" : ""}`}
                onClick={() => setMapMode("agreement")}
                role="radio"
                aria-checked={mapMode === "agreement"}
              >
                Model Agreement
              </button>
            </div>

            {/* Variable Pills (when variable mode is active) */}
            {mapMode === "variable" && (
              <div className="sk-var-pills">
                {(["rainfall", "temperature", "humidity", "wind", "et0"] as VariableType[]).map((v) => (
                  <button
                    key={v}
                    className={`sk-var-pill ${activeVariable === v ? "is-active" : ""}`}
                    onClick={() => setActiveVariable(v)}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SVG Map Card */}
          <div className="sk-card sk-map-card">
            <IndiaChoroplethMap
              regions={displayRegions}
              selectedRegionId={selectedRegionId}
              activeStateId={activeStateId}
              onSelectState={(sId) => setActiveStateId(sId)}
              onSelectRegion={handleSelectRegion}
            />

            {/* Map Legend */}
            <div className="sk-map-legend">
              <span className="sk-legend-title">
                {mapMode === "risk"
                  ? "Panchayat Risk Severity:"
                  : mapMode === "agreement"
                  ? "Multi-Model Ensemble Agreement:"
                  : "Dominant Atmospheric Variable:"}
              </span>
              <div className="sk-legend-swatches">
                <span className="sk-legend-swatch-item">
                  <span className="sk-swatch-box" style={{ background: THEME.calm }} />
                  Calm / High (&gt;80%)
                </span>
                <span className="sk-legend-swatch-item">
                  <span className="sk-swatch-box" style={{ background: THEME.watch }} />
                  Watch / Moderate (60–80%)
                </span>
                <span className="sk-legend-swatch-item">
                  <span className="sk-swatch-box" style={{ background: THEME.alert }} />
                  Alert / Low (&lt;60%)
                </span>
                <span className="sk-legend-swatch-item">
                  <span className="sk-swatch-box" style={{ background: THEME.nodata }} />
                  Derived Synoptic (Out-of-Pilot)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Center Column: Center 10-Day Rail */}
        <section className="sk-rail-column">
          <DayRail
            currentDay={activeLeadDay}
            onSelectDay={handleSelectDay}
          />
        </section>

        {/* Right Column: Detail Panel or Top 20 Worst */}
        <section className="sk-panel-column">
          <PanchayatDetailPanel
            gpData={gpData}
            worstList={worstList}
            selectedDay={activeLeadDay}
            onSelectGP={handleSelectPanchayat}
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
        />
      </section>
    </div>
  );
};
