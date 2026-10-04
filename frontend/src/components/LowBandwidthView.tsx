import React, { useState, useEffect } from "react";
import { Language, t } from "../lib/i18n";

interface LowBandwidthViewProps {
  lang: Language;
  onExit: () => void;
}

interface TablePanchayat {
  lgd_code: number;
  panchayat_name: string;
  district: string;
  block: string;
  rainfall_mm: number;
  temp_max_c: number;
  relative_humidity_pct: number;
  wind_speed_kmh: number;
}

export const LowBandwidthView: React.FC<LowBandwidthViewProps> = ({ lang, onExit }) => {
  const [items, setItems] = useState<TablePanchayat[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/ui/export/data?format=json&scope=district&id=Panna")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.records || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filtered = items.filter(
    (p) =>
      p.panchayat_name.toLowerCase().includes(filter.toLowerCase()) ||
      String(p.lgd_code).includes(filter) ||
      p.district.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      role="region"
      aria-label="Accessible Low Bandwidth Weather Console"
      style={{
        background: "#FFFFFF",
        color: "#000000",
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
        {/* Banner with high-contrast accessibility notice */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "3px solid #000000",
            paddingBottom: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>
              PRAGYAN · {lang === "hi" ? "सुलभ न्यून-बैंडविड्थ दृश्य" : lang === "bn" ? "অ্যাক্সেসযোগ্য কম-ব্যান্ডউইথ ভিউ" : "ACCESSIBLE LOW-BANDWIDTH MODE"}
            </h1>
            <p style={{ fontSize: "14px", margin: "4px 0 0", color: "#222222" }}>
              {lang === "hi"
                ? "पाठ-आधारित उच्च-विपरीत मौसम सारणी (पेलोड < 200 KB)"
                : "Text-only high-contrast weather data table (WCAG 2.1 AA Compliant · Payload < 200 KB)"}
            </p>
          </div>

          <button
            onClick={onExit}
            aria-label="Return to full graphical interface"
            style={{
              padding: "10px 18px",
              background: "#000000",
              color: "#FFFFFF",
              border: "2px solid #000000",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            ← {lang === "hi" ? "मानचित्र मोड पर वापस जाएँ" : "Return to Map Mode"}
          </button>
        </div>

        {/* Search Input with ARIA label */}
        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="panchayat-search" style={{ display: "block", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>
            {lang === "hi" ? "पंचायत या एलजीडी कोड खोजें:" : "Search Panchayat Name or LGD Code:"}
          </label>
          <input
            id="panchayat-search"
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="e.g. Kakarhati, Sanwer, 133338..."
            aria-describedby="search-help"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "12px",
              fontSize: "16px",
              border: "2px solid #000000",
              borderRadius: "0",
            }}
          />
          <div id="search-help" style={{ fontSize: "12px", color: "#444444", marginTop: "4px" }}>
            Press Tab to enter table, use Arrow keys to navigate rows.
          </div>
        </div>

        {/* Accessible Data Table */}
        {loading ? (
          <div role="status" aria-live="polite" style={{ padding: "30px", fontWeight: 700 }}>
            Loading accessible records...
          </div>
        ) : (
          <div tabIndex={0} role="region" aria-label="Weather Data Table" style={{ overflowX: "auto" }}>
            <table
              role="table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "2px solid #000000",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ background: "#000000", color: "#FFFFFF" }}>
                  <th scope="col" style={{ padding: "12px 10px", textAlign: "left" }}>LGD Code</th>
                  <th scope="col" style={{ padding: "12px 10px", textAlign: "left" }}>Gram Panchayat</th>
                  <th scope="col" style={{ padding: "12px 10px", textAlign: "left" }}>District</th>
                  <th scope="col" style={{ padding: "12px 10px", textAlign: "left" }}>Block</th>
                  <th scope="col" style={{ padding: "12px 10px", textAlign: "right" }}>Rain (mm)</th>
                  <th scope="col" style={{ padding: "12px 10px", textAlign: "right" }}>Max Temp (°C)</th>
                  <th scope="col" style={{ padding: "12px 10px", textAlign: "right" }}>Humidity (%)</th>
                  <th scope="col" style={{ padding: "12px 10px", textAlign: "right" }}>Wind (km/h)</th>
                  <th scope="col" style={{ padding: "12px 10px", textAlign: "center" }}>Risk Band</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => {
                  const isAlert = row.rainfall_mm >= 35.0;
                  const isWatch = row.rainfall_mm >= 15.0 && row.rainfall_mm < 35.0;
                  const band = isAlert ? "ALERT" : isWatch ? "WATCH" : "CALM";

                  return (
                    <tr
                      key={row.lgd_code}
                      style={{
                        borderBottom: "1px solid #000000",
                        background: idx % 2 === 0 ? "#FFFFFF" : "#F4F4F4",
                      }}
                    >
                      <td style={{ padding: "10px", fontFamily: "monospace", fontWeight: 700 }}>{row.lgd_code}</td>
                      <td style={{ padding: "10px", fontWeight: 800 }}>{row.panchayat_name}</td>
                      <td style={{ padding: "10px" }}>{row.district}</td>
                      <td style={{ padding: "10px" }}>{row.block}</td>
                      <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>{row.rainfall_mm.toFixed(1)}</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{row.temp_max_c.toFixed(1)}°</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{row.relative_humidity_pct}%</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{row.wind_speed_kmh}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            fontWeight: 900,
                            border: "1px solid #000000",
                            background: isAlert ? "#000000" : isWatch ? "#CCCCCC" : "#FFFFFF",
                            color: isAlert ? "#FFFFFF" : "#000000",
                          }}
                        >
                          {band}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
