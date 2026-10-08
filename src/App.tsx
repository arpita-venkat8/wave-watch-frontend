```tsx
import { useEffect, useRef, useState } from "react";
import "./App.css";

type Severity = "HIGH" | "MEDIUM" | "LOW";

interface BackendReport {
  reportId: string;
  hazardType: string;
  description: string;
  location?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  severity: Severity;
  status: string;
}

interface ResolvedPlace {
  locationName: string;
  addressLabel: string;
  latitude: number;
  longitude: number;
}

const API_URL =
  "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports";

const AWS_REGION = "ap-southeast-2";
const MAP_STYLE = "Standard";

function App() {
  const [showModal, setShowModal] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const [hazardType, setHazardType] = useState("High Waves");
  const [customHazardType, setCustomHazardType] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [resolvedPlace, setResolvedPlace] =
    useState<ResolvedPlace | null>(null);

  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [backendReports, setBackendReports] = useState<BackendReport[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const locationPreviewMarkerRef = useRef<any>(null);

  const LOCATION_API_KEY =
    (import.meta.env.VITE_LOCATION_API_KEY as string | undefined)?.trim() || "";

  // ============================================================
  // MAP INITIALIZATION
  // ============================================================

  useEffect(() => {
    const maplibregl = (window as any).maplibregl;

    if (!mapContainerRef.current) {
      return;
    }

    if (!LOCATION_API_KEY) {
      console.error("VITE_LOCATION_API_KEY is missing.");
      return;
    }

    if (!maplibregl) {
      console.error(
        "MapLibre GL was not found. Make sure MapLibre is loaded in index.html."
      );
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

    map.on("error", (event: any) => {
      console.error("Map error:", event);
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

  // ============================================================
  // RESIZE MAP
  // ============================================================

  useEffect(() => {
    if (!mapRef.current) return;

    const timer = window.setTimeout(() => {
      mapRef.current?.resize();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [isMapExpanded]);

  // ============================================================
  // ESCAPE HTML FOR POPUPS
  // ============================================================

  const escapeHtml = (value: unknown) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // ============================================================
  // DISPLAY REPORT MARKERS
  // ============================================================

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

      const markerColor =
        report.severity === "HIGH"
          ? "#ef4444"
          : report.severity === "MEDIUM"
            ? "#f59e0b"
            : "#22c55e";

      const popupHtml = `
        <div style="min-width:180px">
          <strong>${escapeHtml(report.hazardType)}</strong>
          <br />
          📍 ${escapeHtml(
            report.location || "Reported location"
          )}
          <br />
          Severity: ${escapeHtml(report.severity)}
          <br />
          ${escapeHtml(report.description)}
        </div>
      `;

      const marker = new maplibregl.Marker({
        color: markerColor,
      })
        .setLngLat([longitude, latitude])
        .setPopup(
          new maplibregl.Popup({
            offset: 25,
          }).setHTML(popupHtml)
        )
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [backendReports, mapReady]);

  // ============================================================
  // FETCH REPORTS
  // ============================================================

  const fetchReports = async () => {
    try {
      const response = await fetch(API_URL);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to fetch hazard reports."
        );
      }

      const reports: BackendReport[] = Array.isArray(data?.reports)
        ? data.reports
        : [];

      const validReports = reports.filter(
        (report) =>
          report &&
          Number.isFinite(Number(report.latitude)) &&
          Number.isFinite(Number(report.longitude))
      );

      const sortedReports = [...validReports].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      );

      setBackendReports(sortedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setBackendReports([]);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ============================================================
  // SCROLL TO MAP
  // ============================================================

  const scrollToMap = () => {
    document
      .getElementById("hazard-map")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  };

  // ============================================================
  // SEARCH LOCATION USING AMAZON LOCATION SERVICE
  // ============================================================

  const searchLocation = async (
    searchText: string
  ): Promise<ResolvedPlace> => {
    if (!LOCATION_API_KEY) {
      throw new Error(
        "Amazon Location API key is not configured."
      );
    }

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

        // Center of India
        BiasPosition: [78.9629, 20.5937],

        // Restrict search to India
        Filter: {
          IncludeCountries: ["IND"],
        },

        IntendedUse: "SingleUse",
      }),
    });

    const data = await response.json();

    console.log("Amazon Location response:", data);

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          "Location search failed."
      );
    }

    if (
      !data?.ResultItems ||
      !Array.isArray(data.ResultItems) ||
      data.ResultItems.length === 0
    ) {
      throw new Error(
        `Could not find "${searchText}" in India. Please enter a valid Indian location.`
      );
    }

    const result = data.ResultItems[0];

    if (
      !result?.Position ||
      !Array.isArray(result.Position) ||
      result.Position.length !== 2
    ) {
      throw new Error(
        "Location coordinates were not found."
      );
    }

    const longitude = Number(result.Position[0]);
    const latitude = Number(result.Position[1]);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      throw new Error(
        "Invalid coordinates returned by Amazon Location Service."
      );
    }

    const addressLabel =
      result?.Address?.Label ||
      result?.Address?.Freeform ||
      result?.Title ||
      searchText;

    return {
      locationName:
        result?.Title || searchText,
      addressLabel,
      latitude,
      longitude,
    };
  };

  // ============================================================
  // RESOLVE LOCATION
  // ============================================================

  const resolveLocation = async () => {
    const searchText = location.trim();

    if (!searchText) {
      alert("Please enter an address or location first.");
      return;
    }

    setIsResolvingLocation(true);

    try {
      const place = await searchLocation(searchText);

      setResolvedPlace(place);

      const map = mapRef.current;
      const maplibregl = (window as any).maplibregl;

      if (map) {
        map.flyTo({
          center: [place.longitude, place.latitude],
          zoom: 13,
          essential: true,
        });

        if (maplibregl) {
          if (locationPreviewMarkerRef.current) {
            locationPreviewMarkerRef.current.remove();
          }

          locationPreviewMarkerRef.current =
            new maplibregl.Marker({
              color: "#38bdf8",
            })
              .setLngLat([
                place.longitude,
                place.latitude,
              ])
              .setPopup(
                new maplibregl.Popup({
                  offset: 25,
                }).setHTML(`
                  <strong>Selected Location</strong>
                  <br />
                  ${escapeHtml(place.addressLabel)}
                `)
              )
              .addTo(map);
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

  // ============================================================
  // UPLOAD PHOTO TO S3
  // ============================================================

  const uploadPhotoToS3 = async (file: File) => {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "upload-url",
        fileName: file.name,
        contentType: file.type || "image/jpeg",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Could not generate photo upload URL."
      );
    }

    if (!data?.uploadUrl) {
      throw new Error(
        "Upload URL was not returned by the server."
      );
    }

    const uploadResponse = await fetch(
      data.uploadUrl,
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

    return data.photoKey || "";
  };

  // ============================================================
  // SUBMIT REPORT
  // ============================================================

  const submitReport = async () => {
    const trimmedLocation = location.trim();
    const trimmedDescription = description.trim();

    if (!trimmedLocation) {
      alert("Please enter the location.");
      return;
    }

    if (!trimmedDescription) {
      alert("Please enter a description.");
      return;
    }

    if (
      hazardType === "Other" &&
      !customHazardType.trim()
    ) {
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
      // --------------------------------------------------------
      // 1. RESOLVE LOCATION
      // --------------------------------------------------------

      const place =
        resolvedPlace ||
        (await searchLocation(trimmedLocation));

      // --------------------------------------------------------
      // 2. MOVE MAP
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // 3. UPLOAD PHOTO
      // --------------------------------------------------------

      let photoKey = "";

      if (photoFile) {
        if (!photoFile.type.startsWith("image/")) {
          throw new Error(
            "Please select a valid image file."
          );
        }

        if (photoFile.size > 10 * 1024 * 1024) {
          throw new Error(
            "Photo must be smaller than 10 MB."
          );
        }

        photoKey =
          await uploadPhotoToS3(photoFile);
      }

      // --------------------------------------------------------
      // 4. SEND REPORT TO API
      // --------------------------------------------------------

      const finalHazardType =
        hazardType === "Other"
          ? customHazardType.trim()
          : hazardType;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hazardType: finalHazardType,
          description: trimmedDescription,
          location: place.locationName,
          latitude: place.latitude,
          longitude: place.longitude,
          photoKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to submit hazard report."
        );
      }

      console.log("AWS response:", data);

      // --------------------------------------------------------
      // 5. REFRESH REPORTS
      // --------------------------------------------------------

      await fetchReports();

      // --------------------------------------------------------
      // 6. SUCCESS
      // --------------------------------------------------------

      alert(
        `🚨 Hazard reported successfully at ${place.locationName}!`
      );

      // Reset form
      setHazardType("High Waves");
      setCustomHazardType("");
      setLocation("");
      setResolvedPlace(null);
      setDescription("");
      setPhotoFile(null);

      if (locationPreviewMarkerRef.current) {
        locationPreviewMarkerRef.current.remove();
        locationPreviewMarkerRef.current = null;
      }

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

  // ============================================================
  // UI
  // ============================================================

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
            Wave Watch helps communities report,
            monitor and manage coastal hazards
            using real-time AWS cloud technology.
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

            <strong>High Wave Activity</strong>

            <span>📍 Marina Beach</span>
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
              {
                backendReports.filter(
                  (r) => r.status !== "RESOLVED"
                ).length
              }
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
              {
                backendReports.filter(
                  (r) =>
                    r.status === "PENDING"
                ).length
              }
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
              {
                backendReports.filter(
                  (r) =>
                    r.status === "RESOLVED"
                ).length
              }
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

            <h2>Coastal Hazard Overview</h2>

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
              isMapExpanded ? "expanded" : ""
            }`}
          >
            <div className="map-header">
              <div>
                <h3>Hazard Map</h3>

                <span>
                  India-wide real-time coastal
                  activity
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
                  Amazon Location API key
                  is not configured.
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

              <span className="alert-count">
                {
                  backendReports.filter(
                    (r) => r.status !== "RESOLVED"
                  ).length
                }
              </span>
            </div>

            {backendReports
              .filter(
                (report) =>
                  report.status !== "RESOLVED"
              )
              .slice(0, 3)
              .map((report) => (
                <div
                  className={`alert-item ${report.severity.toLowerCase()}`}
                  key={report.reportId}
                >
                  <div className="alert-icon">
                    {report.severity === "HIGH"
                      ? "🌊"
                      : report.severity === "MEDIUM"
                        ? "🌧️"
                        : "💨"}
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
                      {report.timestamp
                        ? new Date(
                            report.timestamp
                          ).toLocaleString()
                        : "Recently"}
                    </small>
                  </div>
                </div>
              ))}

            {backendReports.filter(
              (r) => r.status !== "RESOLVED"
            ).length === 0 && (
              <div
                style={{
                  padding: "30px 10px",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                No active alerts.
              </div>
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

            <h2>Recent Hazard Reports</h2>

            <p>
              Latest observations submitted by
              the community.
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

      {/* AWS ARCHITECTURE */}
      <section className="aws-section">

        <div className="section-heading center">
          <span className="section-tag">
            CLOUD INFRASTRUCTURE
          </span>

          <h2>Powered by AWS</h2>

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
          onClick={() => {
            if (!isSubmitting) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="close-button"
              onClick={() => {
                if (!isSubmitting) {
                  setShowModal(false);
                }
              }}
              disabled={isSubmitting}
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

            {/* HAZARD TYPE */}
            <label>Hazard Type</label>

            <select
              value={hazardType}
              onChange={(event) => {
                const value =
                  event.target.value;

                setHazardType(value);

                if (value !== "Other") {
                  setCustomHazardType("");
                }
              }}
              disabled={isSubmitting}
            >
              <option>High Waves</option>
              <option>Coastal Flooding</option>
              <option>Beach Erosion</option>
              <option>Strong Winds</option>
              <option>Other</option>
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
                  onChange={(event) =>
                    setCustomHazardType(
                      event.target.value
                    )
                  }
                  disabled={isSubmitting}
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
                onChange={(event) => {
                  setLocation(event.target.value);
                  setResolvedPlace(null);
                }}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              />

              <button
                type="button"
                className="secondary-button"
                onClick={resolveLocation}
                disabled={
                  isResolvingLocation ||
                  isSubmitting
                }
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
                  border:
                    "1px solid rgba(56, 189, 248, 0.35)",
                  borderRadius: "10px",
                  background:
                    "rgba(14, 165, 233, 0.08)",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                <strong
                  style={{
                    color: "#38bdf8",
                  }}
                >
                  ✓ Location Resolved
                </strong>

                <br />

                <strong>
                  {resolvedPlace.locationName}
                </strong>

                <br />

                {resolvedPlace.addressLabel}

                <br />

                <span
                  style={{ opacity: 0.75 }}
                >
                  Coordinates:{" "}
                  {resolvedPlace.latitude.toFixed(
                    5
                  )}
                  ,{" "}
                  {resolvedPlace.longitude.toFixed(
                    5
                  )}
                </span>
              </div>
            )}

            {/* DESCRIPTION */}
            <label>Description *</label>

            <textarea
              placeholder="Describe the hazard..."
              rows={4}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              disabled={isSubmitting}
            />

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
              onChange={(event) => {
                setPhotoFile(
                  event.target.files?.[0] ||
                    null
                );
              }}
              disabled={isSubmitting}
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
                📷 Selected:{" "}
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
```

### After pasting

1. Save `App.tsx`.
2. Make sure your `.env` contains:
```env
VITE_LOCATION_API_KEY=YOUR_AWS_LOCATION_API_KEY
```
3. Restart the Vite server:
```bash
npm run dev
```
4. Open the Wave Watch website.
5. Test **Report a Hazard → enter location → Resolve → Submit Report**.

One important point: **don't change your API URL or AWS region** unless your AWS resources actually use different values. Your current code is configured for `ap-southeast-2` and the API endpoint shown in the uploaded file.
