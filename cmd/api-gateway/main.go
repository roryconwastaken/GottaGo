package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/yourname/gotta-go/api-gateway/handler"
	"github.com/yourname/gotta-go/api-gateway/middleware"
	"github.com/yourname/gotta-go/api-gateway/proxy"
	"github.com/yourname/gotta-go/api-gateway/store"
	"github.com/yourname/gotta-go/api-gateway/token"
)

func main() {
	// --- 1. Read config ---

	connStr := envOr("POSTGRES_DSN",
		"host=localhost port=5433 user=gottago password=gottago dbname=gottago sslmode=disable")
	jwtSecret := envOr("JWT_SECRET", "dev-secret-change-in-production")
	httpAddr := envOr("HTTP_ADDR", ":8080")
	matchingSvc := envOr("MATCHING_SVC_URL", "http://localhost:8082")
	tripSvc := envOr("TRIP_SVC_URL", "http://localhost:8083")
	locationSvc := envOr("LOCATION_SVC_URL", "http://localhost:8081")
	notificationSvc := envOr("NOTIFICATION_SVC_URL", "http://localhost:8084")
	paymentSvc := envOr("PAYMENT_SVC_URL", "http://localhost:8085")

	// --- 2. Connect to Postgres ---

	pgStore, err := store.New(connStr)
	if err != nil {
		log.Fatalf("could not connect to Postgres: %v", err)
	}
	log.Println("connected to Postgres")

	// --- 3. Create token manager ---

	// Tokens expire after 24 hours — users stay logged in for a day.
	tokenManager := token.NewManager(jwtSecret, 24*time.Hour)

	// --- 4. Build handlers and proxies ---

	authHandler := handler.NewAuthHandler(pgStore, tokenManager)

	// Each proxy points to a downstream service.
	matchingProxy := proxy.New(matchingSvc)
	tripProxy := proxy.New(tripSvc)
	locationProxy := proxy.New(locationSvc)
	notificationProxy := proxy.New(notificationSvc)
	paymentProxy := proxy.New(paymentSvc)

	// --- 5. Set up routes ---

	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	}))

	// Public routes — no token required.
	r.Post("/auth/register", authHandler.Register)
	r.Post("/auth/login", authHandler.Login)

	// Protected routes — JWT required for all routes below.
	r.Group(func(r chi.Router) {
		r.Use(middleware.Authenticate(tokenManager))

		// Location routes — operators ping their position.
		r.Post("/api/location/update", locationProxy)
		r.Post("/api/operator/offline", locationProxy)

		// Matching routes — customers request a ride.
		r.Post("/api/match/request", matchingProxy)
		r.Post("/api/match/offer/{offer_id}/accept", matchingProxy)
		r.Post("/api/match/offer/{offer_id}/reject", matchingProxy)
		r.Post("/api/match/offer/{offer_id}/cancel", matchingProxy)

		// Trip routes — operators and customers manage the trip.
		r.Get("/api/trips/{id}", tripProxy)
		r.Post("/api/trips/{id}/start", tripProxy)
		r.Post("/api/trips/{id}/complete", tripProxy)
		r.Post("/api/trips/{id}/cancel", tripProxy)
		r.Get("/api/trips/active/{customer_id}", tripProxy)

		// WebSocket route — clients connect here for live notifications.
		r.Get("/ws", notificationProxy)

		// Payment routes — fetch receipt after trip completes.
		r.Get("/api/payments/{trip_id}", paymentProxy)
	})

	// --- 6. Start HTTP server ---

	httpServer := &http.Server{
		Addr:    httpAddr,
		Handler: r,
	}

	go func() {
		log.Println("api-gateway listening on", httpAddr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// --- 7. Wait for shutdown ---

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down...")
	httpServer.Shutdown(context.Background())
	log.Println("stopped")
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	fmt.Printf("env %s not set, using default: %s\n", key, fallback)
	return fallback
}
