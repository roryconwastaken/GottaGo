import React from 'react'

/* ─── Button ─────────────────────────────────────────────── */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: 'none',
    borderRadius: 10,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.2px',
    transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : undefined,
    opacity: disabled || loading ? 0.55 : 1,
    position: 'relative',
    overflow: 'hidden',
  }

  const sizes: Record<string, React.CSSProperties> = {
    sm: { fontSize: 13, padding: '8px 16px', height: 36 },
    md: { fontSize: 15, padding: '12px 24px', height: 48 },
    lg: { fontSize: 17, padding: '16px 32px', height: 56 },
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--accent)',
      color: '#0a0b0d',
      boxShadow: '0 4px 20px var(--accent-glow)',
    },
    danger: {
      background: 'var(--danger)',
      color: '#fff',
      boxShadow: '0 4px 16px rgba(255,71,87,0.3)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--accent)',
      border: '1px solid var(--accent)',
    },
  }

  return (
    <button
      disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : children}
    </button>
  )
}

/* ─── Card ─────────────────────────────────────────────────── */
interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  glow?: boolean
  className?: string
}

export function Card({ children, style, glow, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${glow ? 'var(--border-bright)' : 'var(--border)'}`,
        borderRadius: 14,
        padding: 20,
        boxShadow: glow ? '0 0 30px var(--accent-glow)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Stat ─────────────────────────────────────────────────── */
export function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 10,
        fontFamily: 'DM Mono, monospace',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 22,
        fontFamily: 'DM Mono, monospace',
        fontWeight: 500,
        color: accent ? 'var(--accent)' : 'var(--text-primary)',
        letterSpacing: '-0.5px',
      }}>
        {value}
      </span>
    </div>
  )
}

/* ─── Badge ────────────────────────────────────────────────── */
type BadgeColor = 'accent' | 'danger' | 'warning' | 'success' | 'muted'
export function Badge({ label, color = 'muted' }: { label: string; color?: BadgeColor }) {
  const colors: Record<BadgeColor, React.CSSProperties> = {
    accent: { color: 'var(--accent)', background: 'var(--accent-glow)', border: '1px solid var(--accent-dim)' },
    danger: { color: 'var(--danger)', background: 'rgba(255,71,87,0.12)', border: '1px solid var(--danger-dim)' },
    warning: { color: 'var(--warning)', background: 'rgba(255,179,71,0.12)', border: '1px solid var(--warning)' },
    success: { color: 'var(--success)', background: 'rgba(76,222,128,0.12)', border: '1px solid var(--success)' },
    muted: { color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' },
  }
  return (
    <span style={{
      fontSize: 10,
      fontFamily: 'DM Mono, monospace',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      padding: '3px 10px',
      borderRadius: 4,
      ...colors[color],
    }}>
      {label}
    </span>
  )
}

/* ─── Spinner ──────────────────────────────────────────────── */
export function Spinner({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: `2px solid ${color || 'var(--border-bright)'}`,
      borderTopColor: color || 'var(--accent)',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

/* ─── Divider ──────────────────────────────────────────────── */
export function Divider({ style }: { style?: React.CSSProperties }) {
  return <div style={{ height: 1, background: 'var(--border)', ...style }} />
}

/* ─── Input ────────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, style, ...rest }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: 11,
          fontFamily: 'DM Mono, monospace',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}>
          {label}
        </label>
      )}
      <input
        style={{
          background: 'var(--bg-elevated)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 10,
          padding: '12px 16px',
          color: 'var(--text-primary)',
          fontFamily: 'DM Mono, monospace',
          fontSize: 14,
          outline: 'none',
          transition: 'border-color 0.2s',
          ...style,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onBlur={e => (e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--border)')}
        {...rest}
      />
      {error && (
        <span style={{ fontSize: 12, color: 'var(--danger)', fontFamily: 'DM Mono, monospace' }}>
          {error}
        </span>
      )}
    </div>
  )
}

/* ─── Section ──────────────────────────────────────────────── */
export function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: '0 20px', ...style }}>
      {children}
    </div>
  )
}