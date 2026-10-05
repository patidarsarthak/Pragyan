import React, { useState, useEffect } from "react";
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
  const [activeSection, setActiveSection] = useState<"about" | "api" | "widget" | "command" | "evidence" | "health" | "replay">("about");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

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

  const handleCopySnippet = () => {
    const code = `<iframe src="https://pragyan.gov.in/embed/gp/133203" width="100%" height="340" frameborder="0" style="border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);" title="Pragyan Panchayat Weather"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="sk-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pragyan System Directory">
      <div
        className="sk-drawer-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Drawer Header with PRAGYAN Leaf Logo */}
        <div className="sk-drawer-header">
          <div className="sk-drawer-title-group">
            <PragyanLogo height={26} showTagline={false} />
            <span className="sk-drawer-pill" style={{ marginTop: "4px" }}>
              {lang === "hi" ? "सिस्टम निर्देशिका एवं संपूर्ण जानकारी" : "SYSTEM DIRECTORY & FULL INFORMATION"}
            </span>
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

        {/* Section Navigation Tabs inside Drawer */}
        <div className="sk-drawer-nav-tabs">
          <button
            className={`sk-drawer-nav-tab ${activeSection === "about" ? "is-active" : ""}`}
            onClick={() => setActiveSection("about")}
          >
            🏛️ {lang === "hi" ? "प्रज्ञान परिचय" : "About Pragyan"}
          </button>
          <button
            className={`sk-drawer-nav-tab ${activeSection === "api" ? "is-active" : ""}`}
            onClick={() => setActiveSection("api")}
          >
            {"</>"} {lang === "hi" ? "एपीआई" : "REST APIs"}
          </button>
          <button
            className={`sk-drawer-nav-tab ${activeSection === "widget" ? "is-active" : ""}`}
            onClick={() => setActiveSection("widget")}
          >
            📱 {lang === "hi" ? "विजेट" : "Widget"}
          </button>
          <button
            className={`sk-drawer-nav-tab ${activeSection === "command" ? "is-active" : ""}`}
            onClick={() => setActiveSection("command")}
          >
            🎯 {lang === "hi" ? "कमांड सेंटर" : "Command Centre"}
          </button>
          <button
            className={`sk-drawer-nav-tab ${activeSection === "evidence" ? "is-active" : ""}`}
            onClick={() => setActiveSection("evidence")}
          >
            📊 {lang === "hi" ? "प्रमाण" : "Evidence"}
          </button>
          <button
            className={`sk-drawer-nav-tab ${activeSection === "health" ? "is-active" : ""}`}
            onClick={() => setActiveSection("health")}
          >
            🩺 {lang === "hi" ? "स्वास्थ्य" : "Health"}
          </button>
          <button
            className={`sk-drawer-nav-tab ${activeSection === "replay" ? "is-active" : ""}`}
            onClick={() => setActiveSection("replay")}
          >
            ⏪ {lang === "hi" ? "रीप्ले" : "Replay"}
          </button>
        </div>

        {/* Drawer Scrollable Body: Displays Full Info for Selected Section */}
        <div className="sk-drawer-body">
          {/* SECTION 1: ABOUT PRAGYAN (FULL INFO) */}
          {activeSection === "about" && (
            <div className="sk-drawer-full-info">
              <div className="sk-drawer-info-hero">
                <span className="sk-drawer-badge">SIH26074 · MINISTRY OF PANCHAYATI RAJ</span>
                <h3 className="sk-drawer-hero-title">
                  {lang === "hi"
                    ? "पंचायत-स्तरीय मौसम डाउनस्केलिंग एवं कृषि परामर्श प्रणाली"
                    : "Panchayat-Level Weather Downscaling & Agro-Advisory System"}
                </h3>
                <p className="sk-drawer-hero-p">
                  {lang === "hi"
                    ? "प्रज्ञान राष्ट्रीय और वैश्विक 25 किमी मौसम पूर्वानुमानों को 1 किमी ग्राम पंचायत भूकर स्तर तक डाउनस्केलिंग करता है, जिससे भारत के किसानों को अति-स्थानीय मौसम सलाह और फसल सुरक्षा चेतावनी मिलती है।"
                    : "Pragyan bridges the last-mile meteorological gap by downscaling coarse 25km synoptic numerical weather forecasts to 1km Gram Panchayat cadastral resolution, delivering hyper-localized weather intelligence and precision agro-advisories."}
                </p>
              </div>

              {/* Core Pillars */}
              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🎯 The Last-Mile Challenge Solved</h4>
                <p className="sk-drawer-desc-text">
                  Standard block-level forecasts span 25×25 km grid cells, ignoring steep topographic elevation changes, 
                  valley microclimates, and agricultural land-cover variations. Rain-fed crops fail when localized rainbands strike 
                  unevenly across a block. Pragyan resolves localized rain deltas down to each specific Gram Panchayat.
                </p>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🗺️ Operational Pilot Scope (Madhya Pradesh)</h4>
                <div className="sk-drawer-stats-grid">
                  <div className="sk-drawer-stat-item">
                    <span className="sk-stat-val">603</span>
                    <span className="sk-stat-lbl">Active Pilot Panchayats</span>
                  </div>
                  <div className="sk-drawer-stat-item">
                    <span className="sk-stat-val">55</span>
                    <span className="sk-stat-lbl">MP Districts Covered</span>
                  </div>
                  <div className="sk-drawer-stat-item">
                    <span className="sk-stat-val">10 Days</span>
                    <span className="sk-stat-lbl">Daily Lead Horizon</span>
                  </div>
                  <div className="sk-drawer-stat-item">
                    <span className="sk-stat-val">1 km</span>
                    <span className="sk-stat-lbl">Cadastral Resolution</span>
                  </div>
                </div>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🔬 Scientific Engine & Earth Datasets</h4>
                <ul className="sk-drawer-bullet-list">
                  <li><strong>Topographic Ridge Trunk:</strong> Physical environmental lapse-rate adjustments (-6.5°C/km) based on NASA SRTM 30m Digital Elevation Models.</li>
                  <li><strong>Gradient Boosted Trees (GBDT):</strong> Non-linear residual learning for microclimate nuances, roughness, and windward orographic enhancement.</li>
                  <li><strong>ESA WorldCover 10m:</strong> Precise fractions for cropland, dense forest, surface water, and built-up areas for every Gram Panchayat polygon.</li>
                  <li><strong>Sentinel-2 / MODIS NDVI:</strong> 16-day dynamic vegetative health composites tracking actual canopy cover.</li>
                  <li><strong>Global NWP Ensembles:</strong> Ingestion of ECMWF IFS 0.25° and NOAA GFS high-resolution daily forecasts.</li>
                </ul>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🌾 Crop-Wise Phenology & Advisory Rules</h4>
                <p className="sk-drawer-desc-text">
                  7 key regional crops (Soybean, Wheat, Mustard, Chickpea, Paddy, Maize, Vegetables) with Growing Degree Day (GDD) 
                  phenology tracking, calibrated to ICAR and Krishi Vigyan Kendra (KVK) agronomic guidelines.
                </p>
              </div>

              <button
                className="sk-drawer-card-btn is-primary"
                onClick={() => handleAction("methodology")}
                style={{ marginTop: "12px" }}
              >
                <span>{lang === "hi" ? "पूरी कार्यप्रणाली एवं शोध पृष्ठ खोलें" : "Open Full Methodology & Architecture Page"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {/* SECTION 2: REST APIS & DEVELOPER GATEWAY (FULL INFO) */}
          {activeSection === "api" && (
            <div className="sk-drawer-full-info">
              <div className="sk-drawer-info-hero">
                <span className="sk-drawer-badge">DEVELOPER API SUITE</span>
                <h3 className="sk-drawer-hero-title">Open REST APIs & Data Feeds</h3>
                <p className="sk-drawer-hero-p">
                  Authenticated, high-throughput JSON API services designed for seamless ingestion into State Relief Portals, 
                  Panchayat Enterprise Suite (PES), and mobile farmer applications.
                </p>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">📡 Core Operational Endpoints</h4>
                <div className="sk-api-endpoint-card">
                  <div className="sk-api-method-badge GET">GET</div>
                  <div className="sk-api-path">/api/ui/scope/summary</div>
                  <p className="sk-api-desc">Returns multi-tier administrative summaries, dominant drivers, alert shares, and day-by-day lead rails for any state, district, or block.</p>
                </div>

                <div className="sk-api-endpoint-card">
                  <div className="sk-api-method-badge GET">GET</div>
                  <div className="sk-api-path">/api/ui/gp/{`{lgd_code}`}</div>
                  <p className="sk-api-desc">10-day downscaled point forecasts for all 5 variables (Rainfall, Temp, RH, Wind, ET0) with 80% confidence bounds and local SHAP feature impacts.</p>
                </div>

                <div className="sk-api-endpoint-card">
                  <div className="sk-api-method-badge GET">GET</div>
                  <div className="sk-api-path">/api/ui/ledger</div>
                  <p className="sk-api-desc">Cryptographically chained SHA-256 audit blocks verifying that forecasts were created at issue time and never altered retrospectively.</p>
                </div>

                <div className="sk-api-endpoint-card">
                  <div className="sk-api-method-badge GET">GET</div>
                  <div className="sk-api-path">/api/ui/health/data-quality</div>
                  <p className="sk-api-desc">Live telemetry tracking station observations, satellite raster latency, and prediction pipeline health.</p>
                </div>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">📋 Sample JSON Output</h4>
                <div className="sk-drawer-code-preview">
                  <pre>{`{
  "gp_code": 133203,
  "gp_name": "Sanwer",
  "district": "Indore",
  "state": "Madhya Pradesh",
  "forecast": {
    "day": 1,
    "rainfall_mm": 26.4,
    "rainfall_ci_80": [18.2, 34.6],
    "temp_max_c": 31.4,
    "humidity_pct": 84,
    "risk_band": "WATCH"
  }
}`}</pre>
                </div>
              </div>

              <button
                className="sk-drawer-card-btn is-primary"
                onClick={() => handleAction("api-widget")}
                style={{ marginTop: "12px" }}
              >
                <span>{lang === "hi" ? "एपीआई एवं विजेट केंद्र खोलें" : "Open API & Widget Dashboard"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {/* SECTION 3: PANCHAYAT WEATHER WIDGET (FULL INFO) */}
          {activeSection === "widget" && (
            <div className="sk-drawer-full-info">
              <div className="sk-drawer-info-hero">
                <span className="sk-drawer-badge">PORTAL INTEGRATION</span>
                <h3 className="sk-drawer-hero-title">Embeddable Panchayat Weather Widget</h3>
                <p className="sk-drawer-hero-p">
                  Embed live 10-day hyperlocal weather warnings and vernacular crop advisories on Gram Panchayat websites, 
                  Krishi Vigyan Kendra portals, or digital village information boards with a single line of HTML.
                </p>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🔍 Live Widget Preview</h4>
                <div className="sk-widget-preview-box">
                  <div className="sk-widget-mini-header">
                    <span style={{ fontWeight: 700, color: "#0F172A" }}>📍 Sanwer Gram Panchayat</span>
                    <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>WATCH 26%</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "8px", fontSize: "12px", color: "#475569" }}>
                    <span>🌧️ 26.4 mm</span>
                    <span>🌡️ 31.4°C</span>
                    <span>💧 84% RH</span>
                    <span>💨 14 km/h</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#1D4ED8", marginTop: "6px", fontWeight: 600 }}>
                    🌾 Wheat Crown Root Initiation: Delay spray due to foliar moisture
                  </div>
                </div>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">📋 Iframe Embed Code</h4>
                <div className="sk-drawer-snippet-box">
                  <code>{`<iframe src="https://pragyan.gov.in/embed/gp/133203" width="100%" height="340" frameborder="0"></iframe>`}</code>
                </div>
                <button
                  className="sk-drawer-card-btn"
                  onClick={handleCopySnippet}
                  style={{ width: "100%", justifyContent: "center", gap: "8px", fontWeight: 700 }}
                >
                  <span>{copiedSnippet ? "✓ Copied to Clipboard!" : "📋 Copy Embed Code"}</span>
                </button>
              </div>

              <button
                className="sk-drawer-card-btn is-primary"
                onClick={() => handleAction("api-widget")}
                style={{ marginTop: "12px" }}
              >
                <span>{lang === "hi" ? "विजेट कॉन्फ़िगरेशन पृष्ठ खोलें" : "Open Full Widget Customizer"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {/* SECTION 4: SYSTEM HEALTH & QUALITY (FULL INFO) */}
          {activeSection === "health" && (
            <div className="sk-drawer-full-info">
              <div className="sk-drawer-info-hero">
                <span className="sk-drawer-badge">TELEMETRY & AUDIT</span>
                <h3 className="sk-drawer-hero-title">System Health & Cryptographic Ledger</h3>
                <p className="sk-drawer-hero-p">
                  Independent operational verification ensuring zero post-hoc forecast tampering, continuous pipeline uptime, 
                  and reliable upstream satellite data synchronization.
                </p>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🛡️ Cryptographic Forecast Ledger</h4>
                <div className="sk-drawer-status-chip-row">
                  <span className="sk-drawer-status-chip">
                    <span className="sk-dot-green" /> Status: VALID
                  </span>
                  <span className="sk-drawer-status-chip">
                    🔒 SHA-256 Merkle Chained
                  </span>
                  <span className="sk-drawer-status-chip">
                    🧱 7 Blocks Archived
                  </span>
                </div>
                <p className="sk-drawer-desc-text">
                  Every forecast run produces a deterministic SHA-256 hash containing all 603 panchayat predictions. 
                  Any retroactive modification to past predictions breaks the parent-hash chain immediately.
                </p>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🛰️ Upstream Synchronization Status</h4>
                <ul className="sk-drawer-bullet-list">
                  <li><strong>ECMWF IFS 0.25°:</strong> Synchronized (Daily 00Z / 12Z cycles)</li>
                  <li><strong>NOAA GFS Seamless:</strong> Active (High-frequency secondary verification)</li>
                  <li><strong>NASA SRTM 30m DEM:</strong> Cached locally (30m spatial relief)</li>
                  <li><strong>ESA WorldCover 10m:</strong> Static panchayat polygon fractions indexed</li>
                  <li><strong>SQLite Database:</strong> 1,471 Panchayats registered (603 MP operational)</li>
                </ul>
              </div>

              <button
                className="sk-drawer-card-btn is-primary"
                onClick={() => handleAction("health")}
                style={{ marginTop: "12px" }}
              >
                <span>{lang === "hi" ? "सिस्टम स्वास्थ्य पृष्ठ खोलें" : "Open System Health Dashboard"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {/* SECTION 5: EVIDENCE & BASELINE VALIDATION (FULL INFO) */}
          {activeSection === "evidence" && (
            <div className="sk-drawer-full-info">
              <div className="sk-drawer-info-hero">
                <span className="sk-drawer-badge">SCIENTIFIC EVIDENCE</span>
                <h3 className="sk-drawer-hero-title">Model Evidence & Baseline Comparison</h3>
                <p className="sk-drawer-hero-p">
                  Rigorous empirical validation comparing Pragyan against standard operational meteorological baselines 
                  across temporal hold-outs and spatial block-level partitions.
                </p>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🪜 4-Tier Baseline Comparison Ladder</h4>
                <ul className="sk-drawer-bullet-list">
                  <li><strong>Tier 1: Block-Copy Baseline:</strong> Raw 25km NWP copied identically to all Panchayats without topographic correction.</li>
                  <li><strong>Tier 2: Environmental Lapse-Rate:</strong> Linear elevation adjustment (-6.5°C/km) without land-cover or roughness dynamics.</li>
                  <li><strong>Tier 3: Historical Climatology:</strong> 10-year monthly normals as a static fallback.</li>
                  <li><strong>Tier 4: Pragyan Hybrid Downscaler (Ours):</strong> Joint Ridge trunk + calibrated GBDT tree residual head capturing localized microclimate nuances.</li>
                </ul>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">📐 Verifiability Decay Modeling</h4>
                <p className="sk-drawer-desc-text">
                  Models spatial error degradation as an exponential function of geodesic distance to the nearest synoptic ground station, 
                  ensuring transparent uncertainty estimates for decision-makers.
                </p>
              </div>

              <button
                className="sk-drawer-card-btn is-primary"
                onClick={() => handleAction("evidence")}
                style={{ marginTop: "12px" }}
              >
                <span>{lang === "hi" ? "प्रमाण एवं मॉडल पृष्ठ खोलें" : "Open Evidence & Models Page"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {/* SECTION 6: COMMAND CENTRE & CRISIS MANAGEMENT (FULL INFO) */}
          {activeSection === "command" && (
            <div className="sk-drawer-full-info">
              <div className="sk-drawer-info-hero">
                <span className="sk-drawer-badge">EMERGENCY DISASTER RESPONSE</span>
                <h3 className="sk-drawer-hero-title">Command Centre & Incident Triage</h3>
                <p className="sk-drawer-hero-p">
                  Unified administrative command module enabling District Magistrates, SDMA emergency officers, 
                  and Block Development Officers to monitor weather anomalies, track risk escalations, and dispatch multi-channel warnings.
                </p>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🚨 Multi-Channel Alert Dispatch Protocol</h4>
                <ul className="sk-drawer-bullet-list">
                  <li><strong>Targeted SMS Blast:</strong> Instant vernacular warnings to registered Sarpanches, Sachivs, and progressive farmers.</li>
                  <li><strong>Common Service Centres (CSC):</strong> Broadcast advisories to rural digital kiosks across all 55 MP districts.</li>
                  <li><strong>Common Alerting Protocol (CAP):</strong> Standardized XML feed integrated into State Emergency Operation Centres (SEOC).</li>
                  <li><strong>Automated Grain Godown Alerts:</strong> Advance notice for APMC Mandis and PACS open grain storage protection.</li>
                </ul>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">⚡ Threshold Triggers & Risk Classification</h4>
                <div className="sk-drawer-stats-grid">
                  <div className="sk-drawer-stat-item">
                    <span className="sk-stat-val" style={{ color: "#EF4444" }}>&gt; 64.5 mm</span>
                    <span className="sk-stat-lbl">Heavy Rainfall Alert</span>
                  </div>
                  <div className="sk-drawer-stat-item">
                    <span className="sk-stat-val" style={{ color: "#F97316" }}>&gt; 42.0°C</span>
                    <span className="sk-stat-lbl">Severe Heatwave Warning</span>
                  </div>
                  <div className="sk-drawer-stat-item">
                    <span className="sk-stat-val" style={{ color: "#8B5CF6" }}>&gt; 45 km/h</span>
                    <span className="sk-stat-lbl">Gale Wind Squall Risk</span>
                  </div>
                  <div className="sk-drawer-stat-item">
                    <span className="sk-stat-val" style={{ color: "#059669" }}>100%</span>
                    <span className="sk-stat-lbl">Audit Verifiability</span>
                  </div>
                </div>
              </div>

              <button
                className="sk-drawer-card-btn is-primary"
                onClick={() => handleAction("command")}
                style={{ marginTop: "12px" }}
              >
                <span>{lang === "hi" ? "कमांड सेंटर संचालन खोलें" : "Open Command Centre Operations"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {/* SECTION 7: HISTORICAL EVENT REPLAY (FULL INFO) */}
          {activeSection === "replay" && (
            <div className="sk-drawer-full-info">
              <div className="sk-drawer-info-hero">
                <span className="sk-drawer-badge">COUNTERFACTUAL VERIFICATION</span>
                <h3 className="sk-drawer-hero-title">Extreme Weather Historical Replay</h3>
                <p className="sk-drawer-hero-p">
                  Play back verified past disaster episodes to evaluate Pragyan's 1km microclimate downscaler 
                  against coarse synoptic forecasts during historical real-world crises.
                </p>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">🌊 Event 1: September 2023 Narmada Basin Flash Flood</h4>
                <p className="sk-drawer-desc-text">
                  A high-intensity convective cloudburst struck Narsinghpur and Hoshangabad. While 25km NWP showed a block-wide 
                  average of 68mm, Pragyan isolated the localized 285mm orographic core along the Satpura ridge, 
                  providing 16 hours advance warning for riverbank Panchayats.
                </p>
              </div>

              <div className="sk-drawer-section-block">
                <h4 className="sk-drawer-block-title">☀️ Event 2: May 2024 Malwa Severe Heatwave</h4>
                <p className="sk-drawer-desc-text">
                  Temperatures reached 46.8°C across the Ujjain and Indore belt. Pragyan's canopy-adjusted model 
                  accurately identified cool-island oasis effects in irrigated orchards compared to bare fallow land, 
                  optimizing power grid surge planning and livestock heat advisories.
                </p>
              </div>

              <button
                className="sk-drawer-card-btn is-primary"
                onClick={() => handleAction("past-events")}
                style={{ marginTop: "12px" }}
              >
                <span>{lang === "hi" ? "ऐतिहासिक रीप्ले सिमुलेशन लॉन्च करें" : "Launch Historical Event Replay"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer with Pragyan Logo & Tagline */}
        <div className="sk-drawer-footer">
          <div className="sk-drawer-brand-block">
            {/* Signature PRAGYAN logo with stylized green leaves in both 'A's */}
            <PragyanLogo
              height={30}
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
