import React from "react";
import { THEME } from "../../theme";

interface DayRailRow {
  day: number;
  label: string;
  calmShare: number;
  watchShare: number;
  alertShare: number;
  meanRisk: number;
  dominantVar?: string;
}

interface DayRailProps {
  currentDay: number;
  onSelectDay: (day: number) => void;
  railData?: DayRailRow[];
  note?: string;
}

export const DayRail: React.FC<DayRailProps> = ({
  currentDay,
  onSelectDay,
  railData,
  note = "Day 4 shows the highest alert concentration (46% mean risk) driven by active convective rainbands over Central MP.",
}) => {
  // Default 10-day distribution if railData not passed
  const rows: DayRailRow[] = railData || [
    { day: 1, label: "Day 1", calmShare: 0.65, watchShare: 0.21, alertShare: 0.14, meanRisk: 18.5, dominantVar: "Rain" },
    { day: 2, label: "Day 2", calmShare: 0.58, watchShare: 0.24, alertShare: 0.18, meanRisk: 24.0, dominantVar: "Rain" },
    { day: 3, label: "Day 3", calmShare: 0.44, watchShare: 0.32, alertShare: 0.24, meanRisk: 38.2, dominantVar: "Wind" },
    { day: 4, label: "Day 4", calmShare: 0.35, watchShare: 0.35, alertShare: 0.30, meanRisk: 46.5, dominantVar: "Rain" },
    { day: 5, label: "Day 5", calmShare: 0.40, watchShare: 0.36, alertShare: 0.24, meanRisk: 41.0, dominantVar: "Rain" },
    { day: 6, label: "Day 6", calmShare: 0.52, watchShare: 0.30, alertShare: 0.18, meanRisk: 32.4, dominantVar: "RH" },
    { day: 7, label: "Day 7", calmShare: 0.58, watchShare: 0.28, alertShare: 0.14, meanRisk: 28.0, dominantVar: "Temp" },
    { day: 8, label: "Day 8", calmShare: 0.62, watchShare: 0.26, alertShare: 0.12, meanRisk: 25.1, dominantVar: "Wind" },
    { day: 9, label: "Day 9", calmShare: 0.66, watchShare: 0.24, alertShare: 0.10, meanRisk: 22.8, dominantVar: "ET₀" },
    { day: 10, label: "Day 10", calmShare: 0.70, watchShare: 0.22, alertShare: 0.08, meanRisk: 20.4, dominantVar: "ET₀" },
  ];

  return (
    <aside className="sk-rail-card" aria-label="10-Day Risk Horizon Rail">
      <div className="sk-rail-header">
        <h3 className="sk-rail-title">10-DAY LEAD HORIZON</h3>
        <span className="sk-rail-sub">Scored across 603 Panchayats</span>
      </div>

      <div className="sk-rail-list">
        {rows.map((row) => {
          const isActive = currentDay === row.day;
          return (
            <button
              key={row.day}
              className={`sk-rail-row ${isActive ? "is-active" : ""}`}
              onClick={() => onSelectDay(row.day)}
              aria-pressed={isActive}
              title={`Switch to Day ${row.day} (Mean Risk: ${Number(row.meanRisk ?? 0).toFixed(0)}%)`}
            >
              <div className="sk-rail-day-label">
                <span className="sk-rail-day-text">{row.label}</span>
                {row.dominantVar && (
                  <span className="sk-rail-var-badge">{row.dominantVar}</span>
                )}
              </div>

              {/* Stacked Band Bar (10px high) */}
              <div className="sk-rail-stacked-bar">
                <div
                  className="sk-bar-calm"
                  style={{
                    width: `${Number(row.calmShare ?? 0) * 100}%`,
                    background: THEME.calm,
                  }}
                  title={`Calm: ${(Number(row.calmShare ?? 0) * 100).toFixed(0)}%`}
                />
                <div
                  className="sk-bar-watch"
                  style={{
                    width: `${Number(row.watchShare ?? 0) * 100}%`,
                    background: THEME.watch,
                  }}
                  title={`Watch: ${(Number(row.watchShare ?? 0) * 100).toFixed(0)}%`}
                />
                <div
                  className="sk-bar-alert"
                  style={{
                    width: `${Number(row.alertShare ?? 0) * 100}%`,
                    background: THEME.alert,
                  }}
                  title={`Alert: ${(Number(row.alertShare ?? 0) * 100).toFixed(0)}%`}
                />
              </div>

              <div className="sk-rail-mean-val">
                {Number(row.meanRisk ?? 0).toFixed(0)}%
              </div>
            </button>
          );
        })}
      </div>

      {/* Rail Key Row */}
      <div className="sk-rail-legend">
        <span className="sk-legend-item">
          <span className="sk-legend-swatch" style={{ background: THEME.calm }} />
          Calm (&lt;25%)
        </span>
        <span className="sk-legend-item">
          <span className="sk-legend-swatch" style={{ background: THEME.watch }} />
          Watch (25–55%)
        </span>
        <span className="sk-legend-item">
          <span className="sk-legend-swatch" style={{ background: THEME.alert }} />
          Alert (&gt;55%)
        </span>
      </div>

      {/* Dynamic Note Box */}
      <div className="sk-rail-note-box">
        <span className="sk-rail-note-icon">💡</span>
        <p className="sk-rail-note-text">{note}</p>
      </div>
    </aside>
  );
};
