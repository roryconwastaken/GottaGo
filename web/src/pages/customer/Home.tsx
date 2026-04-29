import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { useStore } from '../../lib/store'
import api from '../../lib/api'

const RATE = 1.0
const MIN  = 5.0

function calcFare(mins: number) {
  return Math.max(mins * RATE, MIN)
}

export function CustomerHome() {
  const navigate  = useNavigate()
  const { user, setOfferPayload, setOfferId } = useStore()

  const [duration, setDuration] = useState(15)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [pos,      setPos]      = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPos({ lat: coords.latitude, lng: coords.longitude }),
      ()           => setPos({ lat: -7.2575, lng: 112.7521 }),
      { enableHighAccuracy: true, timeout: 6000 }
    )
  }, [])

  const fare = calcFare(duration)
  const sliderPct = ((duration - 5) / (120 - 5)) * 100

  const handleFind = async () => {
    if (!pos) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/match/request', {
        customer_id:      user!.id,
        pickup_lat:       pos.lat,
        pickup_lng:       pos.lng,
        dropoff_lat:      pos.lat + 0.003,
        dropoff_lng:      pos.lng + 0.003,
        duration_minutes: duration,
      })
      // 202 Accepted — store the offer and go to waiting screen
      setOfferPayload(data)
      setOfferId(data.offer_id)
      navigate('/customer/waiting')
    } catch (err: any) {
      if (err.response?.status === 503) {
        setError('No operators nearby right now. Try again in a moment.')
      } else {
        setError(err.response?.data?.message ?? err.response?.data?.error ?? 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Location strip */}
        <div style={{
          padding: '10px 20px', background: '#fff',
          borderBottom: '1px solid #e8e6e1',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: pos ? '#1a5c3a' : '#b0afa8', flexShrink: 0 }} />
          <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: pos ? '#7a7a74' : '#b0afa8' }}>
            {pos ? `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : 'Locating…'}
          </span>
        </div>

        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>

          <div>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
              Book a standby
            </p>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 30, color: '#1a1a18', letterSpacing: '-0.6px', lineHeight: 1.1 }}>
              How long do you need?
            </h2>
          </div>

          {/* Duration + fare card */}
          <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #f0f0ee' }}>
              <div style={{ flex: 1, padding: '24px 20px', borderRight: '1px solid #f0f0ee' }}>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Duration</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 48, color: '#1a1a18', letterSpacing: '-2px', lineHeight: 1 }}>{duration}</span>
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 14, color: '#7a7a74' }}>min</span>
                </div>
              </div>
              <div style={{ flex: 1, padding: '24px 20px' }}>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Est. fare</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#7a7a74' }}>SGD</span>
                  <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 48, color: '#1a5c3a', letterSpacing: '-2px', lineHeight: 1 }}>{fare.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 20px 16px' }}>
              <input
                type="range" min={5} max={120} step={5} value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                style={{
                  width: '100%', height: 4, borderRadius: 2,
                  outline: 'none', border: 'none', cursor: 'pointer',
                  appearance: 'none', WebkitAppearance: 'none',
                  background: `linear-gradient(to right, #1a5c3a 0%, #1a5c3a ${sliderPct}%, #e8e6e1 ${sliderPct}%, #e8e6e1 100%)`,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8' }}>5 min</span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8' }}>120 min</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f0f0ee', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {[
                { label: 'Rate',       value: 'SGD 1.00/min' },
                { label: 'Min. charge', value: 'SGD 5.00' },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{ padding: '12px 16px', borderRight: i < arr.length - 1 ? '1px solid #f0f0ee' : 'none' }}>
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7a7a74' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: '#fdf2f1', border: '1px solid #f5c6c3', borderRadius: 10, fontFamily: 'Geist Mono, monospace', fontSize: 13, color: '#c0392b', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Late fee warning */}
          <div style={{ padding: '10px 14px', background: '#fffbf0', border: '1px solid #f5e4a0', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠</span>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#7a6200', lineHeight: 1.6 }}>
              SGD 3.00 late fee applies if the job runs over your booked time.
            </p>
          </div>

          <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#b0afa8', textAlign: 'center', lineHeight: 1.6 }}>
            You'll only be charged for actual time worked.
            <br />Estimated fare is based on booked duration.
          </p>

          <button
            onClick={handleFind}
            disabled={loading || !pos}
            style={{
              height: 52, background: loading || !pos ? '#d4ece0' : '#1a5c3a',
              border: 'none', borderRadius: 10, color: '#fff',
              fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500,
              cursor: loading || !pos ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? <><Spinner />Finding operator…</> : 'Find operator'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
}