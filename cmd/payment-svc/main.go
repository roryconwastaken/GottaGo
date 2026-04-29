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
	"github.com/yourname/gotta-go/payment-svc/handler"
	"github.com/yourname/gotta-go/payment-svc/processor"
	"github.com/yourname/gotta-go/payment-svc/publisher"
	"github.com/yourname/gotta-go/payment-svc/store"
	"github.com/yourname/gotta-go/payment-svc/subscriber"
)

func main() {
	// --- 1. Read config ---

	connStr := envOr("POSTGRES_DSN",
		"host=localhost port=5433 user=gottago password=gottago dbname=gottago sslmode=disable")
	natsURL := envOr("NATS_URL", "nats://localhost:4222")
	httpAddr := envOr("HTTP_ADDR", ":8085")

	// --- 2. Connect to Postgres ---

	pgStore, err := store.New(connStr)
	if err != nil {
		log.Fatalf("could not connect to Postgres: %v", err)
	}
	log.Println("connected to Postgres")

	// --- 3. Create mock processor ---

	// 300ms delay simulates a real payment gateway response time.
	proc := processor.New(300)

	// --- 4. Create NATS publisher ---

	pub, err := publisher.New(natsURL)
	if err != nil {
		log.Fatalf("could not connect to NATS for publisher: %v", err)
	}
	defer pub.Close()

	// --- 5. Start NATS subscriber ---

	sub, err := subscriber.New(natsURL, pgStore, proc, pub)
	if err != nil {
		log.Fatalf("could not connect to NATS for subscriber: %v", err)
	}
	defer sub.Close()

	if err := sub.Start(); err != nil {
		log.Fatalf("could not start NATS subscriber: %v", err)
	}

	// --- 6. Build and start HTTP server ---

	httpHandler := handler.NewHTTPHandler(pgStore)

	router := chi.NewRouter()
	router.Get("/payments/{trip_id}", httpHandler.GetPayment)

	httpServer := &http.Server{
		Addr:    httpAddr,
		Handler: router,
	}

	go func() {
		log.Println("payment-svc listening on", httpAddr)
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
