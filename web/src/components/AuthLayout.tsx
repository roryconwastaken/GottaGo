import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
  subtitle?: string
}

/** Grid dots SVG background for the brand panel */
function GridPattern() {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="#fff" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  )
}

/** Animated map-pin logo mark */
function PinLogo() {
  return (
    <div className="pin-drop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {/* Pin head */}
      <div style={{
        width: 52,
        height: 52,
        borderRadius: '50% 50% 50% 0',
        transform: 'rotate(-45deg)',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <span style={{
          transform: 'rotate(45deg)',
          fontFamily: 'Fraunces, serif',
          fontWeight: 500,
          fontSize: 20,
          color: 'var(--green)',
          letterSpacing: '-0.5px',
        }}>G</span>
      </div>
      {/* Pin tail */}
      <div style={{
        width: 0, height: 0,
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderTop: '14px solid #fff',
        marginTop: -2,
        opacity: 0.7,
      }} />
    </div>
  )
}

export function AuthLayout({ children, subtitle }: AuthLayoutProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
    }}>
      {/* ── Left: Brand panel ─────────────────────────────── */}
      <div style={{
        background: 'var(--green)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <GridPattern />

        {/* Content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          textAlign: 'center',
        }}>
          <PinLogo />

          <div>
            <h1 style={{
              fontFamily: 'Fraunces, serif',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 48,
              color: '#fff',
              letterSpacing: '-1.5px',
              lineHeight: 1,
              marginBottom: 12,
            }}>
              Gotta Go
            </h1>
            <p style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {subtitle ?? 'On-demand standby services'}
            </p>
          </div>

          {/* Feature list */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginTop: 8,
          }}>
            {[
              ['Post a job', 'Customers book time in minutes'],
              ['Accept & earn', 'Operators get paid per minute worked'],
              ['Real-time billing', 'Only charged for actual time'],
            ].map(([title, desc]) => (
              <div key={title} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                textAlign: 'left',
              }}>
                <div style={{
                  width: 5, height: 5,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.45)',
                  marginTop: 7,
                  flexShrink: 0,
                }} />
                <div>
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, color: '#fff', fontWeight: 500, marginBottom: 1 }}>
                    {title}
                  </p>
                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ─────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 56px',
        background: 'var(--surface)',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {children}
        </div>
      </div>
    </div>
  )
}