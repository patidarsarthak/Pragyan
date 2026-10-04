import React, { useState, useEffect } from "react";
import { THEME } from "../../theme";

interface DecisionCardProps {
  lgdCode: number;
  selectedDay: number;
  lang: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ lgdCode, selectedDay, lang }) => {
  const [costPreset, setCostPreset] = useState<"cheap" | "medium" | "expensive">("medium");
  const [costRatio, setCostRatio] = useState<number>(0.30);
  const [showWhy, setShowWhy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [decision, setDecision] = useState<any>(null);

  const presets = [
    { id: "cheap" as const, label: lang === "hi" ? "कम लागत (0.10)" : "Cheap (0.10)", ratio: 0.10 },
    { id: "medium" as const, label: lang === "hi" ? "मध्यम लागत (0.30)" : "Medium (0.30)", ratio: 0.30 },
    { id: "expensive" as const, label: lang === "hi" ? "उच्च लागत (0.60)" : "Expensive (0.60)", ratio: 0.60 },
  ];

  const handlePresetChange = (presetId: "cheap" | "medium" | "expensive", ratio: number) => {
    setCostPreset(presetId);
    setCostRatio(ratio);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCostRatio(val);
    if (Math.abs(val - 0.10) < 0.05) setCostPreset("cheap");
    else if (Math.abs(val - 0.30) < 0.05) setCostPreset("medium");
    else if (Math.abs(val - 0.60) < 0.05) setCostPreset("expensive");
  };

  useEffect(() => {
    let isCancelled = false;
    if (!lgdCode) return;

    setLoading(true);
    fetch(`/api/ui/decision/${lgdCode}?day=${selectedDay}&cost=${costPreset}&custom_cost_ratio=${costRatio}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!isCancelled && data) {
          setDecision(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch decision:", err);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [lgdCode, selectedDay, costRatio, costPreset]);

  if (!decision && loading) {
    return <div style={{ padding: "12px", fontSize: "12px", color: THEME.inkMuted }}>Loading decision card...</div>;
  }

  if (!decision) return null;

  const differs = decision.advice_differs;
  const robustDiffers = decision.advice_robust_differs;
  const action = decision.action || "WAIT";
  const blockAction = decision.block_action || "WAIT";

  const actionBg =
    action === "ACT"
      ? "#D1FAE5"
      : action === "HEDGE"
      ? "#FEF3C7"
      : "#F3F4F6";

  const actionColor =
    action === "ACT"
      ? "#065F46"
      : action === "HEDGE"
      ? "#92400E"
      : "#374151";

  return (
    <section className="sk-panel-section" style={{ border: differs ? "1.5px solid #F59E0B" : "1px solid #E5E7EB", borderRadius: "8px", padding: "14px", background: differs ? "#FFFDF5" : "#FFFFFF" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div>
          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: THEME.inkMuted, textTransform: "uppercase" }}>
            {lang === "hi" ? "निर्णय कार्ड (मर्फी 1977 लागत-हानि मॉडल)" : "FARMER DECISION CARD (MURPHY 1977)"}
          </span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "14px", fontWeight: 700, color: THEME.inkDark }}>
            {decision.rule_name || "Agromet Action Rule"}
          </h3>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {differs && (
            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: robustDiffers ? "#DC2626" : "#F59E0B", color: "#FFFFFF" }}>
              {robustDiffers ? (lang === "hi" ? "रोबस्ट विचलन" : "ROBUST DIFFERS") : (lang === "hi" ? "ब्लॉक से भिन्न" : "DIFFERS FROM BLOCK")}
            </span>
          )}
        </div>
      </div>

      {/* Main Action Banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: actionBg, borderRadius: "6px", marginBottom: "10px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 600, color: actionColor }}>
            {lang === "hi" ? "सिफारिश (पंचायत 1किमी):" : "RECOMMENDED ACTION (1KM PANCHAYAT):"}
          </span>
          <div style={{ fontSize: "16px", fontWeight: 800, color: actionColor }}>
            {action === "ACT" ? "⚡ TAKE PROTECTIVE ACTION" : action === "HEDGE" ? "⚠️ HEDGE / MONITOR CLOSELY" : "⏸️ WAIT / STANDARD OPERATIONS"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "10px", color: actionColor }}>{lang === "hi" ? "घटना प्रायिकता" : "P(hazard)"}</span>
          <div style={{ fontSize: "15px", fontWeight: 700, color: actionColor }}>
            {(decision.event_probability * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Comparison against Block NWP */}
      <div style={{ fontSize: "12px", color: THEME.inkDark, background: "#F9FAFB", padding: "8px 10px", borderRadius: "6px", marginBottom: "10px", borderLeft: differs ? "3px solid #F59E0B" : "3px solid #9CA3AF" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            <strong>{lang === "hi" ? "ब्लॉक पूर्वानुमान क्या कहता:" : "Coarse Block Forecast Would Say:"}</strong>{" "}
            <span style={{ fontWeight: 600, color: blockAction === action ? "#059669" : "#DC2626" }}>
              {blockAction} (P = {(decision.block_event_probability * 100).toFixed(0)}%)
            </span>
          </span>
          <span style={{ fontSize: "11px", color: THEME.inkMuted }}>
            {differs ? (lang === "hi" ? "❌ ब्लॉक निर्णय अलग होता" : "❌ Disagrees") : (lang === "hi" ? "✅ सहमत" : "✅ Agrees")}
          </span>
        </div>
        <div style={{ fontSize: "11px", color: THEME.inkMuted, marginTop: "4px" }}>
          <strong>Cause:</strong> {decision.cause_line || "Local topographic variation alters rain probability threshold."}
        </div>
      </div>

      {/* Personal Cost Selector */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: THEME.inkDark }}>
            {lang === "hi" ? "कार्रवाई लागत अनुपात (C/L):" : "Personal Action Cost Ratio (C/L):"}
          </span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: THEME.blue }}>
            {costRatio.toFixed(2)} (ASSUMPTION)
          </span>
        </div>

        {/* Preset Buttons */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id, p.ratio)}
              style={{
                flex: 1,
                padding: "4px 8px",
                fontSize: "11px",
                borderRadius: "4px",
                border: costPreset === p.id && Math.abs(costRatio - p.ratio) < 0.01 ? `2px solid ${THEME.blue}` : "1px solid #D1D5DB",
                background: costPreset === p.id && Math.abs(costRatio - p.ratio) < 0.01 ? "#EFF6FF" : "#FFFFFF",
                fontWeight: costPreset === p.id ? 700 : 500,
                cursor: "pointer",
                color: THEME.inkDark
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Continuous Slider for Agronomists / Officers */}
        <input
          type="range"
          min="0.05"
          max="0.95"
          step="0.05"
          value={costRatio}
          onChange={handleSliderChange}
          style={{ width: "100%", accentColor: THEME.blue, cursor: "pointer" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: THEME.inkMuted }}>
          <span>Cheap (0.05)</span>
          <span>Decision flips when P(event) ≥ C/L</span>
          <span>Expensive (0.95)</span>
        </div>
      </div>

      {/* "Why?" Expander */}
      <button
        onClick={() => setShowWhy(!showWhy)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: THEME.blue,
          fontSize: "11px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}
      >
        <span>{showWhy ? "▼" : "▶"} {lang === "hi" ? "यह निर्णय कैसे लिया गया? (विस्तार देखें)" : "Why? Decision science explanation"}</span>
      </button>

      {showWhy && (
        <div style={{ marginTop: "8px", padding: "10px", background: "#F3F4F6", borderRadius: "6px", fontSize: "11px", color: THEME.inkDark, lineHeight: "1.4" }}>
          <div><strong>Rule Applied:</strong> {decision.rule_name}</div>
          <div><strong>Threshold:</strong> {decision.threshold_condition}</div>
          <div><strong>Theoretical Framework:</strong> Murphy (1977) Cost-Loss Ratio model: A risk-neutral farmer acts when calibrated event probability exceeds Cost / Loss ratio (C/L = {costRatio.toFixed(2)}).</div>
          <div style={{ marginTop: "4px" }}>
            <strong>Comparison:</strong> Panchayat 1km P(hazard) = {(decision.event_probability * 100).toFixed(0)}% vs Block Coarse P(hazard) = {(decision.block_event_probability * 100).toFixed(0)}%.
            {differs ? " The 1km downscaled forecast crosses the action boundary whereas the coarse block forecast does not." : " Both forecasts land on the same side of the decision threshold."}
          </div>
        </div>
      )}
    </section>
  );
};
