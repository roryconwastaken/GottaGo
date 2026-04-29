package subscriber

import (
	"encoding/json"
	"log"

	"github.com/nats-io/nats.go"
	"github.com/yourname/gotta-go/matching-svc/matcher"
	"github.com/yourname/gotta-go/matching-svc/model"
)

type LocationEvent struct {
	OperatorID string  `json:"operator_id"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	Bearing    float64 `json:"bearing"`
	Speed      float64 `json:"speed"`
}

type NatsSubscriber struct {
	conn    *nats.Conn
	matcher *matcher.Matcher
}

func New(url string, m *matcher.Matcher) (*NatsSubscriber, error) {
	conn, err := nats.Connect(url)
	if err != nil {
		return nil, err
	}

	return &NatsSubscriber{
		conn:    conn,
		matcher: m,
	}, nil
}

func (s *NatsSubscriber) Start() error {
	// Existing location.updated.* subscription stays the same.
	_, err := s.conn.Subscribe("location.updated.*", func(msg *nats.Msg) {
		var event LocationEvent
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode location event: %v", err)
			return
		}

		s.matcher.UpsertOperator(model.OperatorState{
			OperatorID: event.OperatorID,
			Lat:        event.Lat,
			Lng:        event.Lng,
			Available:  true,
		})
	})
	if err != nil {
		return err
	}

	// New — remove operator from memory when they go offline.
	_, err = s.conn.Subscribe("operator.offline", func(msg *nats.Msg) {
		var event map[string]string
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("subscriber: failed to decode operator.offline: %v", err)
			return
		}

		operatorID := event["operator_id"]
		log.Printf("subscriber: operator %s went offline", operatorID)

		// Mark unavailable — they won't appear in future matches.
		s.matcher.SetAvailability(operatorID, false)
	})
	if err != nil {
		return err
	}

	log.Println("subscriber: listening on location.updated.*, operator.offline")
	return nil
}

func (s *NatsSubscriber) Close() {
	s.conn.Drain()
}
