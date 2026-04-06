"use client";
import { useState, useEffect } from "react";

const SERVICES = [
  {
    id: "postgres",
    name: "PostgreSQL",
    desc: "Relational database engine",
    port: "5432",
    icon: "🐘",
    tag: "Database",
  },
  {
    id: "redis",
    name: "Redis",
    desc: "In-memory cache & store",
    port: "6379",
    icon: "⚡",
    tag: "Cache",
  },
  {
    id: "minio",
    name: "MinIO",
    desc: "S3-compatible object storage",
    port: "9001",
    icon: "🪣",
    tag: "Storage",
  },
  {
    id: "grafana",
    name: "Grafana",
    desc: "Metrics & monitoring dashboard",
    port: "3000",
    icon: "📊",
    tag: "Monitoring",
  },
];

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "deploy", label: "Deploy" },
  { id: "postgres", label: "PostgreSQL" },
  { id: "redis", label: "Redis" },
  { id: "minio", label: "MinIO" },
  { id: "grafana", label: "Grafana" },
] as const;

type Tab = (typeof NAV_ITEMS)[number]["id"];

export default function Home() {
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [query, setQuery] = useState("SELECT * FROM users;");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [redisKey, setRedisKey] = useState("");
  const [redisValue, setRedisValue] = useState("");
  const [redisLoading, setRedisLoading] = useState(false);
  const [redisError, setRedisError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [pods, setPods] = useState<string[]>([]);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    }
    setStatusLoading(false);
  };

  const fetchPods = async () => {
    try {
      const res = await fetch("/api/pods");
      const data = await res.json();
      setPods(data.pods || []);
    } catch {
      setPods([]);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchPods();
  }, []);

  const isDeployed = (serviceId: string) =>
    pods.some((p) => p.includes(`artemis-${serviceId}`));

  const getServiceStatus = (serviceId: string): "connected" | "running" | "stopped" => {
    if (serviceId === "postgres") return status?.postgres?.status === "connected" ? "connected" : "stopped";
    if (serviceId === "redis") return status?.redis?.status === "connected" ? "connected" : "stopped";
    return isDeployed(serviceId) ? "running" : "stopped";
  };

  const isRunning = (serviceId: string) => getServiceStatus(serviceId) !== "stopped";

  const toggle = (id: string) => {
    if (isDeployed(id)) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deploy = async () => {
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: selected }),
      });
      const data = await res.json();
      setResults(data.results);
      setSelected([]);
      setTimeout(() => {
        fetchStatus();
        fetchPods();
      }, 4000);
    } catch {
      setResults([
        {
          service: "all",
          status: "failed",
          error: "Network error — is the operator running?",
        },
      ]);
    }
    setLoading(false);
  };

  const runQuery = async () => {
    setQueryLoading(true);
    setQueryError("");
    setQueryResult(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.error) setQueryError(data.error);
      else setQueryResult(data);
    } catch {
      setQueryError("Failed to reach backend — check if Next.js is running");
    }
    setQueryLoading(false);
  };

  const setRedis = async () => {
    if (!redisKey || !redisValue) return;
    setRedisLoading(true);
    setRedisError("");
    try {
      const res = await fetch("/api/redis-cmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: redisKey, value: redisValue }),
      });
      const data = await res.json();
      if (data.error) {
        setRedisError(data.error);
      } else {
        setStatus((prev: any) => ({
          ...prev,
          redis: { ...prev.redis, keys: data.keys },
        }));
        setRedisKey("");
        setRedisValue("");
      }
    } catch {
      setRedisError("Failed to reach backend");
    }
    setRedisLoading(false);
  };

  const clusterConnected = status !== null;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#1a1a1a",
        color: "white",
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #444; }

        /* Cards */
        .card {
          background: #242424;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 18px 20px;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          position: relative;
          overflow: hidden;
        }
        .card:hover:not(.deployed) { border-color: #444; }
        .card.selected {
          border-color: #22C55E;
          box-shadow: 0 0 0 1px rgba(34,197,94,0.15), 0 0 24px rgba(34,197,94,0.06);
        }
        .card.deployed {
          border-color: rgba(34,197,94,0.35);
          cursor: default;
        }

        /* Service status cards (overview) */
        .svc-card {
          background: #242424;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 20px;
          transition: border-color 0.15s;
        }
        .svc-card:hover { border-color: #444; }
        .svc-card.running { border-color: rgba(34,197,94,0.25); }

        /* Tags */
        .tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          color: #8a8a8a;
          background: #2e2e2e;
          border: 1px solid #383838;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .tag.running { color: #4ade80; background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.2); }
        .tag.stopped { color: #8a8a8a; }

        /* Buttons */
        .btn {
          background: #22C55E;
          color: #0a1a0a;
          border: none;
          padding: 8px 20px;
          border-radius: 7px;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
          display: inline-flex;
          align-items: center;
        }
        .btn:hover:not(:disabled) { background: #16a34a; }
        .btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-secondary {
          background: #242424;
          color: white;
          border: 1px solid #333;
          padding: 7px 16px;
          border-radius: 7px;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          display: inline-flex;
          align-items: center;
        }
        .btn-secondary:hover:not(:disabled) { border-color: #555; background: #2a2a2a; }
        .btn-secondary:disabled { opacity: 0.35; cursor: not-allowed; }

        .btn-ghost {
          background: transparent;
          color: #8a8a8a;
          border: 1px solid #333;
          padding: 5px 12px;
          border-radius: 6px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-ghost:hover { border-color: #555; color: white; }

        /* Status dots */
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .dot.green, .dot.connected, .dot.running { background: #22C55E; }
        .dot.red, .dot.disconnected, .dot.stopped { background: #555; }
        .dot.success { background: #22C55E; }
        .dot.error { background: #ef4444; }

        /* Pulse animation for active dots */
        .dot-pulse {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22C55E;
          box-shadow: 0 0 0 0 rgba(34,197,94,0.4);
          animation: pulse 2s infinite;
          flex-shrink: 0;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          70% { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }

        /* Spinner */
        .spinner {
          width: 12px; height: 12px;
          border: 2px solid rgba(10,26,10,0.3);
          border-top-color: #0a1a0a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
          margin-right: 7px;
          vertical-align: middle;
        }
        .spinner-light {
          width: 12px; height: 12px;
          border: 2px solid rgba(255,255,255,0.15);
          border-top-color: rgba(255,255,255,0.6);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
          margin-right: 7px;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Panels */
        .panel {
          background: #242424;
          border: 1px solid #333;
          border-radius: 10px;
          overflow: hidden;
        }
        .panel-header {
          padding: 12px 18px;
          border-bottom: 1px solid #2e2e2e;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Tables */
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th {
          text-align: left;
          padding: 8px 14px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: #555;
          border-bottom: 1px solid #2e2e2e;
          font-weight: 400;
          text-transform: uppercase;
        }
        td {
          padding: 9px 14px;
          border-bottom: 1px solid #2a2a2a;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: #ccc;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(255,255,255,0.02); }

        /* Inputs */
        textarea {
          width: 100%;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          padding: 14px 16px;
          border: 1px solid #333;
          border-radius: 8px;
          resize: vertical;
          outline: none;
          background: #1e1e1e;
          color: #e8e8e8;
          line-height: 1.65;
          transition: border-color 0.15s;
        }
        textarea:focus { border-color: #555; }
        textarea::placeholder { color: #555; }

        input {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          padding: 8px 14px;
          border: 1px solid #333;
          border-radius: 7px;
          outline: none;
          background: #1e1e1e;
          color: #e8e8e8;
          transition: border-color 0.15s;
        }
        input:focus { border-color: #555; }
        input::placeholder { color: #555; }

        /* Alerts */
        .alert-warn {
          background: rgba(234,179,8,0.07);
          border: 1px solid rgba(234,179,8,0.2);
          color: #ca8a04;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          line-height: 1.6;
        }
        .alert-error {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          line-height: 1.6;
        }
        .result-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 7px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
        }
        .result-row.success { background: rgba(34,197,94,0.07); border: 1px solid rgba(34,197,94,0.2); color: #4ade80; }
        .result-row.error { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); color: #f87171; }

        /* Detail rows */
        .detail-row { display: flex; gap: 16px; align-items: flex-start; }
        .detail-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #555; width: 110px; flex-shrink: 0; padding-top: 1px; letter-spacing: 0.04em; }
        .detail-value { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #ccc; }

        /* Nav item active indicator */
        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          text-align: left;
          transition: background 0.1s, color 0.1s;
          color: #8a8a8a;
          background: transparent;
          position: relative;
        }
        .nav-item:hover { color: #ccc; background: rgba(255,255,255,0.04); }
        .nav-item.active { color: white; background: #2a2a2a; }
        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 50%; transform: translateY(-50%);
          width: 2px; height: 16px;
          background: #22C55E;
          border-radius: 1px;
        }

        /* Check circle */
        .check { width: 16px; height: 16px; border-radius: 50%; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.4); color: #4ade80; display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; }
        .check-sel { width: 16px; height: 16px; border-radius: 50%; background: rgba(34,197,94,0.9); color: #0a1a0a; display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; }

        /* Page header */
        .page-title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: #8a8a8a; font-weight: 300; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside
        style={{
          width: 216,
          background: "#1a1a1a",
          borderRight: "1px solid #282828",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "18px 16px 16px",
            borderBottom: "1px solid #282828",
          }}
        >
          <div
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              marginBottom: 8,
            }}
          >
            Artemis
          </div>
          <span
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 10,
              color: "#555",
              background: "#222",
              border: "1px solid #2e2e2e",
              padding: "2px 8px",
              borderRadius: 4,
              letterSpacing: "0.04em",
            }}
          >
            GKE • asia-south1
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Cluster status */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid #282828",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {clusterConnected ? (
            <div className="dot-pulse" />
          ) : (
            <div
              className="dot red"
              style={{ width: 6, height: 6 }}
            />
          )}
          <span
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 11,
              color: "#555",
            }}
          >
            {clusterConnected ? "cluster connected" : "disconnected"}
          </span>
          <button
            className="btn-ghost"
            style={{ marginLeft: "auto", padding: "3px 8px", fontSize: 10 }}
            onClick={() => { fetchStatus(); fetchPods(); }}
            title="Refresh status"
          >
            {statusLoading ? <span className="spinner-light" style={{ margin: 0 }} /> : "↺"}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "40px 48px",
          background: "#1a1a1a",
        }}
      >

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h1 className="page-title">Overview</h1>
              <p className="page-subtitle">
                All services provisioned on your Kubernetes cluster.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 12,
                marginBottom: 36,
              }}
            >
              {SERVICES.map((s) => {
                const running = isRunning(s.id);
                const svcStatus = getServiceStatus(s.id);
                return (
                  <div
                    key={s.id}
                    className={`svc-card ${running ? "running" : ""}`}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className={`dot ${running ? "green" : "red"}`} />
                        <span
                          className={`tag ${running ? "running" : "stopped"}`}
                        >
                          {svcStatus}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        marginBottom: 2,
                      }}
                    >
                      {s.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#8a8a8a",
                        marginBottom: 14,
                      }}
                    >
                      {s.desc}
                    </div>
                    <div
                      style={{
                        fontFamily: "IBM Plex Mono, monospace",
                        fontSize: 11,
                        color: "#555",
                        borderTop: "1px solid #2e2e2e",
                        paddingTop: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>:{s.port}</span>
                      {(s.id === "postgres" || s.id === "redis") && (
                        <button
                          className="btn-ghost"
                          style={{ padding: "2px 8px", fontSize: 10 }}
                          onClick={() => setActiveTab(s.id as Tab)}
                        >
                          open →
                        </button>
                      )}
                      {(s.id === "minio" || s.id === "grafana") && (
                        <button
                          className="btn-ghost"
                          style={{ padding: "2px 8px", fontSize: 10 }}
                          onClick={() => setActiveTab(s.id as Tab)}
                        >
                          details →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="btn-secondary"
                onClick={() => setActiveTab("deploy")}
              >
                Deploy services →
              </button>
              <span style={{ fontSize: 12, color: "#555" }}>
                {pods.length} pod{pods.length !== 1 ? "s" : ""} running
              </span>
            </div>
          </div>
        )}

        {/* ── DEPLOY ── */}
        {activeTab === "deploy" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 className="page-title">Deploy</h1>
              <p className="page-subtitle">
                Provision services on your Kubernetes cluster. Running services
                are shown with a green border.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 20,
                maxWidth: 520,
              }}
            >
              {SERVICES.map((s) => {
                const deployed = isDeployed(s.id);
                const sel = selected.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className={`card ${deployed ? "deployed" : sel ? "selected" : ""}`}
                    onClick={() => toggle(s.id)}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 14,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span className={`tag ${deployed ? "running" : ""}`}>
                          {deployed ? "running" : s.tag}
                        </span>
                        {deployed && <div className="check">✓</div>}
                        {!deployed && sel && <div className="check-sel">✓</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#8a8a8a", marginBottom: 12 }}>
                      {s.desc}
                    </div>
                    <div
                      style={{
                        fontFamily: "IBM Plex Mono, monospace",
                        fontSize: 11,
                        color: "#555",
                        borderTop: "1px solid #2e2e2e",
                        paddingTop: 10,
                      }}
                    >
                      :{s.port}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="btn"
              onClick={deploy}
              disabled={selected.length === 0 || loading}
            >
              {loading && <span className="spinner" />}
              {loading
                ? "Provisioning..."
                : `Deploy ${selected.length > 0 ? `${selected.length} service${selected.length > 1 ? "s" : ""}` : "services"}`}
            </button>

            {results.length > 0 && (
              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  maxWidth: 520,
                }}
              >
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`result-row ${r.status === "deployed" ? "success" : "error"}`}
                  >
                    <div className={`dot ${r.status === "deployed" ? "success" : "error"}`} />
                    <span>{r.service}</span>
                    <span style={{ marginLeft: "auto", opacity: 0.6 }}>
                      {r.status === "deployed" ? "provisioned" : r.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── POSTGRESQL ── */}
        {activeTab === "postgres" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h1 className="page-title">PostgreSQL</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className={`dot ${status?.postgres?.status === "connected" ? "green" : "red"}`} />
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 11,
                      color: "#8a8a8a",
                    }}
                  >
                    {status?.postgres?.status || "checking..."}
                  </span>
                </div>
              </div>
              <p className="page-subtitle">
                Run SQL queries directly against your PostgreSQL instance.
              </p>
            </div>

            {status?.postgres?.status === "disconnected" && (
              <div className="alert-warn">
                PostgreSQL is not connected — {status.postgres.error}. Make sure
                the service is deployed and the tunnel is running.
              </div>
            )}

            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#555",
                  fontFamily: "IBM Plex Mono, monospace",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Query editor
              </div>
              <textarea
                rows={5}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runQuery();
                }}
                placeholder="SELECT * FROM users;"
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <button
                  className="btn"
                  onClick={runQuery}
                  disabled={queryLoading || status?.postgres?.status !== "connected"}
                >
                  {queryLoading && <span className="spinner" />}
                  {queryLoading ? "Running..." : "Run query"}
                </button>
                <span
                  style={{
                    fontSize: 11,
                    color: "#555",
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                >
                  ⌘ + Enter
                </span>
              </div>
            </div>

            {queryError && <div className="alert-error">{queryError}</div>}

            {queryResult && (
              <div className="panel">
                <div className="panel-header">
                  <span
                    style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}
                  >
                    results
                  </span>
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 11,
                      color: "#555",
                    }}
                  >
                    {queryResult.rowCount} row{queryResult.rowCount !== 1 ? "s" : ""}
                  </span>
                </div>
                {queryResult.rows && queryResult.rows.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          {queryResult.fields.map((f: string) => (
                            <th key={f}>{f}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row: any, i: number) => (
                          <tr key={i}>
                            {Object.values(row).map((v: any, j) => (
                              <td key={j}>{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "18px 18px",
                      color: "#555",
                      fontSize: 12,
                      fontFamily: "IBM Plex Mono, monospace",
                    }}
                  >
                    query executed — no rows returned
                  </div>
                )}
              </div>
            )}

            {status?.postgres?.status === "connected" &&
              Object.keys(status.postgres.tables).length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#555",
                      fontFamily: "IBM Plex Mono, monospace",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Tables
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.entries(status.postgres.tables).map(
                      ([table, rows]: any) => (
                        <div key={table} className="panel">
                          <div className="panel-header">
                            <span
                              style={{
                                fontFamily: "IBM Plex Mono, monospace",
                                fontSize: 12,
                                fontWeight: 500,
                              }}
                            >
                              {table}
                            </span>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span
                                style={{
                                  fontFamily: "IBM Plex Mono, monospace",
                                  fontSize: 11,
                                  color: "#555",
                                }}
                              >
                                {rows.length} rows
                              </span>
                              <button
                                className="btn-ghost"
                                onClick={() => {
                                  setQuery(`SELECT * FROM ${table};`);
                                  runQuery();
                                }}
                              >
                                query
                              </button>
                            </div>
                          </div>
                          {rows.length > 0 && (
                            <table>
                              <thead>
                                <tr>
                                  {Object.keys(rows[0]).map((col: string) => (
                                    <th key={col}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row: any, i: number) => (
                                  <tr key={i}>
                                    {Object.values(row).map((v: any, j) => (
                                      <td key={j}>{String(v)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {status?.postgres?.status === "connected" &&
              Object.keys(status.postgres.tables).length === 0 && (
                <div className="alert-warn">
                  No tables yet — run a CREATE TABLE query above to get started.
                </div>
              )}
          </div>
        )}

        {/* ── REDIS ── */}
        {activeTab === "redis" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h1 className="page-title">Redis</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className={`dot ${status?.redis?.status === "connected" ? "green" : "red"}`} />
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 11,
                      color: "#8a8a8a",
                    }}
                  >
                    {status?.redis?.status || "checking..."}
                  </span>
                </div>
              </div>
              <p className="page-subtitle">
                Write and inspect key-value pairs in your Redis instance.
              </p>
            </div>

            {status?.redis?.status === "disconnected" && (
              <div className="alert-warn">
                Redis is not connected — {status.redis.error}. Make sure the
                service is deployed and the tunnel is running.
              </div>
            )}

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#555",
                  fontFamily: "IBM Plex Mono, monospace",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Set key
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input
                  value={redisKey}
                  onChange={(e) => setRedisKey(e.target.value)}
                  placeholder="key"
                  style={{ width: 170 }}
                />
                <input
                  value={redisValue}
                  onChange={(e) => setRedisValue(e.target.value)}
                  placeholder="value"
                  style={{ width: 230 }}
                />
                <button
                  className="btn"
                  onClick={setRedis}
                  disabled={
                    !redisKey ||
                    !redisValue ||
                    redisLoading ||
                    status?.redis?.status !== "connected"
                  }
                >
                  {redisLoading && <span className="spinner" />}
                  {redisLoading ? "Setting..." : "Set"}
                </button>
              </div>
              {redisError && (
                <div className="alert-error" style={{ marginTop: 10 }}>
                  {redisError}
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <span
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  keyspace
                </span>
                <span
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11,
                    color: "#555",
                  }}
                >
                  {status?.redis?.keys
                    ? Object.keys(status.redis.keys).length
                    : 0}{" "}
                  keys
                </span>
              </div>
              {status?.redis?.keys &&
              Object.keys(status.redis.keys).length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>key</th>
                      <th>value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(status.redis.keys).map(([k, v]: any) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div
                  style={{
                    padding: "18px 18px",
                    color: "#555",
                    fontSize: 12,
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                >
                  {status?.redis?.status === "connected"
                    ? "no keys yet — set one above"
                    : "connect Redis to see keys"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MINIO ── */}
        {activeTab === "minio" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ marginBottom: 4 }}>
              <h1 className="page-title">MinIO</h1>
              <p className="page-subtitle">
                S3-compatible object storage running on your cluster.
              </p>
            </div>

            <div className="panel">
              <div className="panel-header">
                <span
                  style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, fontWeight: 500 }}
                >
                  connection details
                </span>
              </div>
              <div
                style={{
                  padding: "18px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {[
                  { label: "CONSOLE_URL", value: "http://127.0.0.1:50462" },
                  { label: "ACCESS_KEY", value: "admin" },
                  { label: "SECRET_KEY", value: "password123" },
                  { label: "API_ENDPOINT", value: "http://127.0.0.1:9000" },
                ].map(({ label, value }) => (
                  <div key={label} className="detail-row">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="alert-warn">
              MinIO is currently unavailable on this system due to an image
              architecture mismatch. This will work correctly on a real GKE
              cluster.
            </div>
          </div>
        )}

        {/* ── GRAFANA ── */}
        {activeTab === "grafana" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ marginBottom: 4 }}>
              <h1 className="page-title">Grafana</h1>
              <p className="page-subtitle">
                Metrics and monitoring dashboard for your cluster.
              </p>
            </div>

            <div className="panel">
              <div className="panel-header">
                <span
                  style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, fontWeight: 500 }}
                >
                  connection details
                </span>
              </div>
              <div
                style={{
                  padding: "18px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {[
                  {
                    label: "URL",
                    value: `http://${process.env.NEXT_PUBLIC_GRAFANA_HOST || "127.0.0.1"}:${process.env.NEXT_PUBLIC_GRAFANA_PORT || "3000"}`,
                  },
                  { label: "USERNAME", value: "admin" },
                  { label: "PASSWORD", value: "admin" },
                ].map(({ label, value }) => (
                  <div key={label} className="detail-row">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 13, color: "#8a8a8a", marginBottom: 16 }}>
                Open Grafana to set up dashboards and visualize your cluster
                metrics.
              </p>
              <button
                className="btn"
                onClick={() =>
                  window.open(
                    `http://${process.env.NEXT_PUBLIC_GRAFANA_HOST || "127.0.0.1"}:${process.env.NEXT_PUBLIC_GRAFANA_PORT || "3000"}`,
                    "_blank"
                  )
                }
              >
                Open Grafana →
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
