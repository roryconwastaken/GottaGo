import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { useStore } from '../../lib/store'

export function OperatorDone() {
  const navigate = useNavigate()
  const { paymentPayload, setPaymentPayload, setTripId, setMatchPayload } = useStore()

  const handleDone = () => {
    setPaymentPayload(null)
    setTripId(null)
    setMatchPayload(null)
    navigate('/operator')
  }

  const p = paymentPayload

  const baseFare  = 5.00
  const extraMins = p ? Math.max(p.actual_minutes - 5, 0) : 0
  const extraFare = extraMins * 1.00
  const lateFee   = p?.late_fee_applied ? 3.00 : 0
  const total     = p?.amount ?? 0

  const dateStr = new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })

  const rows = p ? [
    { label: 'Base fare',  note: 'first 5 min',                   amount: baseFare,  color: '#1a1a18' },
    ...(extraMins > 0 ? [
      { label: 'Extra time', note: `${extraMins} min × SGD 1.00`, amount: extraFare, color: '#1a1a18' },
    ] : []),
    ...(p.late_fee_applied ? [
      { label: 'Late fee',   note: '⚠ ran over booked time',      amount: lateFee,   color: '#c0392b' },
    ] : []),
  ] : []

  return (
    <Layout title="Job complete">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 24px', gap: 20 }}>

        {/* Success mark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, animation: 'fade-up 0.4s ease' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#f0f7f3', border: '1.5px solid #d4ece0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a5c3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 26, color: '#1a1a18', letterSpacing: '-0.5px', marginBottom: 3 }}>
              Job complete
            </h2>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#7a7a74' }}>
              Your earnings are on the way
            </p>
          </div>
        </div>

        {p ? (
          <div style={{
            width: '100%', background: '#fff', border: '1px solid #e8e6e1',
            borderRadius: 14, overflow: 'hidden',
            animation: 'fade-up 0.4s 0.07s ease both',
          }}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 500, color: '#1a1a18', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Job Receipt
              </span>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#b0afa8' }}>{dateStr}</span>
            </div>

            {/* Transaction */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#b0afa8' }}>Transaction</span>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#7a7a74', letterSpacing: '-0.2px' }}>{p.transaction_id}</span>
            </div>

            {/* Booked / Actual */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #f0f0ee' }}>
              <div style={{ padding: '14px 20px', borderRight: '1px solid #f0f0ee' }}>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Booked</p>
                <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 24, color: '#1a1a18', letterSpacing: '-0.5px' }}>{p.booked_minutes} min</p>
              </div>
              <div style={{ padding: '14px 20px' }}>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Actual</p>
                <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 24, color: p.late_fee_applied ? '#c0392b' : '#1a1a18', letterSpacing: '-0.5px' }}>
                  {p.actual_minutes} min
                </p>
              </div>
            </div>

            {/* Fare breakdown — rows built outside JSX so i and arr are in scope */}
            <div style={{ padding: '4px 0' }}>
              {rows.map(({ label, note, amount, color }, i, arr) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid #f8f7f5' : 'none',
                }}>
                  <div>
                    <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, color, marginBottom: 2 }}>{label}</p>
                    <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#b0afa8' }}>{note}</p>
                  </div>
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, color, fontWeight: 500 }}>
                    SGD {amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total — green for operator */}
            <div style={{
              padding: '16px 20px', background: '#f0f7f3',
              borderTop: '1px solid #d4ece0', borderBottom: '1px solid #d4ece0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, fontWeight: 500, color: '#1a5c3a' }}>
                Amount earned
              </span>
              <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 28, color: '#1a5c3a', letterSpacing: '-1px' }}>
                {p.currency} {total.toFixed(2)}
              </span>
            </div>

            {/* Status */}
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{
                fontFamily: 'Geist Mono, monospace', fontSize: 10,
                padding: '3px 10px', borderRadius: 4,
                background: '#f0f7f3', color: '#1a5c3a',
                border: '1px solid #d4ece0',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>paid</span>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e1', borderRadius: 14, padding: '24px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, color: '#7a7a74' }}>
              Job complete. Payment is being processed.
            </p>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleDone}
          style={{
            width: '100%', height: 52, background: '#1a5c3a',
            border: 'none', borderRadius: 10, color: '#fff',
            fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', animation: 'fade-up 0.4s 0.14s ease both',
          }}
        >
          Back to home
        </button>
      </div>
    </Layout>
  )
}