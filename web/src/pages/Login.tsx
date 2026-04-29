import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Input, Button, Alert } from '../components/AuthUI'
import { useStore } from '../lib/store'
import api from '../lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useStore((s) => s.setAuth)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setAuth(data.token, data.user)
      navigate(data.user.role === 'customer' ? '/customer' : '/operator')
    } catch (err: any) {
      setError(
        err.response?.data?.message
        ?? err.response?.data?.error
        ?? 'Incorrect email or password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontWeight: 300,
          fontSize: 32,
          letterSpacing: '-0.8px',
          color: 'var(--text)',
          marginBottom: 6,
          lineHeight: 1.1,
        }}>
          Welcome back
        </h2>
        <p style={{
          fontFamily: 'Geist Mono, monospace',
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          Sign in to your account
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <div className="fade-up delay-1">
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

        <div className="fade-up delay-2">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="fade-up">
            <Alert message={error} />
          </div>
        )}

        {/* Divider */}
        <div
          className="fade-up delay-3"
          style={{
            height: 1,
            background: 'var(--border)',
            margin: '4px 0',
          }}
        />

        <div className="fade-up delay-4">
          <Button type="submit" loading={loading}>
            Sign in
          </Button>
        </div>
      </form>

      {/* Footer link */}
      <p
        className="fade-up delay-5"
        style={{
          marginTop: 24,
          fontFamily: 'Geist Mono, monospace',
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        No account yet?{' '}
        <Link to="/register" style={{ color: 'var(--green)', fontWeight: 500 }}>
          Create one →
        </Link>
      </p>
    </AuthLayout>
  )
}
