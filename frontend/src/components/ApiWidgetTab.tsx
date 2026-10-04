import React, { useState } from "react";
import { Language } from "../lib/i18n";

interface ApiWidgetTabProps {
  lang: Language;
}

export const ApiWidgetTab: React.FC<ApiWidgetTabProps> = ({ lang }) => {
  const [lgdCode, setLgdCode] = useState<number>(133338);
  const [copied, setCopied] = useState<boolean>(false);

  const iframeSnippet = `<iframe src="${window.location.origin}/api/v1/widget/panchayat/${lgdCode}.html" width="380" height="340" frameborder="0" style="border:none; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.08);" title="Pragyan Weather Widget"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "32px auto", padding: "0 24px", color: "#0B1220" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", borderBottom: "1px solid #E2E8F0", paddingBottom: "16px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669", letterSpacing: "0.08em" }}>
          ● DEVELOPER & CITIZEN PORTAL INTEGRATION
        </span>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0", color: "#0B1220" }}>
          Public API & Embeddable Widget
        </h1>
        <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>
          Open REST APIs, embeddable micro-weather widgets for Gram Panchayat kiosks, and downloadable datasets with full provenance.
        </p>
      </div>

      {/* Grid: Widget Preview & Embed Snippet */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "28px", marginBottom: "32px" }}>
        {/* Live Widget Preview */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Live Embeddable Widget</h3>
            <select
              value={lgdCode}
              onChange={(e) => setLgdCode(Number(e.target.value))}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }}
            >
              <option value={133338}>Kakarhati (#133338)</option>
              <option value={133203}>Sanwer (#133203)</option>
              <option value={133201}>Depalpur (#133201)</option>
              <option value={133205}>Mhow (#133205)</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "center", background: "#F1F5F9", borderRadius: "8px", padding: "16px" }}>
            <iframe
              src={`/api/v1/widget/panchayat/${lgdCode}.html`}
              width="380"
              height="340"
              style={{ border: "none", borderRadius: "12px" }}
              title="Pragyan Live Widget"
            />
          </div>
        </div>

        {/* Code Generator & Documentation */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
            Embed in Kiosk or Portal
          </h3>
          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "14px" }}>
            Copy and paste this HTML snippet into any Gram Panchayat digital notice board, CSC kiosk, or Krishi Vigyan Kendra portal:
          </p>

          <pre style={{ background: "#0F172A", color: "#38BDF8", padding: "14px", borderRadius: "8px", fontSize: "11px", overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {iframeSnippet}
          </pre>

          <button
            onClick={handleCopy}
            style={{
              marginTop: "12px",
              padding: "10px 16px",
              background: copied ? "#059669" : "#003366",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Copied to Clipboard" : "Copy Embed Code"}
          </button>

          <div style={{ marginTop: "24px", borderTop: "1px solid #F1F5F9", paddingTop: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>API Standards & SLA</h4>
            <ul style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6", paddingLeft: "18px" }}>
              <li><strong>Rate Limits:</strong> 100 requests per minute per IP.</li>
              <li><strong>CORS Policy:</strong> Access-Control-Allow-Origin: * enabled for public integration.</li>
              <li><strong>Security:</strong> All endpoints return cryptographic verification hashes.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Open Data Downloads & Data Card */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "12px" }}>
          Open Data Downloads (Madhya Pradesh Pilot)
        </h3>
        <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "18px" }}>
          Direct bulk downloads of calibrated panchayat predictions, elevation deltas, and agricultural risk bands.
        </p>

        <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
          <a
            href="/api/ui/export/data?format=csv&scope=district&id=Panna"
            download
            style={{
              padding: "12px 20px",
              background: "#059669",
              color: "#FFFFFF",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>📥</span> Download Full Dataset (CSV)
          </a>

          <a
            href="/api/ui/export/data?format=json&scope=district&id=Panna"
            download
            style={{
              padding: "12px 20px",
              background: "#003366",
              color: "#FFFFFF",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>📥</span> Download Full Dataset (JSON)
          </a>

          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "12px 20px",
              background: "#F1F5F9",
              color: "#0F172A",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚡</span> Interactive OpenAPI / Swagger Docs
          </a>
        </div>

        {/* Data Card */}
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "#475569", marginBottom: "8px" }}>
            Official Data Card & Provenance
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", fontSize: "12px" }}>
            <div>
              <span style={{ color: "#64748B" }}>License:</span>
              <div style={{ fontWeight: 700, color: "#0F172A" }}>CC-BY-4.0 / Open Government Data (OGD)</div>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>Spatial Provenance:</span>
              <div style={{ fontWeight: 700, color: "#0F172A" }}>ECMWF IFS 9km + SRTM 30m DEM</div>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>Boundary Authority:</span>
              <div style={{ fontWeight: 700, color: "#0F172A" }}>Survey of India LGD Level 5 Match</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
