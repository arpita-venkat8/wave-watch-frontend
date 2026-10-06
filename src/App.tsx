import { useEffect, useRef, useState } from "react";
import "./App.css";

type Report = {
  id: number;
  title: string;
  location: string;
  severity: "High" | "Medium" | "Low";
  status: "Active" | "Under Review" | "Resolved";
  time: string;
};

type BackendReport = {
  reportId: string;
  hazardType: string;
  description: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | string;
  confidence: number;
  status: "PENDING" | "ACTIVE" | "RESOLVED" | "UNDER_REVIEW" | string;
};

const sampleReports: Report[] = [
  {
    id: 1,
    title: "High wave activity",
    location: "Marina Beach",
    severity: "High",
    status: "Active",
    time: "8 min ago",
  },
  {
    id: 2,
    title: "Coastal flooding",
    location: "Besant Nagar",
    severity: "High",
    status: "Under Review",
    time: "24 min ago",
  },
  {
    id: 3,
    title: "Beach erosion detected",
    location: "Mahabalipuram",
    severity: "Medium",
    status: "Active",
    time: "41 min ago",
  },
  {
    id: 4,
    title: "Strong wind conditions",
    location: "Kovalam",
    severity: "Low",
    status: "Resolved",
    time: "1 hr ago",
  },
];

