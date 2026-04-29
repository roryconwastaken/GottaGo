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

function calcEarnings(secs: number, bookedMins: number) {
  const actual = Math.ceil(secs / 60)
  const base = actual <= 5 ? 5 : 5 + (actual - 5) * 1
  const late = actual > bookedMins ? 3 : 0
  return Math.max(base + late, 5)
}

export function OperatorActive() {
  const navigate = useNavigate()
  const { tripId, trip, setTrip } = useStore()

  const [started,    setStarted]    = useState(false)
  const [startTs,    setStartTs]    = useState<number | null>(null)
  const [elapsed,    setElapsed]    = useState(0)
  const [starting,   setStarting]   = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (trip?.status === 'in_progress' && trip.started_at && !started) {
      setStartTs(new Date(trip.started_at).getTime())
      setStarted(true)
    }
  }, [trip?.status])

  useEffect(() => {
    if (!started || !startTs) return
    const tick = () => setElapsed(Math.floor((Date.now() - startTs) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [started, startTs])

  useEffect(() => {
    if (!tripId) return
    const poll = async () => {
      try {
        const { data } = await api.get(`/api/trips/${tripId}`)
        setTrip(data)
        if (data.status === 'cancelled') navigate('/operator')
      } catch {}
    }
    poll()
    const id = setInterval(poll, 6000)
    return () => clearInterval(id)
  }, [tripId])

  const handleStart = async () => {
    console.log('tripId:', tripId)
    console.log('trip:', trip)
    if (!tripId) return
    setStarting(true)
    try {
      await api.post(`/api/trips/${tripId}/start`)
      setStartTs(Date.now())
      setStarted(true)
    } catch (err: any) {
      console.error(err)
    } finally {
      setStarting(false)
    }
  }

  const handleComplete = async () => {
    if (!tripId) return
    setCompleting(true)
    try {
      await api.post(`/api/trips/${tripId}/complete`)
      navigate('/operator/done')
    } catch (err: any) {
      console.error(err)
    } finally {
      setCompleting(false)
    }
  }

  // bookedMins first — everything else depends on it
  const bookedMins       = trip?.duration_minutes ?? 0
  const elapsedMinsFloor = Math.floor(elapsed / 60)  // display + remaining
  const elapsedMinsCeil  = Math.ceil(elapsed / 60)   // billing + late fee trigger
  const earnings         = calcEarnings(elapsed, bookedMins)
  const progressPct      = bookedMins > 0 ? Math.min((elapsedMinsFloor / bookedMins) * 100, 100) : 0
  const overTime         = bookedMins > 0 && elapsedMinsCeil > bookedMins
  const remaining        = Math.max(bookedMins - elapsedMinsFloor, 0)

  return (
    <Layout title="Active job">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        <div style={{
          padding: '14px 24px',
          background: started ? '#f0f7f3' : '#f8f7f5',
          borderBottom: `1px solid ${started ? '#d4ece0' : '#e8e6e1'}`,
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'all 0.4s ease',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: started ? '#1a5c3a' : '#b0afa8',
            transition: 'background 0.4s ease',
          }} />
          <span style={{
            fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.07em',
            color: started ? '#1a5c3a' : '#b0afa8',
            transition: 'color 0.4s ease',
          }}>
            {started ? 'Job in progress' : 'Ready to start'}
          </span>
        </div>

        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

          <div style={{
            background: '#fff',
            border: `1.5px solid ${started ? '#d4ece0' : '#e8e6e1'}`,
            borderRadius: 16, padding: '32px 24px 24px',
            textAlign: 'center', transition: 'border-color 0.4s ease',
          }}>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              {started ? 'Elapsed time' : 'Timer'}
            </p>

            <p style={{
              fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 64,
              letterSpacing: '-3px', lineHeight: 1,
              color: started ? '#1a1a18' : '#e8e6e1',
              transition: 'color 0.4s ease', marginBottom: 24,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmt(elapsed)}
            </p>

            {bookedMins > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 3, background: '#f8f7f5', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${progressPct}%`,
                    background: overTime ? '#c0392b' : '#1a5c3a',
                    borderRadius: 2, transition: 'width 1s linear, background 0.3s',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8' }}>0 min</span>
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8' }}>{bookedMins} min booked</span>
                </div>
              </div>
            )}

            {started && bookedMins > 0 && (
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

            <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
              <div>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                  Earned
                </p>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 26, fontWeight: 500, color: started ? '#1a5c3a' : '#e8e6e1', transition: 'color 0.4s ease' }}>
                  SGD {earnings.toFixed(2)}
                </p>
              </div>
              <div>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                  Booked
                </p>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 26, fontWeight: 500, color: '#1a1a18' }}>
                  {bookedMins} min
                </p>
              </div>
            </div>
          </div>

          {!started && (
            <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e8e6e1', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f8f7f5', border: '1px solid #e8e6e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#7a7a74' }}>i</div>
              <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7a7a74', lineHeight: 1.6 }}>
                Only tap <strong style={{ color: '#1a1a18', fontWeight: 500 }}>Start Job</strong> once you've arrived at the customer's location. The timer starts immediately.
              </p>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {!started ? (
            <button
              onClick={handleStart} disabled={starting}
              style={{ height: 52, background: starting ? '#d4ece0' : '#1a5c3a', border: 'none', borderRadius: 10, color: '#fff', fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500, cursor: starting ? 'not-allowed' : 'pointer', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {starting ? <><Spinner /> Starting...</> : 'Start job'}
            </button>
          ) : (
            <button
              onClick={handleComplete} disabled={completing}
              style={{ height: 52, background: completing ? '#f5c6c3' : '#c0392b', border: 'none', borderRadius: 10, color: '#fff', fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500, cursor: completing ? 'not-allowed' : 'pointer', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {completing ? <><Spinner /> Completing...</> : 'Complete job'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  )
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
}