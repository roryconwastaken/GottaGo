package store

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/yourname/gotta-go/trip-svc/model"
)

type PostgresStore struct {
	db *sqlx.DB
}

func New(connStr string) (*PostgresStore, error) {
	db, err := sqlx.Connect("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("postgres connect failed: %w", err)
	}
	return &PostgresStore{db: db}, nil
}

func (s *PostgresStore) CreateTrip(ctx context.Context, p model.CreateTripParams) (model.Trip, error) {
	query := `
		INSERT INTO trips (
			id, customer_id, operator_id, status,
			pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
			duration_minutes, fare
		) VALUES (
			:id, :customer_id, :operator_id, 'matched',
			:pickup_lat, :pickup_lng, :dropoff_lat, :dropoff_lng,
			:duration_minutes, :fare
		)
		RETURNING *`

	rows, err := s.db.NamedQueryContext(ctx, query, map[string]any{
		"id":               p.ID,
		"customer_id":      p.CustomerID,
		"operator_id":      p.OperatorID,
		"pickup_lat":       p.PickupLat,
		"pickup_lng":       p.PickupLng,
		"dropoff_lat":      p.DropoffLat,
		"dropoff_lng":      p.DropoffLng,
		"duration_minutes": p.DurationMinutes,
		"fare":             p.Fare,
	})
	if err != nil {
		return model.Trip{}, fmt.Errorf("CreateTrip failed: %w", err)
	}
	defer rows.Close()

	var trip model.Trip
	if rows.Next() {
		if err := rows.StructScan(&trip); err != nil {
			return model.Trip{}, fmt.Errorf("scan failed: %w", err)
		}
	}
	return trip, nil
}

func (s *PostgresStore) GetTrip(ctx context.Context, id string) (model.Trip, error) {
	var trip model.Trip
	err := s.db.GetContext(ctx, &trip, `SELECT * FROM trips WHERE id = $1`, id)
	if err != nil {
		return model.Trip{}, fmt.Errorf("GetTrip failed: %w", err)
	}
	return trip, nil
}

func (s *PostgresStore) UpdateStatus(ctx context.Context, p model.UpdateStatusParams) (model.Trip, error) {
	// Stamp started_at when the trip moves to in_progress.
	// Stamp completed_at when the trip moves to completed or cancelled.
	// These timestamps are how payment-svc calculates the duration.
	query := `
		UPDATE trips
		SET
			status       = $1,
			updated_at   = NOW(),
			started_at   = CASE WHEN $1 = 'in_progress' THEN NOW() ELSE started_at END,
			completed_at = CASE WHEN $1 IN ('completed', 'cancelled') THEN NOW() ELSE completed_at END
		WHERE id = $2
		RETURNING *`

	var trip model.Trip
	err := s.db.GetContext(ctx, &trip, query, p.Status, p.ID)
	if err != nil {
		return model.Trip{}, fmt.Errorf("UpdateStatus failed: %w", err)
	}
	return trip, nil
}

// GetActiveTrip fetches the most recent non-completed trip for a customer.
// Used after a match to find the trip ID without needing it in the event.
func (s *PostgresStore) GetActiveTrip(ctx context.Context, customerID string) (model.Trip, error) {
	var trip model.Trip
	err := s.db.GetContext(ctx, &trip, `
		SELECT * FROM trips
		WHERE customer_id = $1
		AND status NOT IN ('completed', 'cancelled')
		ORDER BY created_at DESC
		LIMIT 1
	`, customerID)
	if err != nil {
		return model.Trip{}, fmt.Errorf("GetActiveTrip failed: %w", err)
	}
	return trip, nil
}