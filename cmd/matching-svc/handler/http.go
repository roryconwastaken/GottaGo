package handler

import (
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yourname/gotta-go/matching-svc/client"
	"github.com/yourname/gotta-go/matching-svc/matcher"
	"github.com/yourname/gotta-go/matching-svc/model"
	"github.com/yourname/gotta-go/matching-svc/offer"
	"github.com/yourname/gotta-go/matching-svc/publisher"
)

const OfferExpiry = 30 * time.Second

type HTTPHandler struct {
	locationClient *client.LocationClient
	matcher        *matcher.Matcher
	publisher      *publisher.NatsPublisher
	offers         *offer.Store
}

func NewHTTPHandler(
	lc *client.LocationClient,
	m *matcher.Matcher,
	p *publisher.NatsPublisher,
	o *offer.Store,
) *HTTPHandler {
	return &HTTPHandler{
		locationClient: lc,
		matcher:        m,
		publisher:      p,
		offers:         o,
	}
}

// RequestMatch handles POST /match/request
func (h *HTTPHandler) RequestMatch(w http.ResponseWriter, r *http.Request) {
	var req model.MatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.CustomerID == "" {
		http.Error(w, "customer_id is required", http.StatusBadRequest)
		return
	}
	if req.PickupLat == 0 || req.PickupLng == 0 {
		http.Error(w, "pickup_lat and pickup_lng are required", http.StatusBadRequest)
		return
	}
	if req.DurationMinutes <= 0 {
		http.Error(w, "duration_minutes must be greater than 0", http.StatusBadRequest)
		return
	}

	nearby, err := h.locationClient.GetNearbyOperators(
		r.Context(), req.PickupLat, req.PickupLng, 5.0)
	if err != nil {
		http.Error(w, "failed to fetch nearby operators", http.StatusInternalServerError)
		return
	}

	fare := fareCalc(req.DurationMinutes)

	result, err := h.matcher.FindBest(nearby)
	if err != nil {
		if errors.Is(err, matcher.ErrNoOperators) {
			http.Error(w, "no operators available", http.StatusServiceUnavailable)
			return
		}
		http.Error(w, "matching failed", http.StatusInternalServerError)
		return
	}

	offerID := uuid.New().String()

	o := &offer.Offer{
		OfferID:         offerID,
		CustomerID:      req.CustomerID,
		OperatorID:      result.OperatorID,
		PickupLat:       req.PickupLat,
		PickupLng:       req.PickupLng,
		DropoffLat:      req.DropoffLat,
		DropoffLng:      req.DropoffLng,
		DurationMinutes: req.DurationMinutes,
		Fare:            fare,
		ExpiresAt:       time.Now().Add(OfferExpiry),
		TriedOperators:  []string{result.OperatorID},
	}
	h.offers.Save(o)
	h.matcher.SetAvailability(result.OperatorID, false)

	if err := h.publisher.PublishJobOffer(publisher.JobOfferEvent{
		OfferID:         offerID,
		CustomerID:      req.CustomerID,
		OperatorID:      result.OperatorID,
		PickupLat:       req.PickupLat,
		PickupLng:       req.PickupLng,
		DropoffLat:      req.DropoffLat,
		DropoffLng:      req.DropoffLng,
		DurationMinutes: req.DurationMinutes,
		Fare:            fare,
		ExpiresIn:       int(OfferExpiry.Seconds()),
	}); err != nil {
		log.Printf("handler: failed to publish job offer: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]any{
		"offer_id":         offerID,
		"operator_id":      result.OperatorID,
		"operator_lat":     result.OperatorLat,
		"operator_lng":     result.OperatorLng,
		"distance_km":      result.DistanceKm,
		"duration_minutes": req.DurationMinutes,
		"fare":             fare,
		"expires_in":       int(OfferExpiry.Seconds()),
	})
}

// AcceptOffer handles POST /match/offer/{offer_id}/accept
func (h *HTTPHandler) AcceptOffer(w http.ResponseWriter, r *http.Request) {
	offerID := chi.URLParam(r, "offer_id")

	o := h.offers.Get(offerID)
	if o == nil {
		http.Error(w, "offer not found or expired", http.StatusNotFound)
		return
	}

	h.offers.Delete(offerID)

	if err := h.publisher.PublishMatchFound(publisher.MatchFoundEvent{
		CustomerID:      o.CustomerID,
		OperatorID:      o.OperatorID,
		PickupLat:       o.PickupLat,
		PickupLng:       o.PickupLng,
		DropoffLat:      o.DropoffLat,
		DropoffLng:      o.DropoffLng,
		DurationMinutes: o.DurationMinutes,
		Fare:            o.Fare,
	}); err != nil {
		log.Printf("handler: failed to publish match.found: %v", err)
		http.Error(w, "failed to confirm match", http.StatusInternalServerError)
		return
	}

	log.Printf("handler: operator %s accepted offer %s for customer %s",
		o.OperatorID, offerID, o.CustomerID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":      "accepted",
		"offer_id":    offerID,
		"customer_id": o.CustomerID,
	})
}

