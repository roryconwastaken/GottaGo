import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  role: 'customer' | 'operator'
  created_at: string
}

export interface Trip {
  id: string
  customer_id: string
  operator_id: string
  status: 'matched' | 'in_progress' | 'completed' | 'cancelled'
  pickup_lat: number
  pickup_lng: number
  dropoff_lat: number
  dropoff_lng: number
  duration_minutes: number
  fare: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Returned by POST /api/match/request (202)
export interface OfferPayload {
  offer_id: string
  operator_id: string
  operator_lat?: number
  operator_lng?: number
  distance_km?: number
  duration_minutes: number
  fare: number
  expires_in: number
}

// Arrives via job.offer WS event (operator side)
export interface JobOfferPayload {
  offer_id: string
  customer_id: string
  operator_id: string
  pickup_lat: number
  pickup_lng: number
  dropoff_lat: number
  dropoff_lng: number
  duration_minutes: number
  fare: number
  expires_in_seconds: number
}

// Arrives via match.found WS event
export interface MatchPayload {
  trip_id?: string
  customer_id: string
  operator_id: string
  operator_lat?: number
  operator_lng?: number
  pickup_lat: number
  pickup_lng: number
  dropoff_lat: number
  dropoff_lng: number
  duration_minutes: number
  fare: number
  distance_km?: number
}

export interface PaymentPayload {
  payment_id: string
  trip_id: string
  customer_id: string
  operator_id: string
  amount: number
  currency: string
  actual_minutes: number
  booked_minutes: number
  late_fee_applied: boolean
  transaction_id: string
}

interface AppState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  clearAuth: () => void

  tripId: string | null
  trip: Trip | null
  setTripId: (id: string | null) => void
  setTrip: (trip: Trip | null) => void

  // Customer: offer returned from POST /api/match/request
  offerId: string | null
  offerPayload: OfferPayload | null
  setOfferId: (id: string | null) => void
  setOfferPayload: (o: OfferPayload | null) => void

  // Operator: incoming job.offer event
  jobOffer: JobOfferPayload | null
  setJobOffer: (j: JobOfferPayload | null) => void

  // Both: after match.found
  matchPayload: MatchPayload | null
  setMatchPayload: (m: MatchPayload | null) => void

  paymentPayload: PaymentPayload | null
  setPaymentPayload: (p: PaymentPayload | null) => void

  isOnline: boolean
  setOnline: (v: boolean) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({
        token: null, user: null,
        tripId: null, trip: null,
        offerId: null, offerPayload: null,
        jobOffer: null, matchPayload: null,
        paymentPayload: null, isOnline: false,
      }),

      tripId: null,
      trip: null,
      setTripId: (id) => set({ tripId: id }),
      setTrip: (trip) => set({ trip }),

      offerId: null,
      offerPayload: null,
      setOfferId: (id) => set({ offerId: id }),
      setOfferPayload: (o) => set({ offerPayload: o }),

      jobOffer: null,
      setJobOffer: (j) => set({ jobOffer: j }),

      matchPayload: null,
      setMatchPayload: (m) => set({ matchPayload: m }),

      paymentPayload: null,
      setPaymentPayload: (p) => set({ paymentPayload: p }),

      isOnline: false,
      setOnline: (v) => set({ isOnline: v }),
    }),
    {
      name: 'gotago-store',
      partialize: (s) => ({ token: s.token, user: s.user, tripId: s.tripId }),
    }
  )
)