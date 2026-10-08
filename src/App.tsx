import { useEffect, useRef, useState } from "react";
import "./App.css";

type BackendReport = {
  reportId: string;
  hazardType: string;
  description: string;
  location?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  status: string;
  photoKey?: string;
  sentiment?: string;
  sentimentScore?: number;
};

function App() {
  const [showModal, setShowModal] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const LOCATION_API_KEY =
    import.meta.env.VITE_LOCATION_API_KEY as string;

  const AWS_REGION = "ap-southeast-2";
  const MAP_STYLE = "Standard";

  // =========================================================
  // REPORT FORM
  // =========================================================

  const [hazardType, setHazardType] = useState("High Waves");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================
  // BACKEND REPORTS
  // =========================================================

  const [backendReports, setBackendReports] = useState<BackendReport[]>(
    []
  );
  const [mapReady, setMapReady] = useState(false);

  // =========================================================
  // AMAZON LOCATION MAP
  // =========================================================

  useEffect(() => {
    const maplibregl = (window as any).maplibregl;

    if (!mapContainerRef.current || !LOCATION_API_KEY || !maplibregl) {
      return;
    }

    const styleUrl =
      `https://maps.geo.${AWS_REGION}.amazonaws.com/v2/styles/` +
      `${MAP_STYLE}/descriptor?key=${encodeURIComponent(
        LOCATION_API_KEY
      )}`;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [78.9629, 20.5937],
      zoom: 4.5,
    });

    map.addControl(
      new maplibregl.NavigationControl(),
      "top-right"
    );

    map.on("load", () => {
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [LOCATION_API_KEY]);

  // =========================================================
  // RESIZE MAP
  // =========================================================

  useEffect(() => {
    if (!mapRef.current) return;

    const frame = requestAnimationFrame(() => {
      mapRef.current.resize();
    });

    return () => cancelAnimationFrame(frame);
  }, [isMapExpanded]);

  // =========================================================
  // DISPLAY HAZARDS ON MAP
  // =========================================================

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const maplibregl = (window as any).maplibregl;

    if (!maplibregl) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    backendReports.forEach((report) => {
      const color =
        report.severity === "HIGH"
          ? "#ef4444"
          : report.severity === "MEDIUM"
            ? "#f59e0b"
            : "#22c55e";

      const marker = new maplibregl.Marker({ color })
        .setLngLat([
          Number(report.longitude),
          Number(report.latitude),
        ])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <strong>${report.hazardType}</strong>
            <br/>
            📍 ${report.location || "Reported location"}
            <br/>
            Severity: ${report.severity}
            <br/>
            ${report.description}
          `)
        )
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [backendReports, mapReady]);

  // =========================================================
  // FETCH REPORTS
  // =========================================================

  const fetchReports = async () => {
    try {
      const response = await fetch(
        "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch reports"
        );
      }

      setBackendReports(data.reports || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // =========================================================
  // SCROLL TO MAP
  // =========================================================

  const scrollToMap = () => {
    document.getElementById("hazard-map")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  // =========================================================
  // AMAZON LOCATION SEARCH
  // =========================================================

  const searchLocation = async (searchText: string) => {
    const url =
      `https://places.geo.${AWS_REGION}.amazonaws.com/v2/search-text` +
      `?key=${encodeURIComponent(LOCATION_API_KEY)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        QueryText: searchText,
        MaxResults: 1,

        BiasPosition: [78.9629, 20.5937],

        Filter: {
          IncludeCountries: ["IND"],
        },

        IntendedUse: "SingleUse",
      }),
    });

    const data = await response.json();

    console.log(
      "Amazon Location Search Response:",
      data
    );

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          "Location search failed"
      );
    }

    if (
      !data.ResultItems ||
      data.ResultItems.length === 0
    ) {
      throw new Error(
        `Could not find "${searchText}" in India. Please enter a valid Indian location.`
      );
    }

    const result = data.ResultItems[0];

    if (
      !result.Position ||
      result.Position.length !== 2
    ) {
      throw new Error(
        "Location coordinates were not found."
      );
    }

    return {
      locationName:
        result.Title || searchText,

      longitude: Number(result.Position[0]),
      latitude: Number(result.Position[1]),
    };
  };

  // =========================================================
  // S3 PHOTO UPLOAD
  // =========================================================

  const uploadPhotoToS3 = async (file: File) => {
    const urlResponse = await fetch(
      "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upload-url",
          fileName: file.name,
          contentType: file.type || "image/jpeg",
        }),
      }
    );

    const urlData = await urlResponse.json();

    if (!urlResponse.ok) {
      throw new Error(
        urlData.error ||
          "Could not generate photo upload URL."
      );
    }

    const uploadResponse = await fetch(
      urlData.uploadUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            file.type || "image/jpeg",
        },
        body: file,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(
        "Photo upload failed. Please try again."
      );
    }

    return urlData.photoKey as string;
  };

  // =========================================================
  // SUBMIT REPORT
  // =========================================================

  const submitReport = async () => {
    if (!location.trim() || !description.trim()) {
      alert(
        "Please enter the location and description."
      );
      return;
    }

    if (!LOCATION_API_KEY) {
      alert(
        "Amazon Location API key is not configured."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // STEP 1 — LOCATION
      const place = await searchLocation(
        location.trim()
      );

      console.log("Found location:", place);

      // STEP 2 — MOVE MAP
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [
            place.longitude,
            place.latitude,
          ],
          zoom: 11,
          essential: true,
        });
      }

      // STEP 3 — PHOTO
      let photoKey = "";

      if (photoFile) {
        if (!photoFile.type.startsWith("image/")) {
          throw new Error(
            "Please select an image file."
          );
        }

        if (photoFile.size > 10 * 1024 * 1024) {
          throw new Error(
            "Photo must be smaller than 10 MB."
          );
        }

        photoKey = await uploadPhotoToS3(
          photoFile
        );
      }

      // STEP 4 — API
      const response = await fetch(
        "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            hazardType,
            description,

            location:
              place.locationName,

            latitude:
              place.latitude,

            longitude:
              place.longitude,

            photoKey,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to submit report"
        );
      }

      console.log(
        "AWS Response:",
        data
      );

      // STEP 5 — REFRESH
      await fetchReports();

      // STEP 6 — SUCCESS
      alert(
        `🚨 Hazard reported successfully at ${place.locationName}!`
      );

      setHazardType("High Waves");
      setLocation("");
      setDescription("");
      setPhotoFile(null);

      setShowModal(false);
    } catch (error) {
      console.error(
        "Error submitting report:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to submit report. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // DASHBOARD CALCULATIONS
  // =========================================================

  const highCount = backendReports.filter(
    (r) => r.severity === "HIGH"
  ).length;

  const mediumCount = backendReports.filter(
    (r) => r.severity === "MEDIUM"
  ).length;

  const lowCount = backendReports.filter(
    (r) => r.severity === "LOW"
  ).length;

  const pendingCount = backendReports.filter(
    (r) => r.status === "PENDING"
  ).length;

  const activeCount = backendReports.filter(
    (r) =>
      r.status !== "RESOLVED"
  ).length;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          COMMAND NAVIGATION
      ===================================================== */}

      <nav className="navbar">

        <div className="logo">

          <div className="logo-icon">
            🌊
          </div>

          <div>
            <h2>WAVE WATCH</h2>
            <span>
              COASTAL INTELLIGENCE PLATFORM
            </span>
          </div>

        </div>

        <div className="nav-links">
          <button onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }>
            COMMAND CENTER
          </button>

          <button onClick={scrollToMap}>
            LIVE MAP
          </button>

          <button onClick={() =>
            document
              .getElementById("reports-section")
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }>
            REPORTS
          </button>
        </div>

        <div className="nav-status">
          <span className="live-dot"></span>
          SYSTEM OPERATIONAL
        </div>

      </nav>

      {/* =====================================================
          HERO / COMMAND CENTER
      ===================================================== */}

      <section className="hero">

        <div className="hero-content">

          <div className="hero-badge">
            ● LIVE COASTAL MONITORING
          </div>

          <div className="hero-code">
            WW // COMMAND CENTER // INDIA
          </div>

          <h1>
            Coastal Hazard
            <br />
            <span>Command Center.</span>
          </h1>

          <p>
            Real-time citizen intelligence,
            geospatial monitoring and AWS-powered
            hazard management for India's coastline.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-button"
              onClick={() =>
                setShowModal(true)
              }
            >
              + REPORT HAZARD
            </button>

            <button
              className="secondary-button"
              onClick={scrollToMap}
            >
              OPEN LIVE MAP →
            </button>

          </div>

          <div className="hero-system-line">
            <span>API</span>
            <i></i>
            <span>LAMBDA</span>
            <i></i>
            <span>DYNAMODB</span>
            <i></i>
            <span>S3</span>
            <i></i>
            <span>LOCATION</span>
          </div>

        </div>

        <div className="hero-visual">

          <div className="radar">

            <div className="radar-ring ring-one"></div>
            <div className="radar-ring ring-two"></div>
            <div className="radar-ring ring-three"></div>

            <div className="radar-cross horizontal"></div>
            <div className="radar-cross vertical"></div>

            <div className="radar-sweep"></div>

            <div className="radar-center">
              <span></span>
            </div>

            <div className="radar-point point-one"></div>
            <div className="radar-point point-two"></div>
            <div className="radar-point point-three"></div>

          </div>

          <div className="hero-data-card">

            <span>
              MONITORING REGION
            </span>

            <strong>
              INDIA
            </strong>

            <small>
              08 OCT 2026 // LIVE
            </small>

          </div>

        </div>

      </section>

      {/* =====================================================
          KPI COMMAND BAR
      ===================================================== */}

      <section className="stats">

        <div className="stat-card">
          <div className="stat-top">
            <span>ACTIVE HAZARDS</span>
            <b className="red-text">●</b>
          </div>

          <strong>
            {activeCount}
          </strong>

          <small>
            CURRENTLY MONITORED
          </small>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>CITIZEN REPORTS</span>
            <b>◉</b>
          </div>

          <strong>
            {backendReports.length}
          </strong>

          <small>
            DYNAMODB RECORDS
          </small>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>UNDER REVIEW</span>
            <b className="orange-text">▲</b>
          </div>

          <strong>
            {pendingCount}
          </strong>

          <small>
            PENDING VALIDATION
          </small>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>SYSTEM STATUS</span>
            <b className="green-text">●</b>
          </div>

          <strong className="status-online">
            ONLINE
          </strong>

          <small>
            AWS INFRASTRUCTURE
          </small>
        </div>

      </section>

      {/* =====================================================
          LIVE MONITORING
      ===================================================== */}

      <section className="monitoring">

        <div className="section-heading">

          <div>

            <span className="section-tag">
              LIVE MONITORING // 01
            </span>

            <h2>
              Coastal Intelligence
            </h2>

            <p>
              Real-time geospatial view of
              reported coastal hazards.
            </p>

          </div>

          <div className="live-status">
            <span></span>
            LIVE DATA STREAM
          </div>

        </div>

        <div className="monitor-grid">

          {/* MAP */}

          <div
            id="hazard-map"
            className={`map-card ${
              isMapExpanded
                ? "expanded"
                : ""
            }`}
          >

            <div className="map-header">

              <div>

                <div className="map-label">
                  GEO // INDIA
                </div>

                <h3>
                  Hazard Activity Map
                </h3>

                <span>
                  AMAZON LOCATION SERVICE
                </span>

              </div>

              <button
                className="map-button"
                onClick={() =>
                  setIsMapExpanded(
                    (current) =>
                      !current
                  )
                }
              >
                {isMapExpanded
                  ? "CLOSE MAP ✕"
                  : "EXPAND ↗"}
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
                  className="map-error"
                >
                  AMAZON LOCATION API KEY
                  NOT CONFIGURED
                </div>
              )}

            </div>

            <div className="map-footer">

              <span>
                <i className="legend-red"></i>
                HIGH ({highCount})
              </span>

              <span>
                <i className="legend-orange"></i>
                MEDIUM ({mediumCount})
              </span>

              <span>
                <i className="legend-green"></i>
                LOW ({lowCount})
              </span>

              <span className="map-coordinates">
                INDIA // 20.5937°N
                78.9629°E
              </span>

            </div>

          </div>

          {/* ALERT PANEL */}

          <div className="alert-card">

            <div className="alert-header">

              <div>

                <span className="section-tag">
                  PRIORITY QUEUE
                </span>

                <h3>
                  Active Alerts
                </h3>

              </div>

              <span className="alert-count">
                {activeCount}
              </span>

            </div>

            {backendReports.length === 0 ? (

              <div className="empty-alerts">
                <strong>
                  NO ACTIVE SIGNALS
                </strong>
                <span>
                  Awaiting incoming
                  citizen reports.
                </span>
              </div>

            ) : (

              backendReports
                .slice()
                .reverse()
                .slice(0, 5)
                .map((report) => (

                  <div
                    className={`alert-item ${
                      report.severity.toLowerCase()
                    }`}
                    key={report.reportId}
                  >

                    <div className="alert-icon">
                      {report.severity ===
                      "HIGH"
                        ? "!"
                        : report.severity ===
                            "MEDIUM"
                          ? "▲"
                          : "•"}
                    </div>

                    <div>

                      <strong>
                        {report.hazardType}
                      </strong>

                      <span>
                        📍{" "}
                        {report.location ||
                          "Unknown"}
                      </span>

                      <small>
                        {report.status ===
                        "PENDING"
                          ? "UNDER REVIEW"
                          : report.status}
                      </small>

                    </div>

                    <b>
                      {report.severity}
                    </b>

                  </div>

                ))

            )}

          </div>

        </div>

      </section>

      {/* =====================================================
          REPORT TABLE
      ===================================================== */}

      <section
        className="reports"
        id="reports-section"
      >

        <div className="section-heading">

          <div>

            <span className="section-tag">
              CITIZEN INTELLIGENCE // 02
            </span>

            <h2>
              Incoming Hazard Reports
            </h2>

            <p>
              Live observations ingested
              through the Wave Watch API.
            </p>

          </div>

          <button
            className="primary-button small"
            onClick={() =>
              setShowModal(true)
            }
          >
            + NEW REPORT
          </button>

        </div>

        <div className="reports-table">

          <div className="table-header">
            <span>HAZARD</span>
            <span>LOCATION</span>
            <span>SEVERITY</span>
            <span>STATUS</span>
            <span>TIMESTAMP</span>
          </div>

          {backendReports.length === 0 ? (

            <div className="empty-table">
              NO REPORTS AVAILABLE
            </div>

          ) : (

            backendReports
              .slice()
              .reverse()
              .map((report) => {

                const severity =
                  report.severity ===
                  "HIGH"
                    ? "High"
                    : report.severity ===
                        "LOW"
                      ? "Low"
                      : "Medium";

                const status =
                  report.status ===
                  "PENDING"
                    ? "Under Review"
                    : report.status ===
                        "RESOLVED"
                      ? "Resolved"
                      : "Active";

                const reportedTime =
                  report.timestamp
                    ? new Date(
                        report.timestamp
                      ).toLocaleString()
                    : "Recently";

                return (

                  <div
                    className="report-row"
                    key={
                      report.reportId
                    }
                  >

                    <div className="hazard-name">

                      <div className="report-icon">
                        ⚠
                      </div>

                      <strong>
                        {report.hazardType}
                      </strong>

                    </div>

                    <span className="location">
                      📍{" "}
                      {report.location ||
                        "Reported location"}
                    </span>

                    <span
                      className={`severity ${severity.toLowerCase()}`}
                    >
                      {severity}
                    </span>

                    <span
                      className={`report-status ${status
                        .toLowerCase()
                        .replace(
                          " ",
                          "-"
                        )}`}
                    >
                      {status}
                    </span>

                    <span className="time">
                      {reportedTime}
                    </span>

                  </div>

                );
              })

          )}

        </div>

      </section>

      {/* =====================================================
          SYSTEM PIPELINE
      ===================================================== */}

      <section className="pipeline-section">

        <div className="section-heading center">

          <span className="section-tag">
            AWS INFRASTRUCTURE // 03
          </span>

          <h2>
            Operational Data Pipeline
          </h2>

          <p>
            From citizen observation to
            cloud-based hazard intelligence.
          </p>

        </div>

        <div className="pipeline">

          <div className="pipeline-node active">
            <span>01</span>
            <strong>
              CITIZEN
            </strong>
            <small>
              REPORT
            </small>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-node active">
            <span>02</span>
            <strong>
              API GATEWAY
            </strong>
            <small>
              INGESTION
            </small>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-node active">
            <span>03</span>
            <strong>
              LAMBDA
            </strong>
            <small>
              PROCESSING
            </small>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-node active">
            <span>04</span>
            <strong>
              DYNAMODB
            </strong>
            <small>
              STORAGE
            </small>
          </div>

          <div className="pipeline-line"></div>

          <div className="pipeline-node active">
            <span>05</span>
            <strong>
              LOCATION
            </strong>
            <small>
              GEOSPATIAL
            </small>
          </div>

        </div>

        <div className="aws-services">

          <div>
            <strong>⚡</strong>
            <span>AMPLIFY</span>
          </div>

          <div>
            <strong>⇄</strong>
            <span>API GATEWAY</span>
          </div>

          <div>
            <strong>λ</strong>
            <span>LAMBDA</span>
          </div>

          <div>
            <strong>▣</strong>
            <span>DYNAMODB</span>
          </div>

          <div>
            <strong>◈</strong>
            <span>S3</span>
          </div>

          <div>
            <strong>◎</strong>
            <span>LOCATION</span>
          </div>

          <div>
            <strong>◉</strong>
            <span>EVENTBRIDGE</span>
          </div>

          <div>
            <strong>◌</strong>
            <span>CLOUDWATCH</span>
          </div>

        </div>

      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>

        <div className="footer-logo">
          🌊 WAVE WATCH
        </div>

        <span>
          COASTAL HAZARD INTELLIGENCE SYSTEM
        </span>

        <span>
          AWS // AP-SOUTHEAST-2
        </span>

      </footer>

      {/* =====================================================
          REPORT MODAL
      ===================================================== */}

      {showModal && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowModal(false)
          }
        >

          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="close-button"
              onClick={() =>
                setShowModal(false)
              }
            >
              ×
            </button>

            <div className="modal-header">

              <span className="modal-code">
                INCIDENT // NEW
              </span>

              <div className="modal-icon">
                ⚠
              </div>

              <h2>
                Report Coastal Hazard
              </h2>

              <p>
                Submit a field observation
                to the Wave Watch
                intelligence network.
              </p>

            </div>

            {/* HAZARD */}

            <label>
              HAZARD TYPE
            </label>

            <select
              value={hazardType}
              onChange={(e) =>
                setHazardType(
                  e.target.value
                )
              }
            >

              <option>
                High Waves
              </option>

              <option>
                Coastal Flooding
              </option>

              <option>
                Beach Erosion
              </option>

              <option>
                Strong Winds
              </option>

              <option>
                Other
              </option>

            </select>

            {/* LOCATION */}

            <label>
              LOCATION
            </label>

            <input
              type="text"
              placeholder="Enter Indian location e.g. Dindigul"
              value={location}
              onChange={(e) =>
                setLocation(
                  e.target.value
                )
              }
            />

            {/* DESCRIPTION */}

            <label>
              FIELD OBSERVATION
            </label>

            <textarea
              placeholder="Describe the observed coastal hazard..."
              rows={4}
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
            ></textarea>

            {/* PHOTO */}

            <label>
              PHOTO EVIDENCE
              <span>
                {" "}
                // OPTIONAL
              </span>
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setPhotoFile(
                  e.target.files?.[0] ||
                    null
                )
              }
            />

            {photoFile && (
              <div className="selected-file">
                📷{" "}
                {photoFile.name}
              </div>
            )}

            {/* SUBMIT */}

            <button
              className="primary-button submit"
              onClick={submitReport}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? photoFile
                  ? "PROCESSING // UPLOADING..."
                  : "PROCESSING // SUBMITTING..."
                : "TRANSMIT REPORT →"}
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;
