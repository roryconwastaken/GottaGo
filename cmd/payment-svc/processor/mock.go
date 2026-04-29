package processor

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ChargeRequest is what we send to the processor.
type ChargeRequest struct {
	CustomerID string
	OperatorID string
	Amount     float64
	Currency   string
	TripID     string
}

// ChargeResult is what the processor sends back.
type ChargeResult struct {
	TransactionID string
	Status        string
	ProcessedAt   time.Time
}

// MockProcessor simulates a payment gateway.
// In production this would call Stripe, Braintree, etc.
// Here it always succeeds after a short artificial delay.
type MockProcessor struct {
	delayMs int
}

// New creates a MockProcessor.
// delayMs controls how long the simulated charge takes —
// real payment gateways typically take 200-800ms.
func New(delayMs int) *MockProcessor {
	return &MockProcessor{delayMs: delayMs}
}

// Charge simulates processing a payment.
// It generates a mock transaction ID and returns success.
// In a real system this is where you'd call the payment API.
func (p *MockProcessor) Charge(req ChargeRequest) (ChargeResult, error) {
	// Simulate network latency to a payment gateway.
	time.Sleep(time.Duration(p.delayMs) * time.Millisecond)

	// Reject zero or negative amounts — these would be
	// rejected by a real gateway too.
	if req.Amount <= 0 {
		return ChargeResult{}, fmt.Errorf("invalid amount: %.2f", req.Amount)
	}

	// Generate a mock transaction ID that looks realistic.
	// Real gateways return IDs like "ch_3OqKL2..." (Stripe)
	// or "PAY-8B663..." (PayPal).
	txID := fmt.Sprintf("MOCK-%s", uuid.New().String()[:8])

	return ChargeResult{
		TransactionID: txID,
		Status:        "completed",
		ProcessedAt:   time.Now(),
	}, nil
}
