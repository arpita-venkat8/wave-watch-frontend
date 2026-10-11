import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type Severity = "HIGH" | "MEDIUM" | "LOW";

type BackendReport = {
  reportId: string;
  hazardType: string;
  description: string;
  location?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  severity: Severity;
  status: string;
  photoKey?: string;
  sentiment?: string;
  sentimentScore?: number;
  keyPhrases?: {
    text: string;
    score: number;
  }[];
};

const API_URL =
  "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports";

const AWS_REGION = "ap-southeast-2";
const MAP_STYLE = "Standard";

const HAZARD_TYPES = [
  "High Waves",
  "Rip Current",
  "Coastal Flooding",
  "Beach Erosion",
  "Strong Winds",
  "Storm Surge",
  "Tsunami Warning",
  "Marine Pollution",
  "Other",
];

function App() {
  const LOCATION_API_KEY =
    import.meta.env.VITE_LOCATION_API_KEY as string;

  /* =========================================================
     UI STATE
  ========================================================= */

  const [showModal, setShowModal] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* =========================================================
     FORM STATE
  ========================================================= */

  const [hazardType, setHazardType] =
    useState("High Waves");

  const [location, setLocation] = useState("");

  const [description, setDescription] =
    useState("");

  const [photoFile, setPhotoFile] =
    useState<File | null>(null);

  /* =========================================================
     BACKEND STATE
  ========================================================= */

  const [backendReports, setBackendReports] =
    useState<BackendReport[]>([]);

  /* =========================================================
     MAP STATE
  ========================================================= */

  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<any>(null);

  const markersRef =
    useRef<any[]>([]);

  const [mapReady, setMapReady] =
    useState(false);

  /* =========================================================
     INITIALIZE AMAZON LOCATION MAP
  ========================================================= */

  useEffect(() => {
    const maplibregl = (window as any).maplibregl;

    if (
      !mapContainerRef.current ||
      !LOCATION_API_KEY ||
      !maplibregl
    ) {
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
      markersRef.current.forEach((marker) =>
        marker.remove()
      );

      markersRef.current = [];

      map.remove();

      mapRef.current = null;

      setMapReady(false);
    };
  }, [LOCATION_API_KEY]);

  /* =========================================================
     RESIZE MAP
  ========================================================= */

  useEffect(() => {
    if (!mapRef.current) return;

    const frame = requestAnimationFrame(() => {
      mapRef.current.resize();
    });

    return () => cancelAnimationFrame(frame);
  }, [isMapExpanded]);

  /* =========================================================
     ADD BACKEND REPORT MARKERS
  ========================================================= */

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const maplibregl = (window as any).maplibregl;

    if (!maplibregl) return;

    markersRef.current.forEach((marker) =>
      marker.remove()
    );

    markersRef.current = [];

    backendReports.forEach((report) => {
      const color =
        report.severity === "HIGH"
          ? "#ff4d5a"
          : report.severity === "MEDIUM"
            ? "#ffb020"
            : "#32d583";

      const marker =
        new maplibregl.Marker({
          color,
        })
          .setLngLat([
            Number(report.longitude),
            Number(report.latitude),
          ])
          .setPopup(
            new maplibregl.Popup({
              offset: 25,
            }).setHTML(`
              <div style="min-width:210px">
                <strong>${report.hazardType}</strong>
                <br/>
                <span>📍 ${
                  report.location ||
                  "Reported location"
                }</span>
                <br/>
                <span>Severity: ${
                  report.severity
                }</span>
                <br/>
                <span>Status: ${
                  report.status
                }</span>
                <br/>
                <br/>
                <span>${report.description}</span>
              </div>
            `)
          )
          .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [backendReports, mapReady]);

  /* =========================================================
     FETCH REPORTS
  ========================================================= */

  const fetchReports = async () => {
    try {
      setIsRefreshing(true);

      const response = await fetch(API_URL);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch reports"
        );
      }

      const sortedReports =
        (data.reports || []).sort(
          (
            a: BackendReport,
            b: BackendReport
          ) =>
            new Date(
              b.timestamp
            ).getTime() -
            new Date(
              a.timestamp
            ).getTime()
        );

      setBackendReports(sortedReports);
    } catch (error) {
      console.error(
        "Error fetching reports:",
        error
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  /* =========================================================
     DERIVED DASHBOARD DATA
  ========================================================= */

  const dashboardStats = useMemo(() => {
    const active =
      backendReports.filter(
        (report) =>
          report.status !== "PENDING" &&
          report.status !== "RESOLVED"
      ).length;

    const underReview =
      backendReports.filter(
        (report) =>
          report.status === "PENDING"
      ).length;

    const resolved =
      backendReports.filter(
        (report) =>
          report.status === "RESOLVED"
      ).length;

    const high =
      backendReports.filter(
        (report) =>
          report.severity === "HIGH"
      ).length;

    return {
      active,
      underReview,
      resolved,
      high,
      total: backendReports.length,
    };
  }, [backendReports]);

  const recentAlerts = useMemo(() => {
    return backendReports
      .filter(
        (report) =>
          report.severity === "HIGH" ||
          report.severity === "MEDIUM"
      )
      .slice(0, 4);
  }, [backendReports]);

  /* =========================================================
     SCROLL HELPERS
  ========================================================= */

  const scrollToMap = () => {
    document
      .getElementById("hazard-map")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  };

  const scrollToReports = () => {
    document
      .getElementById("reports")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  /* =========================================================
     AMAZON LOCATION SEARCH
  ========================================================= */

  const searchLocation = async (
    searchText: string
  ) => {
    const url =
      `https://places.geo.${AWS_REGION}.amazonaws.com/v2/search-text` +
      `?key=${encodeURIComponent(
        LOCATION_API_KEY
      )}`;

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        QueryText: searchText,

        MaxResults: 1,

        BiasPosition: [
          78.9629,
          20.5937,
        ],

        Filter: {
          IncludeCountries: ["IND"],
        },

        IntendedUse: "SingleUse",
      }),
    });

    const data = await response.json();

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
        `Could not find "${searchText}" in India.`
      );
    }

    const result =
      data.ResultItems[0];

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

      longitude:
        Number(result.Position[0]),

      latitude:
        Number(result.Position[1]),
    };
  };

  /* =========================================================
     UPLOAD PHOTO TO S3
  ========================================================= */

  const uploadPhotoToS3 = async (
    file: File
  ) => {
    const urlResponse =
      await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          action: "upload-url",
          fileName: file.name,
          contentType:
            file.type ||
            "image/jpeg",
        }),
      });

    const urlData =
      await urlResponse.json();

    if (!urlResponse.ok) {
      throw new Error(
        urlData.error ||
          "Could not generate photo upload URL."
      );
    }

    const uploadResponse =
      await fetch(
        urlData.uploadUrl,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              file.type ||
              "image/jpeg",
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

  /* =========================================================
     SUBMIT REPORT
  ========================================================= */

  const submitReport = async () => {
    if (
      !location.trim() ||
      !description.trim()
    ) {
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
      /* STEP 1 — LOCATION */

      const place =
        await searchLocation(
          location.trim()
        );

      /* STEP 2 — MOVE MAP */

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

      /* STEP 3 — S3 PHOTO */

      let photoKey = "";

      if (photoFile) {
        if (
          !photoFile.type.startsWith(
            "image/"
          )
        ) {
          throw new Error(
            "Please select an image file."
          );
        }

        if (
          photoFile.size >
          10 * 1024 * 1024
        ) {
          throw new Error(
            "Photo must be smaller than 10 MB."
          );
        }

        photoKey =
          await uploadPhotoToS3(
            photoFile
          );
      }

      /* STEP 4 — API */

      const response =
        await fetch(API_URL, {
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
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to submit report"
        );
      }

      /* STEP 5 — REFRESH */

      await fetchReports();

      /* STEP 6 — SUCCESS */

      alert(
        `Hazard reported successfully at ${place.locationName}!`
      );

      setHazardType("High Waves");
      setLocation("");
      setDescription("");
      setPhotoFile(null);

      setShowModal(false);

      /* Move user to map */

      setTimeout(() => {
        scrollToMap();
      }, 150);
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

  /* =========================================================
     FORMAT TIME
  ========================================================= */

  const formatTime = (
    timestamp: string
  ) => {
    if (!timestamp) return "Recently";

    return new Date(
      timestamp
    ).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* =========================================================
     STATUS
  ========================================================= */

  const getStatus = (
    report: BackendReport
  ) => {
    if (report.status === "PENDING") {
      return "Under Review";
    }

    if (
      report.status === "RESOLVED"
    ) {
      return "Resolved";
    }

    return "Active";
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="app">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="navbar">

        <div
          className="brand"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          <div className="brand-mark">
            <span>W</span>
            <div className="brand-wave"></div>
          </div>

          <div className="brand-text">
            <strong>WAVE WATCH</strong>
            <span>
              COASTAL INTELLIGENCE PLATFORM
            </span>
          </div>
        </div>

        <div className="nav-links">
          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            Overview
          </button>

          <button onClick={scrollToMap}>
            Live Map
          </button>

          <button onClick={scrollToReports}>
            Reports
          </button>
        </div>

        <div className="system-status">
          <span className="status-pulse"></span>

          <div>
            <strong>SYSTEM ONLINE</strong>
            <small>
              AWS CLOUD SERVICES
            </small>
          </div>
        </div>

      </nav>

      {/* =====================================================
          COMMAND HERO
      ===================================================== */}

      <main>

        <section className="command-hero">

          <div className="hero-left">

            <div className="eyebrow">
              <span></span>
              REAL-TIME COASTAL INTELLIGENCE
            </div>

            <h1>
              Observe.
              <br />
              <span>Report.</span>
              <br />
              Protect.
            </h1>

            <p className="hero-description">
              Wave Watch is a cloud-powered coastal
              hazard intelligence platform that helps
              communities report incidents and monitor
              coastal activity across India.
            </p>

            <div className="hero-actions">

              <button
                className="command-button primary"
                onClick={() =>
                  setShowModal(true)
                }
              >
                <span>+</span>
                Report Hazard
              </button>

              <button
                className="command-button ghost"
                onClick={scrollToMap}
              >
                Explore Live Map
                <span>↗</span>
              </button>

            </div>

            <div className="hero-meta">

              <div>
                <span>REGION</span>
                <strong>INDIA</strong>
              </div>

              <div>
                <span>REPORTS</span>
                <strong>
                  {backendReports.length
                    .toString()
                    .padStart(2, "0")}
                </strong>
              </div>

              <div>
                <span>HIGH RISK</span>
                <strong>
                  {dashboardStats.high
                    .toString()
                    .padStart(2, "0")}
                </strong>
              </div>

            </div>

          </div>

          <div className="hero-command-panel">

            <div className="panel-topline">
              <span>
                COASTAL OPERATIONS
              </span>

              <span className="panel-live">
                ● LIVE
              </span>
            </div>

            <div className="coast-visual">

              <div className="coast-grid"></div>

              <div className="coast-lines line-a"></div>
              <div className="coast-lines line-b"></div>
              <div className="coast-lines line-c"></div>

              <div className="india-outline">
                <div className="india-glow"></div>
              </div>

              <div className="visual-point point-1">
                <span></span>
                <label>WEST</label>
              </div>

              <div className="visual-point point-2">
                <span></span>
                <label>SOUTH</label>
              </div>

              <div className="visual-point point-3">
                <span></span>
                <label>EAST</label>
              </div>

              <div className="visual-coordinate">
                20.5937° N
                <br />
                78.9629° E
              </div>

            </div>

            <div className="panel-footer">

              <div>
                <span>MONITORING</span>
                <strong>INDIA COASTLINE</strong>
              </div>

              <div className="panel-wave">
                ~ ~ ~ ~ ~
              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            KPI STRIP
        ===================================================== */}

        <section className="kpi-section">

          <div className="kpi-label">
            <span>01</span>
            LIVE SYSTEM METRICS
          </div>

          <div className="kpi-grid">

            <div className="kpi-card danger">
              <div className="kpi-top">
                <span>ACTIVE HAZARDS</span>
                <i>!</i>
              </div>

              <strong>
                {dashboardStats.active}
              </strong>

              <p>
                Current unresolved incidents
              </p>

              <div className="kpi-line"></div>
            </div>

            <div className="kpi-card warning">
              <div className="kpi-top">
                <span>UNDER REVIEW</span>
                <i>◷</i>
              </div>

              <strong>
                {dashboardStats.underReview}
              </strong>

              <p>
                Reports awaiting assessment
              </p>

              <div className="kpi-line"></div>
            </div>

            <div className="kpi-card success">
              <div className="kpi-top">
                <span>RESOLVED</span>
                <i>✓</i>
              </div>

              <strong>
                {dashboardStats.resolved}
              </strong>

              <p>
                Incidents marked resolved
              </p>

              <div className="kpi-line"></div>
            </div>

            <div className="kpi-card info">
              <div className="kpi-top">
                <span>CITIZEN REPORTS</span>
                <i>◎</i>
              </div>

              <strong>
                {dashboardStats.total}
              </strong>

              <p>
                Observations received
              </p>

              <div className="kpi-line"></div>
            </div>

          </div>

        </section>

        {/* =====================================================
            LIVE OPERATIONS
        ===================================================== */}

        <section
          className="operations-section"
          id="hazard-map"
        >

          <div className="section-intro">

            <div>
              <span className="section-number">
                02 / LIVE OPERATIONS
              </span>

              <h2>
                Coastal
                <span> situation map.</span>
              </h2>

              <p>
                Real-time geographic view of citizen
                reported coastal hazards powered by
                Amazon Location Service.
              </p>
            </div>

            <div className="refresh-control">

              <span
                className={
                  isRefreshing
                    ? "refresh-dot spinning"
                    : "refresh-dot"
                }
              ></span>

              <span>
                {isRefreshing
                  ? "SYNCING"
                  : "DATA SYNCED"}
              </span>

              <button
                onClick={fetchReports}
                title="Refresh reports"
              >
                ↻
              </button>

            </div>

          </div>

          <div
            className={
              isMapExpanded
                ? "operations-grid expanded-map"
                : "operations-grid"
            }
          >

            {/* MAP */}

            <div className="map-shell">

              <div className="map-toolbar">

                <div>
                  <span className="map-live-indicator">
                    ●
                  </span>

                  <strong>
                    LIVE HAZARD MAP
                  </strong>

                  <small>
                    INDIA / COASTAL ZONE
                  </small>
                </div>

                <button
                  className="map-expand-button"
                  onClick={() =>
                    setIsMapExpanded(
                      (value) => !value
                    )
                  }
                >
                  {isMapExpanded
                    ? "EXIT FULL MAP"
                    : "EXPAND MAP ↗"}
                </button>

              </div>

              <div className="map-container">

                <div
                  ref={mapContainerRef}
                  className="real-map"
                />

                {!LOCATION_API_KEY && (
                  <div className="map-error">
                    <strong>
                      LOCATION SERVICE NOT CONFIGURED
                    </strong>

                    <span>
                      Add VITE_LOCATION_API_KEY
                      to Amplify environment
                      variables.
                    </span>
                  </div>
                )}

                <div className="map-overlay-label">
                  AMAZON LOCATION SERVICE
                </div>

                <div className="map-coordinates">
                  78.9629° E
                  <br />
                  20.5937° N
                </div>

              </div>

              <div className="map-bottom">

                <div className="map-legend">

                  <span>
                    <i className="legend-dot high"></i>
                    HIGH
                  </span>

                  <span>
                    <i className="legend-dot medium"></i>
                    MEDIUM
                  </span>

                  <span>
                    <i className="legend-dot low"></i>
                    LOW
                  </span>

                </div>

                <span>
                  {backendReports.length} mapped
                  incidents
                </span>

              </div>

            </div>

            {/* INTELLIGENCE PANEL */}

            {!isMapExpanded && (
              <aside className="intelligence-panel">

                <div className="intel-header">

                  <div>
                    <span>
                      INCIDENT INTELLIGENCE
                    </span>

                    <h3>
                      Current signals
                    </h3>
                  </div>

                  <div className="signal-count">
                    {recentAlerts.length}
                  </div>

                </div>

                {recentAlerts.length === 0 ? (
                  <div className="no-alerts">
                    <div>✓</div>

                    <strong>
                      No active alerts
                    </strong>

                    <span>
                      The monitoring network
                      currently has no high or
                      medium severity reports.
                    </span>
                  </div>
                ) : (
                  <div className="intel-list">

                    {recentAlerts.map(
                      (report, index) => (
                        <div
                          className="intel-item"
                          key={report.reportId}
                          onClick={() => {
                            if (
                              mapRef.current
                            ) {
                              mapRef.current.flyTo(
                                {
                                  center: [
                                    Number(
                                      report.longitude
                                    ),
                                    Number(
                                      report.latitude
                                    ),
                                  ],
                                  zoom: 11,
                                  essential: true,
                                }
                              );
                            }
                          }}
                        >

                          <div
                            className={`intel-severity ${report.severity.toLowerCase()}`}
                          >
                            {index + 1}
                          </div>

                          <div className="intel-content">

                            <div className="intel-title">
                              <strong>
                                {report.hazardType}
                              </strong>

                              <span
                                className={`mini-severity ${report.severity.toLowerCase()}`}
                              >
                                {report.severity}
                              </span>
                            </div>

                            <span className="intel-location">
                              📍{" "}
                              {report.location ||
                                "Reported location"}
                            </span>

                            <small>
                              {formatTime(
                                report.timestamp
                              )}
                            </small>

                          </div>

                          <span className="intel-arrow">
                            →
                          </span>

                        </div>
                      )
                    )}

                  </div>
                )}

                <div className="intel-summary">

                  <div>
                    <span>HIGH RISK</span>
                    <strong>
                      {dashboardStats.high}
                    </strong>
                  </div>

                  <div>
                    <span>ALL REPORTS</span>
                    <strong>
                      {dashboardStats.total}
                    </strong>
                  </div>

                </div>

              </aside>
            )}

          </div>

        </section>

        {/* =====================================================
            REPORTS
        ===================================================== */}

        <section
          className="reports-section"
          id="reports"
        >

          <div className="section-intro">

            <div>
              <span className="section-number">
                03 / INCIDENT LOG
              </span>

              <h2>
                Community
                <span> observations.</span>
              </h2>

              <p>
                Every submitted report is stored in
                DynamoDB and visualized on the live
                operations map.
              </p>
            </div>

            <button
              className="command-button primary"
              onClick={() =>
                setShowModal(true)
              }
            >
              + New Report
            </button>

          </div>

          <div className="reports-panel">

            <div className="reports-header">

              <div>
                <strong>
                  INCIDENT DATABASE
                </strong>

                <span>
                  {backendReports.length} records
                </span>
              </div>

              <span>
                SORTED BY LATEST
              </span>

            </div>

            {backendReports.length === 0 ? (
              <div className="empty-reports">
                <div>◎</div>

                <strong>
                  No reports received
                </strong>

                <span>
                  Submit the first coastal
                  hazard observation.
                </span>

                <button
                  onClick={() =>
                    setShowModal(true)
                  }
                >
                  Create Report
                </button>
              </div>
            ) : (
              <div className="report-list">

                {backendReports.map(
                  (report) => {
                    const status =
                      getStatus(report);

                    return (
                      <div
                        className="report-card"
                        key={report.reportId}
                      >

                        <div className="report-main">

                          <div
                            className={`report-severity ${report.severity.toLowerCase()}`}
                          >
                            <span></span>
                            {report.severity}
                          </div>

                          <h3>
                            {report.hazardType}
                          </h3>

                          <p>
                            {report.description}
                          </p>

                        </div>

                        <div className="report-location">

                          <span>
                            LOCATION
                          </span>

                          <strong>
                            📍{" "}
                            {report.location ||
                              "Reported location"}
                          </strong>

                          <small>
                            {Number(
                              report.latitude
                            ).toFixed(4)}
                            ° N&nbsp;&nbsp;
                            {Number(
                              report.longitude
                            ).toFixed(4)}
                            ° E
                          </small>

                        </div>

                        <div className="report-status-block">

                          <span>
                            STATUS
                          </span>

                          <strong
                            className={
                              status ===
                              "Resolved"
                                ? "resolved"
                                : status ===
                                    "Under Review"
                                  ? "review"
                                  : "active"
                            }
                          >
                            {status}
                          </strong>

                          <small>
                            {formatTime(
                              report.timestamp
                            )}
                          </small>

                        </div>

                        <button
                          className="report-map-button"
                          onClick={() => {
                            if (
                              mapRef.current
                            ) {
                              mapRef.current.flyTo(
                                {
                                  center: [
                                    Number(
                                      report.longitude
                                    ),
                                    Number(
                                      report.latitude
                                    ),
                                  ],
                                  zoom: 11,
                                  essential: true,
                                }
                              );
                            }

                            scrollToMap();
                          }}
                        >
                          VIEW
                          <span>↗</span>
                        </button>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

        </section>

        {/* =====================================================
            AWS ARCHITECTURE
        ===================================================== */}

        <section className="architecture-section">

          <div className="architecture-heading">

            <div>
              <span className="section-number">
                04 / CLOUD ARCHITECTURE
              </span>

              <h2>
                Built on
                <span> AWS.</span>
              </h2>

              <p>
                Wave Watch uses managed AWS cloud
                services for application hosting,
                APIs, storage, intelligence and
                monitoring.
              </p>
            </div>

            <div className="architecture-badge">
              AWS CLOUD
              <strong>
                11 SERVICES
              </strong>
            </div>

          </div>

          <div className="architecture-flow">

            <div className="arch-node">
              <span>01</span>
              <strong>AMPLIFY</strong>
              <small>
                Frontend Hosting
              </small>
            </div>

            <div className="flow-arrow">
              →
            </div>

            <div className="arch-node">
              <span>02</span>
              <strong>API GATEWAY</strong>
              <small>
                REST API
              </small>
            </div>

            <div className="flow-arrow">
              →
            </div>

            <div className="arch-node">
              <span>03</span>
              <strong>LAMBDA</strong>
              <small>
                Serverless Logic
              </small>
            </div>

            <div className="flow-arrow">
              →
            </div>

            <div className="arch-node">
              <span>04</span>
              <strong>DYNAMODB</strong>
              <small>
                Hazard Database
              </small>
            </div>

          </div>

          <div className="service-grid">

            <div>
              <strong>S3</strong>
              <span>
                Photo Evidence
              </span>
            </div>

            <div>
              <strong>LOCATION</strong>
              <span>
                Maps & Geocoding
              </span>
            </div>

            <div>
              <strong>EVENTBRIDGE</strong>
              <span>
                Event Automation
              </span>
            </div>

            <div>
              <strong>COMPREHEND</strong>
              <span>
                Text Intelligence
              </span>
            </div>

            <div>
              <strong>CLOUDWATCH</strong>
              <span>
                Monitoring
              </span>
            </div>

            <div>
              <strong>CODEBUILD</strong>
              <span>
                CI Build
              </span>
            </div>

            <div>
              <strong>CODEPIPELINE</strong>
              <span>
                CI/CD Automation
              </span>
            </div>

          </div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>

        <div className="footer-brand">
          <span>WAVE WATCH</span>
          <small>
            COASTAL INTELLIGENCE PLATFORM
          </small>
        </div>

        <div className="footer-center">
          AWS CLOUD INFRASTRUCTURE
          <span>•</span>
          INDIA
        </div>

        <div className="footer-right">
          SYSTEM STATUS
          <span>● OPERATIONAL</span>
        </div>

      </footer>

      {/* =====================================================
          REPORT MODAL
      ===================================================== */}

      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowModal(false);
            }
          }}
        >

          <div className="report-modal">

            <div className="modal-header">

              <div>
                <span>
                  NEW INCIDENT
                </span>

                <h2>
                  Report a coastal hazard
                </h2>

                <p>
                  Submit a verified location and
                  observation to the Wave Watch
                  monitoring network.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>

            </div>

            <div className="workflow">

              <div className="workflow-step active">
                <span>01</span>
                LOCATION
              </div>

              <div className="workflow-line"></div>

              <div className="workflow-step">
                <span>02</span>
                EVIDENCE
              </div>

              <div className="workflow-line"></div>

              <div className="workflow-step">
                <span>03</span>
                CLOUD
              </div>

            </div>

            <div className="form-grid">

              <div className="form-field full">

                <label>
                  HAZARD TYPE
                </label>

                <select
                  value={hazardType}
                  onChange={(event) =>
                    setHazardType(
                      event.target.value
                    )
                  }
                >
                  {HAZARD_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>

              </div>

              <div className="form-field full">

                <label>
                  LOCATION
                  <span>
                    AMAZON LOCATION SERVICE
                  </span>
                </label>

                <input
                  value={location}
                  onChange={(event) =>
                    setLocation(
                      event.target.value
                    )
                  }
                  placeholder="Example: Marina Beach, Chennai"
                />

              </div>

              <div className="form-field full">

                <label>
                  OBSERVATION
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Describe what you observed..."
                  rows={5}
                />

              </div>

              <div className="form-field full">

                <label>
                  PHOTO EVIDENCE
                  <span>
                    OPTIONAL / MAX 10 MB
                  </span>
                </label>

                <label className="file-drop">

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0] ||
                        null;

                      setPhotoFile(file);
                    }}
                  />

                  <div className="upload-icon">
                    ↑
                  </div>

                  <div>
                    <strong>
                      {photoFile
                        ? photoFile.name
                        : "Upload evidence photo"}
                    </strong>

                    <span>
                      Stored securely in Amazon S3
                    </span>
                  </div>

                </label>

              </div>

            </div>

            <div className="modal-security">

              <div>
                <span className="security-icon">
                  ✓
                </span>

                <div>
                  <strong>
                    Secure cloud submission
                  </strong>

                  <small>
                    Location → S3 → API Gateway
                    → Lambda → DynamoDB
                  </small>
                </div>
              </div>

              <span>
                AWS
              </span>

            </div>

            <div className="modal-actions">

              <button
                className="cancel-button"
                onClick={() =>
                  setShowModal(false)
                }
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                className="submit-button"
                onClick={submitReport}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="button-spinner"></span>
                    PROCESSING...
                  </>
                ) : (
                  <>
                    SUBMIT REPORT
                    <span>→</span>
                  </>
                )}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default App;
