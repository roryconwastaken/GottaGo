package publisher

import (
	"encoding/json"
	"fmt"

	"github.com/nats-io/nats.go"
)

// JobOfferEvent is sent to the operator when a customer requests them.
type JobOfferEvent struct {
	OfferID         string  `json:"offer_id"`
	CustomerID      string  `json:"customer_id"`
	OperatorID      string  `json:"operator_id"`
	PickupLat       float64 `json:"pickup_lat"`
	PickupLng       float64 `json:"pickup_lng"`
	DropoffLat      float64 `json:"dropoff_lat"`
	DropoffLng      float64 `json:"dropoff_lng"`
	DurationMinutes int     `json:"duration_minutes"`
	Fare            float64 `json:"fare"`
	ExpiresIn       int     `json:"expires_in_seconds"`
}

// NoOperatorsEvent tells the customer that all nearby
// operators rejected the job and they should try again.
type NoOperatorsEvent struct {
	CustomerID string `json:"customer_id"`
}

// MatchFoundEvent is published after an operator accepts.
// Same shape as before so trip-svc and notification-svc
// don't need to change.
type MatchFoundEvent struct {
	CustomerID      string  `json:"customer_id"`
	OperatorID      string  `json:"operator_id"`
	PickupLat       float64 `json:"pickup_lat"`
	PickupLng       float64 `json:"pickup_lng"`
	DropoffLat      float64 `json:"dropoff_lat"`
	DropoffLng      float64 `json:"dropoff_lng"`
	DurationMinutes int     `json:"duration_minutes"`
	Fare            float64 `json:"fare"`
}

type NatsPublisher struct {
	conn *nats.Conn
}

// OfferCancelledEvent tells the operator their pending offer
// was withdrawn by the customer before they could accept.
type OfferCancelledEvent struct {
	OfferID    string `json:"offer_id"`
	OperatorID string `json:"operator_id"`
}

func New(url string) (*NatsPublisher, error) {
	conn, err := nats.Connect(url)
	if err != nil {
		return nil, fmt.Errorf("nats connect failed: %w", err)
	}
	return &NatsPublisher{conn: conn}, nil
}

// PublishJobOffer sends a job offer to a specific operator.
func (p *NatsPublisher) PublishJobOffer(event JobOfferEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}
	return p.conn.Publish("job.offer", data)
}

// PublishMatchFound fires after operator accepts —
// trip-svc listens to this to create the trip.
func (p *NatsPublisher) PublishMatchFound(event MatchFoundEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}
	return p.conn.Publish("match.found", data)
}

// PublishNoOperators notifies the customer that no operators
// are available after exhausting all nearby options.
func (p *NatsPublisher) PublishNoOperators(customerID string) error {
	data, err := json.Marshal(NoOperatorsEvent{CustomerID: customerID})
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}
	return p.conn.Publish("match.no_operators", data)
}

// PublishOfferCancelled notifies the operator that the customer
// cancelled before they accepted the job.
func (p *NatsPublisher) PublishOfferCancelled(operatorID, offerID string) error {
	data, err := json.Marshal(OfferCancelledEvent{
		OfferID:    offerID,
		OperatorID: operatorID,
	})
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}
	return p.conn.Publish("job.offer.cancelled", data)
}

func (p *NatsPublisher) Close() {
	p.conn.Drain()
}