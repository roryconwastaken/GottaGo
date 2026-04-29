package subscriber

import (
	"encoding/json"
	"log"

	"github.com/nats-io/nats.go"
	"github.com/yourname/gotta-go/notification-svc/hub"
)

type TripEvent struct {
	TripID     string `json:"trip_id"`
	CustomerID string `json:"customer_id"`
	OperatorID string `json:"operator_id"`
	Status     string `json:"status"`
}

type MatchEvent struct {
	CustomerID      string  `json:"customer_id"`
	OperatorID      string  `json:"operator_id"`
	PickupLat       float64 `json:"pickup_lat"`
	PickupLng       float64 `json:"pickup_lng"`
	DropoffLat      float64 `json:"dropoff_lat"`
	DropoffLng      float64 `json:"dropoff_lng"`
	DurationMinutes int     `json:"duration_minutes"`
	Fare            float64 `json:"fare"`
}

// PaymentEvent is the shape of payment.completed messages from payment-svc.
type PaymentEvent struct {
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

type Notification struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

type NatsSubscriber struct {
	conn *nats.Conn
	hub  *hub.Hub
}

func New(url string, h *hub.Hub) (*NatsSubscriber, error) {
	conn, err := nats.Connect(url)
	if err != nil {
		return nil, err
	}

	return &NatsSubscriber{conn: conn, hub: h}, nil
}

func (s *NatsSubscriber) Start() error {
	// Trip state changes.
	_, err := s.conn.Subscribe("trip.updated", func(msg *nats.Msg) {
		var event TripEvent
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode trip event: %v", err)
			return
		}

		log.Printf("subscriber: trip %s → %s", event.TripID, event.Status)

		n := Notification{Type: "trip.updated", Payload: event}
		s.hub.Notify(event.CustomerID, n)
		s.hub.Notify(event.OperatorID, n)
	})
	if err != nil {
		return err
	}

	// Match found — operator assigned to customer.
	_, err = s.conn.Subscribe("match.found", func(msg *nats.Msg) {
		var event MatchEvent
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode match event: %v", err)
			return
		}

		log.Printf("subscriber: match found — customer %s → operator %s",
			event.CustomerID, event.OperatorID)

		n := Notification{Type: "match.found", Payload: event}
		s.hub.Notify(event.CustomerID, n)
		s.hub.Notify(event.OperatorID, n)
	})
	if err != nil {
		return err
	}

	// Payment completed — push receipt to both parties.
	// Customer sees how much they were charged.
	// Operator sees confirmation the job is settled.
	_, err = s.conn.Subscribe("payment.completed", func(msg *nats.Msg) {
		var event PaymentEvent
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode payment event: %v", err)
			return
		}

		log.Printf("subscriber: payment %s completed — SGD %.2f for trip %s",
			event.PaymentID, event.Amount, event.TripID)

		n := Notification{Type: "payment.completed", Payload: event}
		s.hub.Notify(event.CustomerID, n)
		s.hub.Notify(event.OperatorID, n)
	})
	if err != nil {
		return err
	}

	// Add this subscription inside Start() alongside the others
	_, err = s.conn.Subscribe("trip.created", func(msg *nats.Msg) {
		var event map[string]string
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode trip.created: %v", err)
			return
		}

		n := Notification{Type: "trip.created", Payload: event}
		s.hub.Notify(event["customer_id"], n)
		s.hub.Notify(event["operator_id"], n)
	})
	if err != nil {
		return err
	}

	// Job offer — push to the specific operator so they
	// see the incoming job screen on their device.
	_, err = s.conn.Subscribe("job.offer", func(msg *nats.Msg) {
		var event map[string]any
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode job.offer: %v", err)
			return
		}

		operatorID, _ := event["operator_id"].(string)
		customerID, _ := event["customer_id"].(string)

		log.Printf("subscriber: job offer for operator %s from customer %s",
			operatorID, customerID)

		// Only push to the operator — the customer already
		// has their waiting screen from the HTTP response.
		s.hub.Notify(operatorID, Notification{
			Type:    "job.offer",
			Payload: event,
		})
	})
	if err != nil {
		return err
	}

	_, err = s.conn.Subscribe("match.no_operators", func(msg *nats.Msg) {
		var event map[string]string
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode no_operators event: %v", err)
			return
		}

		customerID := event["customer_id"]
		log.Printf("subscriber: no operators available for customer %s", customerID)

		s.hub.Notify(customerID, Notification{
			Type:    "match.no_operators",
			Payload: event,
		})
	})
	if err != nil {
		return err
	}

	// Job offer cancelled — push to operator so their incoming
	// job screen dismisses immediately.
	_, err = s.conn.Subscribe("job.offer.cancelled", func(msg *nats.Msg) {
		var event map[string]any
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode job.offer.cancelled: %v", err)
			return
		}

		operatorID, _ := event["operator_id"].(string)
		offerID, _ := event["offer_id"].(string)

		log.Printf("subscriber: offer %s cancelled — notifying operator %s",
			offerID, operatorID)

		s.hub.Notify(operatorID, Notification{
			Type:    "job.offer.cancelled",
			Payload: event,
		})
	})
	if err != nil {
		return err
	}

	log.Println("subscriber: listening on trip.updated, match.found, job.offer, job.offer.cancelled, match.no_operators, payment.completed, trip.created")
	return nil
}



func (s *NatsSubscriber) Close() {
	s.conn.Drain()
}
