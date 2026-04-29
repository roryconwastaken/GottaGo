package handler

import (
	"encoding/json"
	"net/http"

	"github.com/yourname/gotta-go/location-svc/model"
	"github.com/yourname/gotta-go/location-svc/publisher"
	"github.com/yourname/gotta-go/location-svc/store"
)

type HTTPHandler struct {
	store     *store.RedisStore
	publisher *publisher.NatsPublisher
}

func NewHTTPHandler(s *store.RedisStore, p *publisher.NatsPublisher) *HTTPHandler {
	return &HTTPHandler{store: s, publisher: p}
}

func (h *HTTPHandler) UpdateLocation(w http.ResponseWriter, r *http.Request) {
	var loc model.OperatorLocation
	if err := json.NewDecoder(r.Body).Decode(&loc); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if loc.OperatorID == "" {
		http.Error(w, "operator_id is required", http.StatusBadRequest)
		return
	}
	if loc.Lat == 0 || loc.Lng == 0 {
		http.Error(w, "lat and lng are required", http.StatusBadRequest)
		return
	}

	if err := h.store.SaveLocation(r.Context(), loc); err != nil {
		http.Error(w, "failed to save location", http.StatusInternalServerError)
		return
	}

	if err := h.publisher.PublishLocation(loc); err != nil {
		_ = err
	}

	w.WriteHeader(http.StatusNoContent)
}

// GoOffline handles POST /operator/offline
// Called by the operator app when they toggle offline.
// Removes them from Redis and publishes operator.offline to NATS.
func (h *HTTPHandler) GoOffline(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OperatorID string `json:"operator_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if body.OperatorID == "" {
		http.Error(w, "operator_id is required", http.StatusBadRequest)
		return
	}

	// Remove from Redis immediately rather than waiting for TTL.
	if err := h.store.RemoveOperator(r.Context(), body.OperatorID); err != nil {
		// Non-fatal — TTL will clean it up anyway.
		_ = err
	}

	// Publish so matching-svc marks them unavailable in memory.
	if err := h.publisher.PublishOperatorOffline(body.OperatorID); err != nil {
		_ = err
	}

	w.WriteHeader(http.StatusNoContent)
}