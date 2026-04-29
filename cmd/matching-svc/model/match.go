package model

type MatchRequest struct {
	CustomerID      string  `json:"customer_id"`
	PickupLat       float64 `json:"pickup_lat"`
	PickupLng       float64 `json:"pickup_lng"`
	DropoffLat      float64 `json:"dropoff_lat"`
	DropoffLng      float64 `json:"dropoff_lng"`
	DurationMinutes int     `json:"duration_minutes"`
}

type MatchResult struct {
	OperatorID      string  `json:"operator_id"`
	OperatorLat     float64 `json:"operator_lat"`
	OperatorLng     float64 `json:"operator_lng"`
	DistanceKm      float64 `json:"distance_km"`
	DurationMinutes int     `json:"duration_minutes"`
	Fare            float64 `json:"fare"`
}

type OperatorState struct {
	OperatorID string
	Lat        float64
	Lng        float64
	Available  bool
}
