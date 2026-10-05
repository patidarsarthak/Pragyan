import React from "react";
import { Language, t } from "../lib/i18n";
import { currentSnapshotState } from "../api/client";
import { PragyanLogo } from "./PragyanLogo";

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  lang: Language;
  onLangToggle: () => void;
  isSnapshot: boolean;
  leadDay?: number;
  alertCount?: number;
  farmerMode?: boolean;
  onToggleFarmerMode?: () => void;
  lowBandwidth?: boolean;
  onToggleLowBandwidth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  lang,
  onLangToggle,
  isSnapshot,
  leadDay = 1,
  alertCount = 14,
  farmerMode = false,
  onToggleFarmerMode,
  lowBandwidth = false,
  onToggleLowBandwidth,
}) => {
  const tabs = [
    { id: "forecast", label: t("tabOperations", lang), title: "Operational 1km Micro-Climate & Risk" },
    { id: "alerts", label: t("tabAlerts", lang), title: "Real-Time Panchayats in Alert/Bust Band" },
    { id: "command", label: t("tabCommand", lang), title: "Emergency Command Centre, SDRF & SOP Protocol" },
    { id: "evidence", label: lang === "en" ? "Model" : t("tabModel", lang), alt: "Evidence", title: "Downscaling Physics & SHAP Explainability" },
    { id: "past-events", label: lang === "en" ? "Replay" : t("tabReplay", lang), alt: "Past Events", title: "Extreme Weather Historical Counterfactual Replay" },
    { id: "health", label: lang === "en" ? "Health" : t("tabHealth", lang), title: "System Health & Cryptographic Merkle Ledger Audit" },
    { id: "api-widget", label: lang === "en" ? "API & Data" : t("tabApiWidget", lang), title: "REST Endpoints, JSON Export & Embeddable Widget" },
    { id: "methodology", label: t("tabAbout", lang), title: "Methodology & Architecture Overview" },
  ];

  return (
    <>
      {isSnapshot && (
        <div className="gm-fallback-banner" role="alert">
          <span>
            ⚠️ <strong>{t("snapshotMode", lang)}:</strong> {currentSnapshotState.source}
          </span>
          <span className="muted mono" style={{ marginLeft: "12px" }}>
            {t("asOf", lang)}: {new Date(currentSnapshotState.asOf).toLocaleDateString()}
          </span>
        </div>
      )}

      <header className="sk-topbar">
        <div className="sk-topbar-inner">
          {/* Brand with Logo Icon and Wordmark */}
          <button
            className="sk-brand"
            onClick={() => onTabChange("forecast")}
            aria-label="Pragyan Home"
            style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            <img
              src="/logo_icon.png"
              alt="Pragyan"
              width="34"
              height="34"
              style={{ borderRadius: "8px", objectFit: "contain", flexShrink: 0, display: "block" }}
            />
            <div className="sk-brand-text">
              <span className="sk-brand-wordmark">
                {t("brandName", lang)}
              </span>
              <span className="sk-brand-divider" aria-hidden="true">/</span>
              <span className="sk-brand-subtitle">{t("pilotBadge", lang)}</span>
            </div>
          </button>

          {/* Center Navigation Tabs (All options directly in header) */}
          <nav className="sk-navtabs" aria-label="Main Navigation">
            {tabs.map((tab) => {
              const isActive = !farmerMode && currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`sk-navtab ${isActive ? "is-active" : ""}`}
                  onClick={() => onTabChange(tab.id)}
                  aria-selected={isActive}
                  role="tab"
                  title={tab.title}
                  aria-label={tab.alt ? `${tab.label} (${tab.alt})` : tab.label}
                >
                  <span className="sk-tab-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right-Side Status Pills & Compact Controls */}
          <div className="sk-topbar-right">
            {/* Bust / Alert Count Pill (Solid Red with Pulsing White Dot) */}
            <button
              className="sk-pill sk-pill-alert"
              onClick={() => onTabChange("alerts")}
              title={`${alertCount} Panchayats in ALERT / BUST band today`}
            >
              <span className="sk-dot-pulse" aria-hidden="true" />
              <span className="sk-pill-mono">
                {alertCount} {lang === "en" ? "BUST" : t("statusAlert", lang)} · {t("statusDay", lang)} {leadDay}
              </span>
            </button>

            {/* Farmer Mode Toggle Switch */}
            {onToggleFarmerMode && (
              <button
                className={`sk-farmer-toggle ${farmerMode ? "is-active" : ""}`}
                onClick={onToggleFarmerMode}
                title="Toggle Farmer Vernacular Mode"
                aria-pressed={farmerMode}
              >
                <span className="sk-farmer-icon">🌾</span>
                <span className="sk-farmer-text">{farmerMode ? t("farmerModeActive", lang) : t("farmerMode", lang)}</span>
              </button>
            )}

            {/* Low Bandwidth Toggle */}
            {onToggleLowBandwidth && (
              <button
                className={`sk-farmer-toggle ${lowBandwidth ? "is-active" : ""}`}
                onClick={onToggleLowBandwidth}
                title="Toggle Accessible Low-Bandwidth Mode"
                aria-pressed={lowBandwidth}
              >
                <span>📶</span>
                <span className="sk-farmer-text">{t("lowBandwidth", lang)}</span>
              </button>
            )}

            {/* Language Switcher */}
            <button
              className="sk-lang-btn"
              onClick={onLangToggle}
              title="Switch Language: English / हिन्दी / বাংলা"
              aria-label="Toggle language"
            >
              {lang === "en" ? "हिन्दी" : lang === "hi" ? "বাংলা" : "English"}
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
