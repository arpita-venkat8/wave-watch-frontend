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
  const locationPreviewMarkerRef = useRef<any>(null);

  const LOCATION_API_KEY =
    import.meta.env.VITE_LOCATION_API_KEY as string;

  const AWS_REGION = "ap-southeast-2";
  const MAP_STYLE = "Standard";

  // =========================================================
  // REPORT FORM STATES
  // =========================================================

  const [hazardType, setHazardType] = useState("High Waves");
  const [customHazardType, setCustomHazardType] = useState("");
  const [location, setLocation] = useState("");
  const [resolvedPlace, setResolvedPlace] = useState<{
    locationName: string;
    addressLabel: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
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

      // India-wide initial view
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

      if (locationPreviewMarkerRef.current) {
        locationPreviewMarkerRef.current.remove();
        locationPreviewMarkerRef.current = null;
      }

      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [LOCATION_API_KEY]);

  // =========================================================
  // RESIZE MAP WHEN EXPANDED
  // =========================================================

  useEffect(() => {
    if (!mapRef.current) return;

    const frame = requestAnimationFrame(() => {
      mapRef.current.resize();
    });

    return () => cancelAnimationFrame(frame);
  }, [isMapExpanded]);

  // =========================================================
  // DISPLAY ALL BACKEND HAZARDS ON MAP
  // =========================================================

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const maplibregl = (window as any).maplibregl;

    if (!maplibregl) return;

    // Remove previous markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add backend reports
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
  // FETCH REPORTS FROM API
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

  // Load reports when application starts
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

        // Amazon Location SearchText requires exactly one
        // of BiasPosition, Filter.BoundingBox, or Filter.Circle.
        // This biases the search toward the center of India.
        BiasPosition: [78.9629, 20.5937],

        // Search only within India
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

    const addressLabel =
      result.Address?.Label ||
      result.Address?.Freeform ||
      result.Title ||
      searchText;

    return {
      locationName: result.Title || searchText,
      addressLabel,

      // AWS returns [longitude, latitude]
      longitude: Number(result.Position[0]),
      latitude: Number(result.Position[1]),
    };
  };

  // =========================================================
  // RESOLVE LOCATION PREVIEW
  // =========================================================

  const resolveLocation = async () => {
    if (!location.trim()) {
      alert("Please enter an address or location first.");
      return;
    }

    if (!LOCATION_API_KEY) {
      alert("Amazon Location API key is not configured.");
      return;
    }

    setIsResolvingLocation(true);

    try {
      const place = await searchLocation(location.trim());

      setResolvedPlace({
        locationName: place.locationName,
        addressLabel: place.addressLabel,
        latitude: place.latitude,
        longitude: place.longitude,
      });

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [place.longitude, place.latitude],
          zoom: 13,
          essential: true,
        });

        const maplibregl = (window as any).maplibregl;

        if (maplibregl) {
          if (locationPreviewMarkerRef.current) {
            locationPreviewMarkerRef.current.remove();
          }

          locationPreviewMarkerRef.current = new maplibregl.Marker({
            color: "#38bdf8",
          })
            .setLngLat([place.longitude, place.latitude])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(`
                <strong>Selected Location</strong>
                <br/>
                ${place.addressLabel}
              `)
            )
            .addTo(mapRef.current);
        }
      }
    } catch (error) {
      console.error("Location resolution error:", error);
      setResolvedPlace(null);
      alert(
        error instanceof Error
          ? error.message
          : "Could not resolve this location."
      );
    } finally {
      setIsResolvingLocation(false);
    }
  };

  // =========================================================
  // UPLOAD PHOTO TO S3 USING A PRESIGNED URL
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
        urlData.error || "Could not generate photo upload URL."
      );
    }

    const uploadResponse = await fetch(urlData.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "image/jpeg",
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Photo upload failed. Please try again.");
    }

    return urlData.photoKey as string;
  };

  // =========================================================
  // SUBMIT HAZARD REPORT
  // =========================================================

  const submitReport = async () => {
    if (!location.trim() || !description.trim()) {
      alert(
        "Please enter the location and description."
      );
      return;
    }

    if (hazardType === "Other" && !customHazardType.trim()) {
      alert("Please specify the hazard type.");
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
      // -----------------------------------------------------
      // STEP 1: USE RESOLVED LOCATION OR FIND IT
      // -----------------------------------------------------

      const place = resolvedPlace ||
        (await searchLocation(location.trim()));

      console.log("Found location:", place);

      // -----------------------------------------------------
      // STEP 2: MOVE MAP TO SEARCHED LOCATION
      // -----------------------------------------------------

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

      // -----------------------------------------------------
      // STEP 3: UPLOAD PHOTO TO S3 (IF SELECTED)
      // -----------------------------------------------------

      let photoKey = "";

      if (photoFile) {
        if (!photoFile.type.startsWith("image/")) {
          throw new Error("Please select an image file.");
        }

        if (photoFile.size > 10 * 1024 * 1024) {
          throw new Error("Photo must be smaller than 10 MB.");
        }

        photoKey = await uploadPhotoToS3(photoFile);
      }

      // -----------------------------------------------------
      // STEP 4: SEND REAL COORDINATES + PHOTO KEY TO API
      // -----------------------------------------------------

      const response = await fetch(
        "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            hazardType:
              hazardType === "Other"
                ? customHazardType.trim()
                : hazardType,
            description: description,

            // Real location name
            location: place.locationName,

            // Real coordinates
            latitude: place.latitude,
            longitude: place.longitude,

            // S3 photo object key
            photoKey: photoKey,
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

      // -----------------------------------------------------
      // STEP 5: REFRESH REPORTS
      // -----------------------------------------------------

      await fetchReports();

      // -----------------------------------------------------
      // STEP 6: SUCCESS
      // -----------------------------------------------------

      alert(
        `🚨 Hazard reported successfully at ${place.locationName}!`
      );

      // Clear form
      setHazardType("High Waves");
      setCustomHazardType("");
      setLocation("");
      setResolvedPlace(null);
      if (locationPreviewMarkerRef.current) {
        locationPreviewMarkerRef.current.remove();
        locationPreviewMarkerRef.current = null;
      }
      setDescription("");
      setPhotoFile(null);

      // Close modal
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
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

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

      {/* =====================================================
          HERO
      ===================================================== */}

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
            Wave Watch helps communities report, monitor
            and manage coastal hazards using real-time
            AWS cloud technology.
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

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <section className="stats">

        <div className="stat-card">

          <div className="stat-icon red">
            🚨
          </div>

          <div>
            <span>Active Hazards</span>
            <strong>12</strong>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon orange">
            ⚠️
          </div>

          <div>
            <span>Under Review</span>
            <strong>7</strong>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon green">
            ✓
          </div>

          <div>
            <span>Resolved</span>
            <strong>34</strong>
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

      {/* =====================================================
          MONITORING
      ===================================================== */}

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
              Monitor reported hazards across coastal
              regions.
            </p>

          </div>

          <div className="live-status">
            <span></span>
            LIVE
          </div>

        </div>

        <div className="monitor-grid">

          {/* =================================================
              MAP
          ================================================= */}

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
                  India-wide real-time coastal activity
                </span>

              </div>

              <button
                className="map-button"
                onClick={() =>
                  setIsMapExpanded(
                    (current) => !current
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
                    background:
                      "rgba(6, 17, 31, 0.88)",
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

          {/* =================================================
              ALERT PANEL
          ================================================= */}

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
                3
              </span>

            </div>

            <div className="alert-item high">

              <div className="alert-icon">
                🌊
              </div>

              <div>

                <strong>
                  High Wave Activity
                </strong>

                <span>
                  Marina Beach
                </span>

                <small>
                  8 minutes ago
                </small>

              </div>

            </div>

            <div className="alert-item medium">

              <div className="alert-icon">
                🌧️
              </div>

              <div>

                <strong>
                  Coastal Flooding
                </strong>

                <span>
                  Besant Nagar
                </span>

                <small>
                  24 minutes ago
                </small>

              </div>

            </div>

            <div className="alert-item low">

              <div className="alert-icon">
                💨
              </div>

              <div>

                <strong>
                  Strong Winds
                </strong>

                <span>
                  Kovalam
                </span>

                <small>
                  41 minutes ago
                </small>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          RECENT REPORTS
      ===================================================== */}

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
              Latest observations submitted by the community.
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

            <div
              className="report-row"
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "30px",
                color: "#94a3b8",
              }}
            >
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
                    : report.status === "RESOLVED"
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

      {/* =====================================================
          AWS ARCHITECTURE
      ===================================================== */}

      <section className="aws-section">

        <div className="section-heading center">

          <span className="section-tag">
            CLOUD INFRASTRUCTURE
          </span>

          <h2>
            Powered by AWS
          </h2>

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

      {/* =====================================================
          FOOTER
      ===================================================== */}

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

            {/* HAZARD TYPE */}

            <label>
              Hazard Type
            </label>

            <select
              value={hazardType}
              onChange={(e) => {
                const value = e.target.value;
                setHazardType(value);
                if (value !== "Other") {
                  setCustomHazardType("");
                }
              }}
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

            {hazardType === "Other" && (
              <>
                <label>
                  Specify Hazard Type *
                </label>

                <input
                  type="text"
                  placeholder="e.g. Oil Spill, Tsunami, Marine Debris"
                  value={customHazardType}
                  onChange={(e) =>
                    setCustomHazardType(e.target.value)
                  }
                />
              </>
            )}

            {/* LOCATION */}

            <label>
              LOCATION / ADDRESS *
            </label>

            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "stretch",
              }}
            >
              <input
                type="text"
                placeholder="e.g. Marina Beach, Chennai, Tamil Nadu"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setResolvedPlace(null);
                }}
                style={{ flex: 1 }}
              />

              <button
                type="button"
                className="secondary-button"
                onClick={resolveLocation}
                disabled={isResolvingLocation}
                style={{
                  whiteSpace: "nowrap",
                  padding: "0 14px",
                }}
              >
                {isResolvingLocation
                  ? "Resolving..."
                  : "📍 Resolve"}
              </button>
            </div>

            {resolvedPlace && (
              <div
                style={{
                  marginTop: "10px",
                  marginBottom: "16px",
                  padding: "12px 14px",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  borderRadius: "10px",
                  background: "rgba(14, 165, 233, 0.08)",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "#38bdf8" }}>
                  ✓ Location Resolved
                </strong>
                <br />
                <strong>{resolvedPlace.locationName}</strong>
                <br />
                {resolvedPlace.addressLabel}
                <br />
                <span style={{ opacity: 0.75 }}>
                  Coordinates: {resolvedPlace.latitude.toFixed(5)}, {resolvedPlace.longitude.toFixed(5)}
                </span>
              </div>
            )}

            {/* DESCRIPTION */}

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
            ></textarea>

            {/* PHOTO */}

            <label>
              Photo Evidence{" "}
              <span style={{ opacity: 0.65 }}>
                (optional)
              </span>
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setPhotoFile(
                  e.target.files?.[0] || null
                )
              }
            />

            {photoFile && (
              <div
                style={{
                  marginTop: "8px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#94a3b8",
                }}
              >
                📷 Selected: {photoFile.name}
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
