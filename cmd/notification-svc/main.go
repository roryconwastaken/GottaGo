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
	"github.com/yourname/gotta-go/notification-svc/handler"
	"github.com/yourname/gotta-go/notification-svc/hub"
	"github.com/yourname/gotta-go/notification-svc/subscriber"
)

func main() {
	// --- 1. Read config ---

	natsURL := envOr("NATS_URL", "nats://localhost:4222")
	httpAddr := envOr("HTTP_ADDR", ":8084")

	// --- 2. Create the hub ---

	// The hub is the central registry of all WebSocket connections.
	// It must be created first because both the handler and
	// the subscriber need a reference to it.
	h := hub.New()

	// --- 3. Start NATS subscriber ---

	sub, err := subscriber.New(natsURL, h)
	if err != nil {
		log.Fatalf("could not connect to NATS: %v", err)
	}
	defer sub.Close()

	if err := sub.Start(); err != nil {
		log.Fatalf("could not start NATS subscriber: %v", err)
	}

	// --- 4. Build and start HTTP server ---

	wsHandler := handler.NewWSHandler(h)

	router := chi.NewRouter()

	// WebSocket endpoint — clients connect here and stay connected.
	// The gateway will proxy this route too once we add it.
	router.Get("/ws", wsHandler.Connect)

	httpServer := &http.Server{
		Addr:    httpAddr,
		Handler: router,
	}

	go func() {
		log.Println("notification-svc listening on", httpAddr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// --- 5. Wait for shutdown ---

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
