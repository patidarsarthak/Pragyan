import React from "react";
import { Language, t } from "../lib/i18n";
import { currentSnapshotState } from "../api/client";

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
    { id: "forecast", label: t("tabOperations", lang), sub: null },
    { id: "alerts", label: t("tabAlerts", lang), sub: null },
    { id: "command", label: t("tabCommand", lang), sub: null },
    { id: "evidence", label: t("tabEvidence", lang), sub: null },
    { id: "past-events", label: t("tabReplay", lang), sub: t("tabReplaySub", lang) },
    { id: "health", label: t("tabHealth", lang), sub: null },
    { id: "api-widget", label: t("tabApiWidget", lang), sub: null },
    { id: "methodology", label: t("tabAbout", lang), sub: null },
  ];


  const cycleDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();

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
          {/* Brand with 32px SVG Glyph, Wordmark, and Subtitle */}
          {/* Brand with Pragyan Logo and Wordmark */}
          <button
            className="sk-brand"
            onClick={() => onTabChange("forecast")}
            aria-label="Pragyan Home"
            style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            <img
              src="/logo_icon.png"
              alt="Pragyan"
              width="36"
              height="36"
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

          {/* Center Navtabs */}
          <nav className="sk-navtabs" aria-label="Main Navigation">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`sk-navtab ${isActive ? "is-active" : ""}`}
                  onClick={() => onTabChange(tab.id)}
                  aria-selected={isActive}
                  role="tab"
                >
                  <span className="sk-tab-label">{tab.label}</span>
                  {tab.sub && <span className="sk-tab-sub">"{tab.sub}"</span>}
                </button>
              );
            })}
          </nav>

          {/* Right-Side Status Pills & Controls */}
          <div className="sk-topbar-right">
            {/* Cycle / Valid Pill (White with steady green dot) */}
            <div className="sk-pill sk-pill-cycle" title="Model Initialization & Valid Day">
              <span className="sk-dot-green" aria-hidden="true" />
              <span className="sk-pill-mono">{t("statusIssued", lang)} {cycleDate} · {t("statusValid", lang)} {cycleDate} ({t("statusDay", lang)} {leadDay})</span>
            </div>

            {/* Alert Count Pill (Solid Red with Pulsing White Dot) */}
            <button
              className="sk-pill sk-pill-alert"
              onClick={() => onTabChange("alerts")}
              title={`${alertCount} Panchayats in ALERT band today`}
            >
              <span className="sk-dot-pulse" aria-hidden="true" />
              <span className="sk-pill-mono">{alertCount} {t("statusAlert", lang)} · {t("statusDay", lang)} {leadDay}</span>
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
                style={{ marginLeft: "4px" }}
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
