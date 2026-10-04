import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";
import { UIHeroResponse } from "../../api/types";
import { THEME } from "../../theme";
import { Language, t } from "../../lib/i18n";

interface HeroSectionProps {
  heroData: UIHeroResponse | null;
  day: number;
  onExploreMap: () => void;
  onSelectDay?: (day: number) => void;
  lang?: Language;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  heroData,
  day,
  onExploreMap,
  onSelectDay,
  lang = "en",
}) => {
  const [activeRightTab, setActiveRightTab] = useState<"trajectory" | "calibration">("trajectory");

  // Defaults if loading or mock
  const gauge = heroData?.gauge || {
    share_alert: 0.14,
    delta_vs_prev: -0.03,
    day: 1,
    evaluated_panchayats: 603,
    state: "Madhya Pradesh",
  };

  const kpis = heroData?.kpi || {
    active_alerts: 14,
    total_gps_scored: 603,
    mean_agreement: 89.2,
    worst_gp: { gp_code: 133203, name: "Sanwer", score: 78.4 },
  };

  const riskTrajectory = heroData?.risk_by_day || [
    { lead_day: 1, day_label: "Day 1", mean_risk: 18.5, p10: 12.0, p90: 28.0 },
    { lead_day: 2, day_label: "Day 2", mean_risk: 24.0, p10: 16.5, p90: 36.2 },
    { lead_day: 3, day_label: "Day 3", mean_risk: 38.2, p10: 24.0, p90: 54.0 },
    { lead_day: 4, day_label: "Day 4", mean_risk: 46.5, p10: 30.5, p90: 66.8 },
    { lead_day: 5, day_label: "Day 5", mean_risk: 41.0, p10: 26.0, p90: 61.2 },
    { lead_day: 6, day_label: "Day 6", mean_risk: 32.4, p10: 20.0, p90: 50.0 },
    { lead_day: 7, day_label: "Day 7", mean_risk: 28.0, p10: 17.5, p90: 44.5 },
    { lead_day: 8, day_label: "Day 8", mean_risk: 25.1, p10: 15.0, p90: 42.0 },
    { lead_day: 9, day_label: "Day 9", mean_risk: 22.8, p10: 13.5, p90: 39.0 },
    { lead_day: 10, day_label: "Day 10", mean_risk: 20.4, p10: 12.0, p90: 36.5 },
  ];

  const calibrationScatter = heroData?.calibration_scatter || [
    { station_id: "IN-MP-IND-01", station_name: "Indore IMD", predicted: 32, observed: 34 },
    { station_id: "IN-MP-BHP-01", station_name: "Bhopal AWS", predicted: 45, observed: 42 },
    { station_id: "IN-MP-JBL-01", station_name: "Jabalpur AWS", predicted: 68, observed: 71 },
    { station_id: "IN-MP-GWL-01", station_name: "Gwalior IMD", predicted: 22, observed: 20 },
    { station_id: "IN-MP-UJN-01", station_name: "Ujjain AWS", predicted: 56, observed: 59 },
    { station_id: "IN-MP-REW-01", station_name: "Rewa AWS", predicted: 18, observed: 16 },
    { station_id: "IN-MP-SAG-01", station_name: "Sagar AWS", predicted: 40, observed: 38 },
  ];

  const skillTiles = heroData?.skill_tiles || [
    { label: "ROC-AUC", value: "0.88", unit: "Panchayat", status: "Optimal" },
    { label: "Brier Score", value: "0.12", unit: "Panchayat", status: "Well-calibrated" },
    { label: "F1 Score", value: "0.79", unit: "Alerts", status: "Balanced" },
    { label: "Skill vs ECMWF", value: "+34%", unit: "1km gain", status: "Significant" },
  ];

  // SVG Gauge calculations (128px ring, r=52, stroke=11)
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (gauge.share_alert * circumference);
  const gaugeColor = gauge.share_alert >= 0.25 ? THEME.alert : gauge.share_alert >= 0.10 ? THEME.watch : THEME.calm;

  // Real-time ticker sample items
  const tickerItems = [
    { name: "Sanwer (Indore)", score: "78%", band: "alert", driver: "Rainfall > 65mm" },
    { name: "Mhow (Indore)", score: "52%", band: "watch", driver: "Wind gust 48 km/h" },
    { name: "Huzur (Bhopal)", score: "64%", band: "alert", driver: "Flash flood runoff" },
    { name: "Berasia (Bhopal)", score: "38%", band: "watch", driver: "Humidity 92%" },
    { name: "Sihora (Jabalpur)", score: "71%", band: "alert", driver: "Precipitation 72mm" },
    { name: "Panagar (Jabalpur)", score: "44%", band: "watch", driver: "Root zone saturation" },
    { name: "Dabra (Gwalior)", score: "19%", band: "calm", driver: "Clear conditions" },
    { name: "Ghatigaon (Gwalior)", score: "22%", band: "calm", driver: "Light breeze" },
    { name: "Gadarwara (Narsinghpur)", score: "82%", band: "alert", driver: "Extreme downpour" },
    { name: "Khurai (Sagar)", score: "49%", band: "watch", driver: "Soil deficit" },
  ];

  return (
    <section className="sk-hero-wrap">
      {/* 2-Column Hero Area */}
      <div className="sk-hero-grid">
        {/* Left Column (1.14fr): Kicker, Headline, Subtitle, 2px Blue Note, 128px Gauge */}
        <div className="sk-hero-left">
          <div className="sk-kicker">
            <span className="sk-kicker-rule" />
            <span className="sk-kicker-text">
              {t("heroKicker", lang)} {day}
            </span>
          </div>

          <h1 className="sk-headline">
            {t("heroHeadline1", lang)}{" "}
            <em className="sk-em-red">{t("heroHeadline2", lang)}</em>
          </h1>

          <p className="sk-subline">
            {t("heroSubtitle", lang)}
          </p>

          <div className="sk-note-blue">
            {t("heroNote", lang)}
          </div>

          {/* 128px Gauge Row */}
          <div className="sk-gauge-row">
            <div className="sk-gauge-svg-wrap">
              <svg width="128" height="128" viewBox="0 0 128 128" className="sk-gauge-svg">
                {/* Background Track */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="#dfe4ec"
                  strokeWidth="11"
                  fill="none"
                />
                {/* Colored Progress Arc */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke={gaugeColor}
                  strokeWidth="11"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 64 64)"
                  style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
                />
                <text
                  x="64"
                  y="60"
                  textAnchor="middle"
                  className="sk-gauge-val"
                  fill="#0b1220"
                >
                  {(gauge.share_alert * 100).toFixed(0)}%
                </text>
                <text
                  x="64"
                  y="76"
                  textAnchor="middle"
                  className="sk-gauge-sub"
                  fill="#7b8798"
                >
                  {t("statusAlert", lang)}
                </text>
              </svg>
            </div>

            <div className="sk-gauge-info">
              <span className="sk-gauge-mono-caption">{t("heroRiskRatioTitle", lang)}</span>
              <p className="sk-gauge-desc">
                {(gauge.share_alert * 100).toFixed(1)}% {t("heroRiskRatioDesc", lang)}
              </p>
              <div className="sk-gauge-delta-pill">
                <span
                  className={`sk-delta-badge ${
                    gauge.delta_vs_prev > 0 ? "is-up" : gauge.delta_vs_prev < 0 ? "is-down" : "is-steady"
                  }`}
                >
                  {gauge.delta_vs_prev > 0 ? "▲ +" : gauge.delta_vs_prev < 0 ? "▼ " : "● "}
                  {(gauge.delta_vs_prev * 100).toFixed(1)}% {t("heroVsYesterday", lang)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (0.86fr): White 13px Card with Tabs and Charts */}
        <div className="sk-hero-right">
          <div className="sk-card sk-right-card">
            <div className="sk-right-card-header">
              <div className="sk-card-title-mono">
                {t("heroRiskTrajectory", lang).toUpperCase()} · 10-{t("statusDay", lang).toUpperCase()}
              </div>
              <span className="sk-crossover-tag">
                {t("heroDay3Watch", lang)}
              </span>
            </div>

            {/* Two Tabs: Trajectory vs Calibration */}
            <div className="sk-card-tabs" role="tablist">
              <button
                className={`sk-card-tab ${activeRightTab === "trajectory" ? "is-active" : ""}`}
                onClick={() => setActiveRightTab("trajectory")}
                role="tab"
                aria-selected={activeRightTab === "trajectory"}
              >
                {t("heroRiskTrajectory", lang)}
              </button>
              <button
                className={`sk-card-tab ${activeRightTab === "calibration" ? "is-active" : ""}`}
                onClick={() => setActiveRightTab("calibration")}
                role="tab"
                aria-selected={activeRightTab === "calibration"}
              >
                {t("heroWereWeRight", lang)}
              </button>
            </div>

            {/* Skill Tiles Row */}
            <div className="sk-skill-grid">
              {skillTiles.map((tile, idx) => (
                <div key={idx} className="sk-skill-tile">
                  <span className="sk-skill-label">{tile.label}</span>
                  <strong className="sk-skill-val">{tile.value}</strong>
                  <span className="sk-skill-status">{tile.status}</span>
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="sk-chart-container" style={{ height: "210px", width: "100%", marginTop: "12px" }}>
              {activeRightTab === "trajectory" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={riskTrajectory}
                    margin={{ top: 10, right: 16, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
                    <XAxis
                      dataKey="day_label"
                      stroke="#7b8798"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#7b8798"
                      fontSize={11}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1220",
                        borderRadius: "9px",
                        border: "none",
                        color: "#ffffff",
                        fontSize: "12px",
                        padding: "8px 12px",
                      }}
                      formatter={(val: any) => [`${Number(val).toFixed(1)}%`, ""]}
                    />
                    {/* 80% CI Envelope Area */}
                    <Area
                      type="monotone"
                      dataKey="p90"
                      stroke="none"
                      fill="#a9b6d6"
                      fillOpacity={0.4}
                      name="P90 Upper CI"
                    />
                    <Area
                      type="monotone"
                      dataKey="p10"
                      stroke="none"
                      fill="#ffffff"
                      fillOpacity={1.0}
                      name="P10 Lower CI"
                    />
                    {/* Mean Risk Line */}
                    <Line
                      type="monotone"
                      dataKey="mean_risk"
                      stroke="#2b4eff"
                      strokeWidth={2.6}
                      dot={{ r: 3, fill: "#2b4eff" }}
                      activeDot={{ r: 5 }}
                      name="Mean Risk"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" />
                    <XAxis
                      type="number"
                      dataKey="predicted"
                      name="Predicted"
                      domain={[0, 100]}
                      unit="%"
                      stroke="#7b8798"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="observed"
                      name="Observed"
                      domain={[0, 100]}
                      unit="%"
                      stroke="#7b8798"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1220",
                        borderRadius: "9px",
                        border: "none",
                        color: "#ffffff",
                        fontSize: "12px",
                      }}
                    />
                    {/* Perfect Calibration 1:1 Reference Line */}
                    <ReferenceLine
                      segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
                      stroke="#7b8798"
                      strokeDasharray="5 5"
                    />
                    <Scatter
                      name="Station Validation"
                      data={calibrationScatter}
                      fill="#2b4eff"
                      fillOpacity={0.8}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Key Row */}
            {/* Key Row */}
            <div className="sk-chart-key-row">
              <span className="sk-key-item">
                <span className="sk-key-line" style={{ background: "#2b4eff" }} />
                {t("chartForecastRisk", lang)}
              </span>
              <span className="sk-key-item">
                <span className="sk-key-box" style={{ background: "#a9b6d6" }} />
                {t("chartUncertaintyBand", lang)}
              </span>
              <span className="sk-key-item">
                <span className="sk-key-dot" style={{ background: "#f5254a" }} />
                {t("chartCriticalThreshold", lang)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip (4 Cards in a grid) */}
      <div className="sk-kpi-grid">
        <div className="sk-kpi-card">
          <div className="sk-kpi-bar" style={{ background: THEME.alert }} />
          <span className="sk-kpi-label">{t("heroActiveAlerts", lang, { day: String(day) })}</span>
          <div className="sk-kpi-val">{kpis.active_alerts} <span className="sk-kpi-unit">GPs</span></div>
          <span className="sk-kpi-note">{t("heroImdThreshold", lang)}</span>
        </div>

        <div className="sk-kpi-card">
          <div className="sk-kpi-bar" style={{ background: THEME.blue }} />
          <span className="sk-kpi-label">{t("heroPilotGps", lang)}</span>
          <div className="sk-kpi-val">{kpis.total_gps_scored} <span className="sk-kpi-unit">GPs</span></div>
          <span className="sk-kpi-note">{t("heroCadastralGrid", lang)}</span>
        </div>

        <div className="sk-kpi-card">
          <div className="sk-kpi-bar" style={{ background: THEME.calm }} />
          <span className="sk-kpi-label">{t("heroModelAgreement", lang)}</span>
          <div className="sk-kpi-val">{Number(kpis?.mean_agreement ?? 89.2).toFixed(1)}<span className="sk-kpi-unit">%</span></div>
          <span className="sk-kpi-note">{t("heroMultiPhysics", lang)}</span>
        </div>

        <div className="sk-kpi-card">
          <div className="sk-kpi-bar" style={{ background: THEME.watch }} />
          <span className="sk-kpi-label">{t("heroHighestRiskGp", lang)}</span>
          <div className="sk-kpi-val" style={{ fontSize: "1.45rem" }}>
            {kpis?.worst_gp?.name ?? "Sanwer"} <span className="sk-kpi-unit">({Number(kpis?.worst_gp?.score ?? 78.4).toFixed(0)}%)</span>
          </div>
          <span className="sk-kpi-note">LGD #{kpis?.worst_gp?.gp_code ?? 133203} · Flash rain driver</span>
        </div>
      </div>

      {/* Red Call-to-Action Pill & Scroll Cue */}
      <div className="sk-cta-cue-row">
        <button className="sk-cta-btn" onClick={onExploreMap}>
          <span>{t("heroExploreMap", lang)}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="sk-scroll-cue sk-bob" onClick={onExploreMap} role="button" tabIndex={0}>
          <span>{t("heroThePanchayatMap", lang)}</span>
          <span className="sk-cue-arrow">↓</span>
        </div>
      </div>

      {/* Live Ticker Band */}
      <div className="sk-ticker-wrap" aria-label="High Risk Panchayat Monitor">
        <div className="sk-ticker-badge">{t("liveMonitor", lang)}</div>
        <div className="sk-ticker-marquee">
          <div className="sk-ticker-track">
            {tickerItems.concat(tickerItems).map((item, idx) => (
              <span key={idx} className="sk-ticker-item">
                <span
                  className="sk-ticker-dot"
                  style={{
                    background:
                      item.band === "alert" ? THEME.alert : item.band === "watch" ? THEME.watch : THEME.calm,
                  }}
                />
                <strong className="sk-ticker-name">{item.name}</strong>
                <span className="sk-ticker-score">{item.score}</span>
                <span className="sk-ticker-driver">({item.driver})</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
