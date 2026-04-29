package store

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/yourname/gotta-go/location-svc/model"
)

type RedisStore struct {
	client *redis.Client
}

func New(addr string) (*RedisStore, error) {
	client := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis connect failed: %w", err)
	}

	return &RedisStore{client: client}, nil
}

const (
	redisGeoKey    = "operator:locations"
	// TTL is how long an operator stays visible after their last ping.
	// Operators ping every 3 seconds so 10 seconds gives plenty of buffer
	// before they're considered offline.
	operatorTTL    = 10 * time.Second
	onlineKeyPrefix = "operator:online:"
)

func (s *RedisStore) SaveLocation(ctx context.Context, loc model.OperatorLocation) error {
	// Store the geo position.
	err := s.client.GeoAdd(ctx, redisGeoKey, &redis.GeoLocation{
		Name:      loc.OperatorID,
		Longitude: loc.Lng,
		Latitude:  loc.Lat,
	}).Err()
	if err != nil {
		return fmt.Errorf("GeoAdd failed: %w", err)
	}

	// Set a separate key with TTL to track online status.
	// When this key expires the operator is considered offline.
	// We also remove them from the geo set so they don't appear
	// in search results after going offline.
	onlineKey := onlineKeyPrefix + loc.OperatorID
	err = s.client.Set(ctx, onlineKey, "1", operatorTTL).Err()
	if err != nil {
		return fmt.Errorf("Set online key failed: %w", err)
	}

	return nil
}

func (s *RedisStore) FindNearby(ctx context.Context, q model.NearbyQuery) ([]model.NearbyOperator, error) {
	results, err := s.client.GeoRadius(ctx, redisGeoKey, q.Lng, q.Lat, &redis.GeoRadiusQuery{
		Radius:    q.Radius,
		Unit:      "km",
		WithCoord: true,
		WithDist:  true,
		Sort:      "ASC",
	}).Result()

	if err != nil {
		return nil, fmt.Errorf("GeoRadius failed: %w", err)
	}

	operators := make([]model.NearbyOperator, 0, len(results))
	for _, r := range results {
		// Only include operators whose online key still exists.
		// If the key expired they stopped pinging — treat as offline.
		onlineKey := onlineKeyPrefix + r.Name
		exists, err := s.client.Exists(ctx, onlineKey).Result()
		if err != nil || exists == 0 {
			// Key gone — remove from geo set and skip.
			s.client.ZRem(ctx, redisGeoKey, r.Name)
			continue
		}

		operators = append(operators, model.NearbyOperator{
			OperatorID: r.Name,
			Lat:        r.Latitude,
			Lng:        r.Longitude,
			DistanceKm: r.Dist,
		})
	}

	return operators, nil
}

// RemoveOperator immediately removes an operator from the geo set
// and deletes their online key. Called when they explicitly go offline.
func (s *RedisStore) RemoveOperator(ctx context.Context, operatorID string) error {
	s.client.ZRem(ctx, redisGeoKey, operatorID)
	s.client.Del(ctx, onlineKeyPrefix+operatorID)
	return nil
}
