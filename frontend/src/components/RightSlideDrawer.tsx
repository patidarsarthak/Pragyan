import React, { useState, useEffect } from "react";
import { Language, t } from "../lib/i18n";

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
  // Track which section is expanded for full info (defaults to 'about')
  const [expandedSection, setExpandedSection] = useState<string | null>("about");
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

  const handleCopySnippet = (e: React.MouseEvent) => {
    e.stopPropagation();
    const code = `<iframe src="https://pragyan.gov.in/embed/gp/133203" width="100%" height="340" frameborder="0" style="border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);" title="Pragyan Panchayat Weather"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const toggleSection = (id: string) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  const sections = [
    {
      id: "about",
      tabId: "methodology",
      icon: "🏛️",
      title: lang === "hi" ? "प्रज्ञान परिचय एवं शोध" : "About Pragyan & Methodology",
      subtitle: lang === "hi" ? "SIH26074 अधिदेश, 603 GP पायलट एवं डाउनस्केलिंग" : "SIH26074 Mandate, 603 GP Pilot & Scientific Downscaling",
      badge: "MANDATE",
    },
    {
      id: "api",
      tabId: "api-widget",
      icon: "🔑",
      title: lang === "hi" ? "ओपन REST एपीआई एवं की (API Keys)" : "Open REST APIs & Developer Keys",
      subtitle: lang === "hi" ? "डेवलपर एंडपॉइंट्स, प्रमाणीकरण एवं लाइव JSON फीड्स" : "Developer Endpoints, Authentication Keys & JSON Feeds",
      badge: "REST v1.2",
    },
    {
      id: "widget",
      tabId: "api-widget",
      icon: "📱",
      title: lang === "hi" ? "पंचायत मौसम विजेट" : "Embeddable Panchayat Widget",
      subtitle: lang === "hi" ? "ग्राम पंचायत पोर्टलों के लिए 1-क्लिक आईफ्रेम कोड" : "1-Click Copyable Iframe Code & Live Preview",
      badge: "IFRAME",
    },
    {
      id: "command",
      tabId: "command",
      icon: "🎯",
      title: lang === "hi" ? "कमांड सेंटर एवं अलर्ट प्रेषण" : "Command Centre & Crisis Dispatch",
      subtitle: lang === "hi" ? "जिला-स्तरीय घटना निवारण एवं बहु-चैनल चेतावनी" : "District Incident Triage & Multi-Channel Alert Broadcast",
      badge: "DISASTER RESPONSE",
    },
    {
      id: "evidence",
      tabId: "evidence",
      icon: "📊",
      title: lang === "hi" ? "मॉडल प्रमाण एवं बेसलाइन तुलना" : "Evidence & Baseline Validation",
      subtitle: lang === "hi" ? "4-स्तरीय बेसलाइन लैडर एवं स्टेशन दूरी क्षय" : "4-Tier Baseline Ladder & Geodesic Distance Decay",
      badge: "EMPIRICAL",
    },
    {
      id: "health",
      tabId: "health",
      icon: "🩺",
      title: lang === "hi" ? "सिस्टम स्वास्थ्य एवं लेजर" : "System Health & Cryptographic Ledger",
      subtitle: lang === "hi" ? "7-ब्लॉक SHA-256 ब्लॉकचेन ऑडिट एवं उपग्रह सिंक" : "7-Block SHA-256 Immutable Audit Ledger & Telemetry",
      badge: "SHA-256 VALID",
    },
    {
      id: "replay",
      tabId: "past-events",
      icon: "⏪",
      title: lang === "hi" ? "ऐतिहासिक आपदा रीप्ले" : "Historical Extreme Event Replay",
      subtitle: lang === "hi" ? "2023 नर्मदा बाढ़ एवं 2024 मालवा लू का सिमुलेशन" : "2023 Narmada Flood & 2024 Malwa Heatwave Simulations",
      badge: "HINDCAST",
    },
  ];

  return (
    <div className="sk-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pragyan System Directory">
      <div
        className="sk-drawer-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Drawer Header with Original Brand Style (Like First) */}
        <div className="sk-drawer-header">
          <div className="sk-drawer-brand-header">
            <img
              src="/logo_icon.png"
              alt="Pragyan"
              width="34"
              height="34"
              style={{ borderRadius: "8px", objectFit: "contain", flexShrink: 0, display: "block" }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="sk-drawer-brand-name">
                {t("brandName", lang)}
              </span>
              <span className="sk-drawer-brand-subtitle">
                {lang === "hi" ? "सिस्टम निर्देशिका एवं अनुभाग" : "System Directory & Sections"}
              </span>
            </div>
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

        {/* Drawer Body: Line by Line Options with Direct Full Page Navigation & Expandable Details */}
        <div className="sk-drawer-body">
          <div className="sk-drawer-line-list">
            {sections.map((sec) => {
              const isExpanded = expandedSection === sec.id;
              return (
                <div
                  key={sec.id}
                  className={`sk-drawer-line-card ${isExpanded ? "is-expanded" : ""}`}
                >
                  {/* Top Line Item Row */}
                  <div
                    className="sk-drawer-line-row"
                    onClick={() => toggleSection(sec.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleSection(sec.id);
                      }
                    }}
                    aria-expanded={isExpanded}
                  >
                    <div className="sk-drawer-line-left">
                      <span className="sk-drawer-line-icon">{sec.icon}</span>
                      <div className="sk-drawer-line-text">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="sk-drawer-line-title">{sec.title}</span>
                          <span className="sk-drawer-line-badge">{sec.badge}</span>
                        </div>
                        <span className="sk-drawer-line-sub">{sec.subtitle}</span>
                      </div>
                    </div>

                    <div className="sk-drawer-line-actions" onClick={(e) => e.stopPropagation()}>
                      {/* Direct Full Page Navigation Option */}
                      <button
                        className="sk-drawer-direct-page-btn"
                        onClick={() => handleAction(sec.tabId)}
                        title={lang === "hi" ? "पूरा पृष्ठ सीधे खोलें" : "Open Full Page Directly"}
                      >
                        <span>{lang === "hi" ? "पूरा पृष्ठ" : "Full Page"}</span>
                        <span aria-hidden="true">↗</span>
                      </button>

                      {/* Expand / Collapse Details Toggle */}
                      <button
                        className={`sk-drawer-accordion-toggle ${isExpanded ? "is-open" : ""}`}
                        onClick={() => toggleSection(sec.id)}
                        aria-label={isExpanded ? "Collapse full info" : "Expand full info"}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Full Info Body for this Line */}
                  {isExpanded && (
                    <div className="sk-drawer-line-expanded-body">
                      {/* 1. ABOUT PRAGYAN FULL INFO */}
                      {sec.id === "about" && (
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

                          <div className="sk-drawer-section-block">
                            <h4 className="sk-drawer-block-title">🎯 The Last-Mile Challenge Solved</h4>
                            <p className="sk-drawer-desc-text">
                              Standard block-level forecasts span 25×25 km grid cells, ignoring steep topographic elevation changes, 
                              valley microclimates, and agricultural land-cover variations. Pragyan resolves localized rain deltas down to each specific Gram Panchayat.
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
                              <li><strong>Topographic Ridge Trunk:</strong> Physical environmental lapse-rate adjustments (-6.5°C/km) based on NASA SRTM 30m DEM.</li>
                              <li><strong>Gradient Boosted Trees (GBDT):</strong> Non-linear residual learning for microclimate nuances, roughness, and windward orographic enhancement.</li>
                              <li><strong>ESA WorldCover 10m:</strong> Precise fractions for cropland, dense forest, surface water, and built-up areas for every Gram Panchayat polygon.</li>
                              <li><strong>Sentinel-2 / MODIS NDVI:</strong> 16-day dynamic vegetative health composites tracking actual canopy cover.</li>
                              <li><strong>Global NWP Ensembles:</strong> Ingestion of ECMWF IFS 0.25° and NOAA GFS high-resolution daily forecasts.</li>
                            </ul>
                          </div>

                          <button
                            className="sk-drawer-card-btn is-primary"
                            onClick={() => handleAction("methodology")}
                          >
                            <span>{lang === "hi" ? "पूरी कार्यप्रणाली एवं शोध पृष्ठ खोलें" : "Open Full Methodology & Architecture Page"}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      )}

                      {/* 2. REST APIS & DEVELOPER KEYS FULL INFO */}
                      {sec.id === "api" && (
                        <div className="sk-drawer-full-info">
                          <div className="sk-drawer-info-hero">
                            <span className="sk-drawer-badge">DEVELOPER API SUITE & KEY ACCESS</span>
                            <h3 className="sk-drawer-hero-title">Open REST APIs & Developer Keys</h3>
                            <p className="sk-drawer-hero-p">
                              High-throughput authenticated JSON endpoints with bearer token keys designed for State Relief Portals, 
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
                          >
                            <span>{lang === "hi" ? "एपीआई एवं विजेट केंद्र खोलें" : "Open API & Developer Keys Dashboard"}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      )}

                      {/* 3. EMBEDDABLE WIDGET FULL INFO */}
                      {sec.id === "widget" && (
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
                          >
                            <span>{lang === "hi" ? "विजेट कॉन्फ़िगरेशन पृष्ठ खोलें" : "Open Full Widget Customizer"}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      )}

                      {/* 4. COMMAND CENTRE FULL INFO */}
                      {sec.id === "command" && (
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
                          >
                            <span>{lang === "hi" ? "कमांड सेंटर संचालन खोलें" : "Open Command Centre Operations"}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      )}

                      {/* 5. EVIDENCE & BASELINE FULL INFO */}
                      {sec.id === "evidence" && (
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
                          >
                            <span>{lang === "hi" ? "प्रमाण एवं मॉडल पृष्ठ खोलें" : "Open Evidence & Models Page"}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      )}

                      {/* 6. SYSTEM HEALTH & LEDGER FULL INFO */}
                      {sec.id === "health" && (
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
                          >
                            <span>{lang === "hi" ? "सिस्टम स्वास्थ्य पृष्ठ खोलें" : "Open System Health Dashboard"}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      )}

                      {/* 7. EVENT REPLAY FULL INFO */}
                      {sec.id === "replay" && (
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
                          >
                            <span>{lang === "hi" ? "ऐतिहासिक रीप्ले सिमुलेशन लॉन्च करें" : "Launch Historical Event Replay"}</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer with Original Brand Style (Like First) */}
        <div className="sk-drawer-footer">
          <div className="sk-drawer-brand-block">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img
                src="/logo_icon.png"
                alt="Pragyan"
                width="24"
                height="24"
                style={{ borderRadius: "6px", objectFit: "contain", display: "block" }}
              />
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.01em" }}>
                {t("brandName", lang)}
              </span>
            </div>
            <p className="sk-drawer-tagline">
              {lang === "hi"
                ? "ग्राम पंचायत स्तरीय सूक्ष्म मौसम एवं कृषि परामर्श प्रणाली"
                : "Hyperlocal Weather Downscaling & Precision Agro-Meteorological Intelligence"}
            </p>
            <div className="sk-drawer-meta">
              <span>Ministry of Panchayati Raj Pilot</span>
              <span>·</span>
              <span>Smart India Hackathon 2026 (SIH26074)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
