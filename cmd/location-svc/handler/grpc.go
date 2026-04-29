package handler

import (
	"context"

	"github.com/yourname/gotta-go/location-svc/model"
	pb "github.com/yourname/gotta-go/location-svc/proto"
	"github.com/yourname/gotta-go/location-svc/store"
)

type GRPCHandler struct {
	pb.UnimplementedLocationServiceServer
	store *store.RedisStore
}

func NewGRPCHandler(s *store.RedisStore) *GRPCHandler {
	return &GRPCHandler{store: s}
}

func (h *GRPCHandler) GetNearbyOperators(ctx context.Context, req *pb.NearbyRequest) (*pb.NearbyResponse, error) {
	query := model.NearbyQuery{
		Lat:    req.Lat,
		Lng:    req.Lng,
		Radius: req.RadiusKm,
	}

	operators, err := h.store.FindNearby(ctx, query)
	if err != nil {
		return nil, err
	}

	entries := make([]*pb.OperatorEntry, 0, len(operators))
	for _, o := range operators {
		entries = append(entries, &pb.OperatorEntry{
			OperatorId: o.OperatorID,
			Lat:        o.Lat,
			Lng:        o.Lng,
			DistanceKm: o.DistanceKm,
		})
	}

	return &pb.NearbyResponse{Operators: entries}, nil
}
