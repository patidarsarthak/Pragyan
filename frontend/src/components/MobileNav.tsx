import React from "react";
import { Language, t } from "../lib/i18n";

interface MobileNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  lang: Language;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onTabChange, lang }) => {
  const tabs = [
    { id: "forecast", icon: "🗺️", label: t("tabForecast", lang) },
    { id: "evidence", icon: "📊", label: t("tabEvidence", lang) },
    { id: "alerts", icon: "🚨", label: t("tabAlerts", lang) },
    { id: "past-events", icon: "⏪", label: t("tabPastEvents", lang) },
    { id: "methodology", icon: "📖", label: t("tabMethodology", lang) },
  ];

  return (
    <nav className="gm-bottomnav" aria-label="Mobile Navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`gm-bottomnav-btn ${currentTab === tab.id ? "is-active" : ""}`}
          onClick={() => onTabChange(tab.id)}
          aria-selected={currentTab === tab.id}
        >
          <span style={{ fontSize: "16px" }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};
