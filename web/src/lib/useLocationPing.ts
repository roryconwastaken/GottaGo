import { useEffect, useRef } from 'react'
import api from './api'
import { useStore } from './store'

export function useLocationPing(active: boolean) {
  const { user } = useStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active || !user || user.role !== 'operator') {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    function ping() {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          api.post('/api/location/update', {
            operator_id: user!.id,
            lat: coords.latitude,
            lng: coords.longitude,
            bearing: coords.heading ?? 0,
            speed: coords.speed ?? 0,
          }).catch(console.error)
        },
        (err) => console.warn('[location]', err.message),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }

    ping()
    intervalRef.current = setInterval(ping, 3000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [active, user?.id])
}
