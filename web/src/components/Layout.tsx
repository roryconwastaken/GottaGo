import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  backTo?: string
}

export function Layout({ children, title, showBack, backTo }: LayoutProps) {
  const navigate = useNavigate()
  const { user, clearAuth } = useStore()

  const handleBack = () => backTo ? navigate(backTo) : navigate(-1)
  const handleLogout = () => { clearAuth(); navigate('/login') }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f7f5' }}>
      {/* Nav */}
      <header style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: '#fff',
        borderBottom: '1px solid #e8e6e1',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {showBack && (
            <button onClick={handleBack} style={{
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 6px',
              color: '#7a7a74', fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center',
            }}>←</button>
          )}
          {title ? (
            <span style={{
              fontFamily: 'Fraunces, serif',
              fontWeight: 400,
              fontSize: 18,
              color: '#1a1a18',
              letterSpacing: '-0.3px',
            }}>{title}</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Pin mark */}
              <div style={{
                width: 26, height: 26,
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                background: '#1a5c3a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  transform: 'rotate(45deg)',
                  fontFamily: 'Fraunces, serif',
                  fontWeight: 500,
                  fontSize: 11,
                  color: '#fff',
                }}>G</span>
              </div>
              <span style={{
                fontFamily: 'Fraunces, serif',
                fontWeight: 400,
                fontStyle: 'italic',
                fontSize: 18,
                color: '#1a1a18',
                letterSpacing: '-0.3px',
              }}>Gotta Go</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user && (
            <span style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              padding: '3px 9px',
              borderRadius: 5,
              background: '#f0f7f3',
              color: '#1a5c3a',
              border: '1px solid #d4ece0',
            }}>{user.role}</span>
          )}
          {user && (
            <button onClick={handleLogout} style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: 12,
              color: '#b0afa8',
              background: 'none',
              border: '1px solid #e8e6e1',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#c0392b'; e.currentTarget.style.borderColor = '#f5c6c3' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#b0afa8'; e.currentTarget.style.borderColor = '#e8e6e1' }}
            >sign out</button>
          )}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
