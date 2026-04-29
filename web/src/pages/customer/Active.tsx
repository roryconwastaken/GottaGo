import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { useStore } from '../../lib/store'
import api from '../../lib/api'

function fmt(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function calcFare(secs: number, bookedMins: number) {
  const actual = Math.ceil(secs / 60)
  const base = actual <= 5 ? 5 : 5 + (actual - 5) * 1
  const late = actual > bookedMins ? 3 : 0
  return Math.max(base + late, 5)
}

export function CustomerActive() {
  const navigate = useNavigate()
  const { tripId, trip, setTrip } = useStore()

  const [elapsed, setElapsed] = useState(0)
  const [startTs, setStartTs] = useState<number | null>(null)

  useEffect(() => {
    if (trip?.started_at && !startTs) {
      setStartTs(new Date(trip.started_at).getTime())
    }
  }, [trip?.started_at])

  useEffect(() => {
    if (startTs) {
      const tick = () => setElapsed(Math.floor((Date.now() - startTs) / 1000))
      tick()
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    } else {
      const id = setInterval(() => setElapsed(s => s + 1), 1000)
      return () => clearInterval(id)
    }
  }, [startTs])

  useEffect(() => {
    if (!tripId) return
    const poll = async () => {
      try {
        const { data } = await api.get(`/api/trips/${tripId}`)
        setTrip(data)
        if (data.status === 'completed') navigate('/customer/done')
        if (data.status === 'cancelled') navigate('/customer')
      } catch {}
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [tripId])

  // bookedMins first — everything else depends on it
  const bookedMins       = trip?.duration_minutes ?? 0
  const elapsedMinsFloor = Math.floor(elapsed / 60)  // display + remaining
  const elapsedMinsCeil  = Math.ceil(elapsed / 60)   // billing + late fee trigger
  const fare             = calcFare(elapsed, bookedMins)
  const progressPct      = bookedMins > 0 ? Math.min((elapsedMinsFloor / bookedMins) * 100, 100) : 0
  const overTime         = bookedMins > 0 && elapsedMinsCeil > bookedMins
  const remaining        = Math.max(bookedMins - elapsedMinsFloor, 0)

  return (
    <Layout title="Job in progress">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        <div style={{
          padding: '12px 24px',
          background: '#f0f7f3',
          borderBottom: '1px solid #d4ece0',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#1a5c3a',
            animation: 'live-dot 1.4s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 500,
            color: '#1a5c3a', textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>Live · billing active</span>
        </div>

        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

          <div style={{
            background: '#fff', border: '1px solid #e8e6e1',
            borderRadius: 16, padding: '32px 24px 24px', textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Elapsed time
            </p>

            <p style={{
              fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 72,
              color: '#1a1a18', letterSpacing: '-4px', lineHeight: 1,
              marginBottom: 24, fontVariantNumeric: 'tabular-nums',
            }}>
              {fmt(elapsed)}
            </p>

            {bookedMins > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 3, background: '#f0f0ee', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${progressPct}%`,
                    background: overTime ? '#c0392b' : '#1a5c3a',
                    borderRadius: 2, transition: 'width 1s linear, background 0.3s',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8' }}>0</span>
                  <span style={{
                    fontFamily: 'Geist Mono, monospace', fontSize: 10,
                    color: overTime ? '#c0392b' : '#b0afa8', transition: 'color 0.3s',
                  }}>
                    {bookedMins} min booked
                  </span>
                </div>
              </div>
            )}

            {bookedMins > 0 && (
              <div style={{
                marginBottom: 16, padding: '8px 14px',
                background: overTime ? '#fdf2f1' : '#f0f7f3',
                border: `1px solid ${overTime ? '#f5c6c3' : '#d4ece0'}`,
                borderRadius: 8, fontFamily: 'Geist Mono, monospace', fontSize: 12,
                color: overTime ? '#c0392b' : '#1a5c3a',
                transition: 'all 0.3s ease',
              }}>
                {overTime
                  ? `Late fee applied (+SGD 3.00) · ${elapsedMinsCeil - bookedMins} min over`
                  : `${remaining} min remaining before late fee`}
              </div>
            )}

            <div style={{ height: 1, background: '#f0f0ee', marginBottom: 20 }} />

            <div style={{ display: 'flex', justifyContent: 'center', gap: 48 }}>
              <div>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                  Current fare
                </p>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 26, fontWeight: 500, color: '#1a5c3a' }}>
                  SGD {fare.toFixed(2)}
                </p>
              </div>
              {bookedMins > 0 && (
                <div>
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                    Booked
                  </p>
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 26, fontWeight: 500, color: '#7a7a74' }}>
                    {bookedMins} min
                  </p>
                </div>
              )}
            </div>
          </div>

          {overTime && (
            <div style={{
              padding: '12px 16px', background: '#fdf2f1',
              border: '1px solid #f5c6c3', borderRadius: 10,
              fontFamily: 'Geist Mono, monospace', fontSize: 12,
              color: '#c0392b', lineHeight: 1.6,
            }}>
              <p style={{ fontWeight: 500, marginBottom: 3 }}>Late fee applied — SGD 3.00</p>
              <p>You've exceeded your booked time. Extra minutes bill at SGD 1.00/min.</p>
            </div>
          )}

          <div style={{
            padding: '14px 16px', background: '#fff',
            border: '1px solid #e8e6e1', borderRadius: 10,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: '#f8f7f5', border: '1px solid #e8e6e1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1,
              fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#7a7a74',
            }}>i</div>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7a7a74', lineHeight: 1.6 }}>
              Billing stops automatically when the operator marks the job complete. Final charge rounds up to the nearest minute.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes live-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </Layout>
  )
}