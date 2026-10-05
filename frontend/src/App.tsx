import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { MobileNav } from "./components/MobileNav";
import { ForecastTab } from "./components/ForecastTab";
import { EvidenceTab } from "./components/EvidenceTab";
import { AlertsTab } from "./components/AlertsTab";
import { PastEventsTab } from "./components/PastEventsTab";
import { MethodologyTab } from "./components/MethodologyTab";
import { CommandCentreTab } from "./components/CommandCentreTab";
import { SystemHealthTab } from "./components/SystemHealthTab";
import { ApiWidgetTab } from "./components/ApiWidgetTab";
import { LowBandwidthView } from "./components/LowBandwidthView";
import { FarmerModeCard } from "./components/farmer/FarmerModeCard";
import { FarmerAdvisoryPortal } from "./components/farmer/FarmerAdvisoryPortal";
import { Language } from "./lib/i18n";
import { fetchHealth, currentSnapshotState } from "./api/client";

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>("en");
  const [currentTab, setCurrentTab] = useState<string>("forecast");
  const [isSnapshot, setIsSnapshot] = useState<boolean>(false);
  const [farmerMode, setFarmerMode] = useState<boolean>(false);
  const [lowBandwidthMode, setLowBandwidthMode] = useState<boolean>(false);

  // Sync tab and language with URL search parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["forecast", "evidence", "alerts", "past-events", "command", "health", "api-widget", "methodology"].includes(tabParam)) {
      setCurrentTab(tabParam);
    }
    const langParam = params.get("lang");
    if (langParam && ["en", "hi", "bn"].includes(langParam)) {
      setLang(langParam as Language);
    }
    // Ensure advisory popup does NOT auto-trigger on starting:
    // If a URL parameter 'farmer' or 'advisory' was present from previous visits, bookmarks, or reloads,
    // clean it up immediately so it NEVER triggers an unsolicited popup after starting.
    if (params.has("farmer") || params.has("advisory")) {
      params.delete("farmer");
      params.delete("advisory");
      const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", cleanUrl);
    }
    const lowBwParam = params.get("low_bw");
    if (lowBwParam === "true" || lowBwParam === "1") {
      setLowBandwidthMode(true);
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
    url.searchParams.delete("farmer");
    url.searchParams.delete("advisory");
    window.history.pushState({}, "", url.toString());
  };

  const handleLangToggle = () => {
    setLang((prev) => {
      const next: Language = prev === "en" ? "hi" : prev === "hi" ? "bn" : "en";
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState({}, "", url.toString());
      return next;
    });
  };

  const handleToggleFarmerMode = () => {
    setFarmerMode((prev) => {
      const next = !prev;
      if (!next) {
        sessionStorage.setItem("pragyan_advisory_dismissed", "true");
      }
      return next;
    });
  };

  const handleCloseFarmerMode = () => {
    setFarmerMode(false);
    sessionStorage.setItem("pragyan_advisory_dismissed", "true");
    const url = new URL(window.location.href);
    if (url.searchParams.has("farmer") || url.searchParams.has("advisory")) {
      url.searchParams.delete("farmer");
      url.searchParams.delete("advisory");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleToggleLowBandwidth = () => {
    setLowBandwidthMode((prev) => {
      const next = !prev;
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("low_bw", "1");
      else url.searchParams.delete("low_bw");
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

  if (lowBandwidthMode) {
    return (
      <LowBandwidthView
        lang={lang}
        onExit={() => handleToggleLowBandwidth()}
      />
    );
  }

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
        lowBandwidth={lowBandwidthMode}
        onToggleLowBandwidth={handleToggleLowBandwidth}
      />

      {farmerMode ? (
        <FarmerAdvisoryPortal
          lang={lang}
          onExit={handleCloseFarmerMode}
        />
      ) : (
        <main style={{ flex: "1 0 auto" }}>
          {currentTab === "forecast" && <ForecastTab lang={lang} />}
          {currentTab === "alerts" && (
            <AlertsTab lang={lang} onNavigateToGP={handleNavigateToGPFromAlert} />
          )}
          {currentTab === "command" && <CommandCentreTab lang={lang} />}
          {currentTab === "evidence" && <EvidenceTab lang={lang} />}
          {currentTab === "past-events" && <PastEventsTab lang={lang} />}
          {currentTab === "health" && <SystemHealthTab lang={lang} />}
          {currentTab === "api-widget" && <ApiWidgetTab lang={lang} />}
          {currentTab === "methodology" && <MethodologyTab lang={lang} />}
        </main>
      )}


      <MobileNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
        lang={lang}
      />
    </div>
  );
};

export default App;
