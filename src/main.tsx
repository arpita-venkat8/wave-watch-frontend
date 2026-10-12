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

        <div className="wave-auth-shell">
          <div className="wave-brand">
            <div className="wave-logo">W</div>

            <div>
              <div className="wave-title">WAVE WATCH</div>
              <div className="wave-subtitle">
                COASTAL HAZARD INTELLIGENCE PLATFORM
              </div>
            </div>
          </div>

          <div className="wave-status">
            <span className="status-dot" />
            AWS CLOUD SYSTEM ONLINE
          </div>

          <div className="wave-auth-content">
            <div className="wave-auth-heading">
              <div className="eyebrow">SECURE ACCESS PORTAL</div>

              <h1>
                Coastal intelligence,
                <br />
                <span>when it matters.</span>
              </h1>

              <p>
                Monitor coastal hazards, submit citizen reports and manage
                verified incidents through the Wave Watch cloud platform.
              </p>
            </div>

            <div className="role-selection">
              <div className="role-label">SELECT ACCESS TYPE</div>

              <div className="role-cards">
                <button
                  className="role-card"
                  onClick={() => setSelectedRole("CITIZEN")}
                >
                  <div className="role-icon citizen-icon">◉</div>

                  <div className="role-card-content">
                    <div className="role-card-title">CITIZEN</div>

                    <div className="role-card-description">
                      Report coastal hazards, upload evidence and track your
                      submitted reports.
                    </div>

                    <div className="role-card-action">
                      ENTER CITIZEN PORTAL →
                    </div>
                  </div>
                </button>

                <button
                  className="role-card admin-card"
                  onClick={() => setSelectedRole("ADMIN")}
                >
                  <div className="role-icon admin-icon">◆</div>

                  <div className="role-card-content">
                    <div className="role-card-title">ADMIN</div>

                    <div className="role-card-description">
                      Review incidents, manage report status, inspect
                      correlations and monitor the system.
                    </div>

                    <div className="role-card-action">
                      ENTER ADMIN CONSOLE →
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="wave-auth-footer">
            <span>WAVE WATCH</span>
            <span>•</span>
            <span>AWS POWERED</span>
            <span>•</span>
            <span>SECURE AUTHENTICATION</span>
          </div>
        </div>
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

      <div className="wave-login-container">
        <button
          className="back-role-button"
          onClick={() => setSelectedRole(null)}
        >
          ← CHANGE ACCESS TYPE
        </button>

        <div className="wave-login-brand">
          <div className="wave-logo small-logo">W</div>

          <div>
            <div className="wave-title">WAVE WATCH</div>
            <div className="wave-subtitle">
              {selectedRole === "ADMIN"
                ? "ADMIN CONTROL CENTER"
                : "CITIZEN REPORTING PORTAL"}
            </div>
          </div>
        </div>

        <div className="selected-role-banner">
          <div
            className={`selected-role-indicator ${
              selectedRole === "ADMIN" ? "admin-selected" : ""
            }`}
          >
            {selectedRole === "ADMIN" ? "◆" : "◉"}
          </div>

          <div>
            <div className="selected-role-title">
              {selectedRole === "ADMIN"
                ? "ADMIN ACCESS"
                : "CITIZEN ACCESS"}
            </div>

            <div className="selected-role-text">
              {selectedRole === "ADMIN"
                ? "Authorized personnel only"
                : "Public hazard reporting account"}
            </div>
          </div>
        </div>

        <div className="authenticator-wrapper">
          <Authenticator
            hideSignUp={selectedRole === "ADMIN"}
          >
            <App />
          </Authenticator>
        </div>

        {selectedRole === "ADMIN" && (
          <div className="admin-security-note">
            <span>◆</span>
            ADMIN ACCOUNTS ARE ASSIGNED BY SYSTEM ADMINISTRATORS
          </div>
        )}

        {selectedRole === "CITIZEN" && (
          <div className="citizen-security-note">
            <span>●</span>
            Citizen accounts can register directly through this portal.
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthenticationPortal />
  </React.StrictMode>
);
