package store

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/yourname/gotta-go/payment-svc/model"
)

// PostgresStore holds our connection to Postgres.
type PostgresStore struct {
	db *sqlx.DB
}

// New connects to Postgres and verifies the connection is alive.
func New(connStr string) (*PostgresStore, error) {
	db, err := sqlx.Connect("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("postgres connect failed: %w", err)
	}
	return &PostgresStore{db: db}, nil
}

// CreatePayment inserts a new payment record.
// Called once per completed trip — the UNIQUE constraint on
// trip_id guarantees no duplicate charges even if the event
// is received more than once.
func (s *PostgresStore) CreatePayment(ctx context.Context, p model.CreatePaymentParams) (model.Payment, error) {
	query := `
		INSERT INTO payments (
			id, trip_id, customer_id, operator_id,
			booked_minutes, actual_minutes, amount,
			late_fee_applied, currency, transaction_id
		) VALUES (
			:id, :trip_id, :customer_id, :operator_id,
			:booked_minutes, :actual_minutes, :amount,
			:late_fee_applied, :currency, :transaction_id
		)
		RETURNING *`

	rows, err := s.db.NamedQueryContext(ctx, query, map[string]any{
		"id":               p.ID,
		"trip_id":          p.TripID,
		"customer_id":      p.CustomerID,
		"operator_id":      p.OperatorID,
		"booked_minutes":   p.BookedMinutes,
		"actual_minutes":   p.ActualMinutes,
		"amount":           p.Amount,
		"late_fee_applied": p.LateFeeApplied,
		"currency":         p.Currency,
		"transaction_id":   p.TransactionID,
	})
	if err != nil {
		if isUniqueViolation(err) {
			return model.Payment{}, nil
		}
		return model.Payment{}, fmt.Errorf("CreatePayment failed: %w", err)
	}
	defer rows.Close()

	var payment model.Payment
	if rows.Next() {
		if err := rows.StructScan(&payment); err != nil {
			return model.Payment{}, fmt.Errorf("scan failed: %w", err)
		}
	}

	return payment, nil
}

// GetPaymentByTripID fetches the payment record for a given trip.
// Used by the HTTP handler so customers can see their receipt.
func (s *PostgresStore) GetPaymentByTripID(ctx context.Context, tripID string) (model.Payment, error) {
	var payment model.Payment
	err := s.db.GetContext(ctx, &payment,
		`SELECT * FROM payments WHERE trip_id = $1`, tripID)
	if err != nil {
		return model.Payment{}, fmt.Errorf("GetPaymentByTripID failed: %w", err)
	}
	return payment, nil
}

// isUniqueViolation checks if a Postgres error is a unique constraint violation.
// Postgres error code 23505 means unique_violation.
func isUniqueViolation(err error) bool {
	return err != nil && len(err.Error()) > 0 &&
		contains(err.Error(), "23505")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr || len(s) > 0 && containsRune(s, substr))
}

func containsRune(s, substr string) bool {
	for i := range s {
		if i+len(substr) <= len(s) && s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
