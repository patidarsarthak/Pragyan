import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Pragyan Uncaught React Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07111f",
          color: "#e2e8f0",
          fontFamily: "Public Sans, sans-serif",
          padding: "24px"
        }}>
          <div style={{
            maxWidth: "520px",
            background: "#0c1829",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <span style={{ fontSize: "28px" }}>⚠️</span>
              <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
                Pragyan Operational Recovery
              </h2>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#94a3b8", marginBottom: "20px" }}>
              An interface rendering anomaly was caught and isolated. Your meteorological database and backend pipelines remain fully intact.
            </p>
            {this.state.error && (
              <pre style={{
                background: "#060c14",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#f87171",
                overflowX: "auto",
                marginBottom: "20px"
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                background: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
