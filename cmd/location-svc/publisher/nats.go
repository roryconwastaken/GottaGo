package publisher

import (
	"encoding/json"
	"fmt"

	"github.com/nats-io/nats.go"
	"github.com/yourname/gotta-go/location-svc/model"
)

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

func (p *NatsPublisher) PublishLocation(loc model.OperatorLocation) error {
	subject := fmt.Sprintf("location.updated.%s", loc.OperatorID)

	data, err := json.Marshal(loc)
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}

	if err := p.conn.Publish(subject, data); err != nil {
		return fmt.Errorf("nats publish failed: %w", err)
	}

	return nil
}

func (p *NatsPublisher) PublishOperatorOffline(operatorID string) error {
	data, _ := json.Marshal(map[string]string{"operator_id": operatorID})
	return p.conn.Publish("operator.offline", data)
}

func (p *NatsPublisher) Close() {
	p.conn.Drain()
}