// RejectOffer handles POST /match/offer/{offer_id}/reject
// Frees the rejecting operator and immediately tries the next closest.
// Publishes a job.offer.rejected event so the customer knows
// we are searching again, then sends a new offer to the next operator.
func (h *HTTPHandler) RejectOffer(w http.ResponseWriter, r *http.Request) {
	offerID := chi.URLParam(r, "offer_id")

	o := h.offers.Get(offerID)
	if o == nil {
		http.Error(w, "offer not found or expired", http.StatusNotFound)
		return
	}

	// Free the rejecting operator before we search again.
	h.matcher.SetAvailability(o.OperatorID, true)

	log.Printf("handler: operator %s rejected offer %s — searching for next",
		o.OperatorID, offerID)

	// Try to find the next closest operator excluding all who already rejected.
	nearby, err := h.locationClient.GetNearbyOperators(
		r.Context(), o.PickupLat, o.PickupLng, 5.0)
	if err != nil {
		h.offers.Delete(offerID)
		http.Error(w, "failed to search for operators", http.StatusInternalServerError)
		return
	}

	next, err := h.matcher.FindBestExcluding(nearby, o.TriedOperators)
	if err != nil {
		// No more operators available — clean up and tell the customer.
		h.offers.Delete(offerID)

		// Notify customer via NATS that no operators are left.
		if pubErr := h.publisher.PublishNoOperators(o.CustomerID); pubErr != nil {
			log.Printf("handler: failed to publish no_operators: %v", pubErr)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"status":   "no_operators",
			"offer_id": offerID,
		})
		return
	}

	// Update the offer with the new operator and add them to tried list.
	o.OperatorID = next.OperatorID
	o.TriedOperators = append(o.TriedOperators, next.OperatorID)
	o.ExpiresAt = time.Now().Add(OfferExpiry)
	h.offers.Save(o)
	h.matcher.SetAvailability(next.OperatorID, false)

	// Send the offer to the next operator.
	if err := h.publisher.PublishJobOffer(publisher.JobOfferEvent{
		OfferID:         offerID,
		CustomerID:      o.CustomerID,
		OperatorID:      next.OperatorID,
		PickupLat:       o.PickupLat,
		PickupLng:       o.PickupLng,
		DropoffLat:      o.DropoffLat,
		DropoffLng:      o.DropoffLng,
		DurationMinutes: o.DurationMinutes,
		Fare:            o.Fare,
		ExpiresIn:       int(OfferExpiry.Seconds()),
	}); err != nil {
		log.Printf("handler: failed to publish job offer to next operator: %v", err)
	}

	log.Printf("handler: re-offered job to operator %s", next.OperatorID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":      "re-offered",
		"offer_id":    offerID,
		"operator_id": next.OperatorID,
	})
}

func fareCalc(durationMinutes int) float64 {
	if durationMinutes < 1 {
		durationMinutes = 1
	}
	var amount float64
	if durationMinutes <= 5 {
		amount = 5.00
	} else {
		extra := float64(durationMinutes - 5)
		amount = 5.00 + (extra * 1.00)
	}
	return math.Round(amount*100) / 100
}

// CancelOffer handles POST /match/offer/{offer_id}/cancel
// Called by the customer before the operator accepts.
// Removes the offer, frees the operator, and notifies them via NATS.
func (h *HTTPHandler) CancelOffer(w http.ResponseWriter, r *http.Request) {
	offerID := chi.URLParam(r, "offer_id")

	o := h.offers.Get(offerID)
	if o == nil {
		http.Error(w, "offer not found or expired", http.StatusNotFound)
		return
	}

	// Remove the offer immediately.
	h.offers.Delete(offerID)

	// Free the operator — they were marked unavailable when
	// the offer was created, so we need to release them.
	h.matcher.SetAvailability(o.OperatorID, true)

	// Notify the operator their pending offer was cancelled
	// so they can dismiss the incoming job screen.
	if err := h.publisher.PublishOfferCancelled(o.OperatorID, offerID); err != nil {
		log.Printf("handler: failed to publish offer cancelled: %v", err)
	}

	log.Printf("handler: customer %s cancelled offer %s — operator %s freed",
		o.CustomerID, offerID, o.OperatorID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":   "cancelled",
		"offer_id": offerID,
	})
}
