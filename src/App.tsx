import { useEffect, useRef, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
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

type CorrelationSignal = {
  signalId: string;
  source: string;
  text: string;
  hazardType: string;
  correlation?: {
    score: number;
    hazardMatch: boolean;
    distanceKm: number | null;
    timeDifferenceHours: number | null;
    keywordSimilarity: number;
  };
};

type PossibleIncident = {
  reportId: string;
  hazardType: string;
  location?: string | null;
  severity: "HIGH" | "MEDIUM" | "LOW";
  correlationScore: number;
  classification: string;
  matchedSignals: CorrelationSignal[];
};

function App() {
  const [showModal, setShowModal] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const [userRole, setUserRole] = useState<
    "ADMIN" | "CITIZEN" | null
  >(null);

  const [updatingReportId, setUpdatingReportId] =
    useState<string | null>(null);
  const [selectedReport, setSelectedReport] =
    useState<BackendReport | null>(null);
  const [adminToast, setAdminToast] = useState("");
  const knownReportIdsRef = useRef<Set<string> | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const LOCATION_API_KEY =
    import.meta.env.VITE_LOCATION_API_KEY as string;

  const AWS_REGION = "ap-southeast-2";
  const MAP_STYLE = "Standard";

  // =========================================================
  // AUTHENTICATED API HEADERS
  // =========================================================
  // API Gateway now requires a valid Cognito JWT for protected
  // report and correlation endpoints.
  const getAuthHeaders = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    if (!token) {
      throw new Error(
        "Your login session has expired. Please sign in again."
      );
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // =========================================================
  // GET CURRENT USER ROLE
  // =========================================================

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const session = await fetchAuthSession();

        const groups =
          (session.tokens?.idToken?.payload[
            "cognito:groups"
          ] as string[] | undefined) ?? [];

        if (groups.includes("ADMIN")) {
          setUserRole("ADMIN");
        } else if (groups.includes("CITIZEN")) {
          setUserRole("CITIZEN");
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("Unable to determine user role:", error);
        setUserRole(null);
      }
    };

    loadUserRole();
  }, []);

  // =========================================================
  // ADMIN: MARK REPORT AS REVIEWED
  // =========================================================

  const markReportAsReviewed = async (reportId: string) => {
    if (userRole !== "ADMIN") {
      alert("Only administrators can review reports.");
      return;
    }

    try {
      setUpdatingReportId(reportId);

      const response = await fetch(
        `https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports/${encodeURIComponent(
          reportId
        )}/status`,
        {
          method: "PATCH",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            status: "REVIEWED",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to update report status."
        );
      }

      setBackendReports((currentReports) =>
        currentReports.map((report) =>
          report.reportId === reportId
            ? {
                ...report,
                status: "REVIEWED",
              }
            : report
        )
      );

      alert("Report marked as Reviewed successfully.");
    } catch (error) {
      console.error(
        "Error updating report status:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update report status."
      );
    } finally {
      setUpdatingReportId(null);
    }
  };

  // =========================================================
  // ADMIN: MARK REPORT AS RESOLVED
  // =========================================================

  const markReportAsResolved = async (reportId: string) => {
    if (userRole !== "ADMIN") {
      alert("Only administrators can resolve reports.");
      return;
    }

    try {
      setUpdatingReportId(reportId);

      const response = await fetch(
        `https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports/${encodeURIComponent(
          reportId
        )}/status`,
        {
          method: "PATCH",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            status: "RESOLVED",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to resolve report."
        );
      }

      setBackendReports((currentReports) =>
        currentReports.map((report) =>
          report.reportId === reportId
            ? {
                ...report,
                status: "RESOLVED",
              }
            : report
        )
      );

      alert("Report marked as Resolved successfully.");
    } catch (error) {
      console.error(
        "Error resolving report:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to resolve report."
      );
    } finally {
      setUpdatingReportId(null);
    }
  };

  // =========================================================
  // REPORT FORM STATES
  // =========================================================

  const [hazardType, setHazardType] = useState("High Waves");
  const [customHazardType, setCustomHazardType] = useState("");
  const [severity, setSeverity] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================
  // BACKEND REPORTS
  // =========================================================

  const [backendReports, setBackendReports] = useState<BackendReport[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [correlationIncidents, setCorrelationIncidents] = useState<PossibleIncident[]>([]);
  const [isCorrelating, setIsCorrelating] = useState(false);
  const [correlationUpdated, setCorrelationUpdated] = useState<Date | null>(null);
  const [correlationError, setCorrelationError] = useState("");

  // =========================================================
  // REAL DASHBOARD METRICS FROM DYNAMODB REPORTS
  // =========================================================

  // Normalize status and severity values before calculating dashboard metrics.
  const normalizedStatus = (status: string | undefined) =>
    String(status || "PENDING").trim().toUpperCase();

  const normalizedSeverity = (severity: string | undefined) => {
    const value = String(severity || "MEDIUM").trim().toUpperCase();
    return value === "HIGH" || value === "MEDIUM" || value === "LOW"
      ? value
      : "MEDIUM";
  };

  // Status cards
  const activeReports = backendReports.filter((report) => {
    const status = normalizedStatus(report.status);
    return status === "ACTIVE" || status === "REVIEWED";
  });

  const pendingReports = backendReports.filter((report) => {
    const status = normalizedStatus(report.status);
    return status === "PENDING" || status === "REVIEW";
  });

  const resolvedReports = backendReports.filter(
    (report) => normalizedStatus(report.status) === "RESOLVED"
  );

  // Severity summary: count every unresolved report, including
  // Under Review, Reviewed, and Active reports.
  const highActiveReports = backendReports.filter(
    (report) =>
      normalizedSeverity(report.severity) === "HIGH" &&
      normalizedStatus(report.status) !== "RESOLVED"
  );

  const mediumActiveReports = backendReports.filter(
    (report) =>
      normalizedSeverity(report.severity) === "MEDIUM" &&
      normalizedStatus(report.status) !== "RESOLVED"
  );

  const lowActiveReports = backendReports.filter(
    (report) =>
      normalizedSeverity(report.severity) === "LOW" &&
      normalizedStatus(report.status) !== "RESOLVED"
  );

  // Current Alerts: all unresolved hazards are current alerts.
  // Only RESOLVED reports are removed.
  const currentAlerts = [...backendReports]
    .filter((report) => normalizedStatus(report.status) !== "RESOLVED")
    .sort((a, b) => {
      const severityRank: Record<string, number> = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };

      const severityDifference =
        (severityRank[normalizedSeverity(b.severity)] || 0) -
        (severityRank[normalizedSeverity(a.severity)] || 0);

      if (severityDifference !== 0) return severityDifference;

      return (
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
      );
    })
    .slice(0, 4);

  // =========================================================
  // DANGER-ZONE VISUALIZATION DATA
  // =========================================================
  const dangerZones = Object.values(
    backendReports
      .filter((report) => normalizedStatus(report.status) !== "RESOLVED")
      .reduce((zones, report) => {
        const key = report.location || "Unknown location";
        const severityValue =
          normalizedSeverity(report.severity) === "HIGH"
            ? 3
            : normalizedSeverity(report.severity) === "MEDIUM"
              ? 2
              : 1;
        if (!zones[key]) {
          zones[key] = { location: key, reports: 0, riskScore: 0, high: 0, medium: 0, low: 0 };
        }
        zones[key].reports += 1;
        zones[key].riskScore += severityValue;
        if (normalizedSeverity(report.severity) === "HIGH") zones[key].high += 1;
        else if (normalizedSeverity(report.severity) === "MEDIUM") zones[key].medium += 1;
        else zones[key].low += 1;
        return zones;
      }, {} as Record<string, { location: string; reports: number; riskScore: number; high: number; medium: number; low: number }>)
  ).sort((a, b) => b.riskScore - a.riskScore).slice(0, 6);

  const maxDangerScore = Math.max(1, ...dangerZones.map((zone) => zone.riskScore));

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
      setIsRefreshing(true);

      const response = await fetch(
        "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/reports",
        {
          cache: "no-store",
          headers: await getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch reports");
      }

      const normalizedReports: BackendReport[] = (data.reports || [])
        .map((report: BackendReport) => ({
          ...report,
          severity: (() => {
            const value = String(report.severity || "MEDIUM")
              .trim()
              .toUpperCase();
            return value === "HIGH" || value === "MEDIUM" || value === "LOW"
              ? value
              : "MEDIUM";
          })(),
          status: String(report.status || "PENDING")
            .trim()
            .toUpperCase(),
        }))
        .sort((a: BackendReport, b: BackendReport) => {
          return (
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
          );
        });

      const previousIds = knownReportIdsRef.current;
      const currentIds = new Set(normalizedReports.map((report) => report.reportId));
      if (userRole === "ADMIN" && previousIds) {
        const newReports = normalizedReports.filter((report) => !previousIds.has(report.reportId));
        if (newReports.length > 0) {
          setAdminToast(`🚨 New hazard report received: ${newReports[0].hazardType}`);
          window.setTimeout(() => setAdminToast(""), 5000);
          void runCorrelation();
        }
      }
      knownReportIdsRef.current = currentIds;
      setBackendReports(normalizedReports);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load reports when application starts
  useEffect(() => {
    fetchReports();
    const refreshTimer = window.setInterval(fetchReports, 30000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  // ADMIN: automatic correlation when the admin dashboard opens.
  useEffect(() => {
    if (userRole !== "ADMIN") return;
    const analyzeOnLoad = async () => {
      await fetchReports();
      await runCorrelation();
    };
    void analyzeOnLoad();
  }, [userRole]);

  // =========================================================
  // RUN SOCIAL SIGNAL CORRELATION
  // =========================================================

  const runCorrelation = async () => {
    try {
      setIsCorrelating(true);
      setCorrelationError("");

      const response = await fetch(
        "https://cw6ehoudu9.execute-api.ap-southeast-2.amazonaws.com/correlation",
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Correlation analysis failed."
        );
      }

      setCorrelationIncidents(data.incidents || []);
      setCorrelationUpdated(new Date());
    } catch (error) {
      console.error("Correlation analysis error:", error);
      setCorrelationError(
        error instanceof Error
          ? error.message
          : "Correlation analysis failed. Please try again."
      );
    } finally {
      setIsCorrelating(false);
    }
  };

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
        headers: await getAuthHeaders(),
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

    const finalHazardType =
      hazardType === "Other"
        ? customHazardType.trim()
        : hazardType;

    if (hazardType === "Other" && !finalHazardType) {
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
          headers: await getAuthHeaders(),

          body: JSON.stringify({
            hazardType: finalHazardType,
            severity: severity,
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
      setSeverity("MEDIUM");
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
  // REPORT DETAILS POPUP
  // =========================================================
  const openReportDetails = (report: BackendReport) => {
    setSelectedReport(report);
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

      {adminToast && userRole === "ADMIN" && (
        <div style={{ position: "fixed", top: "92px", right: "24px", zIndex: 10000, maxWidth: "360px", padding: "14px 18px", borderRadius: "12px", border: "1px solid rgba(34,197,94,0.45)", background: "rgba(5,30,45,0.96)", color: "#bbf7d0", boxShadow: "0 12px 30px rgba(0,0,0,0.35)", fontWeight: 700 }}>
          {adminToast}
        </div>
      )}

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

          <div className="coastal-radar">

            <div className="radar-glow"></div>
            <div className="radar-grid"></div>

            <div className="radar-ring ring-1"></div>
            <div className="radar-ring ring-2"></div>
            <div className="radar-ring ring-3"></div>
            <div className="radar-ring ring-4"></div>

            <div className="radar-cross horizontal"></div>
            <div className="radar-cross vertical"></div>

            <div className="radar-sweep"></div>

            <span className="radar-point point-1"></span>
            <span className="radar-point point-2"></span>
            <span className="radar-point point-3"></span>
            <span className="radar-point point-4"></span>

            <div className="radar-center"></div>

            <div className="radar-label top">COASTAL SCAN</div>
            <div className="radar-label bottom">INDIA • LIVE</div>

          </div>

          <div className="floating-card">

            <span className="small-label">
              LIVE SCAN
            </span>

            <strong>
              Coastal Activity
            </strong>

            <span>
              ● Monitoring active
            </span>

          </div>

        </div>

      </section>

      {/* =====================================================
          LIVE STATISTICS
      ===================================================== */}

      <section className="stats">
        <div className="stat-card stat-danger">
          <div className="stat-icon">🚨</div>
          <div>
            <span>Active Hazards</span>
            <strong>{activeReports.length}</strong>
            <small>{highActiveReports.length} high severity</small>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-icon">◉</div>
          <div>
            <span>Under Review</span>
            <strong>{pendingReports.length}</strong>
            <small>Awaiting assessment</small>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon">✓</div>
          <div>
            <span>Resolved</span>
            <strong>{resolvedReports.length}</strong>
            <small>Closed reports</small>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-icon">◎</div>
          <div>
            <span>Citizen Reports</span>
            <strong>{backendReports.length}</strong>
            <small>All reports received</small>
          </div>
        </div>
      </section>

      <section className="severity-strip">
        <div>
          <span className="severity-dot high"></span>
          <strong>{highActiveReports.length}</strong> High severity
        </div>
        <div>
          <span className="severity-dot medium"></span>
          <strong>{mediumActiveReports.length}</strong> Medium severity
        </div>
        <div>
          <span className="severity-dot low"></span>
          <strong>{lowActiveReports.length}</strong> Low severity
        </div>
        <div className="data-refresh">
          <span className="refresh-dot"></span>
          {isRefreshing ? "Syncing reports..." : lastUpdated ? `Data synced ${lastUpdated.toLocaleTimeString()}` : "Waiting for data"}
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

              <div className="alert-actions">
                <span className="alert-count">{currentAlerts.length}</span>
                <button className="text-button" onClick={fetchReports} disabled={isRefreshing}>
                  {isRefreshing ? "Syncing" : "Refresh"}
                </button>
              </div>

            </div>

            {currentAlerts.length === 0 ? (
              <div
                style={{
                  padding: "28px 10px",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                No active alerts right now.
              </div>
            ) : (
              currentAlerts.map((report) => {
                const alertClass = report.severity.toLowerCase();
                const alertIcon =
                  report.severity === "HIGH"
                    ? "🚨"
                    : report.severity === "MEDIUM"
                      ? "⚠️"
                      : "ℹ️";

                const timeAgo = report.timestamp
                  ? (() => {
                      const minutes = Math.max(
                        0,
                        Math.floor(
                          (Date.now() - new Date(report.timestamp).getTime()) /
                            60000
                        )
                      );

                      if (minutes < 1) return "Just now";
                      if (minutes < 60) return `${minutes} min ago`;
                      const hours = Math.floor(minutes / 60);
                      if (hours < 24) return `${hours} hr ago`;
                      return `${Math.floor(hours / 24)} day(s) ago`;
                    })()
                  : "Recently";

                return (
                  <div
                    className={`alert-item ${alertClass}`}
                    key={report.reportId}
                  >
                    <div className="alert-icon">
                      {alertIcon}
                    </div>

                    <div>
                      <strong>
                        {report.hazardType}
                      </strong>

                      <span>
                        📍 {report.location || "Reported location"}
                      </span>

                      <small>
                        {report.severity} • {
                            report.status === "PENDING" || report.status === "REVIEW"
                              ? "Under Review"
                              : report.status === "REVIEWED"
                                ? "Reviewed"
                                : report.status === "RESOLVED"
                                  ? "Resolved"
                                  : "Active"
                          } • {timeAgo}
                      </small>
                    </div>
                  </div>
                );
              })
            )}

          </div>

        </div>

      </section>

      {/* =====================================================
          DANGER ZONE VISUAL
      ===================================================== */}
      <section className="reports" style={{ marginTop: "28px" }}>
        <div className="section-heading">
          <div>
            <span className="section-tag">DANGER ZONE VISUAL</span>
            <h2>Coastal Risk Density</h2>
            <p>Visualizes unresolved hazard concentration by reported location.</p>
          </div>
          <div className="live-status"><span></span>RISK ANALYSIS</div>
        </div>
        {dangerZones.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", borderRadius: "14px", border: "1px dashed rgba(148,163,184,0.25)" }}>
            No unresolved danger zones detected.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
            {dangerZones.map((zone) => {
              const riskPercent = Math.max(8, Math.round((zone.riskScore / maxDangerScore) * 100));
              const riskLabel = zone.high > 0 || riskPercent >= 70 ? "HIGH RISK" : riskPercent >= 40 ? "MEDIUM RISK" : "LOW RISK";
              return (
                <div key={zone.location} style={{ padding: "18px", borderRadius: "14px", border: "1px solid rgba(56,189,248,0.18)", background: "rgba(15,23,42,0.55)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                    <strong>📍 {zone.location}</strong><span style={{ color: zone.high > 0 ? "#fca5a5" : "#fcd34d", fontSize: "11px", fontWeight: 800 }}>{riskLabel}</span>
                  </div>
                  <div style={{ marginTop: "12px", height: "8px", borderRadius: "999px", background: "rgba(148,163,184,0.14)", overflow: "hidden" }}>
                    <div style={{ width: `${riskPercent}%`, height: "100%", borderRadius: "999px", background: zone.high > 0 ? "#ef4444" : zone.medium > 0 ? "#f59e0b" : "#22c55e" }} />
                  </div>
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "12px" }}><span>{zone.reports} unresolved report{zone.reports === 1 ? "" : "s"}</span><span>Risk score: {zone.riskScore}</span></div>
                  <div style={{ marginTop: "8px", color: "#64748b", fontSize: "11px" }}>High: {zone.high} • Medium: {zone.medium} • Low: {zone.low}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================
          CORRELATION INTELLIGENCE
      ===================================================== */}

      <section className="reports" style={{ marginTop: "28px" }}>
        <div className="section-heading">
          <div>
            <span className="section-tag">CORRELATION ENGINE</span>
            <h2>Possible Incident Correlation</h2>
            <p>
              Correlates each citizen hazard report with controlled external
              signals using location, time, hazard type and keyword similarity.
            </p>
          </div>

          <button
            className="primary-button small"
            onClick={runCorrelation}
            disabled={isCorrelating}
          >
            {isCorrelating ? "Analyzing..." : "Run Correlation Analysis"}
          </button>
        </div>

        {correlationError && (
          <div
            style={{
              marginBottom: "16px",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(127,29,29,0.18)",
              color: "#fecaca",
            }}
          >
            Correlation engine error: {correlationError}
          </div>
        )}

        {correlationIncidents.length === 0 ? (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              borderRadius: "14px",
              border: "1px dashed rgba(148,163,184,0.25)",
              color: "#94a3b8",
              background: "rgba(15,23,42,0.35)",
            }}
          >
            <strong style={{ display: "block", color: "#cbd5e1" }}>
              No correlation analysis displayed yet.
            </strong>
            <span style={{ display: "block", marginTop: "6px" }}>
              Run the correlation engine to compare citizen hazard reports
              against the controlled external-signal dataset.
            </span>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {correlationIncidents.map((incident) => {
              const citizenReport = backendReports.find(
                (report) => report.reportId === incident.reportId
              );

              const reportedTime = citizenReport?.timestamp
                ? new Date(citizenReport.timestamp).toLocaleString()
                : "Time unavailable";

              return (
                <div
                  key={incident.reportId}
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    border: "1px solid rgba(56,189,248,0.18)",
                    background: "rgba(15,23,42,0.55)",
                  }}
                >
                  {/* POSSIBLE INCIDENT HEADER */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#67e8f9",
                          fontSize: "11px",
                          fontWeight: 800,
                          letterSpacing: "0.12em",
                          marginBottom: "6px",
                        }}
                      >
                        POSSIBLE INCIDENT
                      </div>
                      <strong style={{ fontSize: "20px" }}>
                        {incident.hazardType}
                      </strong>
                      <div
                        style={{
                          marginTop: "6px",
                          color: "#94a3b8",
                          fontSize: "13px",
                        }}
                      >
                        Incident ID: {incident.reportId}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "28px" }}>
                        {incident.correlationScore}%
                      </strong>
                      <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                        overall correlation score
                      </div>
                    </div>
                  </div>

                  {/* CITIZEN HAZARD REPORT */}
                  <div
                    style={{
                      marginTop: "18px",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid rgba(56,189,248,0.20)",
                      background: "rgba(8,47,73,0.24)",
                    }}
                  >
                    <div
                      style={{
                        color: "#bae6fd",
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        marginBottom: "10px",
                      }}
                    >
                      CITIZEN HAZARD REPORT
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>
                          HAZARD TYPE
                        </span>
                        <div style={{ color: "#e2e8f0", marginTop: "3px" }}>
                          {incident.hazardType}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>
                          SEVERITY
                        </span>
                        <div style={{ color: "#e2e8f0", marginTop: "3px" }}>
                          {incident.severity}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>
                          LOCATION
                        </span>
                        <div style={{ color: "#e2e8f0", marginTop: "3px" }}>
                          {citizenReport?.location || incident.location || "Reported location"}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>
                          REPORTED
                        </span>
                        <div style={{ color: "#e2e8f0", marginTop: "3px" }}>
                          {reportedTime}
                        </div>
                      </div>
                    </div>

                    {citizenReport?.description && (
                      <div
                        style={{
                          marginTop: "12px",
                          color: "#cbd5e1",
                          fontSize: "13px",
                          lineHeight: 1.5,
                        }}
                      >
                        <strong>Report description:</strong>{" "}
                        {citizenReport.description}
                      </div>
                    )}
                  </div>

                  {/* CORRELATION DIRECTION */}
                  <div
                    style={{
                      textAlign: "center",
                      padding: "13px 0",
                      color: "#67e8f9",
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                    }}
                  >
                    ↕ &nbsp; CORRELATED WITH &nbsp; ↕
                  </div>

                  {/* EXTERNAL SOCIAL SIGNALS */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid rgba(34,197,94,0.18)",
                      background: "rgba(20,83,45,0.12)",
                    }}
                  >
                    <div
                      style={{
                        color: "#bbf7d0",
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        marginBottom: "12px",
                      }}
                    >
                      CONTROLLED EXTERNAL / SOCIAL SIGNALS
                    </div>

                    <div style={{ display: "grid", gap: "10px" }}>
                      {incident.matchedSignals?.map((signal) => (
                        <div
                          key={signal.signalId}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "10px",
                            background: "rgba(15,23,42,0.48)",
                            border: "1px solid rgba(56,189,248,0.14)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "12px",
                              flexWrap: "wrap",
                            }}
                          >
                            <strong style={{ color: "#e2e8f0" }}>
                              {signal.signalId}
                            </strong>
                            <span style={{ color: "#7dd3fc", fontWeight: 700 }}>
                              {signal.correlation?.score ?? 0}% match
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: "5px",
                              color: "#94a3b8",
                              fontSize: "12px",
                            }}
                          >
                            Source: {signal.source || "External Signal"} • Hazard: {signal.hazardType}
                          </div>

                          <div
                            style={{
                              marginTop: "8px",
                              color: "#cbd5e1",
                              fontSize: "13px",
                              lineHeight: 1.5,
                            }}
                          >
                            “{signal.text}”
                          </div>

                          {signal.correlation && (
                            <div
                              style={{
                                marginTop: "9px",
                                color: "#64748b",
                                fontSize: "11px",
                              }}
                            >
                              Hazard match: {signal.correlation.hazardMatch ? "Yes" : "No"} •{" "}
                              Distance: {signal.correlation.distanceKm != null
                                ? `${signal.correlation.distanceKm.toFixed(2)} km`
                                : "N/A"} •{" "}
                              Keyword similarity: {Math.round(
                                signal.correlation.keywordSimilarity * 100
                              )}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                      color: "#cbd5e1",
                      fontSize: "13px",
                    }}
                  >
                    <span>
                      <strong>Matched social signals:</strong>{" "}
                      {incident.matchedSignals?.length || 0}
                    </span>
                    <span>
                      <strong>Classification:</strong>{" "}
                      {incident.classification}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      color: "#94a3b8",
                      fontSize: "12px",
                    }}
                  >
                    Correlation indicates a possible incident; it is not confirmation.
                    Social signals are supporting evidence and are not treated as verified
                    citizen reports.
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {correlationUpdated && (
          <div
            style={{
              marginTop: "12px",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            Last analysis: {correlationUpdated.toLocaleTimeString()}
          </div>
        )}
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
                  report.status === "PENDING" ||
                  report.status === "REVIEW"
                    ? "Under Review"
                    : report.status === "REVIEWED"
                      ? "Reviewed"
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
                    onClick={() => openReportDetails(report)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openReportDetails(report);
                      }
                    }}
                    style={{ cursor: "pointer" }}
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

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        className={`report-status ${status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {status}
                      </span>

                      {userRole === "ADMIN" &&
                        (report.status === "PENDING" ||
                          report.status === "REVIEW") && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              markReportAsReviewed(report.reportId);
                            }}
                            disabled={
                              updatingReportId === report.reportId
                            }
                            style={{
                              border: "1px solid rgba(34, 197, 94, 0.45)",
                              background: "rgba(34, 197, 94, 0.12)",
                              color: "#86efac",
                              borderRadius: "8px",
                              padding: "6px 10px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor:
                                updatingReportId === report.reportId
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                updatingReportId === report.reportId
                                  ? 0.6
                                  : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {updatingReportId === report.reportId
                              ? "Updating..."
                              : "✓ Mark as Reviewed"}
                          </button>
                        )}

                      {userRole === "ADMIN" &&
                        (report.status === "REVIEWED" ||
                          report.status === "ACTIVE") && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              markReportAsResolved(report.reportId);
                            }}
                            disabled={
                              updatingReportId === report.reportId
                            }
                            style={{
                              border: "1px solid rgba(96, 165, 250, 0.45)",
                              background: "rgba(96, 165, 250, 0.12)",
                              color: "#93c5fd",
                              borderRadius: "8px",
                              padding: "6px 10px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor:
                                updatingReportId === report.reportId
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                updatingReportId === report.reportId
                                  ? 0.6
                                  : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {updatingReportId === report.reportId
                              ? "Updating..."
                              : "✓ Mark as Resolved"}
                          </button>
                        )}
                    </div>

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
          REPORT DETAILS POPUP
      ===================================================== */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedReport(null)}>×</button>
            <div className="modal-icon">⚠️</div>
            <h2>{selectedReport.hazardType}</h2>
            <p style={{ marginBottom: "18px" }}>Complete hazard report details</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "18px" }}>
              <div><small style={{ color: "#64748b" }}>STATUS</small><div style={{ marginTop: "4px", fontWeight: 700 }}>{normalizedStatus(selectedReport.status) === "RESOLVED" ? "Resolved" : normalizedStatus(selectedReport.status) === "REVIEWED" ? "Reviewed" : normalizedStatus(selectedReport.status) === "ACTIVE" ? "Active" : "Under Review"}</div></div>
              <div><small style={{ color: "#64748b" }}>SEVERITY</small><div style={{ marginTop: "4px", fontWeight: 700 }}>{selectedReport.severity}</div></div>
              <div><small style={{ color: "#64748b" }}>REPORTED</small><div style={{ marginTop: "4px", fontWeight: 700 }}>{new Date(selectedReport.timestamp).toLocaleString()}</div></div>
            </div>
            <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(15,23,42,0.55)", border: "1px solid rgba(56,189,248,0.15)" }}>
              <strong>📍 Location</strong>
              <div style={{ marginTop: "5px", color: "#cbd5e1" }}>{selectedReport.location || "Reported location"}</div>
              <strong style={{ display: "block", marginTop: "14px" }}>📝 Description</strong>
              <div style={{ marginTop: "5px", color: "#cbd5e1", lineHeight: 1.5 }}>{selectedReport.description || "No description provided."}</div>
              <div style={{ marginTop: "14px", color: "#64748b", fontSize: "12px" }}>Coordinates: {Number(selectedReport.latitude).toFixed(5)}, {Number(selectedReport.longitude).toFixed(5)}</div>
            </div>
            <div style={{ marginTop: "14px", color: "#64748b", fontSize: "11px" }}>Report ID: {selectedReport.reportId}</div>
          </div>
        </div>
      )}

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

            {hazardType === "Other" && (
              <>
                <label>
                  Specify Hazard Type
                </label>

                <input
                  type="text"
                  placeholder="e.g. Oil Spill, Tsunami Warning, Jellyfish Bloom"
                  value={customHazardType}
                  onChange={(e) =>
                    setCustomHazardType(e.target.value)
                  }
                  maxLength={100}
                />
              </>
            )}

            {/* SEVERITY */}

            <label>
              Severity
            </label>

            <select
              value={severity}
              onChange={(e) =>
                setSeverity(
                  e.target.value as "HIGH" | "MEDIUM" | "LOW"
                )
              }
            >
              <option value="HIGH">High — Immediate attention</option>
              <option value="MEDIUM">Medium — Needs monitoring</option>
              <option value="LOW">Low — Minor / localized</option>
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
