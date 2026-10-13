import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

import outputs from "../amplify_outputs.json";

import App from "./App.tsx";
import "./index.css";
import "./Auth.css";

Amplify.configure(outputs);

function AuthenticationPortal() {
  const [selectedRole, setSelectedRole] = useState<"CITIZEN" | "ADMIN" | null>(
    null
  );

  if (!selectedRole) {
    return (
      <div className="wave-auth-page">
        <div className="wave-auth-background">
          <div className="wave-grid" />
          <div className="wave-glow wave-glow-one" />
          <div className="wave-glow wave-glow-two" />
        </div>

        {/* HEADER */}
        <header className="wave-auth-header">
          <div className="wave-brand">
            <div className="wave-brand-mark">🌊</div>

            <div>
              <div className="wave-brand-title">WAVE WATCH</div>
              <div className="wave-brand-subtitle">
                Coastal Safety Platform
              </div>
            </div>
          </div>

          <div className="wave-system-status">
            <span className="system-dot" />
            <span>System Live</span>
          </div>
        </header>

        {/* MAIN */}
        <main className="wave-auth-main">
          <section className="wave-auth-hero">
            <div className="wave-monitor-pill">
              <span>🌊</span>
              REAL-TIME COASTAL MONITORING
            </div>

            <h1>
              Stay Ahead of
              <br />
              <span>Coastal Hazards.</span>
            </h1>

            <p>
              Wave Watch helps communities report, monitor and manage coastal
              hazards using real-time AWS cloud technology.
            </p>

            <div className="wave-feature-list">
              <div>
                <span>✓</span>
                Citizen hazard reporting
              </div>

              <div>
                <span>✓</span>
                Real-time coastal monitoring
              </div>

              <div>
                <span>✓</span>
                AWS cloud intelligence
              </div>
            </div>
          </section>

          {/* ACCESS PANEL */}
          <section className="wave-access-panel">
            <div className="panel-top-line" />

            <div className="panel-label">SECURE ACCESS</div>

            <h2>Welcome to Wave Watch</h2>

            <p className="panel-description">
              Select your access type to continue to the coastal safety
              platform.
            </p>

            <div className="access-options">
              <button
                type="button"
                className="access-card citizen-access"
                onClick={() => setSelectedRole("CITIZEN")}
              >
                <div className="access-icon">◉</div>

                <div className="access-content">
                  <div className="access-title">Citizen</div>

                  <div className="access-description">
                    Report coastal hazards, upload evidence and track your
                    reports.
                  </div>

                  <div className="access-arrow">
                    ENTER CITIZEN PORTAL →
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="access-card admin-access"
                onClick={() => setSelectedRole("ADMIN")}
              >
                <div className="access-icon">◆</div>

                <div className="access-content">
                  <div className="access-title">Admin</div>

                  <div className="access-description">
                    Review incidents, manage reports and monitor coastal
                    intelligence.
                  </div>

                  <div className="access-arrow">
                    ENTER ADMIN CONSOLE →
                  </div>
                </div>
              </button>
            </div>

            <div className="access-security">
              <span>●</span>
              AWS COGNITO SECURED ACCESS
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="wave-auth-footer">
          <span>WAVE WATCH</span>
          <span>•</span>
          <span>AWS POWERED</span>
          <span>•</span>
          <span>COASTAL SAFETY INTELLIGENCE</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="wave-auth-page">
      <div className="wave-auth-background">
        <div className="wave-grid" />
        <div className="wave-glow wave-glow-one" />
        <div className="wave-glow wave-glow-two" />
      </div>

      {/* HEADER */}
      <header className="wave-auth-header">
        <div className="wave-brand">
          <div className="wave-brand-mark">🌊</div>

          <div>
            <div className="wave-brand-title">WAVE WATCH</div>

            <div className="wave-brand-subtitle">
              Coastal Safety Platform
            </div>
          </div>
        </div>

        <div className="wave-system-status">
          <span className="system-dot" />
          <span>System Live</span>
        </div>
      </header>

      <main className="wave-login-main">
        <button
          type="button"
          className="back-access-button"
          onClick={() => setSelectedRole(null)}
        >
          ← CHANGE ACCESS TYPE
        </button>

        <div className="wave-login-layout">
          {/* LEFT INFORMATION */}
          <section className="wave-login-info">
            <div className="wave-monitor-pill">
              <span>🌊</span>
              SECURE COASTAL ACCESS
            </div>

            <h1>
              Coastal intelligence,
              <br />
              <span>when it matters.</span>
            </h1>

            <p>
              Access the Wave Watch platform to monitor coastal hazards,
              manage incidents and keep communities informed.
            </p>

            <div className="login-system-info">
              <div className="system-info-item">
                <span className="info-dot" />
                AWS CLOUD PLATFORM
              </div>

              <div className="system-info-item">
                <span className="info-dot" />
                SECURE AUTHENTICATION
              </div>

              <div className="system-info-item">
                <span className="info-dot" />
                REAL-TIME MONITORING
              </div>
            </div>
          </section>

          {/* AUTH CARD */}
          <section className="wave-login-card">
            <div className="login-card-header">
              <div
                className={`login-role-icon ${
                  selectedRole === "ADMIN" ? "admin-role" : ""
                }`}
              >
                {selectedRole === "ADMIN" ? "◆" : "◉"}
              </div>

              <div>
                <div className="login-card-label">
                  {selectedRole === "ADMIN"
                    ? "ADMIN CONSOLE"
                    : "CITIZEN PORTAL"}
                </div>

                <h2>
                  {selectedRole === "ADMIN"
                    ? "Admin Sign In"
                    : "Citizen Access"}
                </h2>
              </div>
            </div>

            <div className="login-divider" />

            <div className="authenticator-wrapper">
              <Authenticator hideSignUp={selectedRole === "ADMIN"}>
                <App />
              </Authenticator>
            </div>

            <div
              className={`login-security-note ${
                selectedRole === "ADMIN" ? "admin-note" : ""
              }`}
            >
              <span>●</span>

              {selectedRole === "ADMIN"
                ? "AUTHORIZED ADMINISTRATORS ONLY"
                : "SECURE CITIZEN ACCOUNT"}
            </div>
          </section>
        </div>
      </main>

      <footer className="wave-auth-footer">
        <span>WAVE WATCH</span>
        <span>•</span>
        <span>AWS POWERED</span>
        <span>•</span>
        <span>SECURE AUTHENTICATION</span>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthenticationPortal />
  </React.StrictMode>
);
