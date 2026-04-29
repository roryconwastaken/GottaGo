package subscriber

import (
	"context"
	"encoding/json"
	"log"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"github.com/yourname/gotta-go/trip-svc/model"
	"github.com/yourname/gotta-go/trip-svc/store"
)

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

type NatsSubscriber struct {
	conn  *nats.Conn
	store *store.PostgresStore
}

func New(url string, s *store.PostgresStore) (*NatsSubscriber, error) {
	conn, err := nats.Connect(url)
	if err != nil {
		return nil, err
	}
	return &NatsSubscriber{conn: conn, store: s}, nil
}

func (s *NatsSubscriber) Start() error {
	_, err := s.conn.Subscribe("match.found", func(msg *nats.Msg) {
		var event MatchFoundEvent
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode match.found: %v", err)
			return
		}

		tripID := uuid.New().String()

		trip, err := s.store.CreateTrip(context.Background(), model.CreateTripParams{
			ID:              tripID,
			CustomerID:      event.CustomerID,
			OperatorID:      event.OperatorID,
			PickupLat:       event.PickupLat,
			PickupLng:       event.PickupLng,
			DropoffLat:      event.DropoffLat,
			DropoffLng:      event.DropoffLng,
			DurationMinutes: event.DurationMinutes,
			Fare:            event.Fare,
		})
		if err != nil {
			log.Printf("subscriber: failed to create trip: %v", err)
			return
		}

		log.Printf("subscriber: created trip %s — %d min, SGD %.2f",
			trip.ID, trip.DurationMinutes, trip.Fare)

		// Publish trip.created so notification-svc can push
		// the trip_id to both the customer and operator via WebSocket.
		tripCreated, _ := json.Marshal(map[string]string{
			"trip_id":     trip.ID,
			"customer_id": trip.CustomerID,
			"operator_id": trip.OperatorID,
		})
		if err := s.conn.Publish("trip.created", tripCreated); err != nil {
			log.Printf("subscriber: failed to publish trip.created: %v", err)
		}
	})

	if err != nil {
		return err
	}

	log.Println("subscriber: listening on match.found")
	return nil
}

func (s *NatsSubscriber) Close() {
	s.conn.Drain()
}