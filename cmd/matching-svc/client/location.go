package client

import (
	"context"
	"fmt"

	pb "github.com/yourname/gotta-go/matching-svc/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type LocationClient struct {
	conn   *grpc.ClientConn
	client pb.LocationServiceClient
}

func New(addr string) (*LocationClient, error) {
	conn, err := grpc.NewClient(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to dial location-svc: %w", err)
	}

	return &LocationClient{
		conn:   conn,
		client: pb.NewLocationServiceClient(conn),
	}, nil
}

type NearbyOperator struct {
	OperatorID string
	Lat        float64
	Lng        float64
	DistanceKm float64
}

func (c *LocationClient) GetNearbyOperators(ctx context.Context, lat, lng, radiusKm float64) ([]NearbyOperator, error) {
	resp, err := c.client.GetNearbyOperators(ctx, &pb.NearbyRequest{
		Lat:      lat,
		Lng:      lng,
		RadiusKm: radiusKm,
	})
	if err != nil {
		return nil, fmt.Errorf("GetNearbyOperators failed: %w", err)
	}

	operators := make([]NearbyOperator, 0, len(resp.Operators))
	for _, o := range resp.Operators {
		operators = append(operators, NearbyOperator{
			OperatorID: o.OperatorId,
			Lat:        o.Lat,
			Lng:        o.Lng,
			DistanceKm: o.DistanceKm,
		})
	}

	return operators, nil
}

func (c *LocationClient) Close() {
	c.conn.Close()
}
