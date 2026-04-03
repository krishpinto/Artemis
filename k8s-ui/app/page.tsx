'use client'
import { useState, useEffect } from 'react'

const SERVICES = [
  {
    id: 'postgres',
    name: 'PostgreSQL',
    desc: 'Relational database engine',
    port: '5432',
    icon: '🐘',
    tag: 'Database'
  },
  {
    id: 'redis',
    name: 'Redis',
    desc: 'In-memory cache & store',
    port: '6379',
    icon: '⚡',
    tag: 'Cache'
  }
]

export default function Home() {
  const [selected, setSelected] = useState<string[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const deploy = async () => {
    setLoading(true)
    setResults([])
    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services: selected })
    })
    const data = await res.json()
    setResults(data.results)
    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      color: '#111'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .card { 
          background: white; 
          border: 1.5px solid #E8E8E4; 
          border-radius: 12px; 
          padding: 20px 24px;
          cursor: pointer;
          transition: all 0.15s ease;
          position: relative;
          overflow: hidden;
        }
        .card:hover { border-color: #C0C0B8; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .card.selected { border-color: #111; background: #FDFDFB; }
        .card.selected::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: #111;
        }
        .tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: #888;
          background: #F2F2EE;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .deploy-btn {
          background: #111;
          color: white;
          border: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          letter-spacing: 0.01em;
        }
        .deploy-btn:hover:not(:disabled) { background: #333; }
        .deploy-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .result {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
        }
        .result.success { background: #F0FBF4; border: 1px solid #C3E8CF; color: #166534; }
        .result.error { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; }
        .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dot.success { background: #22C55E; }
        .dot.error { background: #EF4444; }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .checkmark {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #111;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          flex-shrink: 0;
        }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid #E8E8E4',
        background: 'white',
        padding: '0 48px',
        display: 'flex',
        alignItems: 'center',
        height: 56
      }}>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.02em'
        }}>k8s-provisioner</span>
        <span style={{
          marginLeft: 12,
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          color: '#888',
          background: '#F2F2EE',
          padding: '2px 8px',
          borderRadius: 4
        }}>local cluster</span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '52px 24px' }}>

        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Deploy infrastructure
          </h1>
          <p style={{ fontSize: 14, color: '#666', fontWeight: 300 }}>
            Select services to provision on your Kubernetes cluster. Each deploys as an isolated container with a dedicated endpoint.
          </p>
        </div>

        {/* Service cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {SERVICES.map(s => (
            <div
              key={s.id}
              className={`card ${selected.includes(s.id) ? 'selected' : ''}`}
              onClick={() => toggle(s.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="tag">{s.tag}</span>
                  {selected.includes(s.id) && (
                    <div className="checkmark">✓</div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{s.desc}</div>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                color: '#AAA',
                borderTop: '1px solid #F0F0EC',
                paddingTop: 10
              }}>
                :{s.port}
              </div>
            </div>
          ))}
        </div>

        {/* Deploy button */}
        <button
          className="deploy-btn"
          onClick={deploy}
          disabled={selected.length === 0 || loading}
        >
          {loading && <span className="spinner" />}
          {loading ? 'Provisioning...' : `Deploy ${selected.length > 0 ? `${selected.length} service${selected.length > 1 ? 's' : ''}` : 'services'}`}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#888', marginBottom: 10, letterSpacing: '0.06em' }}>
              DEPLOYMENT LOG
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map((r, i) => (
                <div key={i} className={`result ${r.status === 'deployed' ? 'success' : 'error'}`}>
                  <div className={`dot ${r.status === 'deployed' ? 'success' : 'error'}`} />
                  <span>{r.service}</span>
                  <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
                    {r.status === 'deployed' ? 'running' : r.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}