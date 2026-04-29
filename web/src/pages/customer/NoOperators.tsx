import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { useStore } from '../../lib/store'

export function CustomerNoOperators() {
  const navigate = useNavigate()
  const { setOfferId, setOfferPayload, setMatchPayload } = useStore()

  const handleRetry = () => {
    setOfferId(null)
    setOfferPayload(null)
    setMatchPayload(null)
    navigate('/customer')
  }

  return (
    <Layout title="No operators found">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 24 }}>

        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#fdf2f1', border: '1.5px solid #f5c6c3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 26, color: '#1a1a18', letterSpacing: '-0.4px', marginBottom: 8 }}>
            No operators available
          </h2>
          <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, color: '#7a7a74', lineHeight: 1.6, maxWidth: 280 }}>
            All nearby operators are busy right now. Try again in a few minutes.
          </p>
        </div>

        <button
          onClick={handleRetry}
          style={{
            height: 52, width: '100%', maxWidth: 320,
            background: '#1a5c3a', border: 'none', borderRadius: 10,
            color: '#fff', fontFamily: 'Geist Mono, monospace',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </Layout>
  )
}