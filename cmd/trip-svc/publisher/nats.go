package publisher

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/yourname/gotta-go/trip-svc/model"
)

type TripEvent struct {
	TripID          string     `json:"trip_id"`
	CustomerID      string     `json:"customer_id"`
	OperatorID      string     `json:"operator_id"`
	Status          string     `json:"status"`
	DurationMinutes int        `json:"duration_minutes"`
	StartedAt       *time.Time `json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at"`
}

type NatsPublisher struct {
	conn *nats.Conn
}

func New(url string) (*NatsPublisher, error) {
	conn, err := nats.Connect(url)
	if err != nil {
		return nil, fmt.Errorf("nats connect failed: %w", err)
	}
	return &NatsPublisher{conn: conn}, nil
}

func (p *NatsPublisher) PublishTripUpdated(trip model.Trip) error {
	event := TripEvent{
		TripID:          trip.ID,
		CustomerID:      trip.CustomerID,
		OperatorID:      trip.OperatorID,
		Status:          string(trip.Status),
		DurationMinutes: trip.DurationMinutes,
		StartedAt:       trip.StartedAt,
		CompletedAt:     trip.CompletedAt,
	}

	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}

	if err := p.conn.Publish("trip.updated", data); err != nil {
		return fmt.Errorf("nats publish failed: %w", err)
	}

	return nil
}

func (p *NatsPublisher) Close() {
	p.conn.Drain()
}