import React from "react";
import { THEME } from "../../theme";
import { Language, t } from "../../lib/i18n";

export interface BreadcrumbItem {
  level: "india" | "state" | "district" | "block" | "gp";
  id: string | number;
  name: string;
}

interface MapStatusBarProps {
  breadcrumbs: BreadcrumbItem[];
  onBreadcrumbClick: (item: BreadcrumbItem, index: number) => void;
  activeLevelName: string;
  scoredCount: number;
  totalCount: number;
  alertCount: number;
  leadDay: number;
  dominantVariable?: string;
  meanRisk?: number;
  isValidated: boolean;
  boundaryNote?: string;
  hoverInfo?: {
    name: string;
    level: string;
    riskScore?: number;
    riskBand?: string;
  } | null;
  lang?: Language;
}

export const MapStatusBar: React.FC<MapStatusBarProps> = ({
  breadcrumbs,
  onBreadcrumbClick,
  activeLevelName,
  scoredCount,
  totalCount,
  alertCount,
  leadDay,
  dominantVariable = "rainfall",
  meanRisk = 32,
  isValidated,
  boundaryNote,
  hoverInfo,
  lang = "en",
}) => {
  // Construct dynamic template narration strictly from real API fields
  const pctAlert = totalCount > 0 ? ((alertCount / Math.max(1, scoredCount)) * 100).toFixed(1) : "0.0";
  
  let narrationText = "";
  if (!isValidated) {
    narrationText = lang === "hi"
      ? "पायलट से बाहर का क्षेत्र: मोटा मॉडल दृश्य। मध्य प्रदेश बेसिन में 1 किमी डाउनस्केलिंग सक्रिय।"
      : lang === "bn"
      ? "পাইলট এলাকার বাইরে: সাধারণ মডেল। মধ্যপ্রদেশে ১ কিমি ডাউনস্কেলিং সক্রিয়।"
      : `Out-of-pilot region: showing synoptic coarse resolution. Validated 1km downscaling currently active in Madhya Pradesh pilot basin.`;
  } else if (alertCount > 0) {
    narrationText = lang === "hi"
      ? `दिवस ${leadDay} पर ${activeLevelName} में चेतावनी: ${scoredCount} में से ${alertCount} पंचायतें (${pctAlert}%) चेतावनी स्थिति में हैं; मुख्य कारक ${dominantVariable} है।`
      : lang === "bn"
      ? `দিন ${leadDay}-এ ${activeLevelName}-এ সতর্কতা: ${scoredCount}-এর মধ্যে ${alertCount} পঞ্চায়েত (${pctAlert}%) সতর্কতায় রয়েছে; প্রধান কারণ ${dominantVariable}।`
      : `Day ${leadDay} has the highest alert share in ${activeLevelName}: ${alertCount} of ${scoredCount} scored panchayats (${pctAlert}%) are in alert status; ${dominantVariable.replace(
          "_",
          " "
        )} is the primary meteorological driver.`;
  } else {
    narrationText = lang === "hi"
      ? `दिवस ${leadDay} पर ${activeLevelName} की स्थिति सभी ${scoredCount} मूल्यांकित पंचायतों में अनुकूल है: औसत जोखिम ${Math.round(meanRisk)}% है; मौसमी कार्य जारी रखने की सलाह।`
      : lang === "bn"
      ? `দিন ${leadDay}-এ ${activeLevelName}-এর পরিস্থিতি ${scoredCount}টি মূল্যায়িত পঞ্চায়েতে অনুকূল: গড় ঝুঁকি ${Math.round(meanRisk)}%; কৃষিকাজ চালুর পরামর্শ।`
      : `Day ${leadDay} conditions in ${activeLevelName} remain favorable across all ${scoredCount} scored panchayats: mean risk index is ${Math.round(
          meanRisk
        )} (calm status); standard seasonal field operations recommended.`;
  }

  return (
    <div className="sk-status-bar-container" style={{ marginBottom: "12px" }}>
      {/* 1. Top row: Breadcrumbs + Operational Tier Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          padding: "8px 12px",
          background: "#FFFFFF",
          borderRadius: "8px 8px 0 0",
          border: "1px solid #E2E8F0",
          borderBottom: "none",
        }}
      >
        {/* Breadcrumbs */}
        <nav aria-label="Administrative drilldown breadcrumb" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
          {breadcrumbs.map((bc, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={`${bc.level}-${bc.id}-${idx}`}>
                {idx > 0 && <span style={{ color: "#94A3B8" }}>›</span>}
                <button
                  type="button"
                  onClick={() => onBreadcrumbClick(bc, idx)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    cursor: isLast ? "default" : "pointer",
                    fontWeight: isLast ? 700 : 500,
                    color: isLast ? "#0F172A" : "#2563EB",
                    textDecoration: isLast ? "none" : "underline",
                    fontSize: "13px",
                  }}
                  title={isLast ? "Current view" : `Navigate up to ${bc.name}`}
                >
                  {bc.name}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Evaluation Tier Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              background: isValidated ? "#ECFDF5" : "#F1F5F9",
              color: isValidated ? "#065F46" : "#475569",
              border: `1px solid ${isValidated ? "#A7F3D0" : "#CBD5E1"}`,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: isValidated ? "#10B981" : "#94A3B8",
              }}
            />
            {isValidated ? t("pilotEvaluationTier", lang) : (lang === "hi" ? "सांख्यिकीय बेसलाइन" : lang === "bn" ? "সাধারণ বেসলাইন" : "SYNOPTIC BASELINE")}
          </span>

          <span
            style={{
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 600,
              background: "#F8FAFC",
              color: "#334155",
              border: "1px solid #E2E8F0",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {scoredCount.toLocaleString()} / {totalCount.toLocaleString()} {t("gpsScoredLabel", lang)}
          </span>
        </div>
      </div>

      {/* 2. Middle Row: Live Template Narration Banner */}
      <div
        style={{
          padding: "8px 12px",
          background: isValidated ? "#F8FAFC" : "#FFFBEB",
          border: "1px solid #E2E8F0",
          borderTop: "1px solid #F1F5F9",
          borderBottom: "1px solid #E2E8F0",
          fontSize: "12px",
          lineHeight: "1.4",
          color: isValidated ? "#1E293B" : "#92400E",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "14px", flexShrink: 0 }}>
          {isValidated ? (alertCount > 0 ? "⚠️" : "🌱") : "ℹ️"}
        </span>
        <div style={{ flex: 1 }}>
          <strong style={{ marginRight: "6px" }}>{t("synopticSummaryLabel", lang)}</strong>
          {narrationText}
        </div>
      </div>

      {/* 3. Bottom strip: Boundary Note / Hover Readout */}
      {(boundaryNote || hoverInfo) && (
        <div
          style={{
            padding: "4px 12px",
            background: "#F1F5F9",
            borderRadius: "0 0 8px 8px",
            border: "1px solid #E2E8F0",
            borderTop: "none",
            fontSize: "11px",
            color: "#475569",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            {boundaryNote ? (
              <span style={{ color: "#B45309", fontWeight: 600 }}>
                • {boundaryNote}
              </span>
            ) : (
              <span>{lang === "hi" ? "सुझाव: किसी भी प्रशासनिक सीमा पर क्लिक करके नीचे स्तर पर जाएं" : lang === "bn" ? "পরামর্শ: বিস্তারিত দেখতে প্রশাসনিক সীমানায় ক্লিক করুন" : "Tip: Click any administrative boundary to drill down level-by-level"}</span>
            )}
          </span>
          {hoverInfo && (
            <span style={{ fontWeight: 600, color: "#0F172A" }}>
              {lang === "hi" ? "चयनित: " : lang === "bn" ? "নির্বাচিত: " : "Hovering: "}{hoverInfo.name} ({hoverInfo.level})
              {hoverInfo.riskScore !== undefined && ` · Risk: ${hoverInfo.riskScore}%`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
