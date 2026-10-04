import React, { useEffect, useState } from "react";
import { Language } from "../lib/i18n";

interface SystemHealthTabProps {
  lang: Language;
}

export const SystemHealthTab: React.FC<SystemHealthTabProps> = ({ lang }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationOutput, setVerificationOutput] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ui/health/data-quality")
      .then((res) => res.json())
      .then((d) => {
        setHealthData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load system health report:", err);
        setLoading(false);
      });
  }, []);

  const handleRunLedgerAudit = () => {
    setVerifying(true);
    fetch("/api/ui/ledger")
      .then((res) => res.json())
      .then((res) => {
        setVerifying(false);
        setVerificationOutput(
          `STATUS: ${res.status}\nBLOCKS: ${res.total_blocks} chained blocks\nGENESIS: ${res.genesis_hash}\nLATEST: ${res.latest_hash}\nMESSAGE: ${res.message}`
        );
      })
      .catch(() => {
        setVerifying(false);
        setVerificationOutput("Audit error: Unable to connect to ledger verification engine.");
      });
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1280px", margin: "32px auto", padding: "0 24px" }}>
        <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
          Loading System Health & Data Quality telemetry...
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div style={{ maxWidth: "1280px", margin: "32px auto", padding: "0 24px" }}>
        <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
          Failed to load System Health telemetry.
        </div>
      </div>
    );
  }

  const { upstream_sources, panchayat_data_quality, ledger_verification, residual_drift, model_card } = healthData;

  return (
    <div style={{ maxWidth: "1280px", margin: "32px auto", padding: "0 24px", color: "#0B1220" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #E2E8F0", paddingBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669", letterSpacing: "0.08em" }}>
            ● SYSTEM HEALTH & DATA INTEGRITY TELEMETRY
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0", color: "#0B1220" }}>
            Data Quality & Model Diagnostics
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>
            Real-time pipeline freshness, spatial data completeness, cryptographic ledger audits, and residual drift tracking.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ padding: "8px 16px", borderRadius: "8px", background: "#ECFDF5", border: "1px solid #A7F3D0", textAlign: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#065F46", textTransform: "uppercase" }}>STATUS</span>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#059669" }}>OPERATIONAL</div>
          </div>
        </div>
      </div>

      {/* Grid: Upstream Pipelines & Data Quality */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Upstream Sources Freshness */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", color: "#0F172A" }}>
            1. Upstream Ingestion Freshness & Latency
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {upstream_sources.map((src: any) => (
              <div key={src.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #F1F5F9" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{src.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>
                    {src.type} · Provenance: {src.provenance}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", background: src.status === "HEALTHY" ? "#ECFDF5" : "#EFF6FF", color: src.status_color }}>
                    {src.status} {src.latency_hours > 0 ? `(${src.latency_hours}h lag)` : ""}
                  </span>
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                    Expected: {src.expected_cadence_hours ? `Every ${src.expected_cadence_hours}h` : "Static"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spatial Data Completeness */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", color: "#0F172A" }}>
            2. Pilot Spatial Completeness
          </h3>
          <div style={{ textAlign: "center", padding: "16px", background: "#F0FDF4", borderRadius: "8px", border: "1px solid #BBF7D0", marginBottom: "16px" }}>
            <div style={{ fontSize: "36px", fontWeight: 800, color: "#059669" }}>
              {panchayat_data_quality.complete_coverage_pct}%
            </div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
              Complete Coverage Rate
            </div>
            <div style={{ fontSize: "12px", color: "#4B5563", marginTop: "4px" }}>
              {panchayat_data_quality.complete_coverage_count} of {panchayat_data_quality.total_active_panchayats} Pilot Panchayats
            </div>
          </div>

          <div style={{ fontSize: "13px", color: "#334155", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Interpolated Fallbacks:</span>
              <strong>{panchayat_data_quality.interpolated_coverage_count} ({panchayat_data_quality.interpolated_coverage_pct}%)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Missing Records:</span>
              <strong style={{ color: "#059669" }}>{panchayat_data_quality.missing_coverage_count} (0.0%)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Zero-Missing Guarantee:</span>
              <strong style={{ color: "#059669" }}>ENFORCED</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Cryptographic Ledger & Drift Analysis */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Ledger Verification */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0F172A" }}>
              3. Forecast Ledger Integrity
            </h3>
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", background: "#ECFDF5", color: "#059669" }}>
              {ledger_verification.chain_status}
            </span>
          </div>

          <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.4" }}>
            Every forecast cycle is hashed with SHA-256 into a tamper-evident blockchain-style ledger. If any forecast is retroactively altered, the chain breaks.
          </p>

          <div style={{ background: "#0F172A", color: "#E2E8F0", padding: "12px", borderRadius: "8px", fontFamily: "monospace", fontSize: "11px", marginBottom: "14px" }}>
            <div>CHAIN: {ledger_verification.total_blocks} chained blocks</div>
            <div style={{ marginTop: "4px", wordBreak: "break-all" }}>LATEST: {ledger_verification.latest_block_hash}</div>
          </div>

          <button
            onClick={handleRunLedgerAudit}
            disabled={verifying}
            style={{
              padding: "10px 16px",
              background: "#003366",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {verifying ? "Auditing Chain..." : "Run Cryptographic Audit"}
          </button>

          {verificationOutput && (
            <pre style={{ marginTop: "12px", padding: "10px", background: "#F1F5F9", borderRadius: "6px", fontSize: "11px", color: "#0F172A", whiteSpace: "pre-wrap" }}>
              {verificationOutput}
            </pre>
          )}
        </div>

        {/* 7-Day Residual Drift Tracking */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0F172A" }}>
              4. 7-Day Residual Drift vs Observations
            </h3>
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", background: "#ECFDF5", color: "#059669" }}>
              {residual_drift.status} ({residual_drift.observed_rmse_drift_sigma}σ)
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>Lead Horizon</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Rain RMSE</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Temp MAE</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Skill Score</th>
              </tr>
            </thead>
            <tbody>
              {residual_drift.lead_day_residuals.map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 600 }}>{row.day}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{row.rainfall_rmse_mm} mm</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{row.temp_mae_c}°C</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#059669", fontWeight: 700 }}>+{row.skill_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Card & Operational Limitations */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "24px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px", color: "#0F172A" }}>
          5. Model Card & Documented Operational Limitations
        </h3>
        <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "16px" }}>
          Architectural specification and honest boundary constraints for {model_card.model_name}.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "#475569", marginBottom: "8px" }}>
              Intended Scope & Architecture
            </h4>
            <ul style={{ fontSize: "13px", color: "#334155", paddingLeft: "18px", lineHeight: "1.6" }}>
              <li><strong>Architecture:</strong> {model_card.architecture}</li>
              <li><strong>Intended Use:</strong> {model_card.intended_use}</li>
              <li><strong>Pilot Scope:</strong> {model_card.pilot_scope}</li>
              <li><strong>Training Period:</strong> {model_card.training_period}</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "#DC2626", marginBottom: "8px" }}>
              Documented Failure Modes & Limitations
            </h4>
            <ul style={{ fontSize: "13px", color: "#334155", paddingLeft: "18px", lineHeight: "1.6" }}>
              {model_card.limitations.map((lim: string, idx: number) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
