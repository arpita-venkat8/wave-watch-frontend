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

  const API_URL =
    "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports";

  const [hazardType, setHazardType] = useState("High Waves");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [backendReports, setBackendReports] = useState<BackendReport[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // =========================================================
  // FETCH REPORTS FROM BACKEND
  // =========================================================

  const fetchReports = async () => {
    try {
      const response = await fetch(API_URL, {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to fetch reports."
        );
      }

      let reports: BackendReport[] = [];

      if (Array.isArray(data)) {
        reports = data;
      } else if (Array.isArray(data?.reports)) {
        reports = data.reports;
      } else if (typeof data?.body === "string") {
        try {
          const parsed = JSON.parse(data.body);

          if (Array.isArray(parsed)) {
            reports = parsed;
          } else if (Array.isArray(parsed?.reports)) {
            reports = parsed.reports;
          }
        } catch {
          reports = [];
        }
      } else if (Array.isArray(data?.body)) {
        reports = data.body;
      }

      setBackendReports(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  // =========================================================
  // INITIAL DATA LOAD
  // =========================================================

  useEffect(() => {
    fetchReports();
  }, []);

  // =========================================================
  // INITIALIZE AMAZON LOCATION MAP
  // =========================================================

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!LOCATION_API_KEY) {
      console.error(
        "VITE_LOCATION_API_KEY is missing."
      );
      return;
    }

    if (mapRef.current) return;

    const initializeMap = () => {
      if (!mapContainerRef.current) return;

      const maplibregl = (window as any).maplibregl;

      if (!maplibregl) {
        console.error(
          "MapLibre GL JS was not loaded."
        );
        return;
      }

      try {
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: `https://maps.geo.${AWS_REGION}.amazonaws.com/maps/v0/maps/${MAP_STYLE}/style-descriptor?key=${LOCATION_API_KEY}`,
          center: [78.9629, 20.5937],
          zoom: 4.5,
        });

        mapRef.current = map;

        map.addControl(
          new maplibregl.NavigationControl(),
          "top-right"
        );

        map.on("load", () => {
          setMapReady(true);
        });
      } catch (error) {
        console.error(
          "Failed to initialize map:",
          error
        );
      }
    };

    const maplibregl = (window as any).maplibregl;

    if (maplibregl) {
      initializeMap();
    } else {
      const interval = window.setInterval(() => {
        if ((window as any).maplibregl) {
          window.clearInterval(interval);
          initializeMap();
        }
      }, 100);

      return () => {
        window.clearInterval(interval);
      };
    }
  }, [LOCATION_API_KEY]);

  // =========================================================
  // ADD REPORT MARKERS TO MAP
  // =========================================================

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const maplibregl = (window as any).maplibregl;

    if (!maplibregl) return;

    // Remove old markers
    markersRef.current.forEach((marker) => {
      try {
        marker.remove();
      } catch {
        // Ignore marker cleanup errors
      }
    });

    markersRef.current = [];

    backendReports.forEach((report) => {
      if (
        typeof report.latitude !== "number" ||
        typeof report.longitude !== "number"
      ) {
        return;
      }

      const markerElement =
        document.createElement("div");

      markerElement.style.width = "18px";
      markerElement.style.height = "18px";
      markerElement.style.borderRadius = "50%";
      markerElement.style.border =
        "3px solid white";
      markerElement.style.boxShadow =
        "0 2px 10px rgba(0,0,0,0.5)";

      if (report.severity === "HIGH") {
        markerElement.style.backgroundColor =
          "#ef4444";
      } else if (
        report.severity === "MEDIUM"
      ) {
        markerElement.style.backgroundColor =
          "#f59e0b";
      } else {
        markerElement.style.backgroundColor =
          "#22c55e";
      }

      const popup = new maplibregl.Popup({
        offset: 20,
        closeButton: true,
      }).setHTML(`
        <div style="
          font-family: Arial, sans-serif;
          min-width: 220px;
          color: #111827;
        ">
          <strong style="font-size: 16px;">
            ${escapeHtml(report.hazardType)}
          </strong>

          <div style="
            margin-top: 8px;
            font-size: 13px;
          ">
            <strong>Location:</strong>
            ${escapeHtml(
              report.location || "Unknown"
            )}
          </div>

          <div style="
            margin-top: 6px;
            font-size: 13px;
          ">
            <strong>Severity:</strong>
            ${escapeHtml(report.severity)}
          </div>

          <div style="
            margin-top: 6px;
            font-size: 13px;
          ">
            <strong>Status:</strong>
            ${escapeHtml(report.status)}
          </div>

          <div style="
            margin-top: 6px;
            font-size: 13px;
          ">
            ${escapeHtml(report.description)}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({
        element: markerElement,
      })
        .setLngLat([
          report.longitude,
          report.latitude,
        ])
        .setPopup(popup)
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [backendReports, mapReady]);

  // =========================================================
  // SEARCH LOCATION
  // =========================================================

  const searchLocation = async () => {
    if (!searchText.trim()) {
      alert("Please enter a location to search.");
      return;
    }

    if (!LOCATION_API_KEY) {
      alert(
        "Amazon Location API key is missing."
      );
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://places.geo.${AWS_REGION}.amazonaws.com/v2/search-text?key=${encodeURIComponent(
          LOCATION_API_KEY
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            QueryText: searchText,
            MaxResults: 1,

            // IMPORTANT:
            // Amazon Location SearchText requires
            // exactly one of BiasPosition,
            // Filter.BoundingBox, or Filter.Circle.
            //
            // BiasPosition uses:
            // [longitude, latitude]
            //
            // This biases the search toward India.
            BiasPosition: [78.9629, 20.5937],

            // Search only within India.
            Filter: {
              IncludeCountries: ["IND"],
            },

            IntendedUse: "SingleUse",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Amazon Location error:",
          data
        );

        throw new Error(
          data?.Message ||
            data?.message ||
            "Location search failed."
        );
      }

      const places =
        data?.ResultItems || [];

      if (!places.length) {
        alert(
          "Location not found. Try another place."
        );
        return;
      }

      const place = places[0];

      const coordinates =
        place?.Position;

      if (
        !coordinates ||
        coordinates.length < 2
      ) {
        alert(
          "Location found, but coordinates were unavailable."
        );
        return;
      }

      const longitude = coordinates[0];
      const latitude = coordinates[1];

      setLocation(
        place?.Title ||
          place?.Address?.Label ||
          searchText
      );

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [
            longitude,
            latitude,
          ],
          zoom: 12,
          essential: true,
        });
      }
    } catch (error) {
      console.error(
        "Location search error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to search location."
      );
    } finally {
      setIsSearching(false);
    }
  };

  // =========================================================
  // UPLOAD PHOTO TO S3 USING PRESIGNED URL
  // =========================================================

  const uploadPhotoToS3 = async (
    file: File
  ) => {
    const urlResponse = await fetch(
      API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          action: "upload-url",
          fileName: file.name,
          contentType:
            file.type || "image/jpeg",
        }),
      }
    );

    const urlData =
      await urlResponse.json();

    if (!urlResponse.ok) {
      throw new Error(
        urlData?.error ||
          "Could not generate photo upload URL."
      );
    }

    if (!urlData?.uploadUrl) {
      throw new Error(
        "Upload URL was not returned by the server."
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

  const submitReport = async (
    event?: React.FormEvent
  ) => {
    event?.preventDefault();

    if (!hazardType.trim()) {
      alert("Please select a hazard type.");
      return;
    }

    if (!description.trim()) {
      alert(
        "Please enter a description."
      );
      return;
    }

    if (!location.trim()) {
      alert(
        "Please search and select a location."
      );
      return;
    }

    if (!LOCATION_API_KEY) {
      alert(
        "Amazon Location API key is missing."
      );
      return;
    }

    if (photoFile) {
      if (!photoFile.type.startsWith("image/")) {
        alert(
          "Please select a valid image file."
        );
        return;
      }

      if (
        photoFile.size >
        10 * 1024 * 1024
      ) {
        alert(
          "Photo must be smaller than 10 MB."
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // -----------------------------------------------------
      // FIRST: Search location to obtain coordinates
      // -----------------------------------------------------

      const locationResponse =
        await fetch(
          `https://places.geo.${AWS_REGION}.amazonaws.com/v2/search-text?key=${encodeURIComponent(
            LOCATION_API_KEY
          )}`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              QueryText: location,
              MaxResults: 1,

              // FIX:
              // SearchText requires exactly one
              // geographic field.
              BiasPosition: [
                78.9629,
                20.5937,
              ],

              Filter: {
                IncludeCountries: [
                  "IND",
                ],
              },

              IntendedUse: "SingleUse",
            }),
          }
        );

      const locationData =
        await locationResponse.json();

      if (!locationResponse.ok) {
        console.error(
          "Location error:",
          locationData
        );

        throw new Error(
          locationData?.Message ||
            locationData?.message ||
            "Unable to find the selected location."
        );
      }

      const resultItems =
        locationData?.ResultItems || [];

      if (!resultItems.length) {
        throw new Error(
          "Location not found. Please search for a valid Indian location."
        );
      }

      const selectedPlace =
        resultItems[0];

      const coordinates =
        selectedPlace?.Position;

      if (
        !coordinates ||
        coordinates.length < 2
      ) {
        throw new Error(
          "Coordinates could not be found for this location."
        );
      }

      const longitude =
        Number(coordinates[0]);

      const latitude =
        Number(coordinates[1]);

      // -----------------------------------------------------
      // SECOND: Upload photo if selected
      // -----------------------------------------------------

      let photoKey:
        | string
        | undefined;

      if (photoFile) {
        photoKey =
          await uploadPhotoToS3(
            photoFile
          );
      }

      // -----------------------------------------------------
      // THIRD: Send report to API Gateway
      // -----------------------------------------------------

      const reportResponse =
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
              selectedPlace?.Title ||
              selectedPlace?.Address
                ?.Label ||
              location,
            latitude,
            longitude,
            ...(photoKey
              ? { photoKey }
              : {}),
          }),
        });

      const reportData =
        await reportResponse.json();

      if (!reportResponse.ok) {
        throw new Error(
          reportData?.error ||
            reportData?.message ||
            "Failed to submit report."
        );
      }

      // -----------------------------------------------------
      // REFRESH REPORTS
      // -----------------------------------------------------

      await fetchReports();

      // -----------------------------------------------------
      // MOVE MAP TO REPORTED LOCATION
      // -----------------------------------------------------

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [
            longitude,
            latitude,
          ],
          zoom: 12,
          essential: true,
        });
      }

      // -----------------------------------------------------
      // RESET FORM
      // -----------------------------------------------------

      setDescription("");
      setLocation("");
      setSearchText("");
      setPhotoFile(null);

      const fileInput =
        document.getElementById(
          "photo-upload"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      setShowModal(false);

      alert(
        "Coastal hazard report submitted successfully!"
      );
    } catch (error) {
      console.error(
        "Submit report error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to submit report."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // ESCAPE HTML FOR POPUPS
  // =========================================================

  function escapeHtml(
    value: string
  ): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="header">
        <div className="header-inner">

          <div className="brand">
            <div className="brand-icon">
              🌊
            </div>

            <div>
              <h1>Wave Watch</h1>
              <p>
                Coastal Hazard Monitoring
              </p>
            </div>
          </div>

          <button
            className="primary-button"
            onClick={() =>
              setShowModal(true)
            }
          >
            + Report Hazard
          </button>

        </div>
      </header>

      {/* ===================================================
          HERO SECTION
      =================================================== */}

      <main className="main-content">

        <section className="hero">

          <div className="hero-content">

            <div className="hero-badge">
              🌐 AWS-powered coastal
              intelligence
            </div>

            <h2>
              Stay ahead of
              <span> coastal hazards.</span>
            </h2>

            <p>
              Wave Watch helps coastal
              communities report, monitor,
              and respond to hazards in
              real time.
            </p>

            <div className="hero-actions">

              <button
                className="primary-button"
                onClick={() =>
                  setShowModal(true)
                }
              >
                Report a Hazard
              </button>

              <button
                className="secondary-button"
                onClick={() => {
                  document
                    .getElementById(
                      "map-section"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
              >
                View Live Map
              </button>

            </div>

          </div>

          <div className="hero-visual">
            <div className="wave-card">
              <div className="wave-animation">
                🌊
              </div>

              <div className="wave-info">
                <span>
                  LIVE MONITORING
                </span>

                <strong>
                  Coastal conditions
                  tracked 24/7
                </strong>
              </div>
            </div>
          </div>

        </section>

        {/* =================================================
            STATS
        ================================================= */}

        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon">
              📍
            </div>

            <div>
              <strong>
                {backendReports.length}
              </strong>

              <span>
                Citizen Reports
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🗺️
            </div>

            <div>
              <strong>
                LIVE
              </strong>

              <span>
                Location Mapping
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ☁️
            </div>

            <div>
              <strong>
                AWS
              </strong>

              <span>
                Cloud Powered
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ⚡
            </div>

            <div>
              <strong>
                REAL-TIME
              </strong>

              <span>
                Hazard Monitoring
              </span>
            </div>
          </div>

        </section>

        {/* =================================================
            MAP SECTION
        ================================================= */}

        <section
          id="map-section"
          className={
            isMapExpanded
              ? "map-card expanded"
              : "map-card"
          }
        >

          <div className="section-header">

            <div>
              <div className="section-label">
                LIVE MAP
              </div>

              <h3>
                Coastal Hazard Map
              </h3>

              <p>
                View reported coastal
                hazards across India.
              </p>
            </div>

            <button
              className="map-button"
              onClick={() =>
                setIsMapExpanded(
                  !isMapExpanded
                )
              }
            >
              {isMapExpanded
                ? "✕ Close"
                : "⛶ Expand"}
            </button>

          </div>

          {/* MAP SEARCH */}

          <div className="map-search">

            <input
              type="text"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  searchLocation();
                }
              }}
              placeholder="Search a coastal location..."
            />

            <button
              className="secondary-button"
              onClick={searchLocation}
              disabled={isSearching}
            >
              {isSearching
                ? "Searching..."
                : "Search"}
            </button>

          </div>

          <div
            ref={mapContainerRef}
            className="real-map"
          />

          <div className="map-legend">

            <div>
              <span
                className="legend-dot high"
              />
              High Severity
            </div>

            <div>
              <span
                className="legend-dot medium"
              />
              Medium Severity
            </div>

            <div>
              <span
                className="legend-dot low"
              />
              Low Severity
            </div>

          </div>

        </section>

        {/* =================================================
            RECENT REPORTS
        ================================================= */}

        <section className="reports-section">

          <div className="section-header">

            <div>
              <div className="section-label">
                REPORTS
              </div>

              <h3>
                Recent Coastal Reports
              </h3>

              <p>
                Latest reports submitted
                by citizens.
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={fetchReports}
            >
              ↻ Refresh
            </button>

          </div>

          {backendReports.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                🌊
              </div>

              <h4>
                No reports yet
              </h4>

              <p>
                Be the first to report a
                coastal hazard.
              </p>

              <button
                className="primary-button"
                onClick={() =>
                  setShowModal(true)
                }
              >
                Report Hazard
              </button>

            </div>

          ) : (

            <div className="reports-grid">

              {backendReports
                .slice()
                .sort(
                  (a, b) =>
                    new Date(
                      b.timestamp
                    ).getTime() -
                    new Date(
                      a.timestamp
                    ).getTime()
                )
                .slice(0, 6)
                .map((report) => (

                  <article
                    className="report-card"
                    key={report.reportId}
                  >

                    <div className="report-card-top">

                      <div className="report-type">
                        {getHazardEmoji(
                          report.hazardType
                        )}

                        <span>
                          {report.hazardType}
                        </span>
                      </div>

                      <span
                        className={`severity-badge ${report.severity.toLowerCase()}`}
                      >
                        {report.severity}
                      </span>

                    </div>

                    <h4>
                      {report.location ||
                        "Unknown location"}
                    </h4>

                    <p>
                      {report.description}
                    </p>

                    <div className="report-meta">

                      <span>
                        📍{" "}
                        {Number(
                          report.latitude
                        ).toFixed(4)}
                        ,{" "}
                        {Number(
                          report.longitude
                        ).toFixed(4)}
                      </span>

                      <span>
                        🕒{" "}
                        {formatDate(
                          report.timestamp
                        )}
                      </span>

                    </div>

                    <div className="report-status">
                      <span className="status-dot" />
                      {report.status}
                    </div>

                  </article>

                ))}

            </div>

          )}

        </section>

        {/* =================================================
            HOW IT WORKS
        ================================================= */}

        <section className="how-section">

          <div className="section-header centered">

            <div className="section-label">
              HOW IT WORKS
            </div>

            <h3>
              From report to response
            </h3>

            <p>
              Wave Watch connects coastal
              communities with cloud-powered
              hazard monitoring.
            </p>

          </div>

          <div className="steps-grid">

            <div className="step-card">

              <div className="step-number">
                01
              </div>

              <div className="step-icon">
                📱
              </div>

              <h4>
                Report
              </h4>

              <p>
                Citizens report coastal
                hazards with location,
                description, and photo
                evidence.
              </p>

            </div>

            <div className="step-card">

              <div className="step-number">
                02
              </div>

              <div className="step-icon">
                ☁️
              </div>

              <h4>
                Process
              </h4>

              <p>
                AWS Lambda, API Gateway,
                DynamoDB, and other cloud
                services process the report.
              </p>

            </div>

            <div className="step-card">

              <div className="step-number">
                03
              </div>

              <div className="step-icon">
                🗺️
              </div>

              <h4>
                Visualize
              </h4>

              <p>
                Reports are displayed on a
                live Amazon Location map.
              </p>

            </div>

            <div className="step-card">

              <div className="step-number">
                04
              </div>

              <div className="step-icon">
                🚨
              </div>

              <h4>
                Respond
              </h4>

              <p>
                Authorities and communities
                can use the information to
                make faster decisions.
              </p>

            </div>

          </div>

        </section>

      </main>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="footer">

        <div className="footer-inner">

          <div className="brand">

            <div className="brand-icon">
              🌊
            </div>

            <div>
              <h1>
                Wave Watch
              </h1>

              <p>
                Coastal Hazard Monitoring
              </p>
            </div>

          </div>

          <p>
            Built with AWS cloud
            technologies for safer
            coastal communities.
          </p>

        </div>

      </footer>

      {/* ===================================================
          REPORT MODAL
      =================================================== */}

      {showModal && (

        <div
          className="modal-overlay"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowModal(false);
            }
          }}
        >

          <div className="modal">

            <div className="modal-header">

              <div>
                <div className="section-label">
                  CITIZEN REPORT
                </div>

                <h3>
                  Report a Coastal Hazard
                </h3>

                <p>
                  Help keep coastal
                  communities safe.
                </p>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={submitReport}
              className="report-form"
            >

              {/* HAZARD TYPE */}

              <div className="form-group">

                <label>
                  Hazard Type
                </label>

                <select
                  value={hazardType}
                  onChange={(event) =>
                    setHazardType(
                      event.target.value
                    )
                  }
                >
                  <option>
                    High Waves
                  </option>

                  <option>
                    Beach Erosion
                  </option>

                  <option>
                    Strong Winds
                  </option>

                  <option>
                    Coastal Flooding
                  </option>

                  <option>
                    Storm Surge
                  </option>

                  <option>
                    Tsunami
                  </option>

                  <option>
                    Dangerous Currents
                  </option>

                  <option>
                    Oil Spill
                  </option>

                  <option>
                    Marine Pollution
                  </option>

                  <option>
                    Other
                  </option>

                </select>

              </div>

              {/* LOCATION */}

              <div className="form-group">

                <label>
                  Location
                </label>

                <div className="location-input">

                  <input
                    type="text"
                    value={location}
                    onChange={(event) =>
                      setLocation(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Marina Beach, Chennai"
                  />

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setSearchText(
                        location
                      );
                      searchLocation();
                    }}
                    disabled={isSearching}
                  >
                    {isSearching
                      ? "..."
                      : "Find"}
                  </button>

                </div>

                <small>
                  Search the location to
                  automatically obtain
                  map coordinates.
                </small>

              </div>

              {/* DESCRIPTION */}

              <div className="form-group">

                <label>
                  Description
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

              {/* PHOTO */}

              <div className="form-group">

                <label>
                  Photo Evidence{" "}
                  <span
                    style={{
                      opacity: 0.65,
                    }}
                  >
                    (optional)
                  </span>
                </label>

                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setPhotoFile(
                      event.target
                        .files?.[0] || null
                    )
                  }
                />

                {photoFile && (

                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "13px",
                      opacity: 0.8,
                    }}
                  >
                    Selected:
                    {" "}
                    {photoFile.name}
                  </div>

                )}

                <small>
                  Maximum size: 10 MB.
                  Photos are securely
                  uploaded to Amazon S3.
                </small>

              </div>

              {/* FORM ACTIONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Submitting..."
                    : "Submit Report"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

// =========================================================
// HELPER FUNCTIONS
// =========================================================

function getHazardEmoji(
  hazardType: string
): string {
  const type =
    hazardType.toLowerCase();

  if (
    type.includes("wave") ||
    type.includes("tsunami")
  ) {
    return "🌊";
  }

  if (
    type.includes("erosion")
  ) {
    return "🏖️";
  }

  if (
    type.includes("wind") ||
    type.includes("storm")
  ) {
    return "🌪️";
  }

  if (
    type.includes("flood")
  ) {
    return "🌧️";
  }

  if (
    type.includes("oil") ||
    type.includes("pollution")
  ) {
    return "🛢️";
  }

  if (
    type.includes("current")
  ) {
    return "⚠️";
  }

  return "🚨";
}

function formatDate(
  timestamp: string
): string {
  try {
    return new Date(
      timestamp
    ).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

export default App;  const [photoFile, setPhotoFile] = useState<File | null>(null);
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

      setBackendReports(data.reports || []);
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

    return {
      locationName:
        result.Title || searchText,

      // AWS returns [longitude, latitude]
      longitude: Number(result.Position[0]),
      latitude: Number(result.Position[1]),
    };
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

    if (!LOCATION_API_KEY) {
      alert(
        "Amazon Location API key is not configured."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // -----------------------------------------------------
      // STEP 1: FIND LOCATION USING AMAZON LOCATION
      // -----------------------------------------------------

      const place = await searchLocation(
        location.trim()
      );

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
            hazardType: hazardType,
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
      setLocation("");
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

            backendReports
              .slice()
              .reverse()
              .map((report) => {

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
