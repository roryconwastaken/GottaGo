import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useWebSocket } from './lib/useWebSocket'
import { useStore } from './lib/store'

import { LoginPage }    from './pages/Login'
import { RegisterPage } from './pages/Register'

import { CustomerHome }        from './pages/customer/Home'
import { CustomerWaiting }     from './pages/customer/Waiting'
import { CustomerActive }      from './pages/customer/Active'
import { CustomerDone }        from './pages/customer/Done'
import { CustomerNoOperators } from './pages/customer/NoOperators'

import { OperatorHome }     from './pages/operator/Home'
import { OperatorIncoming } from './pages/operator/Incoming'
import { OperatorActive }   from './pages/operator/Active'
import { OperatorDone }     from './pages/operator/Done'

function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'customer' | 'operator' }) {
  const { token, user } = useStore()
  if (!token || !user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'customer' ? '/customer' : '/operator'} replace />
  }
  return <>{children}</>
}

function AppShell() {
  useWebSocket()
  const { user } = useStore()

  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/customer"              element={<RequireAuth role="customer"><CustomerHome /></RequireAuth>} />
      <Route path="/customer/waiting"      element={<RequireAuth role="customer"><CustomerWaiting /></RequireAuth>} />
      <Route path="/customer/active"       element={<RequireAuth role="customer"><CustomerActive /></RequireAuth>} />
      <Route path="/customer/done"         element={<RequireAuth role="customer"><CustomerDone /></RequireAuth>} />
      <Route path="/customer/no-operators" element={<RequireAuth role="customer"><CustomerNoOperators /></RequireAuth>} />

      <Route path="/operator"          element={<RequireAuth role="operator"><OperatorHome /></RequireAuth>} />
      <Route path="/operator/incoming" element={<RequireAuth role="operator"><OperatorIncoming /></RequireAuth>} />
      <Route path="/operator/active"   element={<RequireAuth role="operator"><OperatorActive /></RequireAuth>} />
      <Route path="/operator/done"     element={<RequireAuth role="operator"><OperatorDone /></RequireAuth>} />

      <Route path="*" element={
        user
          ? <Navigate to={user.role === 'customer' ? '/customer' : '/operator'} replace />
          : <Navigate to="/login" replace />
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}