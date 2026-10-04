import React, { useEffect, useState } from "react";
import { Language } from "../lib/i18n";

interface CommandCentreTabProps {
  lang: Language;
}

export const CommandCentreTab: React.FC<CommandCentreTabProps> = ({ lang }) => {
  const [district, setDistrict] = useState<string>("Panna");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ui/command-centre?scope_level=district&scope_id=${district}&day=1`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load command centre data:", err);
        setLoading(false);
      });
  }, [district]);

  const handlePrintBrief = () => {
    window.open(`/api/ui/command-centre/brief.html?scope_level=district&scope_id=${district}`, "_blank");
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "32px auto", padding: "0 24px", color: "#0B1220" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #E2E8F0", paddingBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB", letterSpacing: "0.08em" }}>
            ● DISTRICT & BLOCK AGRO-METEOROLOGICAL HEADQUARTERS
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0", color: "#0B1220" }}>
            Season Command Centre
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>
            Unified decision operational console for Sub-Divisional Agricultural Officers (SDAO) and District Collectorates.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontSize: "14px",
              fontWeight: 600,
              background: "#FFFFFF",
              color: "#0F172A",
            }}
          >
            <option value="Panna">Panna District</option>
            <option value="Damoh">Damoh District</option>
            <option value="Chhatarpur">Chhatarpur District</option>
            <option value="Indore">Indore District</option>
            <option value="Sagar">Sagar District</option>
          </select>

          <button
            onClick={handlePrintBrief}
            style={{
              padding: "10px 16px",
              background: "#059669",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📄</span> One-Click Officer PDF Brief
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
          Loading command centre operational dashboard...
        </div>
      ) : !data ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
          Failed to load command centre data.
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626", textTransform: "uppercase" }}>
                Active Alert Panchayats (≥55)
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#DC2626", marginTop: "4px" }}>
                {data.active_alerts_count}
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                Mandatory field advisory dispatch required today
              </div>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#D97706", textTransform: "uppercase" }}>
                High-Risk Sown Acreage
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#D97706", marginTop: "4px" }}>
                {data.high_risk_crop_area_ha.toLocaleString()} ha
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                Vulnerable crop stages under precipitation hazard
              </div>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>
                Monitored Panchayats ({district})
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#059669", marginTop: "4px" }}>
                {data.total_panchayats_monitored}
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                100% active LGD polygons with calibrated downscaling
              </div>
            </div>
          </div>

          {/* Section 1: Priority Action Queue */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px", marginBottom: "28px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 800, marginBottom: "14px", color: "#0F172A" }}>
              1. Priority Action Queue (Officer Interventions)
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Panchayat</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Block</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Risk Score</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Primary Hazard</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Crop Stage</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Mandated Field Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.priority_action_queue.map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                        {row.panchayat_name} <span style={{ fontSize: "11px", color: "#94A3B8" }}>#{row.lgd_code}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{row.block_name}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "4px", background: "#FEE2E2", color: "#991B1B", fontWeight: 700 }}>
                          {row.risk_score}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#DC2626", fontWeight: 600 }}>{row.primary_threat}</td>
                      <td style={{ padding: "10px 12px" }}>{row.dominant_crop}</td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>{row.action_required}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: 7-Day Risk Calendar Matrix & Crop Stage Cohorts */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
            {/* Risk Calendar Matrix */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "14px", color: "#0F172A" }}>
                2. 7-Day District Risk Forecast Matrix
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Lead Day</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Calm (&lt;25)</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Watch (25-54)</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Alert (≥55)</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>At-Risk Area</th>
                  </tr>
                </thead>
                <tbody>
                  {data.risk_calendar_7day.map((d: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>Day {d.day} ({d.label})</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#059669" }}>{d.calm}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#D97706", fontWeight: 600 }}>{d.watch}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#DC2626", fontWeight: 700 }}>{d.alert}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{d.high_risk_ha.toLocaleString()} ha</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Crop Cohorts */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "14px", color: "#0F172A" }}>
                3. Crop Stage Cohorts Distribution
              </h3>
              {data.crop_stage_cohorts.map((c: any, i: number) => (
                <div key={i} style={{ marginBottom: "16px", padding: "12px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #F1F5F9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
                    <span>{c.crop}</span>
                    <span style={{ color: "#64748B" }}>{c.total_area_ha.toLocaleString()} ha</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {c.stages.map((st: any, j: number) => (
                      <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span>{st.stage} ({st.pct}%)</span>
                        <span style={{ fontWeight: 600, color: st.vulnerability === "CRITICAL" ? "#DC2626" : st.vulnerability === "HIGH" ? "#D97706" : "#059669" }}>
                          {st.vulnerability}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
