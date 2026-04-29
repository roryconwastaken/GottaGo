package model

import "time"

type Status string

const (
	StatusMatched    Status = "matched"
	StatusInProgress Status = "in_progress"
	StatusCompleted  Status = "completed"
	StatusCancelled  Status = "cancelled"
)

type Trip struct {
	ID              string     `db:"id"               json:"id"`
	CustomerID      string     `db:"customer_id"      json:"customer_id"`
	OperatorID      string     `db:"operator_id"      json:"operator_id"`
	Status          Status     `db:"status"           json:"status"`
	PickupLat       float64    `db:"pickup_lat"       json:"pickup_lat"`
	PickupLng       float64    `db:"pickup_lng"       json:"pickup_lng"`
	DropoffLat      float64    `db:"dropoff_lat"      json:"dropoff_lat"`
	DropoffLng      float64    `db:"dropoff_lng"      json:"dropoff_lng"`
	DurationMinutes int        `db:"duration_minutes" json:"duration_minutes"`
	Fare            float64    `db:"fare"             json:"fare"`
	StartedAt       *time.Time `db:"started_at"       json:"started_at"`
	CompletedAt     *time.Time `db:"completed_at"     json:"completed_at"`
	CreatedAt       time.Time  `db:"created_at"       json:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at"       json:"updated_at"`
}

type CreateTripParams struct {
	ID              string
	CustomerID      string
	OperatorID      string
	PickupLat       float64
	PickupLng       float64
	DropoffLat      float64
	DropoffLng      float64
	DurationMinutes int
	Fare            float64
}

type UpdateStatusParams struct {
	ID     string
	Status Status
}
