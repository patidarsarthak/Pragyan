import React from "react";

interface PragyanLogoProps {
  height?: number | string;
  className?: string;
  variant?: "full" | "icon" | "image";
  showTagline?: boolean;
  tagline?: string;
  style?: React.CSSProperties;
}

/**
 * PragyanLogo Component
 *
 * Renders the authoritative PRAGYAN wordmark with the signature green leaf
 * nestled inside the triangular counters of both 'A' letters, matching the
 * official brand identity.
 */
export const PragyanLogo: React.FC<PragyanLogoProps> = ({
  height = 36,
  className = "",
  variant = "full",
  showTagline = false,
  tagline = "Hyperlocal Weather Downscaling & Precision Agro-Meteorological Intelligence",
  style = {},
}) => {
  // If variant is "image", render the high-resolution direct asset from public
  if (variant === "image") {
    return (
      <div
        className={`pragyan-logo-wrapper ${className}`}
        style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", ...style }}
      >
        <img
          src="/pragyan_leaf_logo.png"
          alt="PRAGYAN"
          style={{ height: height, width: "auto", display: "block", objectFit: "contain" }}
        />
        {showTagline && (
          <span
            style={{
              fontSize: "11px",
              color: "#64748B",
              fontWeight: 500,
              marginTop: "4px",
              letterSpacing: "0.02em",
            }}
          >
            {tagline}
          </span>
        )}
      </div>
    );
  }

  // Pure Vector SVG implementation of PRAGYAN with stylized leaves in both 'A's
  return (
    <div
      className={`pragyan-logo-wrapper ${className}`}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", ...style }}
    >
      <svg
        viewBox="0 0 540 82"
        height={height}
        style={{ width: "auto", height, display: "block", overflow: "visible" }}
        aria-label="PRAGYAN"
        role="img"
      >
        <defs>
          <linearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2E9F43" />
            <stop offset="100%" stopColor="#48C760" />
          </linearGradient>
        </defs>

        {/* --- P --- */}
        <path
          d="M 12 70 L 12 12 L 56 12 C 76 12, 88 22, 88 38 C 88 54, 76 64, 56 64 L 32 64 L 32 70 Z M 32 26 L 32 50 L 54 50 C 65 50, 70 45, 70 38 C 70 31, 65 26, 54 26 Z"
          fill="#0A4D80"
        />

        {/* --- R --- */}
        <path
          d="M 104 70 L 104 12 L 148 12 C 168 12, 180 22, 180 37 C 180 47, 173 55, 161 59 L 184 70 L 163 70 L 143 60 L 124 60 L 124 70 Z M 124 25 L 124 47 L 146 47 C 157 47, 162 43, 162 36 C 162 29, 157 25, 146 25 Z"
          fill="#0A4D80"
        />

        {/* --- First A (with Leaf) --- */}
        {/* A Outer Stems (No crossbar, open inner triangle) */}
        <path
          d="M 194 70 L 222 12 L 244 12 L 272 70 L 251 70 L 233 30 L 215 70 Z"
          fill="#0A4D80"
        />
        {/* Stylized Leaf inside first A */}
        <path
          d="M 221 68 C 218 56 226 40 238 34 C 242 45 237 59 229 67 C 226 70 223 70 221 68 Z"
          fill="url(#leafGrad)"
        />
        {/* Delicate inner leaf vein */}
        <path
          d="M 223 66 Q 228 52 235 41"
          stroke="#1F7A31"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* --- G --- */}
        <path
          d="M 354 24 C 347 16, 336 12, 322 12 C 298 12, 282 28, 282 41 C 282 54, 298 70, 322 70 C 344 70, 356 58, 356 46 L 324 46 L 324 35 L 374 35 L 374 50 C 374 63, 354 82, 322 82 C 286 82, 262 62, 262 41 C 262 20, 286 0, 322 0 C 344 0, 362 8, 372 20 Z"
          transform="matrix(1 0 0 1 -10 0)"
          fill="#0A4D80"
        />

        {/* --- Y --- */}
        <path
          d="M 374 12 L 395 44 L 395 70 L 413 70 L 413 44 L 434 12 L 413 12 L 404 29 L 395 12 Z"
          fill="#0A4D80"
        />

        {/* --- Second A (with Leaf) --- */}
        {/* A Outer Stems */}
        <path
          d="M 444 70 L 472 12 L 494 12 L 522 70 L 501 70 L 483 30 L 465 70 Z"
          fill="#0A4D80"
        />
        {/* Stylized Leaf inside second A */}
        <path
          d="M 471 68 C 468 56 476 40 488 34 C 492 45 487 59 479 67 C 476 70 473 70 471 68 Z"
          fill="url(#leafGrad)"
        />
        {/* Delicate inner leaf vein */}
        <path
          d="M 473 66 Q 478 52 485 41"
          stroke="#1F7A31"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* --- N --- */}
        <path
          d="M 536 70 L 536 12 L 554 12 L 586 52 L 586 12 L 604 12 L 604 70 L 586 70 L 554 30 L 554 70 Z"
          transform="matrix(0.9 0 0 1 42 0)"
          fill="#0A4D80"
        />
      </svg>

      {showTagline && (
        <span
          style={{
            fontSize: "11px",
            color: "#64748B",
            fontWeight: 600,
            marginTop: "6px",
            letterSpacing: "0.03em",
          }}
        >
          {tagline}
        </span>
      )}
    </div>
  );
};
