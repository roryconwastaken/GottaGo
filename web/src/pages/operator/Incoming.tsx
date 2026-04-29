import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { useStore } from '../../lib/store'
import api from '../../lib/api'

export function OperatorIncoming() {
  const navigate = useNavigate()
  const { jobOffer, setJobOffer, setTripId } = useStore()

  const [accepting,  setAccepting]  = useState(false)
  const [declining,  setDeclining]  = useState(false)
  const [countdown,  setCountdown]  = useState(jobOffer?.expires_in_seconds ?? 30)

  // Countdown — auto-decline at zero
  useEffect(() => {
    if (!jobOffer) return
    setCountdown(jobOffer.expires_in_seconds)
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(id)
          // Offer expired server-side — go back home
          setJobOffer(null)
          navigate('/operator')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [jobOffer?.offer_id])

  const handleAccept = async () => {
    if (!jobOffer) return
    setAccepting(true)
    try {
      await api.post(`/api/match/offer/${jobOffer.offer_id}/accept`)
      // trip_id will arrive via trip.created WS event
      // useWebSocket will navigate to /operator/active once it arrives
    } catch (err: any) {
      console.error(err)
      // If offer expired or already taken, go home
      setJobOffer(null)
      navigate('/operator')
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    if (!jobOffer) return
    setDeclining(true)
    try {
      await api.post(`/api/match/offer/${jobOffer.offer_id}/reject`)
    } catch (err: any) {
      console.error(err)
    } finally {
      setJobOffer(null)
      navigate('/operator')
    }
  }

  const progressPct = jobOffer ? (countdown / jobOffer.expires_in) * 100 : 0
  const duration    = jobOffer?.duration_minutes ?? 0
  const fare        = jobOffer?.fare ?? 0

  return (
    <Layout title="Incoming job">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Countdown progress bar */}
        <div style={{ height: 3, background: '#e8e6e1', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progressPct}%`,
            background: countdown <= 10 ? '#c0392b' : '#1a5c3a',
            transition: 'width 1s linear, background 0.3s ease',
          }} />
        </div>

        {/* Alert header */}
        <div style={{
          padding: '16px 24px', background: '#f0f7f3',
          borderBottom: '1px solid #d4ece0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a5c3a', animation: 'pulse 1.2s infinite' }} />
            <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, fontWeight: 500, color: '#1a5c3a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              New job request
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontFamily: 'Geist Mono, monospace', fontSize: 22, fontWeight: 500,
              color: countdown <= 10 ? '#c0392b' : '#1a1a18',
              transition: 'color 0.3s',
            }}>{countdown}</span>
            <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#b0afa8' }}>s</span>
          </div>
        </div>

        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>

          {/* Earnings hero */}
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Estimated earnings
            </p>
            <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 52, color: '#1a5c3a', letterSpacing: '-2px', lineHeight: 1, marginBottom: 4 }}>
              SGD {fare.toFixed(2)}
            </p>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7ab89a' }}>
              SGD 1.00/min · {duration} min booked
            </p>
          </div>

          <div style={{ height: 1, background: '#e8e6e1' }} />

          {/* Job details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Duration',    value: `${duration} min` },
              { label: 'Min. charge', value: 'SGD 5.00' },
              { label: 'Rate',        value: 'SGD 1.00/min' },
              { label: 'Late fee',    value: '+SGD 3.00' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e8e6e1', borderRadius: 10 }}>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</p>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500, color: '#1a1a18' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Pickup location */}
          {jobOffer && (
            <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e8e6e1', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0f7f3', border: '1px solid #d4ece0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Pickup location</p>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, color: '#1a1a18' }}>
                  {jobOffer.pickup_lat.toFixed(5)}, {jobOffer.pickup_lng.toFixed(5)}
                </p>
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleAccept} disabled={accepting}
              style={{
                height: 52, background: accepting ? '#d4ece0' : '#1a5c3a',
                border: 'none', borderRadius: 10, color: '#fff',
                fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500,
                cursor: accepting ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {accepting ? <><Spinner />Accepting…</> : 'Accept job'}
            </button>
            <button
              onClick={handleDecline} disabled={declining}
              style={{
                height: 44, background: 'transparent', border: '1px solid #e8e6e1',
                borderRadius: 10, color: '#7a7a74', fontFamily: 'Geist Mono, monospace',
                fontSize: 13, cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fdf2f1'; e.currentTarget.style.color = '#c0392b'; e.currentTarget.style.borderColor = '#f5c6c3' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a7a74'; e.currentTarget.style.borderColor = '#e8e6e1' }}
            >
              Decline
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 3px #d4ece0; } 50% { box-shadow: 0 0 0 5px #d4ece080; } }
      `}</style>
    </Layout>
  )
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
}