function App() {
  const [showModal, setShowModal] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapLoadedRef = useRef(false);
  const dynamicMarkersRef = useRef<any[]>([]);

  const [backendReports, setBackendReports] = useState<BackendReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const LOCATION_API_KEY = import.meta.env.VITE_LOCATION_API_KEY as string;
  const AWS_REGION = "ap-southeast-2";
  const MAP_STYLE = "Standard";

  const API_URL =
    "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports";

  // Initialize Amazon Location Service map
  useEffect(() => {
    const maplibregl = (window as any).maplibregl;

    if (!mapContainerRef.current || !LOCATION_API_KEY || !maplibregl) {
      return;
    }

    const styleUrl =
      `https://maps.geo.${AWS_REGION}.amazonaws.com/v2/styles/` +
      `${MAP_STYLE}/descriptor?key=${encodeURIComponent(LOCATION_API_KEY)}`;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [80.2707, 13.0827],
      zoom: 10,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      const hazards = [
        {
          name: "Marina Beach",
          coordinates: [80.282, 13.049],
          severity: "High",
        },
        {
          name: "Besant Nagar",
          coordinates: [80.267, 12.999],
          severity: "High",
        },
        {
          name: "Mahabalipuram",
          coordinates: [80.192, 12.626],
          severity: "Medium",
        },
      ];

      hazards.forEach((hazard) => {
        const color =
          hazard.severity === "High"
            ? "#ef4444"
            : hazard.severity === "Medium"
              ? "#f59e0b"
              : "#22c55e";

        new maplibregl.Marker({ color })
          .setLngLat(hazard.coordinates)
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<strong>${hazard.name}</strong><br/>Severity: ${hazard.severity}`
            )
          )
          .addTo(map);
      });

      mapLoadedRef.current = true;
      setIsMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      dynamicMarkersRef.current = [];
      setIsMapReady(false);
    };
  }, [LOCATION_API_KEY]);

  // Fetch reports from DynamoDB through API Gateway
  const fetchReports = async () => {
    setIsLoadingReports(true);

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const data = await response.json();

      const reports = Array.isArray(data.reports)
        ? data.reports
        : [];

      setBackendReports(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Load reports when page opens
  useEffect(() => {
    fetchReports();
  }, []);

  // Add real reports as map markers
  useEffect(() => {
    const maplibregl = (window as any).maplibregl;

    if (
      !mapRef.current ||
      !isMapReady ||
      !mapLoadedRef.current ||
      !maplibregl
    ) {
      return;
    }

    // Remove old dynamic markers
    dynamicMarkersRef.current.forEach((marker) => marker.remove());
    dynamicMarkersRef.current = [];

    backendReports.forEach((report) => {
      if (
        typeof report.latitude !== "number" ||
        typeof report.longitude !== "number"
      ) {
        return;
      }

      const severity = String(report.severity).toUpperCase();

      const color =
        severity === "HIGH"
          ? "#ef4444"
          : severity === "LOW"
            ? "#22c55e"
            : "#f59e0b";

      const marker = new maplibregl.Marker({ color })
        .setLngLat([report.longitude, report.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<strong>${report.hazardType}</strong>` +
              `<br/>Severity: ${severity}` +
              `<br/>${report.description}` +
              `<br/><small>Status: ${report.status}</small>`
          )
        )
        .addTo(mapRef.current);

      dynamicMarkersRef.current.push(marker);
    });
  }, [backendReports, isMapReady]);

  // Resize map when expanded
  useEffect(() => {
    if (!mapRef.current) return;

    const frame = requestAnimationFrame(() => {
      mapRef.current.resize();
    });

    return () => cancelAnimationFrame(frame);
  }, [isMapExpanded]);

  const scrollToMap = () => {
    document.getElementById("hazard-map")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  // Report form states
  const [hazardType, setHazardType] = useState("High Waves");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit report
  const submitReport = async () => {
    if (!location.trim() || !description.trim()) {
      alert("Please enter the location and description.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hazardType: hazardType,
          description: description,
          latitude: 13.0827,
          longitude: 80.2707,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit report");
      }

      alert("🚨 Hazard report submitted successfully!");

      setHazardType("High Waves");
      setLocation("");
      setDescription("");

      // Fetch latest reports immediately
      await fetchReports();

      setShowModal(false);

      console.log("AWS Response:", data);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayReports: Report[] =
    backendReports.length > 0
      ? backendReports
          .slice()
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime()
          )
          .map((report, index) => ({
            id: index + 1,
            title: report.hazardType,
            location: `${Number(report.latitude).toFixed(4)}, ${Number(
              report.longitude
            ).toFixed(4)}`,
            severity:
              String(report.severity).toUpperCase() === "HIGH"
                ? "High"
                : String(report.severity).toUpperCase() === "LOW"
                  ? "Low"
                  : "Medium",
            status:
              String(report.status).toUpperCase() === "RESOLVED"
                ? "Resolved"
                : String(report.status).toUpperCase() === "ACTIVE"
                  ? "Active"
                  : "Under Review",
            time: new Date(report.timestamp).toLocaleString(),
          }))
      : sampleReports;

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">🌊</span>

          <div>
            <h2>WAVE WATCH</h2>
            <span>Coastal Safety Platform</span>
          </div>
        </div>

        <div className="nav-status">
          <span className="live-dot"></span>
          System Live
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            🌊 REAL-TIME COASTAL MONITORING
          </div>

          <h1>
            Stay Ahead of
            <br />
            <span>Coastal Hazards.</span>
          </h1>

          <p>
            Wave Watch helps communities report, monitor and
            manage coastal hazards using real-time AWS cloud
            technology.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-button"
              onClick={() => setShowModal(true)}
            >
              🚨 Report a Hazard
            </button>

            <button
              className="secondary-button"
              onClick={scrollToMap}
            >
              🗺️ View Live Map
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="ocean-circle">
            <div className="wave wave-one"></div>
            <div className="wave wave-two"></div>
            <div className="wave wave-three"></div>

            <div className="location-pin">📍</div>
          </div>

          <div className="floating-card">
            <span className="small-label">ACTIVE ALERT</span>
            <strong>High Wave Activity</strong>
            <span>📍 Marina Beach</span>
          </div>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="stats">
        <div className="stat-card">
          <div className="stat-icon red">🚨</div>

          <div>
            <span>Active Hazards</span>
            <strong>12</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">⚠️</div>

          <div>
            <span>Under Review</span>
            <strong>7</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">✓</div>

          <div>
            <span>Resolved</span>
            <strong>34</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">👥</div>

          <div>
            <span>Citizen Reports</span>
            <strong>128</strong>
          </div>
        </div>
      </section>

      {/* MONITORING SECTION */}
      <section className="monitoring">
        <div className="section-heading">
          <div>
            <span className="section-tag">
              LIVE MONITORING
            </span>

            <h2>Coastal Hazard Overview</h2>

            <p>
              Monitor reported hazards across coastal regions.
            </p>
          </div>

          <div className="live-status">
            <span></span>
            LIVE
          </div>
        </div>

        <div className="monitor-grid">
          {/* MAP */}
          <div
            id="hazard-map"
            className={`map-card ${
              isMapExpanded ? "expanded" : ""
            }`}
          >
            <div className="map-header">
              <div>
                <h3>Hazard Map</h3>
                <span>Real-time coastal activity</span>
              </div>

              <button
                className="map-button"
                onClick={() =>
                  setIsMapExpanded((current) => !current)
                }
              >
                {isMapExpanded
                  ? "Close Map ✕"
                  : "Full Map ↗"}
              </button>
            </div>

            <div className="real-map">
              <div
                ref={mapContainerRef}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />

              {!LOCATION_API_KEY && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(6, 17, 31, 0.88)",
                    color: "#e2e8f0",
                    padding: "20px",
                    textAlign: "center",
                    zIndex: 2,
                  }}
                >
                  Amazon Location API key is not configured.
                </div>
              )}
            </div>

            <div className="map-legend">
              <span>
                <i className="legend-red"></i>
                High
              </span>

              <span>
                <i className="legend-orange"></i>
                Medium
              </span>

              <span>
                <i className="legend-green"></i>
                Low
              </span>
            </div>
          </div>

          {/* ALERT PANEL */}
          <div className="alert-card">
            <div className="alert-header">
              <div>
                <span className="section-tag">
                  URGENT
                </span>

                <h3>Current Alerts</h3>
              </div>

              <span className="alert-count">3</span>
            </div>

            <div className="alert-item high">
              <div className="alert-icon">🌊</div>

              <div>
                <strong>High Wave Activity</strong>
                <span>Marina Beach</span>
                <small>8 minutes ago</small>
              </div>
            </div>

            <div className="alert-item medium">
              <div className="alert-icon">🌧️</div>

              <div>
                <strong>Coastal Flooding</strong>
                <span>Besant Nagar</span>
                <small>24 minutes ago</small>
              </div>
            </div>

            <div className="alert-item low">
              <div className="alert-icon">💨</div>

              <div>
                <strong>Strong Winds</strong>
                <span>Kovalam</span>
                <small>41 minutes ago</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECENT REPORTS */}
      <section className="reports">
        <div className="section-heading">
          <div>
            <span className="section-tag">
              CITIZEN REPORTS
            </span>

            <h2>Recent Hazard Reports</h2>

            <p>
              Latest observations submitted by the community.
            </p>
          </div>

          <button
            className="primary-button small"
            onClick={() => setShowModal(true)}
          >
            + New Report
          </button>
        </div>

        <div className="reports-table">
          <div className="table-header">
            <span>HAZARD</span>
            <span>LOCATION</span>
            <span>SEVERITY</span>
            <span>STATUS</span>
            <span>REPORTED</span>
          </div>

          {isLoadingReports ? (
            <div
              className="report-row"
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "25px",
              }}
            >
              Loading reports...
            </div>
          ) : (
            displayReports.map((report) => (
              <div
                className="report-row"
                key={report.id}
              >
                <div className="hazard-name">
                  <div className="report-icon">
                    ⚠️
                  </div>

                  <strong>{report.title}</strong>
                </div>

                <span className="location">
                  📍 {report.location}
                </span>

                <span
                  className={`severity ${report.severity.toLowerCase()}`}
                >
                  {report.severity}
                </span>

                <span
                  className={`report-status ${report.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {report.status}
                </span>

                <span className="time">
                  {report.time}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* AWS ARCHITECTURE */}
      <section className="aws-section">
        <div className="section-heading center">
          <span className="section-tag">
            CLOUD INFRASTRUCTURE
          </span>

          <h2>Powered by AWS</h2>

          <p>
            Built with scalable AWS services for reliable
            coastal hazard monitoring.
          </p>
        </div>

        <div className="aws-services">
          <div>
            <strong>⚡</strong>
            <span>Amplify</span>
          </div>

          <div>
            <strong>🔗</strong>
            <span>API Gateway</span>
          </div>

          <div>
            <strong>λ</strong>
            <span>Lambda</span>
          </div>

          <div>
            <strong>🗄️</strong>
            <span>DynamoDB</span>
          </div>

          <div>
            <strong>📦</strong>
            <span>S3</span>
          </div>

          <div>
            <strong>📍</strong>
            <span>Location</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">
          🌊 WAVE WATCH
        </div>

        <span>
          Coastal Hazard Monitoring System
        </span>

        <span>
          Built with AWS ☁️
        </span>
      </footer>

      {/* REPORT MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-button"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>

            <div className="modal-icon">
              🚨
            </div>

            <h2>
              Report a Coastal Hazard
            </h2>

            <p>
              Help keep coastal communities safe by
              reporting what you observe.
            </p>

            <label>
              Hazard Type
            </label>

            <select
              value={hazardType}
              onChange={(e) =>
                setHazardType(e.target.value)
              }
            >
              <option>High Waves</option>
              <option>Coastal Flooding</option>
              <option>Beach Erosion</option>
              <option>Strong Winds</option>
              <option>Other</option>
            </select>

            <label>
              Location
            </label>

            <input
              type="text"
              placeholder="Enter coastal location"
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
            />

            <label>
              Description
            </label>

            <textarea
              placeholder="Describe the hazard..."
              rows={4}
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
            ></textarea>

            <button
              className="primary-button submit"
              onClick={submitReport}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Submitting..."
                : "Submit Report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
