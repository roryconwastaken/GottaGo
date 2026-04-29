package offer

import (
	"sync"
	"time"
)

type Offer struct {
	OfferID         string
	CustomerID      string
	OperatorID      string
	PickupLat       float64
	PickupLng       float64
	DropoffLat      float64
	DropoffLng      float64
	DurationMinutes int
	Fare            float64
	ExpiresAt       time.Time
	// TriedOperators tracks every operator who was offered
	// this job so we never offer it to the same person twice.
	TriedOperators  []string
}

type Store struct {
	mu     sync.RWMutex
	offers map[string]*Offer
}

func New() *Store {
	return &Store{
		offers: make(map[string]*Offer),
	}
}

func (s *Store) Save(offer *Offer) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.offers[offer.OfferID] = offer
}

func (s *Store) Get(offerID string) *Offer {
	s.mu.RLock()
	defer s.mu.RUnlock()

	o, ok := s.offers[offerID]
	if !ok {
		return nil
	}

	if time.Now().After(o.ExpiresAt) {
		return nil
	}

	return o
}

func (s *Store) Delete(offerID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.offers, offerID)
}