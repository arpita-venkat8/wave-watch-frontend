import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import {
  Authenticator,
  useAuthenticator,
} from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth";

import "@aws-amplify/ui-react/styles.css";

import outputs from "../amplify_outputs.json";

import App from "./App.tsx";
import "./index.css";
import "./Auth.css";

Amplify.configure(outputs);

/* =========================================================
   TYPES
   ========================================================= */

type Role = "CITIZEN" | "ADMIN";

interface RoleErrorProps {
  message: string;
  onBack: () => void;
}

/* =========================================================
   ROLE ERROR SCREEN
   ========================================================= */

function RoleError({
  message,
  onBack,
}: RoleErrorProps) {
  return (
    <div className="wave-auth-page">
      <div className="wave-auth-background">
        <div className="wave-grid" />
        <div className="wave-glow wave-glow-one" />
        <div className="wave-glow wave-glow-two" />
      </div>

      <header className="wave-auth-header">
        <div className="wave-brand">
          <div className="wave-brand-mark">🌊</div>

          <div>
            <div className="wave-brand-title">
              WAVE WATCH
            </div>

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

      <main
        style={{
          minHeight: "calc(100vh - 150px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "560px",
            background: "rgba(7, 26, 43, 0.96)",
            border:
              "1px solid rgba(0, 180, 255, 0.35)",
            borderRadius: "18px",
            padding: "42px",
            textAlign: "center",
            boxShadow:
              "0 24px 70px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div
            style={{
              fontSize: "52px",
              marginBottom: "18px",
            }}
          >
            ⚠️
          </div>

          <div
            style={{
              color: "#60a5fa",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              marginBottom: "12px",
            }}
          >
            ACCESS DENIED
          </div>

          <h2
            style={{
              color: "#f8fafc",
              margin: "0 0 14px",
              fontSize: "28px",
            }}
          >
            Incorrect Access Type
          </h2>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: 1.7,
              margin: "0 auto 28px",
              maxWidth: "430px",
            }}
          >
            {message}
          </p>

          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "12px 22px",
              borderRadius: "10px",
              border:
                "1px solid rgba(0, 180, 255, 0.45)",
              background: "#0b2942",
              color: "#dbeafe",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            ← CHANGE ACCESS TYPE
          </button>
        </section>
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

/* =========================================================
   AUTHENTICATION PORTAL
   ========================================================= */

function AuthenticationPortal() {
  const { authStatus, signOut } =
    useAuthenticator((context) => [
      context.authStatus,
      context.signOut,
    ]);

  const [selectedRole, setSelectedRole] =
    useState<Role | null>(null);

  const [verifiedRole, setVerifiedRole] =
    useState<Role | null>(null);

  const [roleError, setRoleError] =
    useState("");

  const [checkingRole, setCheckingRole] =
    useState(false);

  /* =======================================================
     VERIFY COGNITO ROLE
     ======================================================= */

  const verifyRole = async () => {
    if (!selectedRole) {
      return;
    }

    setCheckingRole(true);
    setRoleError("");

    try {
      const session = await fetchAuthSession();

      const groups =
        (session.tokens?.idToken?.payload[
          "cognito:groups"
        ] as string[] | undefined) ?? [];

      console.log(
        "Wave Watch Cognito groups:",
        groups
      );

      console.log(
        "Wave Watch selected role:",
        selectedRole
      );

      const hasSelectedRole =
        groups.includes(selectedRole);

      /* =================================================
         USER HAS THE CORRECT ROLE
         ================================================= */

      if (hasSelectedRole) {
        setVerifiedRole(selectedRole);
        setRoleError("");
        return;
      }

      /* =================================================
         USER HAS THE WRONG ROLE
         ================================================= */

      const actualRole = groups.includes("ADMIN")
        ? "ADMIN"
        : groups.includes("CITIZEN")
          ? "CITIZEN"
          : null;

      if (actualRole) {
        setRoleError(
          `This account is registered as ${actualRole}. You selected ${selectedRole}. Please select the correct access type.`
        );
      } else {
        setRoleError(
          "This account does not have a valid Wave Watch role. Please contact the administrator."
        );
      }

      setVerifiedRole(null);

      /*
       * Immediately sign the user out.
       * This prevents a wrongly-selected role from
       * remaining authenticated.
       */
      await signOut();
    } catch (error) {
      console.error(
        "Wave Watch role verification failed:",
        error
      );

      setVerifiedRole(null);

      setRoleError(
        "Unable to verify your Wave Watch role. Please sign in again."
      );

      try {
        await signOut();
      } catch (signOutError) {
        console.error(
          "Sign out after role verification failure failed:",
          signOutError
        );
      }
    } finally {
      setCheckingRole(false);
    }
  };

  /* =======================================================
     WATCH AUTHENTICATION STATUS
     ======================================================= */

  useEffect(() => {
  if (
    authStatus === "authenticated" &&
    selectedRole &&
    !verifiedRole &&
    !checkingRole
  ) {
    void verifyRole();
  }
  // Intentionally run only when authentication status
  // or selected portal changes.
  // Do NOT depend on checkingRole/verifiedRole.
}, [authStatus, selectedRole]);

  /* =======================================================
     AUTHENTICATED USER
     ======================================================= */

  if (authStatus === "authenticated") {
    /*
     * Authentication succeeded, but role verification
     * has not completed yet.
     */
    if (!verifiedRole) {
      return (
        <div className="wave-auth-page">
          <div className="wave-auth-background">
            <div className="wave-grid" />
            <div className="wave-glow wave-glow-one" />
            <div className="wave-glow wave-glow-two" />
          </div>

          <main
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                color: "#dbeafe",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  marginBottom: "18px",
                }}
              >
                🌊
              </div>

              <h2
                style={{
                  marginBottom: "8px",
                }}
              >
                Verifying Access
              </h2>

              <p
                style={{
                  color: "#94a3b8",
                  margin: 0,
                }}
              >
                Checking your Wave Watch role...
              </p>
            </div>
          </main>
        </div>
      );
    }

    /*
     * Role has been verified successfully.
     *
     * For this phase App.tsx remains the dashboard.
     * Later we will separate Citizen and Admin
     * dashboard capabilities.
     */
    return (
      <>
        <App />

        {/* Temporary Sign Out button */}
        <button
          type="button"
          onClick={async () => {
  try {
    setVerifiedRole(null);
    setSelectedRole(null);
    setRoleError("");
    setCheckingRole(false);

    await signOut();
  } catch (error) {
    console.error("Wave Watch sign out failed:", error);
  }
}}
          style={{
            position: "fixed",
            top: "18px",
            right: "24px",
            zIndex: 99999,
            padding: "10px 18px",
            borderRadius: "10px",
            border:
              "1px solid rgba(0, 180, 255, 0.45)",
            background: "#071a2b",
            color: "#dbeafe",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "13px",
            boxShadow:
              "0 8px 24px rgba(0, 0, 0, 0.25)",
          }}
        >
          Sign Out
        </button>
      </>
    );
  }

  /* =======================================================
     ROLE ERROR
     ======================================================= */

  if (roleError) {
    return (
      <RoleError
        message={roleError}
        onBack={() => {
          setRoleError("");
          setSelectedRole(null);
          setVerifiedRole(null);
        }}
      />
    );
  }

  /* =======================================================
     ROLE SELECTION SCREEN
     ======================================================= */

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
            <div className="wave-brand-mark">
              🌊
            </div>

            <div>
              <div className="wave-brand-title">
                WAVE WATCH
              </div>

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
          {/* LEFT SIDE */}
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
              Wave Watch helps communities report, monitor
              and manage coastal hazards using real-time AWS
              cloud technology.
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

          {/* RIGHT SIDE */}
          <section className="wave-access-panel">
            <div className="panel-top-line" />

            <div className="panel-label">
              SECURE ACCESS
            </div>

            <h2>Welcome to Wave Watch</h2>

            <p className="panel-description">
              Select your access type to continue to the
              coastal safety platform.
            </p>

            <div className="access-options">
              {/* CITIZEN */}
              <button
                type="button"
                className="access-card citizen-access"
                onClick={() => {
                  setSelectedRole("CITIZEN");
                  setRoleError("");
                }}
              >
                <div className="access-icon">
                  ◉
                </div>

                <div className="access-content">
                  <div className="access-title">
                    Citizen
                  </div>

                  <div className="access-description">
                    Report coastal hazards, upload evidence
                    and track your reports.
                  </div>

                  <div className="access-arrow">
                    ENTER CITIZEN PORTAL →
                  </div>
                </div>
              </button>

              {/* ADMIN */}
              <button
                type="button"
                className="access-card admin-access"
                onClick={() => {
                  setSelectedRole("ADMIN");
                  setRoleError("");
                }}
              >
                <div className="access-icon">
                  ◆
                </div>

                <div className="access-content">
                  <div className="access-title">
                    Admin
                  </div>

                  <div className="access-description">
                    Review incidents, manage reports and
                    monitor coastal intelligence.
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

  /* =======================================================
     LOGIN / SIGNUP SCREEN
     ======================================================= */

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
          <div className="wave-brand-mark">
            🌊
          </div>

          <div>
            <div className="wave-brand-title">
              WAVE WATCH
            </div>

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

      {/* LOGIN AREA */}
      <main className="wave-login-main">
        {/* BACK BUTTON */}
        <button
          type="button"
          className="back-access-button"
          onClick={() => {
            setSelectedRole(null);
            setRoleError("");
          }}
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
              Access the Wave Watch platform to monitor
              coastal hazards, manage incidents and keep
              communities informed.
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

          {/* COGNITO LOGIN CARD */}
          <section className="wave-login-card">
            <div className="login-card-header">
              <div
                className={`login-role-icon ${
                  selectedRole === "ADMIN"
                    ? "admin-role"
                    : ""
                }`}
              >
                {selectedRole === "ADMIN"
                  ? "◆"
                  : "◉"}
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
              <Authenticator
                /*
                 * Citizen can use the normal Cognito
                 * signup flow.
                 *
                 * Admin accounts are currently created
                 * and assigned to ADMIN through Cognito.
                 */
                hideSignUp={
                  selectedRole === "ADMIN"
                }
              />
            </div>

            <div
              className={`login-security-note ${
                selectedRole === "ADMIN"
                  ? "admin-note"
                  : ""
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

      {/* FOOTER */}
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

/* =========================================================
   ROOT RENDER
   ========================================================= */

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <Authenticator.Provider>
      <AuthenticationPortal />
    </Authenticator.Provider>
  </React.StrictMode>
);
