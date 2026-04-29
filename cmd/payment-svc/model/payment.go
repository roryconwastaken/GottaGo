package model

import "time"

type Payment struct {
	ID             string    `db:"id"               json:"id"`
	TripID         string    `db:"trip_id"          json:"trip_id"`
	CustomerID     string    `db:"customer_id"      json:"customer_id"`
	OperatorID     string    `db:"operator_id"      json:"operator_id"`
	BookedMinutes  int       `db:"booked_minutes"   json:"booked_minutes"`
	ActualMinutes  float64   `db:"actual_minutes"   json:"actual_minutes"`
	Amount         float64   `db:"amount"           json:"amount"`
	LateFeeApplied bool      `db:"late_fee_applied" json:"late_fee_applied"`
	Currency       string    `db:"currency"         json:"currency"`
	Status         string    `db:"status"           json:"status"`
	TransactionID  string    `db:"transaction_id"   json:"transaction_id"`
	CreatedAt      time.Time `db:"created_at"       json:"created_at"`
}

type CreatePaymentParams struct {
	ID             string
	TripID         string
	CustomerID     string
	OperatorID     string
	BookedMinutes  int
	ActualMinutes  float64
	Amount         float64
	LateFeeApplied bool
	Currency       string
	TransactionID  string
}