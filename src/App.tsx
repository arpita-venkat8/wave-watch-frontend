import { useState } from "react";
import "./App.css";

type Severity = "low" | "moderate" | "high";

interface Report {
  id: number;
  type: string;
  location: string;
  severity: Severity;
  notes: string;
  time: string;
}

const HAZARD_TYPES = [
  "High waves",
  "Rip current",
  "Coastal flooding",
  "Erosion",
  "Debris / pollution",
  "Storm surge",
];

const SEED: Report[] = [
  {
    id: 1,
    type: "Rip current",
    location: "Marina Beach, Chennai",
    severity: "high",
    notes: "Strong pull near the lifeguard tower. Swimming not advised.",
    time: "08:15",
  },
  {
    id: 2,
    type: "High waves",
    location: "Elliot's Beach",
    severity: "moderate",
    notes: "Waves around 2 m at the shoreline.",
    time: "07:40",
  },
  {
    id: 3,
    type: "Debris / pollution",
    location: "Covelong Beach",
    severity: "low",
    notes: "Plastic waste along the tide line.",
    time: "06:55",
  },
];

const LABEL: Record<Severity, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

export default function App() {
  const [reports, setReports] = useState<Report[]>(SEED);
  const [type, setType] = useState(HAZARD_TYPES[0]);
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState<Severity>("moderate");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<Severity | "all">("all");

  const count = (s: Severity) => reports.filter((r) => r.severity === s).length;
  const overall: Severity =
    count("high") > 0 ? "high" : count("moderate") > 0 ? "moderate" : "low";

  const visible =
    filter === "all" ? reports : reports.filter((r) => r.severity === filter);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!location.trim()) return;
    const now = new Date();
    setReports([
      {
        id: Date.now(),
        type,
        location: location.trim(),
        severity,
        notes: notes.trim(),
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      ...reports,
    ]);
    setLocation("");
    setNotes("");
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">≈</span>
            Wave Watch
          </a>
          <nav className="nav" aria-label="Main">
            <a href="#status">Status</a>
            <a href="#report">Report</a>
            <a href="#feed">Feed</a>
          </nav>
        </div>
      </header>

      <main>
        <section className={`hero hero-${overall}`} id="status">
          <div className="container">
            <p className="hero-kicker">Coastal hazard monitoring</p>
            <h1>
              Coastline status: <span>{LABEL[overall]} risk</span>
            </h1>
            <p className="hero-sub">
              Community reports of waves, currents, flooding and erosion, in one
              place.
            </p>

            <div className="stats">
              {(["high", "moderate", "low"] as Severity[]).map((s) => (
                <div key={s} className={`stat stat-${s}`}>
                  <strong>{count(s)}</strong>
                  <span>{LABEL[s]} severity</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="container layout">
          <section className="panel" id="report">
            <h2>Report a hazard</h2>
            <form onSubmit={submit} className="form">
              <label>
                Hazard type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {HAZARD_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label>
                Location
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Beach or landmark"
                  required
                />
              </label>

              <fieldset>
                <legend>Severity</legend>
                <div className="segmented">
                  {(["low", "moderate", "high"] as Severity[]).map((s) => (
                    <label key={s} className={severity === s ? "on" : ""}>
                      <input
                        type="radio"
                        name="severity"
                        checked={severity === s}
                        onChange={() => setSeverity(s)}
                      />
                      {LABEL[s]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label>
                What are you seeing?
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Wave height, who is at risk, anything useful"
                />
              </label>

              <button type="submit" className="btn">
                Submit report
              </button>
            </form>
          </section>

          <section className="panel" id="feed">
            <div className="feed-head">
              <h2>Latest reports</h2>
              <select
                aria-label="Filter by severity"
                value={filter}
                onChange={(e) => setFilter(e.target.value as Severity | "all")}
              >
                <option value="all">All severities</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
            </div>

            {visible.length === 0 ? (
              <p className="empty">No reports match this filter yet.</p>
            ) : (
              <ul className="reports">
                {visible.map((r) => (
                  <li key={r.id} className={`report report-${r.severity}`}>
                    <div className="report-top">
                      <h3>{r.type}</h3>
                      <span className={`badge badge-${r.severity}`}>
                        {LABEL[r.severity]}
                      </span>
                    </div>
                    <p className="report-meta">
                      {r.location} · {r.time}
                    </p>
                    {r.notes && <p>{r.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          In an emergency, call your local coast guard or emergency services.
        </div>
      </footer>
    </div>
  );
}
