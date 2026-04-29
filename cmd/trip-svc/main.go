package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/go-chi/chi/v5"
	"github.com/yourname/gotta-go/trip-svc/handler"
	"github.com/yourname/gotta-go/trip-svc/publisher"
	"github.com/yourname/gotta-go/trip-svc/store"
	"github.com/yourname/gotta-go/trip-svc/subscriber"
)

func main() {
	connStr := envOr("POSTGRES_DSN",
		"host=localhost port=5433 user=gottago password=gottago dbname=gottago sslmode=disable")
	natsURL := envOr("NATS_URL", "nats://localhost:4222")
	httpAddr := envOr("HTTP_ADDR", ":8083")

	pgStore, err := store.New(connStr)
	if err != nil {
		log.Fatalf("could not connect to Postgres: %v", err)
	}
	log.Println("connected to Postgres")

	sub, err := subscriber.New(natsURL, pgStore)
	if err != nil {
		log.Fatalf("could not connect to NATS for subscriber: %v", err)
	}
	defer sub.Close()

	if err := sub.Start(); err != nil {
		log.Fatalf("could not start NATS subscriber: %v", err)
	}

	// Create publisher on a separate NATS connection.
	pub, err := publisher.New(natsURL)
	if err != nil {
		log.Fatalf("could not connect to NATS for publisher: %v", err)
	}
	defer pub.Close()
	log.Println("connected to NATS")

	httpHandler := handler.NewHTTPHandler(pgStore, pub)

	router := chi.NewRouter()
	router.Get("/trips/{id}", httpHandler.GetTrip)
	router.Post("/trips/{id}/start", httpHandler.StartTrip)
	router.Post("/trips/{id}/complete", httpHandler.CompleteTrip)
	router.Post("/trips/{id}/cancel", httpHandler.CancelTrip)
	router.Get("/trips/active/{customer_id}", httpHandler.GetActiveTrip)

	httpServer := &http.Server{
		Addr:    httpAddr,
		Handler: router,
	}

	go func() {
		log.Println("HTTP server listening on", httpAddr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

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
