package publisher

import (
	"encoding/json"
	"fmt"

	"github.com/nats-io/nats.go"
	"github.com/yourname/gotta-go/payment-svc/model"
)

// PaymentCompletedEvent is the message we publish after
// a payment is successfully processed.
type PaymentCompletedEvent struct {
	PaymentID      string  `json:"payment_id"`
	TripID         string  `json:"trip_id"`
	CustomerID     string  `json:"customer_id"`
	OperatorID     string  `json:"operator_id"`
	Amount         float64 `json:"amount"`
	Currency       string  `json:"currency"`
	ActualMinutes  float64 `json:"actual_minutes"`
	BookedMinutes  int     `json:"booked_minutes"`
	LateFeeApplied bool    `json:"late_fee_applied"`
	TransactionID  string  `json:"transaction_id"`
}

// NatsPublisher holds our connection to NATS.
type NatsPublisher struct {
	conn *nats.Conn
}

// New creates a NatsPublisher and connects to NATS.
func New(url string) (*NatsPublisher, error) {
	conn, err := nats.Connect(url)
	if err != nil {
		return nil, fmt.Errorf("nats connect failed: %w", err)
	}
	return &NatsPublisher{conn: conn}, nil
}

// PublishPaymentCompleted fires a payment.completed event
// so notification-svc can push the receipt to both parties.
func (p *NatsPublisher) PublishPaymentCompleted(payment model.Payment) error {
	event := PaymentCompletedEvent{
		PaymentID:      payment.ID,
		TripID:         payment.TripID,
		CustomerID:     payment.CustomerID,
		OperatorID:     payment.OperatorID,
		Amount:         payment.Amount,
		Currency:       payment.Currency,
		ActualMinutes:  payment.ActualMinutes,
		BookedMinutes:  payment.BookedMinutes,
		LateFeeApplied: payment.LateFeeApplied,
		TransactionID:  payment.TransactionID,
	}

	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}

	if err := p.conn.Publish("payment.completed", data); err != nil {
		return fmt.Errorf("nats publish failed: %w", err)
	}

	return nil
}

// Close drains and shuts down the NATS connection gracefully.
func (p *NatsPublisher) Close() {
	p.conn.Drain()
}
