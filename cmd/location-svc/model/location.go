package model

type OperatorLocation struct {
	OperatorID string  `json:"operator_id"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	Bearing    float64 `json:"bearing"`
	Speed      float64 `json:"speed"`
}

type NearbyOperator struct {
	OperatorID string  `json:"operator_id"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	DistanceKm float64 `json:"distance_km"`
}

type NearbyQuery struct {
	Lat    float64
	Lng    float64
	Radius float64
}
