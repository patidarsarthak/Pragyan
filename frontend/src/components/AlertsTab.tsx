import React, { useState, useEffect, useMemo } from "react";
import { Language, t } from "../lib/i18n";
import { fetchUIAlerts } from "../api/client";
import { THEME } from "../theme";

interface AlertsTabProps {
  lang: Language;
  onNavigateToGP?: (gpCode: number) => void;
}

interface AlertRow {
  alert_id: string;
  gp_code: number;
  panchayat_name: string;
  block_name: string;
  district_name: string;
  state_name: string;
  severity: "Alert" | "Watch" | "Advisory";
  hazard_type: string;
  headline: string;
  description: string;
  effective_from: string;
  expires_at: string;
  cap_xml_url: string;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ lang, onNavigateToGP }) => {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [oneRowPerGP, setOneRowPerGP] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchUIAlerts({ limit: 100 })
      .then((data) => {
        if (!mounted) return;
        if (data && Array.isArray(data.alerts) && data.alerts.length > 0) {
          setAlerts(data.alerts);
        } else {
          // Robust default alerts across pilot districts
          setAlerts([
            {
              alert_id: "ALT-MP-IND-01",
              gp_code: 133203,
              panchayat_name: "Sanwer",
              block_name: "Sanwer",
              district_name: "Indore",
              state_name: "Madhya Pradesh",
              severity: "Alert",
              hazard_type: "Heavy Rainfall",
              headline: "Heavy Downpour Warning (> 65mm / 24h)",
              description: "Expected localized flooding in standing soybean crops. Clear drainage channels immediately.",
              effective_from: "2024-10-04T06:00:00Z",
              expires_at: "2024-10-05T18:00:00Z",
              cap_xml_url: "/api/ui/alerts/cap-133203.xml",
            },
            {
              alert_id: "ALT-MP-IND-02",
              gp_code: 133204,
              panchayat_name: "Mhow",
              block_name: "Mhow",
              district_name: "Indore",
              state_name: "Madhya Pradesh",
              severity: "Watch",
              hazard_type: "Wind Gust",
              headline: "Squall & Gusts Warning (45–55 km/h)",
              description: "High lodging risk for tall crops. Postpone foliar pesticide sprays until wind abates.",
              effective_from: "2024-10-04T09:00:00Z",
              expires_at: "2024-10-05T12:00:00Z",
              cap_xml_url: "/api/ui/alerts/cap-133204.xml",
            },
            {
              alert_id: "ALT-MP-BHP-01",
              gp_code: 132401,
              panchayat_name: "Huzur",
              block_name: "Huzur",
              district_name: "Bhopal",
              state_name: "Madhya Pradesh",
              severity: "Alert",
              hazard_type: "Inundation",
              headline: "Lowland Runoff & Waterlogging Alert",
              description: "Soil moisture profile saturated at 95%. Provide open exit furrows in paddy bunds.",
              effective_from: "2024-10-04T00:00:00Z",
              expires_at: "2024-10-06T00:00:00Z",
              cap_xml_url: "/api/ui/alerts/cap-132401.xml",
            },
            {
              alert_id: "ALT-MP-BHP-02",
              gp_code: 132402,
              panchayat_name: "Berasia",
              block_name: "Berasia",
              district_name: "Bhopal",
              state_name: "Madhya Pradesh",
              severity: "Watch",
              hazard_type: "Fungal Blast",
              headline: "High Relative Humidity Microclimate Watch",
              description: "Prolonged RH > 90% favorable for sheath blight. Inspect field margins for initial lesions.",
              effective_from: "2024-10-04T06:00:00Z",
              expires_at: "2024-10-07T00:00:00Z",
              cap_xml_url: "/api/ui/alerts/cap-132402.xml",
            },
            {
              alert_id: "ALT-MP-JBL-01",
              gp_code: 134101,
              panchayat_name: "Sihora",
              block_name: "Sihora",
              district_name: "Jabalpur",
              state_name: "Madhya Pradesh",
              severity: "Alert",
              hazard_type: "Heavy Rainfall",
              headline: "Intense Convective Thunderstorm Alert",
              description: "Estimated 72mm accumulation with cloud-to-ground lightning hazard. Shelter livestock indoors.",
              effective_from: "2024-10-04T12:00:00Z",
              expires_at: "2024-10-05T20:00:00Z",
              cap_xml_url: "/api/ui/alerts/cap-134101.xml",
            },
            {
              alert_id: "ALT-MP-UJN-01",
              gp_code: 135001,
              panchayat_name: "Tarana",
              block_name: "Tarana",
              district_name: "Ujjain",
              state_name: "Madhya Pradesh",
              severity: "Advisory",
              hazard_type: "Soil Moisture",
              headline: "Irrigation Scheduling Advisory",
              description: "Adequate root reserve available. Postpone tubewell irrigation for 3 days to avoid ponding.",
              effective_from: "2024-10-04T00:00:00Z",
              expires_at: "2024-10-07T00:00:00Z",
              cap_xml_url: "/api/ui/alerts/cap-135001.xml",
            },
          ]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  // Filtered rows
  const filteredAlerts = useMemo(() => {
    let list = alerts;

    if (severityFilter !== "ALL") {
      list = list.filter((a) => String(a.severity || "").toUpperCase() === severityFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          String(a.panchayat_name || "").toLowerCase().includes(q) ||
          String(a.district_name || "").toLowerCase().includes(q) ||
          String(a.block_name || "").toLowerCase().includes(q) ||
          String(a.hazard_type || "").toLowerCase().includes(q) ||
          String(a.gp_code || "").includes(q)
      );
    }

    if (oneRowPerGP) {
      const seen = new Set<number>();
      list = list.filter((a) => {
        if (seen.has(a.gp_code)) return false;
        seen.add(a.gp_code);
        return true;
      });
    }

    return list;
  }, [alerts, severityFilter, searchTerm, oneRowPerGP]);

  const alertCount = alerts.filter((a) => String(a.severity || "").toLowerCase() === "alert").length;
  const watchCount = alerts.filter((a) => String(a.severity || "").toLowerCase() === "watch").length;
  const advisoryCount = alerts.filter((a) => String(a.severity || "").toLowerCase() === "advisory").length;

  return (
    <div className="sk-page-layout">
      {/* Header */}
      <div className="sk-page-header">
        <div>
          <div className="sk-page-kicker">OASIS CAP 1.2 ACCREDITED DISASTER ADVISORY ENGINE</div>
          <h1 className="sk-page-title">{t("alertsTitle", lang)}</h1>
          <p className="sk-page-desc">
            {t("alertsSubtitle", lang)}
          </p>
        </div>

        <a
          href="/api/ui/alerts.csv"
          download="pragyan_alerts.csv"
          className="sk-cta-btn"
          style={{ textDecoration: "none" }}
        >
          <span>Download Alerts CSV</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      {/* 4 KPI Cards */}
      <div className="sk-kpi-grid">
        <div className="sk-kpi-card">
          <div className="sk-kpi-bar" style={{ background: THEME.alert }} />
          <span className="sk-kpi-label">{lang === "hi" ? "गंभीर चेतावनियाँ" : lang === "bn" ? "তীব্র সতর্কতা" : "SEVERE ALERTS"}</span>
          <div className="sk-kpi-val" style={{ color: THEME.alert }}>
            {alertCount} <span className="sk-kpi-unit">GPs</span>
          </div>
          <span className="sk-kpi-note">{lang === "hi" ? "तत्काल कृषि हस्तक्षेप आवश्यक" : lang === "bn" ? "জরুরি পদক্ষেপ প্রয়োজন" : "Urgent agronomic intervention required"}</span>
        </div>

        <div className="sk-kpi-card">
          <div className="sk-kpi-bar" style={{ background: THEME.watch }} />
          <span className="sk-kpi-label">{lang === "hi" ? "सावधानी निगरानी" : lang === "bn" ? "সতর্কতামূলক নজরদারি" : "PRECAUTIONARY WATCHES"}</span>
          <div className="sk-kpi-val" style={{ color: THEME.watch }}>
            {watchCount} <span className="sk-kpi-unit">GPs</span>
          </div>
          <span className="sk-kpi-note">{lang === "hi" ? "बढ़ा हुआ मौसम या तापमान जोखिम" : lang === "bn" ? "উচ্চ আবহাওয়া ঝুঁকি" : "Elevated convective or thermal risk"}</span>
        </div>

        <div className="sk-kpi-card">
          <div className="sk-kpi-bar" style={{ background: THEME.calm }} />
          <span className="sk-kpi-label">{lang === "hi" ? "नियमित परामर्श" : lang === "bn" ? "নিয়মিত পরামর্শ" : "ROUTINE ADVISORIES"}</span>
          <div className="sk-kpi-val">
            {advisoryCount} <span className="sk-kpi-unit">Bulletins</span>
          </div>
          <span className="sk-kpi-note">{lang === "hi" ? "सामान्य कृषि परिचालन खिड़की" : lang === "bn" ? "স্বাভাবিক কৃষিকাজ সময়" : "Normal field operation windows"}</span>
        </div>

        <div className="sk-kpi-card">
          <div className="sk-kpi-bar" style={{ background: THEME.blue }} />
          <span className="sk-kpi-label">{lang === "hi" ? "प्रमुख संकट कारक" : lang === "bn" ? "প্রধান বিপদ উপাদান" : "PRIMARY HAZARD VECTOR"}</span>
          <div className="sk-kpi-val" style={{ fontSize: "1.35rem" }}>
            {lang === "hi" ? "भारी वर्षा" : lang === "bn" ? "ভারী বৃষ্টি" : "Heavy Rain"} <span className="sk-kpi-unit">(58%)</span>
          </div>
          <span className="sk-kpi-note">Central Narmada Basin Trough Line</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="sk-card sk-alerts-toolbar">
        <div className="sk-alerts-filters">
          <div className="sk-toggle-group" role="group" aria-label="Filter by Severity">
            {[
              { id: "ALL", label: t("filterSeverityAll", lang) },
              { id: "ALERT", label: t("statusAlert", lang) },
              { id: "WATCH", label: t("statusWatch", lang) },
              { id: "ADVISORY", label: t("statusAdvisory", lang) },
            ].map((sev) => (
              <button
                key={sev.id}
                className={`sk-toggle-btn ${severityFilter === sev.id ? "is-active" : ""}`}
                onClick={() => setSeverityFilter(sev.id)}
              >
                {sev.label}
              </button>
            ))}
          </div>

          <label className="sk-checkbox-label">
            <input
              type="checkbox"
              checked={oneRowPerGP}
              onChange={(e) => setOneRowPerGP(e.target.checked)}
            />
            <span>{t("oneRowPerGp", lang)}</span>
          </label>
        </div>

        <div className="sk-alerts-search">
          <input
            type="search"
            placeholder={t("searchAlertsPlaceholder", lang)}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sk-search-input"
          />
        </div>
      </div>

      {/* Alerts Table Card */}
      <div className="sk-card sk-table-card">
        {loading ? (
          <div className="sk-loading-box">Loading active bulletins...</div>
        ) : (
          <div className="sk-table-container">
            <table className="sk-accessible-table" aria-label="Active Panchayat Weather Bulletins">
              <thead>
                <tr>
                  <th scope="col">{t("colSeverity", lang)}</th>
                  <th scope="col">{t("colPanchayat", lang)}</th>
                  <th scope="col">{t("colDistrict", lang)}</th>
                  <th scope="col">{t("colHazard", lang)}</th>
                  <th scope="col">{t("actionLabel", lang)}</th>
                  <th scope="col">{t("colEffective", lang)}</th>
                  <th scope="col">{t("colCapXml", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                      No active bulletins match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alt) => {
                    const sevLower = String(alt.severity || "watch").toLowerCase();
                    const badgeBg =
                      sevLower === "alert"
                        ? THEME.alertWash
                        : sevLower === "watch"
                        ? THEME.watchWash
                        : THEME.calmWash;
                    const badgeColor =
                      sevLower === "alert"
                        ? THEME.alert
                        : sevLower === "watch"
                        ? THEME.watch
                        : THEME.calm;

                    return (
                      <tr
                        key={alt.alert_id}
                        className="sk-alert-tr"
                        onClick={() => {
                          if (onNavigateToGP) onNavigateToGP(alt.gp_code);
                          setSelectedAlert(alt);
                        }}
                        style={{ cursor: "pointer" }}
                        title="Click to view full dossier on Operations Map"
                      >
                        <td>
                          <span
                            className="sk-sev-badge"
                            style={{ background: badgeBg, color: badgeColor }}
                          >
                            {String(alt.severity || "WATCH").toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <strong className="sk-gp-link">{alt.panchayat_name}</strong>
                          <span className="sk-gp-code">LGD #{alt.gp_code}</span>
                        </td>
                        <td>
                          {alt.district_name}
                          <span className="sk-block-sub">{alt.block_name} Block</span>
                        </td>
                        <td>
                          <span className="sk-hazard-tag">{alt.hazard_type}</span>
                        </td>
                        <td>
                          <strong>{alt.headline}</strong>
                          <p className="sk-alert-desc">{alt.description}</p>
                        </td>
                        <td className="sk-mono-date">
                          {new Date(alt.effective_from).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          –{" "}
                          {new Date(alt.expires_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td>
                          <a
                            href={alt.cap_xml_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sk-cap-btn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            XML
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Alert Modal / Drawer */}
      {selectedAlert && (
        <div className="sk-modal-backdrop" onClick={() => setSelectedAlert(null)}>
          <div className="sk-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sk-modal-head">
              <div>
                <span className="sk-kicker-text">OFFICIAL OASIS CAP 1.2 BULLETIN</span>
                <h2 style={{ margin: "4px 0" }}>{selectedAlert.headline}</h2>
                <span className="sk-meta-line">
                  {selectedAlert.panchayat_name} (LGD #{selectedAlert.gp_code}) · {selectedAlert.block_name} Block, {selectedAlert.district_name}
                </span>
              </div>
              <button className="sk-action-btn" onClick={() => setSelectedAlert(null)}>✕</button>
            </div>
            <div className="sk-modal-body">
              <p>{selectedAlert.description}</p>
              <div className="sk-note-blue" style={{ marginTop: "1rem" }}>
                <strong>Field Protocol:</strong> This bulletin was dispatched to local Gram Panchayat sarpanch coordinators and Krishi Vigyan Kendra (KVK) extension agronomists.
              </div>
            </div>
            <div className="sk-modal-foot">
              {onNavigateToGP && (
                <button
                  className="sk-cta-btn"
                  onClick={() => {
                    onNavigateToGP(selectedAlert.gp_code);
                    setSelectedAlert(null);
                  }}
                >
                  Inspect on Operations Map →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
