import React, { useState } from "react";
import { Language, t } from "../lib/i18n";
import { currentSnapshotState } from "../api/client";
import { PragyanLogo } from "./PragyanLogo";
import { UserProfile } from "../api/auth";

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
  currentUser?: UserProfile | null;
  onOpenAuth?: (mode?: "login" | "register") => void;
  onLogout?: () => void;
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
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
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
              src="/logo.png"
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

            {/* User Account / Sign In CTA */}
            {currentUser ? (
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="sk-user-pill"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  title={`${currentUser.fullName} (${currentUser.role})`}
                  aria-expanded={showUserDropdown}
                >
                  <span className="sk-user-avatar">{currentUser.avatar || "👤"}</span>
                  <span className="sk-user-name">{currentUser.fullName.split(" ")[0]}</span>
                  <span className="sk-user-role-tag">{currentUser.role}</span>
                </button>

                {showUserDropdown && (
                  <div
                    className="sk-user-dropdown-menu"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "#0f172a",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      width: "250px",
                      boxShadow: "0 14px 34px rgba(0,0,0,0.85)",
                      zIndex: 1000,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                      {currentUser.fullName}
                    </div>
                    <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "2px" }}>
                      {currentUser.designation || currentUser.roleLabel || currentUser.role.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "#94a3b8",
                        marginTop: "5px",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        paddingBottom: "8px",
                      }}
                    >
                      📍 {currentUser.gpName ? `${currentUser.gpName}, ` : ""}{currentUser.districtName || "Madhya Pradesh"}
                    </div>
                    <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAuth?.("login");
                        }}
                        style={{
                          background: "rgba(30, 41, 59, 0.8)",
                          border: "1px solid rgba(148, 163, 184, 0.2)",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          color: "#cbd5e1",
                          fontSize: "11.5px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        🔄 {lang === "hi" ? "प्रोफ़ाइल / खाता बदलें" : "Switch Role / Account"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout?.();
                        }}
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          color: "#fca5a5",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        🚪 {lang === "hi" ? "लॉग आउट (Sign Out)" : "Sign Out"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="sk-login-cta-btn"
                onClick={() => onOpenAuth?.("login")}
                title="Sign In or Register New Official Account"
              >
                <span>🔐</span>
                <span>{lang === "hi" ? "लॉग इन / पंजीकरण" : "Sign In / Register"}</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
