'use client'
import { useState, useEffect } from 'react'

const SERVICES = [
  { id: 'postgres', name: 'PostgreSQL', desc: 'Relational database engine', port: '5432', icon: '🐘', tag: 'Database' },
  { id: 'redis', name: 'Redis', desc: 'In-memory cache & store', port: '6379', icon: '⚡', tag: 'Cache' },
  { id: 'minio', name: 'MinIO', desc: 'S3-compatible object storage', port: '9001', icon: '🪣', tag: 'Storage' },
  { id: 'grafana', name: 'Grafana', desc: 'Metrics & monitoring dashboard', port: '3000', icon: '📊', tag: 'Monitoring' }
]

const SERVICE_STATUS_MAP: Record<string, string> = {
  postgres: 'postgres',
  redis: 'redis'
}

export default function Home() {
  const [selected, setSelected] = useState<string[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [query, setQuery] = useState('SELECT * FROM users;')
  const [queryResult, setQueryResult] = useState<any>(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryError, setQueryError] = useState('')
  const [redisKey, setRedisKey] = useState('')
  const [redisValue, setRedisValue] = useState('')
  const [redisLoading, setRedisLoading] = useState(false)
  const [redisError, setRedisError] = useState('')
  const [activeTab, setActiveTab] = useState<'deploy' | 'postgres' | 'redis' | 'minio' | 'grafana'>('deploy')
  const [pods, setPods] = useState<string[]>([])

  const fetchStatus = async () => {
    setStatusLoading(true)
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus(null)
    }
    setStatusLoading(false)
  }

  const fetchPods = async () => {
    try {
      const res = await fetch('/api/pods')
      const data = await res.json()
      setPods(data.pods || [])
    } catch {
      setPods([])
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchPods()
  }, [])

  const isDeployed = (serviceId: string) => {
    return pods.some(p => p.includes(`artemis-${serviceId}`))
  }

  const toggle = (id: string) => {
    if (isDeployed(id)) return
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const deploy = async () => {
    setLoading(true)
    setResults([])
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: selected })
      })
      const data = await res.json()
      setResults(data.results)
      setSelected([])
      setTimeout(() => { fetchStatus(); fetchPods() }, 4000)
    } catch {
      setResults([{ service: 'all', status: 'failed', error: 'Network error — is the operator running?' }])
    }
    setLoading(false)
  }

  const runQuery = async () => {
    setQueryLoading(true)
    setQueryError('')
    setQueryResult(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      const data = await res.json()
      if (data.error) setQueryError(data.error)
      else setQueryResult(data)
    } catch {
      setQueryError('Failed to reach backend — check if Next.js is running')
    }
    setQueryLoading(false)
  }

  const setRedis = async () => {
    if (!redisKey || !redisValue) return
    setRedisLoading(true)
    setRedisError('')
    try {
      const res = await fetch('/api/redis-cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: redisKey, value: redisValue })
      })
      const data = await res.json()
      if (data.error) {
        setRedisError(data.error)
      } else {
        setStatus((prev: any) => ({ ...prev, redis: { ...prev.redis, keys: data.keys } }))
        setRedisKey('')
        setRedisValue('')
      }
    } catch {
      setRedisError('Failed to reach backend')
    }
    setRedisLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', color: '#111' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .card { background: white; border: 1.5px solid #E8E8E4; border-radius: 12px; padding: 20px 24px; cursor: pointer; transition: all 0.15s ease; position: relative; overflow: hidden; }
        .card:hover:not(.deployed) { border-color: #C0C0B8; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .card.selected { border-color: #111; }
        .card.selected::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: #111; }
        .card.deployed { border-color: #22C55E; cursor: default; opacity: 0.8; }
        .card.deployed::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: #22C55E; }
        .tag { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: #888; background: #F2F2EE; padding: 2px 8px; border-radius: 4px; }
        .tag.running { color: #166534; background: #F0FBF4; }
        .btn { background: #111; color: white; border: none; padding: 10px 22px; border-radius: 8px; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s ease; }
        .btn:hover:not(:disabled) { background: #333; }
        .btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .btn-outline { background: white; color: #111; border: 1.5px solid #E8E8E4; padding: 9px 18px; border-radius: 8px; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.15s; }
        .btn-outline:hover { border-color: #111; }
        .btn-sm { background: white; color: #111; border: 1.5px solid #E8E8E4; padding: 3px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; font-family: 'IBM Plex Mono', monospace; transition: all 0.15s; }
        .btn-sm:hover { border-color: #111; }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .dot.connected { background: #22C55E; }
        .dot.disconnected { background: #EF4444; }
        .dot.success { background: #22C55E; }
        .dot.error { background: #EF4444; }
        .spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
        .spinner-dark { width: 13px; height: 13px; border: 2px solid #E8E8E4; border-top-color: #111; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .checkmark { width: 18px; height: 18px; border-radius: 50%; background: #111; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
        .check-green { width: 18px; height: 18px; border-radius: 50%; background: #22C55E; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
        .panel { background: white; border: 1.5px solid #E8E8E4; border-radius: 12px; overflow: hidden; }
        .panel-header { padding: 14px 20px; border-bottom: 1px solid #E8E8E4; display: flex; align-items: center; justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 8px 12px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #888; border-bottom: 1px solid #E8E8E4; font-weight: 400; }
        td { padding: 9px 12px; border-bottom: 1px solid #F4F4F0; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #333; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #FAFAF6; }
        textarea { width: 100%; font-family: 'IBM Plex Mono', monospace; font-size: 13px; padding: 14px; border: 1.5px solid #E8E8E4; border-radius: 8px; resize: vertical; outline: none; background: white; color: #111; line-height: 1.6; }
        textarea:focus { border-color: #111; }
        input { font-family: 'IBM Plex Mono', monospace; font-size: 13px; padding: 10px 14px; border: 1.5px solid #E8E8E4; border-radius: 8px; outline: none; background: white; color: #111; }
        input:focus { border-color: #111; }
        .tab { padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; background: none; font-family: 'IBM Plex Sans', sans-serif; color: #888; transition: all 0.15s; }
        .tab.active { background: white; color: #111; box-shadow: 0 1px 4px rgba(0,0,0,0.08); border: 1px solid #E8E8E4; }
        .tab:hover:not(.active) { color: #444; }
        .result-row { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
        .result-row.success { background: #F0FBF4; border: 1px solid #C3E8CF; color: #166534; }
        .result-row.error { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; }
        .error-box { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 12px 16px; border-radius: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
        .warn-box { background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; padding: 12px 16px; border-radius: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
        .detail-row { display: flex; gap: 16px; align-items: center; }
        .detail-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #888; width: 120px; flex-shrink: 0; }
        .detail-value { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #333; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #E8E8E4', background: 'white', padding: '0 48px', display: 'flex', alignItems: 'center', height: 56 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 500 }}>Artemis</span>
        <span style={{ marginLeft: 12, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#888', background: '#F2F2EE', padding: '2px 8px', borderRadius: 4 }}>local cluster</span>
        {status && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
            {['postgres', 'redis'].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className={`dot ${status[s]?.status}`} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#888' }}>{s}</span>
              </div>
            ))}
            <button className="btn-outline" style={{ padding: '4px 12px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} onClick={() => { fetchStatus(); fetchPods() }}>
              {statusLoading ? <span className="spinner-dark" /> : 'refresh'}
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#F2F2EE', padding: 4, borderRadius: 10, width: 'fit-content', marginBottom: 36 }}>
          {(['deploy', 'postgres', 'redis', 'minio', 'grafana'] as const).map(tab => (
            <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'deploy' ? '🚀 Deploy' : tab === 'postgres' ? '🐘 PostgreSQL' : tab === 'redis' ? '⚡ Redis' : tab === 'minio' ? '🪣 MinIO' : '📊 Grafana'}
            </button>
          ))}
        </div>

        {/* Deploy tab */}
        {activeTab === 'deploy' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>Deploy infrastructure</h1>
            <p style={{ fontSize: 14, color: '#666', fontWeight: 300, marginBottom: 28 }}>Select services to provision on your Kubernetes cluster. Already running services are shown in green.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, maxWidth: 560 }}>
              {SERVICES.map(s => {
                const deployed = isDeployed(s.id)
                const sel = selected.includes(s.id)
                return (
                  <div key={s.id} className={`card ${deployed ? 'deployed' : sel ? 'selected' : ''}`} onClick={() => toggle(s.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <span style={{ fontSize: 22 }}>{s.icon}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`tag ${deployed ? 'running' : ''}`}>{deployed ? 'running' : s.tag}</span>
                        {deployed && <div className="check-green">✓</div>}
                        {!deployed && sel && <div className="checkmark">✓</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{s.desc}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#AAA', borderTop: '1px solid #F0F0EC', paddingTop: 10 }}>:{s.port}</div>
                  </div>
                )
              })}
            </div>
            <button className="btn" onClick={deploy} disabled={selected.length === 0 || loading}>
              {loading && <span className="spinner" />}
              {loading ? 'Provisioning...' : `Deploy ${selected.length > 0 ? `${selected.length} service${selected.length > 1 ? 's' : ''}` : 'services'}`}
            </button>
            {results.length > 0 && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560 }}>
                {results.map((r, i) => (
                  <div key={i} className={`result-row ${r.status === 'deployed' ? 'success' : 'error'}`}>
                    <div className={`dot ${r.status === 'deployed' ? 'success' : 'error'}`} />
                    <span>{r.service}</span>
                    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{r.status === 'deployed' ? 'running' : r.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Postgres tab */}
        {activeTab === 'postgres' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {status?.postgres?.status === 'disconnected' && (
              <div className="warn-box">
                Postgres is not connected — {status.postgres.error}. Make sure the service is deployed and the tunnel is running.
              </div>
            )}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Query editor</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Run SQL directly against your PostgreSQL instance.</p>
              <textarea rows={5} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runQuery() }} placeholder="SELECT * FROM users;" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <button className="btn" onClick={runQuery} disabled={queryLoading || status?.postgres?.status !== 'connected'}>
                  {queryLoading && <span className="spinner" />}
                  {queryLoading ? 'Running...' : 'Run query'}
                </button>
                <span style={{ fontSize: 11, color: '#AAA', fontFamily: 'IBM Plex Mono, monospace' }}>⌘ + Enter</span>
              </div>
            </div>
            {queryError && <div className="error-box">{queryError}</div>}
            {queryResult && (
              <div className="panel">
                <div className="panel-header">
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>results</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#888' }}>{queryResult.rowCount} row{queryResult.rowCount !== 1 ? 's' : ''}</span>
                </div>
                {queryResult.rows.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr>{queryResult.fields.map((f: string) => <th key={f}>{f}</th>)}</tr></thead>
                      <tbody>{queryResult.rows.map((row: any, i: number) => (<tr key={i}>{Object.values(row).map((v: any, j) => <td key={j}>{String(v)}</td>)}</tr>))}</tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: 20, color: '#AAA', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>query executed — no rows returned</div>
                )}
              </div>
            )}
            {status?.postgres?.status === 'connected' && Object.keys(status.postgres.tables).length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: '#444' }}>Tables</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(status.postgres.tables).map(([table, rows]: any) => (
                    <div key={table} className="panel">
                      <div className="panel-header">
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 500 }}>{table}</span>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#888' }}>{rows.length} rows</span>
                          <button className="btn-sm" onClick={() => { setQuery(`SELECT * FROM ${table};`); runQuery() }}>query</button>
                        </div>
                      </div>
                      {rows.length > 0 && (
                        <table>
                          <thead><tr>{Object.keys(rows[0]).map((col: string) => <th key={col}>{col}</th>)}</tr></thead>
                          <tbody>{rows.map((row: any, i: number) => (<tr key={i}>{Object.values(row).map((v: any, j) => <td key={j}>{String(v)}</td>)}</tr>))}</tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {status?.postgres?.status === 'connected' && Object.keys(status.postgres.tables).length === 0 && (
              <div className="warn-box">No tables yet — run a CREATE TABLE query above to get started.</div>
            )}
          </div>
        )}

        {/* Redis tab */}
        {activeTab === 'redis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {status?.redis?.status === 'disconnected' && (
              <div className="warn-box">
                Redis is not connected — {status.redis.error}. Make sure the service is deployed and the tunnel is running.
              </div>
            )}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Set key</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Write key-value pairs to your Redis instance.</p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={redisKey} onChange={e => setRedisKey(e.target.value)} placeholder="key" style={{ width: 180 }} />
                <input value={redisValue} onChange={e => setRedisValue(e.target.value)} placeholder="value" style={{ width: 240 }} />
                <button className="btn" onClick={setRedis} disabled={!redisKey || !redisValue || redisLoading || status?.redis?.status !== 'connected'}>
                  {redisLoading && <span className="spinner" />}
                  {redisLoading ? 'Setting...' : 'Set'}
                </button>
              </div>
              {redisError && <div className="error-box" style={{ marginTop: 10 }}>{redisError}</div>}
            </div>
            <div className="panel">
              <div className="panel-header">
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 500 }}>keyspace</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#888' }}>{status?.redis?.keys ? Object.keys(status.redis.keys).length : 0} keys</span>
              </div>
              {status?.redis?.keys && Object.keys(status.redis.keys).length > 0 ? (
                <table>
                  <thead><tr><th>key</th><th>value</th></tr></thead>
                  <tbody>{Object.entries(status.redis.keys).map(([k, v]: any) => (<tr key={k}><td>{k}</td><td>{v}</td></tr>))}</tbody>
                </table>
              ) : (
                <div style={{ padding: 20, color: '#AAA', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {status?.redis?.status === 'connected' ? 'no keys yet — set one above' : 'connect Redis to see keys'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Minio tab */}
        {activeTab === 'minio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>MinIO Storage</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>S3-compatible object storage running on your cluster.</p>
            </div>
            <div className="panel">
              <div className="panel-header">
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 500 }}>connection details</span>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Console URL', value: 'http://127.0.0.1:50462' },
                  { label: 'Access Key', value: 'admin' },
                  { label: 'Secret Key', value: 'password123' },
                  { label: 'API Endpoint', value: 'http://127.0.0.1:9000' },
                ].map(({ label, value }) => (
                  <div key={label} className="detail-row">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="warn-box">MinIO is currently unavailable on this system due to an image architecture mismatch. This will work correctly on a real GKE cluster.</div>
          </div>
        )}

        {/* Grafana tab */}
        {activeTab === 'grafana' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Grafana</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Metrics and monitoring dashboard for your cluster.</p>
            </div>
            <div className="panel">
              <div className="panel-header">
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 500 }}>connection details</span>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'URL', value: `http://${process.env.NEXT_PUBLIC_GRAFANA_HOST || '127.0.0.1'}:${process.env.NEXT_PUBLIC_GRAFANA_PORT || '3000'}` },
                  { label: 'Username', value: 'admin' },
                  { label: 'Password', value: 'admin' },
                ].map(({ label, value }) => (
                  <div key={label} className="detail-row">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel" style={{ padding: 20 }}>
              <p style={{ fontSize: 13, color: '#666' }}>Open Grafana to set up dashboards and visualize your cluster metrics.</p>
              <button className="btn" style={{ marginTop: 16 }} onClick={() => window.open(`http://${process.env.NEXT_PUBLIC_GRAFANA_HOST || '127.0.0.1'}:${process.env.NEXT_PUBLIC_GRAFANA_PORT || '3000'}`, '_blank')}>
                Open Grafana →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}