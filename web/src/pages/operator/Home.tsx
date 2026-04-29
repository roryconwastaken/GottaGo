import React, { useState, useEffect } from 'react'
import { Layout } from '../../components/Layout'
import { useStore } from '../../lib/store'
import { useLocationPing } from '../../lib/useLocationPing'
import api from '../../lib/api'

export function OperatorHome() {
  const { isOnline, setOnline, user } = useStore()
  const [toggling, setToggling] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useLocationPing(isOnline)

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const handleToggle = async () => {
    setToggling(true)
    try {
      if (isOnline) {
        // Going offline — tell the backend explicitly
        await api.post('/api/operator/offline', { operator_id: user!.id })
      }
      setOnline(!isOnline)
    } catch (err) {
      // Non-fatal — TTL will clean up Redis within 10s anyway
      console.warn('[offline] explicit call failed, TTL will handle it:', err)
      setOnline(!isOnline)
    } finally {
      setToggling(false)
    }
  }

  const timeStr = currentTime.toLocaleTimeString('en-SG', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })

  return (
    <Layout>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Status banner */}
        <div style={{
          background: isOnline ? '#f0f7f3' : '#f8f7f5',
          borderBottom: `1px solid ${isOnline ? '#d4ece0' : '#e8e6e1'}`,
          padding: '20px 24px',
          transition: 'background 0.4s ease, border-color 0.4s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: isOnline ? '#1a5c3a' : '#b0afa8',
                  transition: 'background 0.4s ease',
                  boxShadow: isOnline ? '0 0 0 3px #d4ece0' : 'none',
                }} />
                <span style={{
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: 11, fontWeight: 500,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  color: isOnline ? '#1a5c3a' : '#b0afa8',
                  transition: 'color 0.4s ease',
                }}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p style={{
                fontFamily: 'Fraunces, serif', fontWeight: 300,
                fontSize: 26, color: '#1a1a18', letterSpacing: '-0.5px', lineHeight: 1.1,
              }}>
                {isOnline ? 'Waiting for jobs' : 'You\'re not visible'}
              </p>
            </div>

            {/* Live clock */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 22, fontWeight: 300, color: '#1a1a18', letterSpacing: '-0.5px' }}>
                {timeStr}
              </p>
              <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#b0afa8', marginTop: 2 }}>
                {currentTime.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 28, flex: 1 }}>

          {/* Toggle button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <button
              onClick={handleToggle}
              disabled={toggling}
              style={{
                width: 120, height: 120, borderRadius: '50%',
                border: `2.5px solid ${isOnline ? '#1a5c3a' : '#e8e6e1'}`,
                background: isOnline ? '#f0f7f3' : '#fff',
                cursor: toggling ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.35s ease',
                opacity: toggling ? 0.6 : 1,
                boxShadow: isOnline ? '0 0 0 6px #d4ece040' : 'none',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke={isOnline ? '#1a5c3a' : '#b0afa8'} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'stroke 0.35s ease' }}>
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
              <span style={{
                fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 500,
                color: isOnline ? '#1a5c3a' : '#b0afa8',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                transition: 'color 0.35s ease',
              }}>
                {toggling ? '...' : isOnline ? 'Go offline' : 'Go online'}
              </span>
            </button>

            {isOnline && (
              <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7ab89a', textAlign: 'center' }}>
                Broadcasting location every 3s
              </p>
            )}
          </div>

          <div style={{ height: 1, background: '#e8e6e1' }} />

          {/* How it works */}
          <div>
            <p style={{
              fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.07em',
              color: '#b0afa8', marginBottom: 16,
            }}>How it works</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { n: '01', title: 'Go online',    desc: 'Your location broadcasts every 3 seconds to nearby customers.' },
                { n: '02', title: 'Accept a job', desc: 'You\'ll get a 30-second window to accept or decline each offer.' },
                { n: '03', title: 'Start the timer', desc: 'Tap Start Job once you arrive at the pickup location.' },
                { n: '04', title: 'Get paid',     desc: 'Earnings are calculated from actual minutes worked.' },
              ].map(({ n, title, desc }, i, arr) => (
                <div key={n} style={{ display: 'flex', gap: 16, paddingBottom: i < arr.length - 1 ? 20 : 0, position: 'relative' }}>
                  {i < arr.length - 1 && (
                    <div style={{ position: 'absolute', left: 15, top: 28, width: 1, height: 'calc(100% - 8px)', background: '#e8e6e1' }} />
                  )}
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    border: '1px solid #e8e6e1', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#7a7a74', fontWeight: 500,
                  }}>{n}</div>
                  <div style={{ paddingTop: 5 }}>
                    <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, fontWeight: 500, color: '#1a1a18', marginBottom: 3 }}>{title}</p>
                    <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7a7a74', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}