import React, { useEffect, useState } from "react";
import { Language } from "../../lib/i18n";

interface UnusualnessMeterProps {
  lgdCode: number;
  selectedDay: number;
  rainfallMm?: number;
  lang: Language;
}

interface UnusualnessData {
  panchayat_name: string;
  lead_day: number;
  forecast_rainfall_mm: number;
  climatological_percentile: number;
  return_period_years: number;
  return_period_text: string;
  verbal_classification: string;
  alert_level: string;
  badge_color: string;
  baseline_dataset: string;
  baseline_period: string;
  sample_size_years: number;
  historical_benchmarks: {
    mean_daily_mm: number;
    p90_threshold_mm: number;
    record_maximum_mm: number;
  };
  narration: string;
}

export const UnusualnessMeterCard: React.FC<UnusualnessMeterProps> = ({
  lgdCode,
  selectedDay,
  rainfallMm,
  lang,
}) => {
  const [data, setData] = useState<UnusualnessData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let url = `/api/ui/unusualness?gp_code=${lgdCode}&day=${selectedDay}`;
    if (rainfallMm !== undefined) {
      url += `&rainfall_mm=${rainfallMm}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load unusualness meter:", err);
        setLoading(false);
      });
  }, [lgdCode, selectedDay, rainfallMm]);

  if (loading) {
    return (
      <div className="sk-panel-section" style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
        <div style={{ fontSize: "12px", color: "#64748b" }}>Loading climatological return-period...</div>
      </div>
    );
  }

  if (!data) return null;

  const pct = data.climatological_percentile;
  const barColor = pct >= 90 ? "#dc2626" : pct >= 75 ? "#d97706" : "#059669";

  return (
    <section className="sk-panel-section" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#475569" }}>
            {lang === "hi" ? "ऐतिहासिक असाधारणता मीटर" : lang === "bn" ? "ঐতিহাসিক অস্বাভাবিকতা মিটার" : "HISTORICAL UNUSUALNESS METER"}
          </span>
          <h4 style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
            {data.verbal_classification}
          </h4>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "4px",
            background: data.badge_color,
            color: "#FFFFFF",
          }}
        >
          {data.return_period_text}
        </span>
      </div>

      {/* Visual Percentile Progress Gauge */}
      <div style={{ margin: "10px 0 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>
          <span>44-Year CHIRPS Baseline Normal</span>
          <strong style={{ color: barColor }}>{pct}th Percentile</strong>
        </div>
        <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(3, pct))}%`,
              height: "100%",
              background: barColor,
              borderRadius: "4px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* Narration */}
      <p style={{ fontSize: "12px", color: "#334155", margin: "8px 0 10px", lineHeight: "1.4" }}>
        {data.narration}
      </p>

      {/* Climatological Benchmarks Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", borderTop: "1px solid #E2E8F0", paddingTop: "8px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase" }}>Season Normal</div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>{data.historical_benchmarks.mean_daily_mm} mm</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase" }}>90th Percentile</div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#D97706" }}>{data.historical_benchmarks.p90_threshold_mm} mm</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase" }}>44-Yr Record</div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>{data.historical_benchmarks.record_maximum_mm} mm</div>
        </div>
      </div>

      <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "8px", textAlign: "right" }}>
        Ref: {data.baseline_dataset} (1981–2024, N={data.sample_size_years} seasons)
      </div>
    </section>
  );
};
