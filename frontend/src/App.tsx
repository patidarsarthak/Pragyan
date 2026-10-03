import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { MobileNav } from "./components/MobileNav";
import { ForecastTab } from "./components/ForecastTab";
import { EvidenceTab } from "./components/EvidenceTab";
import { AlertsTab } from "./components/AlertsTab";
import { PastEventsTab } from "./components/PastEventsTab";
import { MethodologyTab } from "./components/MethodologyTab";
import { FarmerModeCard } from "./components/farmer/FarmerModeCard";
import { Language } from "./lib/i18n";
import { fetchHealth, currentSnapshotState } from "./api/client";

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>("en");
  const [currentTab, setCurrentTab] = useState<string>("forecast");
  const [isSnapshot, setIsSnapshot] = useState<boolean>(false);
  const [farmerMode, setFarmerMode] = useState<boolean>(false);

  // Sync tab with URL search parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["forecast", "evidence", "alerts", "past-events", "methodology"].includes(tabParam)) {
      setCurrentTab(tabParam);
    }
    const farmerParam = params.get("farmer");
    if (farmerParam === "true") {
      setFarmerMode(true);
    }

    // Health check to detect live backend vs snapshot fallback
    fetchHealth()
      .then(() => setIsSnapshot(currentSnapshotState.isSnapshot))
      .catch(() => setIsSnapshot(true));
  }, []);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
  };

  const handleLangToggle = () => {
    setLang((prev) => (prev === "en" ? "hi" : prev === "hi" ? "bn" : "en"));
  };

  const handleToggleFarmerMode = () => {
    setFarmerMode((prev) => {
      const next = !prev;
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("farmer", "true");
      else url.searchParams.delete("farmer");
      window.history.replaceState({}, "", url.toString());
      return next;
    });
  };

  const handleNavigateToGPFromAlert = (gpCode: number) => {
    setCurrentTab("forecast");
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "forecast");
    url.searchParams.set("gp", String(gpCode));
    window.history.pushState({}, "", url.toString());
  };

  return (
    <div className="gm-app">
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        lang={lang}
        onLangToggle={handleLangToggle}
        isSnapshot={isSnapshot}
        farmerMode={farmerMode}
        onToggleFarmerMode={handleToggleFarmerMode}
      />

      {farmerMode && (
        <FarmerModeCard
          lang={lang}
          onClose={() => setFarmerMode(false)}
        />
      )}

      <main style={{ flex: "1 0 auto" }}>
        {currentTab === "forecast" && <ForecastTab lang={lang} />}
        {currentTab === "evidence" && <EvidenceTab lang={lang} />}
        {currentTab === "alerts" && (
          <AlertsTab lang={lang} onNavigateToGP={handleNavigateToGPFromAlert} />
        )}
        {currentTab === "past-events" && <PastEventsTab lang={lang} />}
        {currentTab === "methodology" && <MethodologyTab lang={lang} />}
      </main>

      <MobileNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
        lang={lang}
      />
    </div>
  );
};

export default App;
