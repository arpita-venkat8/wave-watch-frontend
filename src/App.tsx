import { useState } from "react";
import "./App.css";

type Report = {
  id: number;
  type: string;
  location: string;
  time: string;
  severity: "Critical" | "High" | "Moderate";
};

const initialReports: Report[] = [
  {
    id: 1,
    type: "Coastal Flooding",
    location: "Marina Beach",
    time: "5 min ago",
    severity: "Critical",
  },
  {
    id: 2,
    type: "Beach Erosion",
    location: "Besant Nagar",
    time: "18 min ago",
    severity: "High",
  },
  {
    id: 3,
    type: "High Waves",
    location: "Elliot's Beach",
    time: "32 min ago",
    severity: "Moderate",
  },
];

function App() {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [showModal, setShowModal] = useState(false);
  const [hazardType, setHazardType] = useState("Coastal Flooding");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submitReport() {
    if (!location.trim()) {
      alert("Please enter a location.");
      return;
    }

    const newReport: Report = {
      id: Date.now(),
      type: hazardType,
      location,
      time: "Just now",
      severity: "High",
    };

    setReports((current) => [newReport, ...current]);
    setLocation("");
    setDescription("");
    setShowModal(false);
    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
    }, 3000);
  }

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">🌊</div>
          <div>
            <div className="brand-name">WAVE WATCH</div>
            <div className="brand-tagline">Coastal Safety Network</div>
          </div>
        </div>

        <div className="nav-links">
          <a href="#dashboard">Dashboard</a>
          <a href="#map">Live Map</a>
          <a href="#reports">Reports</a>
          <a href="#about">About</a>
        </div>

        <button className="report-button" onClick={() => setShowModal(true)}>
          🚨 Report Hazard
        </button>
      </nav>

      {/* HERO */}
      <section className="hero" id="dashboard">
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <div className="live-badge">
            <span className="pulse-dot"></span>
            LIVE COASTAL MONITORING
          </div>

          <h1>
            Protect Our Coast.
            <br />
            <span>Report. Monitor. Respond.</span>
          </h1>

          <p>
            Help coastal communities identify hazards in real time.
            Submit reports, share locations and keep our shores safer.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-button"
              onClick={() => setShowModal(true)}
            >
              🚨 Report a Hazard
            </button>

            <a className="secondary-button" href="#map">
              🗺️ Explore Live Map
            </a>
          </div>
        </div>

        <div className="wave-decoration">
          <div>〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰</div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-section">
        <div className="stat-card critical">
          <div className="stat-icon">🔴</div>
          <div>
            <div className="stat-number">12</div>
            <div className="stat-label">Active Hazards</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">🟠</div>
          <div>
            <div className="stat-number">07</div>
            <div className="stat-label">Under Review</div>
          </div>
        </div>

        <div className="stat-card safe">
          <div className="stat-icon">🟢</div>
          <div>
            <div className="stat-number">34</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div>
            <div className="stat-number">1.2K</div>
            <div className="stat-label">Citizen Reports</div>
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="map-section" id="map">
        <div className="section-heading">
          <div>
            <div className="section-kicker">REAL-TIME MONITORING</div>
            <h2>🗺️ Live Coastal Hazard Map</h2>
            <p>Monitor reported hazards across the coastline.</p>
          </div>

          <div className="map-status">
            <span className="pulse-dot"></span>
            LIVE
          </div>
        </div>

        <div className="map-container">
          <div className="map-grid"></div>

          <div className="coastline"></div>

          <div className="map-marker marker-one">
            <span>🌊</span>
            <div className="marker-label">Flooding</div>
          </div>

          <div className="map-marker marker-two">
            <span>⚠️</span>
            <div className="marker-label">Erosion</div>
          </div>

          <div className="map-marker marker-three">
            <span>🌪️</span>
            <div className="marker-label">Storm</div>
          </div>

          <div className="map-marker marker-four">
            <span>🌊</span>
            <div className="marker-label">High Waves</div>
          </div>

          <div className="map-controls">
            <button>＋</button>
            <button>−</button>
            <button>⌖</button>
          </div>

          <div className="map-caption">
            <span>📍</span>
            Coastal monitoring zone
          </div>
        </div>
      </section>

      {/* REPORTS + ANALYTICS */}
      <section className="content-grid" id="reports">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="section-kicker">CITIZEN REPORTS</div>
              <h2>🚨 Recent Reports</h2>
            </div>

            <button className="view-all">View all →</button>
          </div>

          <div className="reports-list">
            {reports.map((report) => (
              <div className="report-item" key={report.id}>
                <div className="report-type-icon">
                  {report.type.includes("Flood")
                    ? "🌊"
                    : report.type.includes("Erosion")
                    ? "🏖️"
                    : "⚠️"}
                </div>

                <div className="report-info">
                  <strong>{report.type}</strong>
                  <span>📍 {report.location}</span>
                  <small>{report.time}</small>
                </div>

                <span className={`severity ${report.severity.toLowerCase()}`}>
                  {report.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel analytics-panel">
          <div className="section-kicker">HAZARD ANALYTICS</div>
          <h2>📊 Hazard Overview</h2>

          <div className="analytics">
            <div className="bar-row">
              <span>Flooding</span>
              <div className="bar">
                <div className="bar-fill flood" style={{ width: "82%" }}></div>
              </div>
              <strong>42%</strong>
            </div>

            <div className="bar-row">
              <span>Erosion</span>
              <div className="bar">
                <div
                  className="bar-fill erosion"
                  style={{ width: "58%" }}
                ></div>
              </div>
              <strong>28%</strong>
            </div>

            <div className="bar-row">
              <span>Storm</span>
              <div className="bar">
                <div className="bar-fill storm" style={{ width: "42%" }}></div>
              </div>
              <strong>20%</strong>
            </div>

            <div className="bar-row">
              <span>Other</span>
              <div className="bar">
                <div className="bar-fill other" style={{ width: "22%" }}></div>
              </div>
              <strong>10%</strong>
            </div>
          </div>

          <div className="analytics-footer">
            <span>Last updated</span>
            <strong>Just now</strong>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="cta-section" id="about">
        <div>
          <div className="section-kicker">BE PART OF THE NETWORK</div>
          <h2>Every report can make a difference.</h2>
          <p>
            Your observations help communities respond faster to coastal
            hazards.
          </p>
        </div>

        <button className="primary-button" onClick={() => setShowModal(true)}>
          🚨 Submit a Report
        </button>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">🌊 WAVE WATCH</div>
        <span>Coastal Hazard Intelligence Platform</span>
        <span>Powered by AWS ☁️</span>
      </footer>

      {/* SUCCESS MESSAGE */}
      {submitted && (
        <div className="toast">
          <span>✅</span>
          Hazard report submitted successfully!
        </div>
      )}

      {/* REPORT MODAL */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>

            <div className="modal-icon">🚨</div>

            <div className="section-kicker">CITIZEN REPORT</div>
            <h2>Report a Coastal Hazard</h2>
            <p className="modal-description">
              Tell us what you observed so the community can respond faster.
            </p>

            <label>Hazard Type</label>
            <select
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value)}
            >
              <option>Coastal Flooding</option>
              <option>Beach Erosion</option>
              <option>High Waves</option>
              <option>Storm / Cyclone</option>
              <option>Oil Spill</option>
              <option>Other</option>
            </select>

            <label>Location</label>
            <div className="location-input">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter coastal location..."
              />
              <button
                type="button"
                onClick={() => setLocation("Current location")}
              >
                📍
              </button>
            </div>

            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you observed..."
              rows={4}
            />

            <label>Photo Evidence</label>
            <div className="upload-box">
              📸
              <span>Click to upload a photo</span>
              <small>JPG, PNG up to 10MB</small>
            </div>

            <button className="submit-button" onClick={submitReport}>
              🚨 Submit Hazard Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;  );
}

export default App;
