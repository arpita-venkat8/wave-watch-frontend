import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import {
  Authenticator,
  useAuthenticator,
} from "@aws-amplify/ui-react";
import {
  fetchAuthSession,
  signOut as amplifySignOut,
} from "aws-amplify/auth";

import "@aws-amplify/ui-react/styles.css";

import outputs from "../amplify_outputs.json";

import App from "./App.tsx";
import "./index.css";
import "./Auth.css";

Amplify.configure(outputs);

type Role = "CITIZEN" | "ADMIN";

function AuthenticationPortal() {
  const { authStatus } = useAuthenticator((context) => [
    context.authStatus,
  ]);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [verifiedRole, setVerifiedRole] = useState<Role | null>(null);
  const [checkingRole, setCheckingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

  const verificationStarted = useRef(false);

  /*
   * =========================================================
   * ROLE VERIFICATION
   * =========================================================
   */
  useEffect(() => {
    if (authStatus !== "authenticated") {
      verificationStarted.current = false;
      setVerifiedRole(null);
      setCheckingRole(false);
      return;
    }

    if (verificationStarted.current) {
      return;
    }

    verificationStarted.current = true;

    const verifyAuthenticatedUser = async () => {
      setCheckingRole(true);
      setRoleError("");

      try {
        const session = await fetchAuthSession();

        const groups =
          (session.tokens?.idToken?.payload[
            "cognito:groups"
          ] as string[] | undefined) ?? [];

        const actualRole: Role | null = groups.includes("ADMIN")
          ? "ADMIN"
          : groups.includes("CITIZEN")
          ? "CITIZEN"
          : null;

        /*
         * No valid Wave Watch role.
         */
        if (!actualRole) {
          setRoleError(
            "This account does not have a valid Wave Watch role."
          );

          setSelectedRole(null);
          setVerifiedRole(null);

          try {
            await amplifySignOut({ global: true });
          } catch (signOutError) {
            console.error(
              "Sign out after invalid role failed:",
              signOutError
            );
          }

          return;
        }

        /*
         * Check selected portal against actual Cognito role.
         */
        if (selectedRole && selectedRole !== actualRole) {
          setRoleError(
            `This account is not a ${selectedRole.toLowerCase()} account.`
          );

          setSelectedRole(null);
          setVerifiedRole(null);

          try {
            await amplifySignOut({ global: true });
          } catch (signOutError) {
            console.error(
              "Sign out after role mismatch failed:",
              signOutError
            );
          }

          return;
        }

        /*
         * Authentication + role verification successful.
         */
        setSelectedRole(actualRole);
        setVerifiedRole(actualRole);
      } catch (error) {
        console.error(
          "Wave Watch role verification failed:",
          error
        );

        setRoleError(
          "Unable to verify your Wave Watch account. Please sign in again."
        );

        setSelectedRole(null);
        setVerifiedRole(null);

        try {
          await amplifySignOut({ global: true });
        } catch (signOutError) {
          console.error(
            "Sign out after verification error failed:",
            signOutError
          );
        }
      } finally {
        setCheckingRole(false);
      }
    };

    void verifyAuthenticatedUser();
  }, [authStatus]);

  /*
   * =========================================================
   * SIGN OUT
   * =========================================================
   */
  const handleSignOut = async () => {
    try {
      setCheckingRole(false);
      setVerifiedRole(null);
      setSelectedRole(null);
      setRoleError("");

      verificationStarted.current = false;

      await amplifySignOut({ global: true });
    } catch (error) {
      console.error(
        "Wave Watch sign out failed:",
        error
      );

      try {
        await amplifySignOut();
      } catch (localError) {
        console.error(
          "Wave Watch local sign out failed:",
          localError
        );
      }
    }
  };

  /*
   * =========================================================
   * AUTHENTICATED USER
   * =========================================================
   */
  if (authStatus === "authenticated") {
    /*
     * Wait until Cognito role is verified.
     */
    if (checkingRole || !verifiedRole) {
      return (
        <div className="wave-auth-page">
          <div className="wave-auth-background">
            <div className="wave-grid" />
            <div className="wave-glow wave-glow-one" />
            <div className="wave-glow wave-glow-two" />
          </div>

          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              textAlign: "center",
              padding: "40px",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontSize: "64px",
                marginBottom: "24px",
              }}
            >
              🌊
            </div>

            <h1
              style={{
                margin: 0,
                color: "#dbeafe",
                fontSize: "46px",
                fontWeight: 800,
              }}
            >
              Verifying Access
            </h1>

            <p
              style={{
                marginTop: "20px",
                color: "#94a3b8",
                fontSize: "22px",
              }}
            >
              Checking your Wave Watch role...
            </p>
          </div>
        </div>
      );
    }

    /*
     * =======================================================
     * VERIFIED DASHBOARD
     * =======================================================
     */
    return (
      <>
        <App />

        {/* SIGN OUT BUTTON */}
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          style={{
            position: "fixed",

            /*
             * Vertically centered on the same line as the
             * System Live indicator.
             */
            top: "36px",
            transform: "translateY(-50%)",
            right: "260px",

            zIndex: 999999,

            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",

            height: "42px",
            minWidth: "112px",

            padding: "0 16px",

            border:
              "1px solid rgba(0, 180, 255, 0.45)",

            borderRadius: "10px",

            background:
              "rgba(7, 26, 43, 0.96)",

            color: "#dbeafe",

            cursor: "pointer",

            fontFamily: "inherit",
            fontSize: "13px",
            fontWeight: 700,

            boxShadow:
              "0 8px 24px rgba(0, 0, 0, 0.30)",

            backdropFilter: "blur(10px)",

            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontSize: "16px",
              lineHeight: 1,
            }}
          >
            ↪
          </span>

          <span>
            Sign Out
          </span>
        </button>
      </>
    );
  }

  /*
   * =========================================================
   * ROLE SELECTION
   * =========================================================
   */
  if (!selectedRole) {
    return (
      <div className="wave-auth-page">

        <div className="wave-auth-background">
          <div className="wave-grid" />
          <div className="wave-glow wave-glow-one" />
          <div className="wave-glow wave-glow-two" />
        </div>

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

          <section className="wave-access-panel">

            <div className="panel-top-line" />

            <div className="panel-label">
              SECURE ACCESS
            </div>

            <h2>
              Welcome to Wave Watch
            </h2>

            <p className="panel-description">
              Select your access type to continue to the
              coastal safety platform.
            </p>

            <div className="access-options">

              <button
                type="button"
                className="access-card citizen-access"
                onClick={() => {
                  setRoleError("");
                  setSelectedRole("CITIZEN");
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

              <button
                type="button"
                className="access-card admin-access"
                onClick={() => {
                  setRoleError("");
                  setSelectedRole("ADMIN");
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

            {roleError && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(248, 113, 113, 0.35)",
                  background:
                    "rgba(127, 29, 29, 0.20)",
                  color: "#fca5a5",
                  fontSize: "13px",
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                {roleError}
              </div>
            )}

            <div className="access-security">
              <span>●</span>
              AWS COGNITO SECURED ACCESS
            </div>

          </section>

        </main>

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

  /*
   * =========================================================
   * LOGIN / SIGN UP
   * =========================================================
   */
  return (
    <div className="wave-auth-page">

      <div className="wave-auth-background">
        <div className="wave-grid" />
        <div className="wave-glow wave-glow-one" />
        <div className="wave-glow wave-glow-two" />
      </div>

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

      <main className="wave-login-main">

        <button
          type="button"
          className="back-access-button"
          onClick={() => {
            setRoleError("");
            setSelectedRole(null);
          }}
        >
          ← CHANGE ACCESS TYPE
        </button>

        <div className="wave-login-layout">

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
                hideSignUp={false}
              />

            </div>

            {roleError && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(248, 113, 113, 0.35)",
                  background:
                    "rgba(127, 29, 29, 0.20)",
                  color: "#fca5a5",
                  fontSize: "13px",
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                {roleError}
              </div>
            )}

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

/*
 * =========================================================
 * ROOT
 * =========================================================
 */

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <Authenticator.Provider>
      <AuthenticationPortal />
    </Authenticator.Provider>
  </React.StrictMode>
);
