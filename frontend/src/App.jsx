import { useState, useEffect, useRef, useCallback } from 'react'
import {
  StreamVideo,
  StreamCall,
  StreamVideoClient,
  useCallStateHooks,
  ParticipantView,
  useCall,
} from '@stream-io/video-react-sdk'
import '@stream-io/video-react-sdk/dist/css/styles.css'

// ── Styles ──────────────────────────────────────────────
const S = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #0f1117 50%, #0a0f1a 100%)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 28px',
    borderBottom: '1px solid #1e2a3a',
    background: 'rgba(10,15,26,0.95)',
    backdropFilter: 'blur(10px)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    boxShadow: '0 0 20px rgba(239,68,68,0.4)',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 800,
    background: 'linear-gradient(90deg, #ef4444, #f97316)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: 2,
  },
  statusBadge: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 16px',
    borderRadius: 20,
    border: `1px solid ${active ? '#22c55e40' : '#ef444440'}`,
    background: active ? '#22c55e10' : '#ef444410',
    fontSize: 13,
    fontWeight: 600,
    color: active ? '#22c55e' : '#ef4444',
    letterSpacing: 1,
  }),
  dot: (active) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: active ? '#22c55e' : '#ef4444',
    animation: active ? 'pulse 1.5s infinite' : 'none',
    boxShadow: active ? '0 0 8px #22c55e' : 'none',
  }),
  main: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: 0,
    height: 'calc(100vh - 69px)',
  },
  videoSection: {
    display: 'flex',
    flexDirection: 'column',
    padding: 20,
    gap: 16,
    borderRight: '1px solid #1e2a3a',
  },
  videoContainer: {
    flex: 1,
    background: '#060810',
    borderRadius: 12,
    border: '1px solid #1e2a3a',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 400,
  },
  videoLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    background: 'rgba(0,0,0,0.7)',
    color: '#94a3b8',
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 4,
    letterSpacing: 1,
    zIndex: 10,
    fontFamily: 'monospace',
  },
  recordingDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(0,0,0,0.7)',
    padding: '4px 10px',
    borderRadius: 4,
    zIndex: 10,
    fontSize: 11,
    color: '#ef4444',
    fontWeight: 600,
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  panel: {
    padding: '16px 20px',
    borderBottom: '1px solid #1e2a3a',
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  alertLog: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  alertItem: (severity) => ({
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${severity === 'high' ? '#ef444430' : severity === 'med' ? '#f9731630' : '#22c55e20'}`,
    background: severity === 'high' ? '#ef44440a' : severity === 'med' ? '#f973160a' : '#22c55e08',
    fontSize: 12,
  }),
  alertTitle: (severity) => ({
    fontWeight: 700,
    color: severity === 'high' ? '#ef4444' : severity === 'med' ? '#f97316' : '#22c55e',
    marginBottom: 4,
    display: 'flex',
    justifyContent: 'space-between',
  }),
  alertTime: {
    fontSize: 10,
    color: '#475569',
    fontFamily: 'monospace',
  },
  threatTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    background: '#1e293b',
    border: '1px solid #334155',
    fontSize: 12,
    color: '#94a3b8',
    margin: '3px 3px',
    cursor: 'pointer',
  },
  threatInput: {
    width: '100%',
    background: '#0f1117',
    border: '1px solid #1e2a3a',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
    marginTop: 8,
  },
  joinBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: 'none',
    borderRadius: 10,
    color: 'white',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 1,
    boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
    transition: 'all 0.2s',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 0',
    flex: 1,
  },
  statNum: {
    fontSize: 28,
    fontWeight: 800,
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
}

// ── Alert Log Component ────────────────────────────────────
function AlertLog({ alerts }) {
  const bottomRef = useRef(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [alerts])

  if (alerts.length === 0) {
    return (
      <div style={S.alertLog}>
        <div style={{ textAlign: 'center', color: '#334155', marginTop: 40, fontSize: 13 }}>
          🟢 No threats detected yet.<br />
          <span style={{ fontSize: 11, color: '#1e293b' }}>System is monitoring...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={S.alertLog}>
      {alerts.map((a, i) => (
        <div key={i} style={S.alertItem(a.severity)}>
          <div style={S.alertTitle(a.severity)}>
            <span>{a.severity === 'high' ? '🚨' : a.severity === 'med' ? '⚠️' : '✅'} {a.label}</span>
            <span style={S.alertTime}>{a.time}</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{a.detail}</div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

// ── Video Feed Component ───────────────────────────────────
function VideoFeed() {
  const { useParticipants } = useCallStateHooks()
  const participants = useParticipants()
  const me = participants.find(p => p.isLocalParticipant)
  const sentinel = participants.find(p => !p.isLocalParticipant)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: sentinel ? '1fr 1fr' : '1fr', gap: 12, height: '100%', padding: 12 }}>
      {me && (
        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#060810' }}>
          <div style={S.videoLabel}>📷 CAMERA FEED</div>
          <div style={S.recordingDot}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
            REC
          </div>
          <ParticipantView participant={me} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {sentinel && (
        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#060810' }}>
          <div style={S.videoLabel}>🤖 SENTINEL AI</div>
          <ParticipantView participant={sentinel} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {!me && !sentinel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 40 }}>📡</div>
          <div style={{ fontSize: 13 }}>Connecting to feed...</div>
        </div>
      )}
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [client, setClient] = useState(null)
  const [call, setCall] = useState(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [threats, setThreats] = useState(['knife', 'person fallen', 'fire', 'gun', 'unattended bag'])
  const [newThreat, setNewThreat] = useState('')
  const [stats, setStats] = useState({ total: 0, high: 0, session: '00:00' })
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  // Session timer
  useEffect(() => {
    if (active) {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0')
        const s = String(elapsed % 60).padStart(2, '0')
        setStats(prev => ({ ...prev, session: `${m}:${s}` }))
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [active])

  // Simulate detection alerts for demo (replace with real WebSocket later)
  const addAlert = useCallback((label, detail, severity = 'high') => {
    const time = new Date().toLocaleTimeString()
    setAlerts(prev => [...prev, { label, detail, severity, time }])
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      high: severity === 'high' ? prev.high + 1 : prev.high,
    }))
  }, [])

  const handleJoin = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'operator-1', user_name: 'Security Operator' }),
      })
      const data = await res.json()

      const videoClient = new StreamVideoClient({
        apiKey: data.api_key,
        user: { id: data.user_id, name: data.user_name },
        token: data.token,
      })

      const videoCall = videoClient.call(data.call_type, data.call_id)
      await videoCall.join({ create: true })

      setClient(videoClient)
      setCall(videoCall)
      setActive(true)
      addAlert('SYSTEM ONLINE', 'SentinelAI surveillance active. Monitoring feed.', 'med')
    } catch (err) {
      console.error('Failed to join:', err)
      addAlert('CONNECTION ERROR', err.message, 'high')
    }
    setLoading(false)
  }

  const handleDisconnect = async () => {
    await call?.leave()
    await client?.disconnectUser()
    setCall(null)
    setClient(null)
    setActive(false)
    clearInterval(timerRef.current)
  }

  const addThreat = (e) => {
    e.preventDefault()
    if (newThreat.trim() && !threats.includes(newThreat.trim())) {
      setThreats(prev => [...prev, newThreat.trim()])
      addAlert(`WATCHLIST UPDATED`, `Now monitoring: "${newThreat.trim()}"`, 'med')
      setNewThreat('')
    }
  }

  const removeThreat = (t) => {
    setThreats(prev => prev.filter(x => x !== t))
  }

  return (
    <div style={S.app}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.2)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0a0a0f}
        ::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:4px}
        input::placeholder{color:#334155}
      `}</style>

      {/* Header */}
      <header style={S.header}>
        <div style={S.logo}>
          <div style={S.logoIcon}>🛡️</div>
          <div>
            <div style={S.logoText}>SENTINELAI</div>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: 2 }}>REAL-TIME SURVEILLANCE SYSTEM</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['DETECTIONS', stats.total], ['HIGH ALERTS', stats.high], ['SESSION', stats.session]].map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>{v}</div>
                <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={S.statusBadge(active)}>
            <div style={S.dot(active)} />
            {active ? 'MONITORING' : 'OFFLINE'}
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={S.main}>

        {/* Left: Video */}
        <div style={S.videoSection}>
          <div style={S.videoContainer}>
            {active && client && call ? (
              <StreamVideo client={client}>
                <StreamCall call={call}>
                  <VideoFeed />
                </StreamCall>
              </StreamVideo>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
                <div style={{ fontSize: 60 }}>🔒</div>
                <div style={{ color: '#334155', fontSize: 15, letterSpacing: 2 }}>FEED OFFLINE</div>
                <div style={{ color: '#1e293b', fontSize: 12 }}>Start monitoring to activate camera</div>
              </div>
            )}
          </div>

          {/* Connect Button */}
          <button
            style={{
              ...S.joinBtn,
              background: active
                ? 'linear-gradient(135deg, #374151, #1f2937)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              opacity: loading ? 0.7 : 1,
            }}
            onClick={active ? handleDisconnect : handleJoin}
            disabled={loading}
          >
            {loading ? '⏳ CONNECTING...' : active ? '⏹ STOP MONITORING' : '▶ START MONITORING'}
          </button>
        </div>

        {/* Right: Sidebar */}
        <div style={S.sidebar}>

          {/* Watchlist */}
          <div style={S.panel}>
            <div style={S.panelTitle}>👁 Active Watchlist ({threats.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {threats.map(t => (
                <div key={t} style={S.threatTag} onClick={() => removeThreat(t)} title="Click to remove">
                  🎯 {t} <span style={{ color: '#ef4444', fontSize: 10 }}>✕</span>
                </div>
              ))}
            </div>
            <form onSubmit={addThreat}>
              <input
                style={S.threatInput}
                value={newThreat}
                onChange={e => setNewThreat(e.target.value)}
                placeholder="+ Add threat (e.g. smoke, crowd)"
                maxLength={40}
              />
            </form>
          </div>

          {/* Alert Log */}
          <div style={{ padding: '12px 20px 6px', borderBottom: '1px solid #1e2a3a' }}>
            <div style={S.panelTitle}>🚨 Alert Log</div>
          </div>
          <AlertLog alerts={alerts} />

        </div>
      </main>
    </div>
  )
}
