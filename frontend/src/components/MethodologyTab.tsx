import React from "react";
import { Language, t } from "../lib/i18n";
import { THEME } from "../theme";

interface MethodologyTabProps {
  lang: Language;
}

export const MethodologyTab: React.FC<MethodologyTabProps> = ({ lang }) => {
  return (
    <div className="sk-page-layout">
      {/* Page Header */}
      <div className="sk-page-header">
        <div>
          <div className="sk-page-kicker">SCIENTIFIC PROVENANCE &amp; OPEN METHODOLOGY</div>
          <h1 className="sk-page-title">About Pragyan</h1>
          <p className="sk-page-desc">
            Pragyan is India's dedicated Panchayat-level weather downscaling and agromet advisory platform, engineered for cadastral resolution and radical scientific honesty.
          </p>
        </div>
      </div>

      {/* Modular Card Grid */}
      <div className="sk-about-grid">
        {/* Card 1: What Question It Answers */}
        <div className="sk-card">
          <div className="sk-card-header-line">
            <h2 className="sk-card-title">1. The Problem We Solve</h2>
          </div>
          <p className="sk-card-body-text">
            Standard global and regional weather forecasts (ECMWF, IMD GFS) provide predictions at coarse 12km to 25km grid intervals. However, a typical Indian Gram Panchayat is only 2km to 6km across. Coarse forecasts average out critical valley frost, ridge wind accelerations, and orographic cloudbursts.
          </p>
          <div className="sk-note-blue" style={{ marginTop: "1rem" }}>
            <strong>The Core Question:</strong> What will the weather be in <em>this specific village cadastral polygon</em> over the next 10 days, and what immediate agronomic action must farmers take to defend their crops?
          </div>
        </div>

        {/* Card 2: How Well It Works */}
        <div className="sk-card">
          <div className="sk-card-header-line">
            <h2 className="sk-card-title">2. Downscaling Formulation &amp; Physics</h2>
          </div>
          <p className="sk-card-body-text">
            Pragyan combines deterministic geophysical laws with machine learning ensembles to translate 0.25° NWP forcing into 1km village predictions:
          </p>
          <div style={{ background: "var(--card-2)", padding: "12px", borderRadius: "8px", margin: "12px 0", borderLeft: `3px solid ${THEME.blue}` }}>
            <code className="sk-mono-code">
              Ŷ_GP,t = f( X_coarse_NWP,t,  Z_polygon_topography,  H_temporal_features )
            </code>
          </div>
          <ul className="sk-bullet-list">
            <li><strong>Atmospheric Forcing:</strong> ECMWF IFS Cycle 48r1 / ERA5-Land.</li>
            <li><strong>Topography:</strong> NASA SRTM 30m 1 arc-second DEM zonal elevation, slope, aspect, and terrain roughness.</li>
            <li><strong>Land Cover:</strong> ESA WorldCover 10m Sentinel-derived agricultural and canopy fractions.</li>
            <li><strong>Deterministic ET₀:</strong> FAO-56 Penman-Monteith equation for physical evapotranspiration.</li>
          </ul>
        </div>

        {/* Card 3: Sovereign Administrative Boundaries */}
        <div className="sk-card">
          <div className="sk-card-header-line">
            <h2 className="sk-card-title">3. Sovereign Administrative Boundaries</h2>
          </div>
          <p className="sk-card-body-text">
            All geospatial features strictly adhere to the <strong>National Geospatial Policy 2021</strong> issued by the Ministry of Science and Technology, Government of India:
          </p>
          <ul className="sk-bullet-list">
            <li><strong>National Outline:</strong> Complies with Survey of India (SoI) standards. The sovereign territory of Jammu &amp; Kashmir and Ladakh is depicted in its entirety.</li>
            <li><strong>Local Government Directory (LGD):</strong> All State, District, Block, and Gram Panchayat codes are synced with official codes issued by the Ministry of Panchayati Raj (MoPR).</li>
            <li><strong>Cadastral Tessellation:</strong> Gram Panchayat polygons are mapped from official LGD cadastral centroids and bounded by administrative extents.</li>
          </ul>
        </div>

        {/* Card 4: What It Does NOT Do (Honest Caveats) */}
        <div className="sk-card">
          <div className="sk-card-header-line">
            <h2 className="sk-card-title">4. What It Does NOT Do (Honest Disclosures)</h2>
          </div>
          <div className="gm-notice gm-notice--warning" style={{ margin: "10px 0" }}>
            <strong>Convective Cloudburst Micro-Scale Limits:</strong>
            <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
              Meso-gamma scale convective cloudbursts (&lt; 2 km spatial extent, &lt; 1 hour duration) cannot be resolved deterministically from 25 km NWP forcing without Doppler Weather Radar ingestion.
            </p>
          </div>
          <div className="gm-notice" style={{ margin: "10px 0" }}>
            <strong>Unmeasured Regional Sensors:</strong>
            <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
              Independent automated rain gauge networks are not yet deployed at all 2.5 lakh Indian panchayats. Where field ground truth is missing, metrics are transparently flagged as <code>NOT YET MEASURED</code>. Zero synthetic numbers are fabricated.
            </p>
          </div>
        </div>

        {/* Card 5: How It Runs */}
        <div className="sk-card">
          <div className="sk-card-header-line">
            <h2 className="sk-card-title">5. Production Stack &amp; Architecture</h2>
          </div>
          <ul className="sk-bullet-list">
            <li><strong>Backend:</strong> Python FastAPI serving sub-50ms REST API queries.</li>
            <li><strong>Spatial Database:</strong> SQLite with R*Tree spatial indexing for instantaneous point-in-polygon resolution.</li>
            <li><strong>Machine Learning:</strong> Gradient boosting downscalers with physical hydrostatic and lapse-rate constraints.</li>
            <li><strong>Frontend:</strong> React 18, TypeScript, Vite, Recharts, and d3-geo / TopoJSON rendering.</li>
            <li><strong>Disaster Protocols:</strong> Native OASIS Common Alerting Protocol (CAP 1.2) XML export engine.</li>
          </ul>
        </div>

        {/* Card 6: Data & Third-Party Attribution */}
        <div className="sk-card">
          <div className="sk-card-header-line">
            <h2 className="sk-card-title">6. Attribution &amp; Licences</h2>
          </div>
          <p className="sk-card-body-text">
            Frontend visual tokens and layout patterns are adapted from open-source MIT-licensed references (Team Winging It / Sanket). All data, backend services, downscaling models, boundary pipelines, and ICAR agro-advisory engines are independent original work of Team Pragyan.
          </p>
          <div className="sk-mono-meta" style={{ marginTop: "1rem" }}>
            FULL NOTICES: docs/ATTRIBUTION.md · docs/THIRD_PARTY_NOTICES.md · LICENSE (MIT)
          </div>
        </div>
      </div>
    </div>
  );
};
