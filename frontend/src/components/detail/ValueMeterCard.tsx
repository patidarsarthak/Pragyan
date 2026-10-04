import React, { useState, useEffect } from "react";
import { THEME } from "../../theme";

interface ValueMeterCardProps {
  scopeLevel: string;
  scopeId: string;
  scopeName: string;
  selectedDay: number;
  lang: string;
}

export const ValueMeterCard: React.FC<ValueMeterCardProps> = ({
  scopeLevel,
  scopeId,
  scopeName,
  selectedDay,
  lang,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetch(`/api/ui/value-meter?scope=${scopeLevel}&id=${encodeURIComponent(scopeId)}&day=${selectedDay}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!isCancelled && res) setData(res);
      })
      .catch((err) => console.error("Failed to load value meter:", err))
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [scopeLevel, scopeId, selectedDay]);

  if (!data && loading) {
    return <div style={{ padding: "10px", fontSize: "11px", color: THEME.inkMuted }}>Loading Value Meter...</div>;
  }

  if (!data || data.total_panchayats_evaluated === 0) return null;

  const diffRate = data.difference_rate_pct || 0;
  const robustRate = data.robust_difference_rate_pct || 0;
  const ver = data.verification || {};

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "12px", margin: "12px 14px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em", color: THEME.inkMuted, textTransform: "uppercase" }}>
          {lang === "hi" ? "डाउनस्केलिंग मूल्य मीटर" : "DOWNSCALING VALUE METER"}
        </span>
        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#EFF6FF", color: THEME.blue, fontWeight: 600 }}>
          {data.total_panchayats_evaluated} GPs Evaluated
        </span>
      </div>

      <div style={{ fontSize: "13px", fontWeight: 700, color: THEME.inkDark, lineHeight: "1.4", marginBottom: "8px" }}>
        In {scopeName}, 1km downscaling changes farming advice for{" "}
        <span style={{ color: "#D97706" }}>{diffRate.toFixed(1)}%</span> of panchayat-days{" "}
        <span style={{ fontSize: "11px", fontWeight: 500, color: THEME.inkMuted }}>
          ({robustRate.toFixed(1)}% robust, |ΔP| ≥ 10%)
        </span>
      </div>

      {/* Progress Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: THEME.inkMuted, marginBottom: "2px" }}>
            <span>Advice Differs vs Block</span>
            <strong>{diffRate.toFixed(1)}% ({data.difference_count} GPs)</strong>
          </div>
          <div style={{ height: "6px", width: "100%", background: "#F3F4F6", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, diffRate)}%`, background: "#F59E0B" }} />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: THEME.inkMuted, marginBottom: "2px" }}>
            <span>Robust Divergence (|ΔP| ≥ 10%)</span>
            <strong>{robustRate.toFixed(1)}% ({data.robust_difference_count} GPs)</strong>
          </div>
          <div style={{ height: "6px", width: "100%", background: "#F3F4F6", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, robustRate)}%`, background: "#DC2626" }} />
          </div>
        </div>
      </div>

      {/* Honest Verification Box */}
      <div style={{ background: "#F9FAFB", padding: "8px 10px", borderRadius: "6px", fontSize: "11px", border: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, color: THEME.inkDark }}>Historical Win-Rate:</span>
          {ver.has_enough_data ? (
            <span style={{ fontWeight: 700, color: "#059669" }}>
              {ver.win_rate_pct}% (95% CI [{ver.ci_lower}%, {ver.ci_upper}%])
            </span>
          ) : (
            <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontSize: "10px" }}>
              not enough data yet (n &lt; 30)
            </span>
          )}
        </div>
        <div style={{ fontSize: "10px", color: THEME.inkMuted, marginTop: "4px" }}>
          {ver.has_enough_data
            ? "When downscaled and block advice disagreed, the 1km downscaled forecast matched ground truth outcomes significantly more often."
            : "Requires minimum 30 paired ground observations before claiming historical accuracy superiority."}
        </div>
      </div>
    </div>
  );
};
