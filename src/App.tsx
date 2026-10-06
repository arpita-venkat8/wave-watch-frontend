import { useState } from "react";
import "./App.css";

type Report = {
  id: number;
  title: string;
  location: string;
  severity: "High" | "Medium" | "Low";
  status: "Active" | "Under Review" | "Resolved";
  time: string;
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

            <button className="secondary-button">
              🗺️ View Live Map
            </button>
          </div>

        </div>

        <div className="hero-visual">

          <div className="ocean-circle">
            <div className="wave wave-one"></div>
            <div className="wave wave-two"></div>
            <div className="wave wave-three"></div>

            <div className="location-pin">
              📍
            </div>
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
            <span className="section-tag">LIVE MONITORING</span>
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
          <div className="map-card">

            <div className="map-header">
              <div>
                <h3>Hazard Map</h3>
                <span>Real-time coastal activity</span>
              </div>

              <button className="map-button">
                Full Map ↗
              </button>
            </div>

            <div className="fake-map">

              <div className="map-grid"></div>

              <div className="coastline"></div>

              <div className="map-marker marker-one">
                <span></span>
              </div>

              <div className="map-marker marker-two">
                <span></span>
              </div>

              <div className="map-marker marker-three">
                <span></span>
              </div>

              <div className="map-label label-one">
                Marina
              </div>

              <div className="map-label label-two">
                Besant Nagar
              </div>

              <div className="map-label label-three">
                Mahabalipuram
              </div>

              <div className="map-center">
                🌊
              </div>

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
                <span className="section-tag">URGENT</span>
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

          {sampleReports.map((report) => (
            <div className="report-row" key={report.id}>

              <div className="hazard-name">
                <div className="report-icon">
                  ⚠️
                </div>

                <strong>{report.title}</strong>
              </div>

              <span className="location">
                📍 {report.location}
              </span>

              <span className={`severity ${report.severity.toLowerCase()}`}>
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
          ))}

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

            <h2>Report a Coastal Hazard</h2>

            <p>
              Help keep coastal communities safe by
              reporting what you observe.
            </p>

            <label>
              Hazard Type
            </label>

            <select>
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
            />

            <label>
              Description
            </label>

            <textarea
              placeholder="Describe the hazard..."
              rows={4}
            ></textarea>

            <button className="primary-button submit">
              Submit Report
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default App;
