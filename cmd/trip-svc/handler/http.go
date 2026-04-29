package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/yourname/gotta-go/trip-svc/model"
	"github.com/yourname/gotta-go/trip-svc/publisher"
	"github.com/yourname/gotta-go/trip-svc/store"
)

// HTTPHandler holds the dependencies our HTTP handlers need.
type HTTPHandler struct {
	store     *store.PostgresStore
	publisher *publisher.NatsPublisher
}

// NewHTTPHandler creates an HTTPHandler with its dependencies injected.
func NewHTTPHandler(s *store.PostgresStore, p *publisher.NatsPublisher) *HTTPHandler {
	return &HTTPHandler{store: s, publisher: p}
}

// GetTrip handles GET /trips/{id}
func (h *HTTPHandler) GetTrip(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "trip id is required", http.StatusBadRequest)
		return
	}

	trip, err := h.store.GetTrip(r.Context(), id)
	if err != nil {
		http.Error(w, "trip not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trip)
}

// StartTrip handles POST /trips/{id}/start
func (h *HTTPHandler) StartTrip(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	trip, err := h.store.GetTrip(r.Context(), id)
	if err != nil {
		http.Error(w, "trip not found", http.StatusNotFound)
		return
	}

	if trip.Status != model.StatusMatched {
		http.Error(w, "trip is not in matched status", http.StatusConflict)
		return
	}

	updated, err := h.store.UpdateStatus(r.Context(), model.UpdateStatusParams{
		ID:     id,
		Status: model.StatusInProgress,
	})
	if err != nil {
		http.Error(w, "failed to update trip", http.StatusInternalServerError)
		return
	}

	// Publish the state change so notification-svc can push
	// a live update to the customer and operator.
	if err := h.publisher.PublishTripUpdated(updated); err != nil {
		log.Printf("handler: failed to publish trip.updated: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

// CompleteTrip handles POST /trips/{id}/complete
func (h *HTTPHandler) CompleteTrip(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	trip, err := h.store.GetTrip(r.Context(), id)
	if err != nil {
		http.Error(w, "trip not found", http.StatusNotFound)
		return
	}

	if trip.Status != model.StatusInProgress {
		http.Error(w, "trip is not in_progress", http.StatusConflict)
		return
	}

	updated, err := h.store.UpdateStatus(r.Context(), model.UpdateStatusParams{
		ID:     id,
		Status: model.StatusCompleted,
	})
	if err != nil {
		http.Error(w, "failed to update trip", http.StatusInternalServerError)
		return
	}

	if err := h.publisher.PublishTripUpdated(updated); err != nil {
		log.Printf("handler: failed to publish trip.updated: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

// CancelTrip handles POST /trips/{id}/cancel
func (h *HTTPHandler) CancelTrip(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	trip, err := h.store.GetTrip(r.Context(), id)
	if err != nil {
		http.Error(w, "trip not found", http.StatusNotFound)
		return
	}

	if trip.Status == model.StatusCompleted {
		http.Error(w, "cannot cancel a completed trip", http.StatusConflict)
		return
	}

	updated, err := h.store.UpdateStatus(r.Context(), model.UpdateStatusParams{
		ID:     id,
		Status: model.StatusCancelled,
	})
	if err != nil {
		http.Error(w, "failed to cancel trip", http.StatusInternalServerError)
		return
	}

	if err := h.publisher.PublishTripUpdated(updated); err != nil {
		log.Printf("handler: failed to publish trip.updated: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

// GetActiveTrip handles GET /trips/active/{customer_id}
// Called by the frontend after match.found arrives to get the trip_id.
func (h *HTTPHandler) GetActiveTrip(w http.ResponseWriter, r *http.Request) {
	customerID := chi.URLParam(r, "customer_id")
	if customerID == "" {
		http.Error(w, "customer_id is required", http.StatusBadRequest)
		return
	}

	trip, err := h.store.GetActiveTrip(r.Context(), customerID)
	if err != nil {
		http.Error(w, "no active trip found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trip)
}