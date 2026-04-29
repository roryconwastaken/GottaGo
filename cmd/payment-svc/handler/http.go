package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/yourname/gotta-go/payment-svc/store"
)

// HTTPHandler holds the dependencies our HTTP handlers need.
type HTTPHandler struct {
	store *store.PostgresStore
}

// NewHTTPHandler creates an HTTPHandler with its dependencies injected.
func NewHTTPHandler(s *store.PostgresStore) *HTTPHandler {
	return &HTTPHandler{store: s}
}

// GetPayment handles GET /payments/{trip_id}
// Returns the payment record for a completed trip.
// Both the customer and operator can call this to see the receipt.
func (h *HTTPHandler) GetPayment(w http.ResponseWriter, r *http.Request) {
	tripID := chi.URLParam(r, "trip_id")
	if tripID == "" {
		http.Error(w, "trip_id is required", http.StatusBadRequest)
		return
	}

	payment, err := h.store.GetPaymentByTripID(r.Context(), tripID)
	if err != nil {
		// Payment may not exist yet if the trip just completed
		// and the processor hasn't finished — tell the client
		// to try again shortly.
		http.Error(w, "payment not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payment)
}
