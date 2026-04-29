import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from './store'
import api from './api'

export function useWebSocket() {
  const {
    user, setJobOffer, setMatchPayload,
    setTripId, setTrip, setPaymentPayload,
    setOfferId, setOfferPayload,
  } = useStore()
  const navigate = useNavigate()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return

    function connect() {
      const ws = new WebSocket(`ws://localhost:8084/ws?user_id=${user!.id}`)
      wsRef.current = ws

      ws.onopen = () => console.log('[WS] connected')

      ws.onmessage = async (e) => {
        try {
          const { type, payload } = JSON.parse(e.data)
          console.log('[WS]', type, payload)

          // Operator receives an incoming job offer
          if (type === 'job.offer') {
            setJobOffer(payload)
            navigate('/operator/incoming')
          }

          // Operator: customer cancelled before they accepted
          if (type === 'job.offer.cancelled') {
            console.log('[WS] offer cancelled — returning to home')
            setJobOffer(null)
            navigate('/operator')
          }

          // Customer + operator: operator accepted, match confirmed
          if (type === 'match.found') {
            setMatchPayload(payload)
            if (user!.role === 'customer') navigate('/customer/waiting')
          }

          // Both: trip record created, now we have trip_id
          if (type === 'trip.created') {
            console.log('[WS] trip.created — trip_id:', payload.trip_id)
            setTripId(payload.trip_id)
            try {
              const { data } = await api.get(`/api/trips/${payload.trip_id}`)
              setTrip(data)
            } catch {}
            if (user!.role === 'operator') navigate('/operator/active')
          }

          // Both: trip status changed
          if (type === 'trip.updated') {
            if (payload.trip_id) {
              setTripId(payload.trip_id)
              try {
                const { data } = await api.get(`/api/trips/${payload.trip_id}`)
                setTrip(data)
              } catch {}
            }
            if (payload.status === 'in_progress') {
              if (user!.role === 'customer') navigate('/customer/active')
              else navigate('/operator/active')
            }
            if (payload.status === 'cancelled') {
              if (user!.role === 'customer') navigate('/customer')
              else navigate('/operator')
            }
          }

          // Customer: all operators rejected
          if (type === 'match.no_operators') {
            navigate('/customer/no-operators')
          }

          // Both: payment done
          if (type === 'payment.completed') {
            setPaymentPayload(payload)
            if (user!.role === 'customer') navigate('/customer/done')
            else navigate('/operator/done')
          }

        } catch (err) {
          console.error('[WS] parse error', err)
        }
      }

      ws.onclose = () => {
        console.log('[WS] disconnected — retrying in 3s')
        reconnectRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      wsRef.current?.close()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }
  }, [user?.id])
}