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
}) => {
  const tabs = [
    { id: "forecast", label: lang === "hi" ? "संचालन" : "Operations", sub: null },
    { id: "alerts", label: lang === "hi" ? "चेतावनी" : "Alerts", sub: null },
    { id: "evidence", label: lang === "hi" ? "प्रमाण व मॉडल" : "Evidence", sub: null },
    { id: "past-events", label: lang === "hi" ? "रीप्ले" : "Replay", sub: lang === "hi" ? "विगत घटना" : "a real event" },
    { id: "methodology", label: lang === "hi" ? "परिचय" : "About", sub: null },
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
          <button
            className="sk-brand"
            onClick={() => onTabChange("forecast")}
            aria-label="Pragyan Home"
          >
            <div className="sk-brand-glyph" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="#2b4eff" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="4.5" fill="#2b4eff" />
              </svg>
            </div>
            <div className="sk-brand-text">
              <span className="sk-brand-wordmark">Pragyan</span>
              <span className="sk-brand-divider" aria-hidden="true">/</span>
              <span className="sk-brand-subtitle">Madhya Pradesh Pilot · Panchayat Weather Intelligence</span>
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
              <span className="sk-pill-mono">ISSUED {cycleDate} · VALID {cycleDate} (DAY {leadDay})</span>
            </div>

            {/* Alert Count Pill (Solid Red with Pulsing White Dot) */}
            <button
              className="sk-pill sk-pill-alert"
              onClick={() => onTabChange("alerts")}
              title={`${alertCount} Panchayats in ALERT band today`}
            >
              <span className="sk-dot-pulse" aria-hidden="true" />
              <span className="sk-pill-mono">{alertCount} ALERT · DAY {leadDay}</span>
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
                <span className="sk-farmer-text">{farmerMode ? (lang === "hi" ? "किसान मोड सक्रिय" : "Farmer Mode Active") : (lang === "hi" ? "किसान मोड" : "Farmer Mode")}</span>
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
