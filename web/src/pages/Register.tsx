import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Input, Button, Alert, RoleCard } from '../components/AuthUI'
import { useStore } from '../lib/store'
import api from '../lib/api'

export function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useStore((s) => s.setAuth)

  const [role, setRole]         = useState<'customer' | 'operator'>('customer')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { email, password, role })
      setAuth(data.token, data.user)
      navigate(data.user.role === 'customer' ? '/customer' : '/operator')
    } catch (err: any) {
      setError(
        err.response?.data?.message
        ?? err.response?.data?.error
        ?? 'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout subtitle="Join the network">
      {/* Heading */}
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontWeight: 300,
          fontSize: 32,
          letterSpacing: '-0.8px',
          color: 'var(--text)',
          marginBottom: 6,
          lineHeight: 1.1,
        }}>
          Create account
        </h2>
        <p style={{
          fontFamily: 'Geist Mono, monospace',
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          Choose your role to get started
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        {/* Role picker */}
        <div className="fade-up delay-1">
          <p style={{
            fontSize: 11,
            fontFamily: 'Geist Mono, monospace',
            fontWeight: 500,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginBottom: 8,
          }}>
            I want to
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <RoleCard role="customer" selected={role === 'customer'} onClick={() => setRole('customer')} />
            <RoleCard role="operator" selected={role === 'operator'} onClick={() => setRole('operator')} />
          </div>
        </div>

        {/* Thin rule */}
        <div style={{ height: 1, background: 'var(--border)' }} />

        <div className="fade-up delay-2">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="fade-up delay-3">
          <Input
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="fade-up">
            <Alert message={error} />
          </div>
        )}

        <div className="fade-up delay-4" style={{ marginTop: 4 }}>
          <Button type="submit" loading={loading}>
            Create account
          </Button>
        </div>
      </form>

      {/* T&C note */}
      <p
        className="fade-up delay-5"
        style={{
          marginTop: 14,
          fontFamily: 'Geist Mono, monospace',
          fontSize: 11,
          color: 'var(--text-faint)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        By creating an account you agree to our terms of service.
      </p>

      {/* Footer link */}
      <p
        style={{
          marginTop: 20,
          fontFamily: 'Geist Mono, monospace',
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--green)', fontWeight: 500 }}>
          Sign in →
        </Link>
      </p>
    </AuthLayout>
  )
}