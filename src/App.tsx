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

  const [backendReports, setBackendReports] = useState<BackendReport[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // =========================================================
  // INITIALIZE AMAZON LOCATION MAP
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const initializeMap = () => {
      if (cancelled) return;

      const maplibregl = (window as any).maplibregl;
      const container = mapContainerRef.current;

      if (!container || !LOCATION_API_KEY || !maplibregl) {
        return;
      }

      // Prevent duplicate map instances.
      if (mapRef.current) {
        requestAnimationFrame(() => {
          mapRef.current?.resize();
        });
        return;
      }

      const styleUrl =
        `https://maps.geo.${AWS_REGION}.amazonaws.com/v2/styles/` +
        `${MAP_STYLE}/descriptor?key=${encodeURIComponent(
          LOCATION_API_KEY
        )}`;

      const map = new maplibregl.Map({
        container,
        style: styleUrl,
        center: [78.9629, 20.5937],
        zoom: 4.5,
        attributionControl: true,
      });

      map.addControl(
        new maplibregl.NavigationControl(),
        "top-right"
      );

      map.on("load", () => {
        if (cancelled) return;

        setMapReady(true);

        // Important: force MapLibre to recalculate the container size.
        requestAnimationFrame(() => {
          map.resize();

          setTimeout(() => {
            map.resize();
          }, 250);
        });
      });

      map.on("error", (event: any) => {
        console.error("Amazon Location map error:", event);
      });

      mapRef.current = map;
    };

    // Wait until the DOM has painted and the map container has dimensions.
    const frame = requestAnimationFrame(() => {
      initializeMap();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      setMapReady(false);
    };
  }, [LOCATION_API_KEY]);

  // =========================================================
  // KEEP MAP SIZE CORRECT
  // =========================================================

  useEffect(() => {
    if (!mapRef.current) return;

    const resizeMap = () => {
      requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
    };

    resizeMap();

    const timer1 = window.setTimeout(resizeMap, 100);
    const timer2 = window.setTimeout(resizeMap, 400);
    const timer3 = window.setTimeout(resizeMap, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isMapExpanded]);

  // =========================================================
  // RESIZE WHEN WINDOW CHANGES
  // =========================================================

  useEffect(() => {
    const handleResize = () => {
      mapRef.current?.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // =========================================================
  // DISPLAY BACKEND HAZARDS ON MAP
  // =========================================================

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const maplibregl = (window as any).maplibregl;

    if (!maplibregl) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    backendReports.forEach((report) => {
      const latitude = Number(report.latitude);
      const longitude = Number(report.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return;
      }

      const color =
        report.severity === "HIGH"
          ? "#ef4444"
          : report.severity === "MEDIUM"
            ? "#f59e0b"
            : "#22c55e";

      const marker = new maplibregl.Marker({
        color,
      })
        .setLngLat([longitude, latitude])
        .setPopup(
          new maplibregl.Popup({
            offset: 25,
            closeButton: true,
          }).setHTML(`
            <div style="
              font-family: Arial, sans-serif;
              min-width: 180px;
              color: #111827;
            ">
              <strong style="font-size:14px;">
                ${report.hazardType}
              </strong>

              <br/>

              <span style="font-size:12px;">
                📍 ${report.location || "Reported location"}
              </span>

              <br/>

              <span style="font-size:12px;">
                Severity: ${report.severity}
              </span>

              <br/>

              <span style="font-size:12px;">
                ${report.description}
              </span>
            </div>
          `)
        )
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });

    mapRef.current.resize();
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

      const sortedReports = (data.reports || []).sort(
        (a: BackendReport, b: BackendReport) => {
          return (
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
          );
        }
      );

      setBackendReports(sortedReports);
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
  // UPLOAD PHOTO TO S3
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
      // 1. Find location
      const place = await searchLocation(
        location.trim()
      );

      console.log("Found location:", place);

      // 2. Move map
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

      // 3. Upload photo
      let photoKey = "";

      if (photoFile) {
        if (!photoFile.type.startsWith("image/")) {
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
          await uploadPhotoToS3(photoFile);
      }

      // 4. Submit to API
      const response = await fetch(
        "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hazardType,
            description,
            location:
              place.locationName,
            latitude: place.latitude,
            longitude: place.longitude,
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

      console.log("AWS Response:", data);

      // 5. Refresh reports
      await fetchReports();

      // 6. Success
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
  // DASHBOARD COUNTS
  // =========================================================

  const activeHazards =
    backendReports.filter(
      (r) =>
        r.status !== "PENDING" &&
        r.status !== "RESOLVED"
    ).length;

  const underReview =
    backendReports.filter(
      (r) => r.status === "PENDING"
    ).length;

  const resolved =
    backendReports.filter(
      (r) => r.status === "RESOLVED"
    ).length;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* NAVBAR */}

      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">
            🌊
          </span>

          <div>
            <h2>WAVE WATCH</h2>
            <span>
              Coastal Safety Platform
            </span>
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
            Wave Watch helps communities report,
            monitor and manage coastal hazards
            using real-time AWS cloud technology.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-button"
              onClick={() =>
                setShowModal(true)
              }
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

            <div className="location-pin">
              📍
            </div>
          </div>

          <div className="floating-card">

            <span className="small-label">
              ACTIVE ALERT
            </span>

            <strong>
              High Wave Activity
            </strong>

            <span>
              📍 Marina Beach
            </span>

          </div>

        </div>

      </section>

      {/* STATISTICS */}

      <section className="stats">

        <div className="stat-card">
          <div className="stat-icon red">
            🚨
          </div>

          <div>
            <span>Active Hazards</span>
            <strong>
              {activeHazards}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            ⚠️
          </div>

          <div>
            <span>Under Review</span>
            <strong>
              {underReview}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            ✓
          </div>

          <div>
            <span>Resolved</span>
            <strong>
              {resolved}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            👥
          </div>

          <div>
            <span>Citizen Reports</span>
            <strong>
              {backendReports.length}
            </strong>
          </div>
        </div>

      </section>

      {/* MONITORING */}

      <section className="monitoring">

        <div className="section-heading">

          <div>
            <span className="section-tag">
              LIVE MONITORING
            </span>

            <h2>
              Coastal Hazard Overview
            </h2>

            <p>
              Monitor reported hazards across
              coastal regions.
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
              isMapExpanded
                ? "expanded"
                : ""
            }`}
          >

            <div className="map-header">

              <div>
                <h3>
                  Hazard Map
                </h3>

                <span>
                  India-wide real-time coastal
                  activity
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
                  ? "Close Map ✕"
                  : "Full Map ↗"}
              </button>

            </div>

            <div className="real-map">

              <div
                ref={mapContainerRef}
                className="map-container"
              />

              {!LOCATION_API_KEY && (
                <div className="map-error">
                  Amazon Location API key is
                  not configured.
                </div>
              )}

              {LOCATION_API_KEY &&
                !mapReady && (
                  <div className="map-loading">
                    <div className="loading-spinner"></div>
                    <span>
                      Loading live map...
                    </span>
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

                <h3>
                  Current Alerts
                </h3>
              </div>

              <span className="alert-count">
                {backendReports.length}
              </span>

            </div>

            {backendReports.length === 0 ? (

              <div className="empty-alerts">
                <span>✓</span>
                <p>
                  No active citizen reports.
                </p>
              </div>

            ) : (

              backendReports
                .slice(0, 5)
                .map((report) => (

                  <div
                    className={`alert-item ${
                      report.severity.toLowerCase()
                    }`}
                    key={report.reportId}
                  >

                    <div className="alert-icon">
                      {report.hazardType
                        .toLowerCase()
                        .includes("wave")
                        ? "🌊"
                        : report.hazardType
                            .toLowerCase()
                            .includes("wind")
                          ? "💨"
                          : "⚠️"}
                    </div>

                    <div>

                      <strong>
                        {report.hazardType}
                      </strong>

                      <span>
                        {report.location ||
                          "Reported location"}
                      </span>

                      <small>
                        {new Date(
                          report.timestamp
                        ).toLocaleString()}
                      </small>

                    </div>

                  </div>

                ))

            )}

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

            <h2>
              Recent Hazard Reports
            </h2>

            <p>
              Latest observations submitted by
              the community.
            </p>
          </div>

          <button
            className="primary-button small"
            onClick={() =>
              setShowModal(true)
            }
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

          {backendReports.length === 0 ? (

            <div className="empty-reports">
              No hazard reports available yet.
            </div>

          ) : (

            backendReports.map((report) => {

              const severity =
                report.severity === "HIGH"
                  ? "High"
                  : report.severity === "LOW"
                    ? "Low"
                    : "Medium";

              const status =
                report.status === "PENDING"
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
                  key={report.reportId}
                >

                  <div className="hazard-name">

                    <div className="report-icon">
                      ⚠️
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
                      .replace(" ", "-")}`}
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

      {/* AWS ARCHITECTURE */}

      <section className="aws-section">

        <div className="section-heading center">

          <span className="section-tag">
            CLOUD INFRASTRUCTURE
          </span>

          <h2>
            Powered by AWS
          </h2>

          <p>
            Built with scalable AWS services for
            reliable coastal hazard monitoring.
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

            <div className="modal-icon">
              🚨
            </div>

            <h2>
              Report a Coastal Hazard
            </h2>

            <p>
              Help keep coastal communities safe
              by reporting what you observe.
            </p>

            <label>
              Hazard Type
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

            <label>
              Location
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

            <label>
              Description
            </label>

            <textarea
              placeholder="Describe the hazard..."
              rows={4}
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
            />

            <label>
              Photo Evidence{" "}
              <span className="optional">
                (optional)
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
              <div className="selected-photo">
                📷 Selected:{" "}
                {photoFile.name}
              </div>
            )}

            <button
              className="primary-button submit"
              onClick={submitReport}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? photoFile
                  ? "Finding location & uploading..."
                  : "Finding location & submitting..."
                : "Submit Report"}
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;
