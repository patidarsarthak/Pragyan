import React, { useEffect } from "react";
import { Language, t } from "../lib/i18n";
import { PragyanLogo } from "./PragyanLogo";

interface RightSlideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTabChange: (tab: string) => void;
  lang: Language;
}

export const RightSlideDrawer: React.FC<RightSlideDrawerProps> = ({
  isOpen,
  onClose,
  onTabChange,
  lang,
}) => {
  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = (tabId: string) => {
    onTabChange(tabId);
    onClose();
  };

  return (
    <div className="sk-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pragyan Directory & Tools">
      <div
        className="sk-drawer-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Drawer Header */}
        <div className="sk-drawer-header">
          <div className="sk-drawer-title-group">
            <span className="sk-drawer-pill">SYSTEM DIRECTORY</span>
            <h2 className="sk-drawer-title">{lang === "hi" ? "प्रज्ञान उपकरण एवं संसाधन" : lang === "bn" ? "প্রজ্ঞান সরঞ্জাম ও রিসোর্স" : "Pragyan Tools & Directory"}</h2>
          </div>
          <button
            className="sk-drawer-close-btn"
            onClick={onClose}
            aria-label="Close directory drawer"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body with 4 Key Features */}
        <div className="sk-drawer-body">
          {/* Feature 1: API & Developer Gateway */}
          <div className="sk-drawer-card">
            <div className="sk-drawer-card-header">
              <span className="sk-drawer-icon" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
                {"</>"}
              </span>
              <div>
                <h3 className="sk-drawer-card-title">{lang === "hi" ? "एपीआई एवं डेटा फीड्स" : "REST APIs & Developer Gateway"}</h3>
                <span className="sk-drawer-card-sub">Programmatic JSON access for government portals</span>
              </div>
            </div>
            <p className="sk-drawer-card-desc">
              High-frequency, authenticated JSON endpoints delivering downscaled Gram Panchayat weather predictions, 
              risk bands, and cryptographic audit proofs directly into Panchayat Enterprise Suite (PES) and state dashboards.
            </p>
            <div className="sk-drawer-endpoints-list">
              <code>GET /api/ui/scope/summary</code>
              <code>GET /api/ui/gp/{`{lgd}`}</code>
              <code>GET /api/ui/ledger</code>
            </div>
            <button
              className="sk-drawer-card-btn is-primary"
              onClick={() => handleAction("api-widget")}
            >
              <span>{lang === "hi" ? "एपीआई दस्तावेज़ खोलें" : "Open API & Widget Suite"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Feature 2: Embeddable Weather Widget */}
          <div className="sk-drawer-card">
            <div className="sk-drawer-card-header">
              <span className="sk-drawer-icon" style={{ background: "#ECFDF5", color: "#047857" }}>
                📱
              </span>
              <div>
                <h3 className="sk-drawer-card-title">{lang === "hi" ? "पंचायत मौसम विजेट" : "Panchayat Weather Widget"}</h3>
                <span className="sk-drawer-card-sub">Lightweight iframe & script embed snippet</span>
              </div>
            </div>
            <p className="sk-drawer-card-desc">
              Zero-configuration responsive widget designed for embedding live 10-day hyperlocal forecasts and 
              vernacular crop warnings directly into Gram Panchayat, KVK, and Krishi Vigyan Kendra digital kiosks.
            </p>
            <div className="sk-drawer-snippet-box">
              <code>{`<iframe src="https://pragyan.gov.in/embed/gp/133203" width="100%" height="320" />`}</code>
            </div>
            <button
              className="sk-drawer-card-btn"
              onClick={() => handleAction("api-widget")}
            >
              <span>{lang === "hi" ? "विजेट कोड जनरेट करें" : "Configure & Copy Widget"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Feature 3: Operational Command Centre */}
          <div className="sk-drawer-card">
            <div className="sk-drawer-card-header">
              <span className="sk-drawer-icon" style={{ background: "#FEF3C7", color: "#B45309" }}>
                ⚡
              </span>
              <div>
                <h3 className="sk-drawer-card-title">{lang === "hi" ? "संचालन कमान केंद्र" : "Operational Command Centre"}</h3>
                <span className="sk-drawer-card-sub">Real-time alert triage & district readiness</span>
              </div>
            </div>
            <p className="sk-drawer-card-desc">
              State and district-level administrative cockpit providing real-time triage for emergency alerts, 
              weather risk escalation bands, and continuous SHA-256 forecast ledger integrity verification.
            </p>
            <div className="sk-drawer-status-chip-row">
              <span className="sk-drawer-status-chip">
                <span className="sk-dot-green" /> 7 Ledgers Chained
              </span>
              <span className="sk-drawer-status-chip">
                <span>📍</span> 603 Panchayats Monitored
              </span>
            </div>
            <button
              className="sk-drawer-card-btn"
              onClick={() => handleAction("command")}
            >
              <span>{lang === "hi" ? "कमान केंद्र लॉन्च करें" : "Launch Command Centre"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Feature 4: About Section & SIH26074 */}
          <div className="sk-drawer-card">
            <div className="sk-drawer-card-header">
              <span className="sk-drawer-icon" style={{ background: "#F1F5F9", color: "#334155" }}>
                🏛️
              </span>
              <div>
                <h3 className="sk-drawer-card-title">{lang === "hi" ? "प्रज्ञान के बारे में" : "About Pragyan System"}</h3>
                <span className="sk-drawer-card-sub">SIH26074 Problem Statement & Methodology</span>
              </div>
            </div>
            <p className="sk-drawer-card-desc">
              Designed for the Ministry of Panchayati Raj, Pragyan bridges the last-mile meteorological gap 
              by downscaling coarse 25km NWP models to 1km Gram Panchayat cadastral scale via Topographic Ridge trunks 
              and Gradient Boosted Decision Trees with verifiable audit trails.
            </p>
            <button
              className="sk-drawer-card-btn"
              onClick={() => handleAction("methodology")}
            >
              <span>{lang === "hi" ? "पूरी कार्यप्रणाली पढ़ें" : "Read Full System Architecture"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Drawer Footer with Pragyan Logo & Tagline */}
        <div className="sk-drawer-footer">
          <div className="sk-drawer-brand-block">
            {/* The signature PRAGYAN logo with green leaves in the 'A's */}
            <PragyanLogo
              height={32}
              showTagline={false}
              className="sk-drawer-logo"
            />
            <p className="sk-drawer-tagline">
              Hyperlocal Weather Downscaling & Precision Agro-Meteorological Intelligence
            </p>
            <div className="sk-drawer-meta">
              <span>Ministry of Panchayati Raj Pilot</span>
              <span>·</span>
              <span>Smart India Hackathon 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
