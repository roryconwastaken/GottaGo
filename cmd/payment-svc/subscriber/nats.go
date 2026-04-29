package subscriber

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"github.com/yourname/gotta-go/payment-svc/fare"
	"github.com/yourname/gotta-go/payment-svc/model"
	"github.com/yourname/gotta-go/payment-svc/processor"
	"github.com/yourname/gotta-go/payment-svc/publisher"
	"github.com/yourname/gotta-go/payment-svc/store"
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

type NatsSubscriber struct {
	conn      *nats.Conn
	store     *store.PostgresStore
	processor *processor.MockProcessor
	publisher *publisher.NatsPublisher
}

func New(url string, s *store.PostgresStore, p *processor.MockProcessor, pub *publisher.NatsPublisher) (*NatsSubscriber, error) {
	conn, err := nats.Connect(url)
	if err != nil {
		return nil, err
	}

	return &NatsSubscriber{
		conn:      conn,
		store:     s,
		processor: p,
		publisher: pub,
	}, nil
}

func (s *NatsSubscriber) Start() error {
	_, err := s.conn.Subscribe("trip.updated", func(msg *nats.Msg) {
		var event TripEvent
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode trip event: %v", err)
			return
		}

		if event.Status != "completed" {
			return
		}

		if event.StartedAt == nil || event.CompletedAt == nil {
			log.Printf("subscriber: trip %s missing timestamps — skipping", event.TripID)
			return
		}

		amount, actualMinutes, lateFeeApplied := fare.Calculate(
			*event.StartedAt,
			*event.CompletedAt,
			event.DurationMinutes,
		)

		if lateFeeApplied {
			log.Printf("subscriber: trip %s ran over booked time — late fee applied", event.TripID)
		}

		log.Printf("subscriber: trip %s — %.0f actual min (booked %d), SGD %.2f",
			event.TripID, actualMinutes, event.DurationMinutes, amount)

		result, err := s.processor.Charge(processor.ChargeRequest{
			CustomerID: event.CustomerID,
			OperatorID: event.OperatorID,
			Amount:     amount,
			Currency:   "SGD",
			TripID:     event.TripID,
		})
		if err != nil {
			log.Printf("subscriber: charge failed for trip %s: %v", event.TripID, err)
			return
		}

		payment, err := s.store.CreatePayment(context.Background(), model.CreatePaymentParams{
			ID:             uuid.New().String(),
			TripID:         event.TripID,
			CustomerID:     event.CustomerID,
			OperatorID:     event.OperatorID,
			BookedMinutes:  event.DurationMinutes,
			ActualMinutes:  actualMinutes,
			Amount:         amount,
			LateFeeApplied: lateFeeApplied,
			Currency:       "SGD",
			TransactionID:  result.TransactionID,
		})
		if err != nil {
			log.Printf("subscriber: failed to save payment for trip %s: %v", event.TripID, err)
			return
		}

		log.Printf("subscriber: payment %s saved — txn %s", payment.ID, payment.TransactionID)

		if err := s.publisher.PublishPaymentCompleted(payment); err != nil {
			log.Printf("subscriber: failed to publish payment.completed: %v", err)
		}
	})

	if err != nil {
		return err
	}

	log.Println("subscriber: listening on trip.updated")
	return nil
}

func (s *NatsSubscriber) Close() {
	s.conn.Drain()
}