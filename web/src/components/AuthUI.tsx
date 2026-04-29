import React, { useState } from 'react'

/* ── Input ──────────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, id, ...rest }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={inputId}
        style={{
          fontSize: 11,
          fontFamily: 'Geist Mono, monospace',
          fontWeight: 500,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}
      >
        {label}
      </label>
      <input
        id={inputId}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: 44,
          padding: '0 14px',
          border: `1.5px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 14,
          color: 'var(--text)',
          background: error ? 'var(--danger-bg)' : '#fff',
          outline: 'none',
          transition: 'border-color 0.15s ease, background 0.15s ease',
          width: '100%',
        }}
        {...rest}
      />
      {error && (
        <p style={{
          fontSize: 12,
          fontFamily: 'Geist Mono, monospace',
          color: 'var(--danger)',
          marginTop: 2,
        }}>
          {error}
        </p>
      )}
    </div>
  )
}

/* ── Button ─────────────────────────────────────────────────── */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'ghost'
}

export function Button({ loading, variant = 'primary', children, disabled, style, ...rest }: ButtonProps) {
  const [hovered, setHovered] = useState(false)
  const isPrimary = variant === 'primary'

  return (
    <button
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 48,
        width: '100%',
        border: isPrimary ? 'none' : '1.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: isPrimary
          ? hovered && !disabled ? '#153f29' : 'var(--green)'
          : hovered ? 'var(--bg)' : '#fff',
        color: isPrimary ? '#fff' : 'var(--text-muted)',
        fontFamily: 'Geist Mono, monospace',
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'background 0.15s ease, opacity 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        letterSpacing: '0.02em',
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}

/* ── Spinner ────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{
      width: 16, height: 16,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.65s linear infinite',
    }} />
  )
}

/* ── Alert ──────────────────────────────────────────────────── */
export function Alert({ message }: { message: string }) {
  return (
    <div style={{
      padding: '12px 14px',
      border: '1.5px solid #f5c6c3',
      borderRadius: 'var(--radius)',
      background: 'var(--danger-bg)',
      fontFamily: 'Geist Mono, monospace',
      fontSize: 13,
      color: 'var(--danger)',
      lineHeight: 1.5,
    }}>
      {message}
    </div>
  )
}

/* ── RoleCard ───────────────────────────────────────────────── */
interface RoleCardProps {
  role: 'customer' | 'operator'
  selected: boolean
  onClick: () => void
}

export function RoleCard({ role, selected, onClick }: RoleCardProps) {
  const isCustomer = role === 'customer'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '16px 14px',
        border: `1.5px solid ${selected ? 'var(--green)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        background: selected ? 'var(--green-light)' : '#fff',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease',
        flex: 1,
      }}
    >
      <div style={{ marginBottom: 6 }}>
        {/* Icon as CSS shape instead of emoji */}
        <div style={{
          width: 28, height: 28,
          borderRadius: 6,
          background: selected ? 'var(--green-mid)' : 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          transition: 'background 0.15s ease',
        }}>
          {isCustomer ? '🙋' : '🦺'}
        </div>
      </div>
      <p style={{
        fontFamily: 'Geist Mono, monospace',
        fontWeight: 500,
        fontSize: 13,
        color: selected ? 'var(--green)' : 'var(--text)',
        marginBottom: 3,
        textTransform: 'capitalize',
      }}>
        {role}
      </p>
      <p style={{
        fontFamily: 'Geist Mono, monospace',
        fontSize: 11,
        color: selected ? 'var(--green-muted)' : 'var(--text-faint)',
        lineHeight: 1.4,
      }}>
        {isCustomer ? 'Post & pay for jobs' : 'Accept & earn per min'}
      </p>
    </button>
  )
}

/* inject spin keyframe */
const spinStyle = document.createElement('style')
spinStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
document.head.appendChild(spinStyle)