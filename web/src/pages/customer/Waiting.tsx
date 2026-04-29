import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { useStore } from '../../lib/store'
import api from '../../lib/api'

export function CustomerWaiting() {
  const navigate = useNavigate()
  const {
    offerPayload, offerId, matchPayload,
    tripId, setTripId, setOfferId, setOfferPayload,
    setMatchPayload, setTrip,
  } = useStore()

  const [cancelling, setCancelling] = useState(false)
  const [countdown,  setCountdown]  = useState(offerPayload?.expires_in ?? 30)
  const [phase, setPhase] = useState<'searching' | 'matched'>('searching')

  // Switch to matched phase when match.found arrives
  useEffect(() => {
    if (matchPayload) setPhase('matched')
  }, [matchPayload])

  // Countdown — resets when a new offer arrives
  useEffect(() => {
    if (phase === 'matched') return
    setCountdown(offerPayload?.expires_in ?? 30)
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [offerPayload?.offer_id, phase])

  // Client-side fallback: redirect if still searching after offer expires
  useEffect(() => {
    if (phase !== 'searching') return
    const expiresIn = offerPayload?.expires_in ?? 30
    const id = setTimeout(() => {
      setOfferId(null)
      setOfferPayload(null)
      navigate('/customer/no-operators')
    }, (expiresIn + 2) * 1000)
    return () => clearTimeout(id)
  }, [offerPayload?.offer_id, phase])

  // Poll trip as WS fallback once we have a trip_id
  useEffect(() => {
    if (!tripId) return
    const poll = async () => {
      try {
        const { data } = await api.get(`/api/trips/${tripId}`)
        setTrip(data)
        if (data.status === 'in_progress') navigate('/customer/active')
        if (data.status === 'cancelled')   navigate('/customer')
      } catch {}
    }
    const id = setInterval(poll, 4000)
    return () => clearInterval(id)
  }, [tripId])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      if (offerId) {
        // Offer exists but no trip yet — cancel the offer
        await api.post(`/api/match/offer/${offerId}/cancel`)
      } else if (tripId) {
        // Trip already created — cancel the trip
        await api.post(`/api/trips/${tripId}/cancel`)
      }
    } catch (err) {
      console.warn('[cancel]', err)
    }
    setTripId(null)
    setOfferId(null)
    setOfferPayload(null)
    setMatchPayload(null)
    navigate('/customer')
  }

  const progressPct = ((offerPayload?.expires_in ?? 30) > 0)
    ? (countdown / (offerPayload?.expires_in ?? 30)) * 100
    : 0

  return (
    <Layout title="Finding operator">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#f0f0ee', position: 'relative', overflow: 'hidden' }}>
          {phase === 'searching' ? (
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              width: '40%', background: '#1a5c3a', borderRadius: 2,
              animation: 'slide-bar 1.8s ease-in-out infinite',
            }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: '#1a5c3a' }} />
          )}
        </div>

        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>

          {phase === 'searching' ? (
            <>
              {/* Searching state */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: '1.5px solid #d4ece0',
                    animation: 'ring-pulse 1.6s ease-out infinite',
                  }} />
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: '#f0f7f3', border: '1.5px solid #d4ece0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 24, color: '#1a1a18', letterSpacing: '-0.4px', marginBottom: 3 }}>
                    Finding your operator
                  </h2>
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7a7a74' }}>
                    Waiting for someone to accept · {countdown}s
                  </p>
                </div>
              </div>

              {/* Countdown ring */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f0f0ee" strokeWidth="6" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={countdown <= 10 ? '#c0392b' : '#1a5c3a'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPct / 100)}`}
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                  />
                  <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
                    style={{ fontFamily: 'Geist Mono, monospace', fontSize: 24, fontWeight: 500, fill: countdown <= 10 ? '#c0392b' : '#1a1a18' }}>
                    {countdown}
                  </text>
                </svg>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#b0afa8', marginTop: 8 }}>
                  seconds remaining
                </p>
              </div>

              {offerPayload && (
                <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 18px', borderBottom: '1px solid #f0f0ee' }}>
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 500, color: '#7a7a74', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Your request
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    {[
                      { label: 'Duration', value: `${offerPayload.duration_minutes} min` },
                      { label: 'Est. fare', value: `SGD ${offerPayload.fare.toFixed(2)}`, green: true },
                    ].map(({ label, value, green }, i, arr) => (
                      <div key={label} style={{ padding: '14px 18px', borderRight: i < arr.length - 1 ? '1px solid #f0f0ee' : 'none' }}>
                        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</p>
                        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500, color: green ? '#1a5c3a' : '#1a1a18' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e8e6e1', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f8f7f5', border: '1px solid #e8e6e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#7a7a74' }}>i</div>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7a7a74', lineHeight: 1.6 }}>
                  We're finding the nearest available operator. This may take a moment if operators are busy.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Matched state */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#f0f7f3', border: '1.5px solid #d4ece0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 24, color: '#1a1a18', letterSpacing: '-0.4px', marginBottom: 3 }}>
                    Operator confirmed
                  </h2>
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7ab89a' }}>
                    On the way · job starts when they arrive
                  </p>
                </div>
              </div>

              {matchPayload && (
                <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 500, color: '#7a7a74', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Job confirmed</span>
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#f0f7f3', color: '#1a5c3a', border: '1px solid #d4ece0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>matched</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    {[
                      { label: 'Duration',  value: `${matchPayload.duration_minutes} min` },
                      { label: 'Est. fare', value: `SGD ${(matchPayload.fare ?? 0).toFixed(2)}`, green: true },
                      { label: 'Pickup',    value: `${matchPayload.pickup_lat.toFixed(4)}, ${matchPayload.pickup_lng.toFixed(4)}` },
                      { label: 'Late fee',  value: 'SGD 3.00' },
                    ].map(({ label, value, green }, i, arr) => (
                      <div key={label} style={{ padding: '14px 18px', borderRight: i % 2 === 0 ? '1px solid #f0f0ee' : 'none', borderBottom: i < arr.length - 2 ? '1px solid #f0f0ee' : 'none' }}>
                        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</p>
                        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500, color: green ? '#1a5c3a' : '#1a1a18' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e8e6e1', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f8f7f5', border: '1px solid #e8e6e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#7a7a74' }}>i</div>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7a7a74', lineHeight: 1.6 }}>
                  Your timer and billing only begin once the operator taps <strong style={{ color: '#1a1a18', fontWeight: 500 }}>Start Job</strong> at your location.
                </p>
              </div>
            </>
          )}

          <div style={{ flex: 1 }} />

          <button
            onClick={handleCancel} disabled={cancelling}
            style={{
              height: 44, background: 'transparent', border: '1px solid #e8e6e1',
              borderRadius: 10, color: cancelling ? '#b0afa8' : '#c0392b',
              fontFamily: 'Geist Mono, monospace', fontSize: 13,
              cursor: cancelling ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!cancelling) { e.currentTarget.style.background = '#fdf2f1'; e.currentTarget.style.borderColor = '#f5c6c3' } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e8e6e1' }}
          >
            {cancelling ? <><Spinner color="#b0afa8" />Cancelling…</> : 'Cancel request'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-bar { 0% { left: -40%; } 100% { left: 100%; } }
        @keyframes ring-pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.7); opacity: 0; } }
      `}</style>
    </Layout>
  )
}

function Spinner({ color = '#fff' }: { color?: string }) {
  return <div style={{ width: 14, height: 14, border: `2px solid ${color}40`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
}