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
	"github.com/yourname/gotta-go/matching-svc/client"
	"github.com/yourname/gotta-go/matching-svc/handler"
	"github.com/yourname/gotta-go/matching-svc/matcher"
	"github.com/yourname/gotta-go/matching-svc/offer"
	"github.com/yourname/gotta-go/matching-svc/publisher"
	"github.com/yourname/gotta-go/matching-svc/subscriber"
)

func main() {
	locationAddr := envOr("LOCATION_GRPC_ADDR", "localhost:9091")
	natsURL      := envOr("NATS_URL",            "nats://localhost:4222")
	httpAddr     := envOr("HTTP_ADDR",            ":8082")

	locationClient, err := client.New(locationAddr)
	if err != nil {
		log.Fatalf("could not connect to location-svc: %v", err)
	}
	defer locationClient.Close()
	log.Println("connected to location-svc at", locationAddr)

	m := matcher.New()

	sub, err := subscriber.New(natsURL, m)
	if err != nil {
		log.Fatalf("could not connect to NATS for subscriber: %v", err)
	}
	defer sub.Close()

	if err := sub.Start(); err != nil {
		log.Fatalf("could not start NATS subscriber: %v", err)
	}

	pub, err := publisher.New(natsURL)
	if err != nil {
		log.Fatalf("could not connect to NATS for publisher: %v", err)
	}
	defer pub.Close()
	log.Println("connected to NATS at", natsURL)

	offerStore := offer.New()
	httpHandler := handler.NewHTTPHandler(locationClient, m, pub, offerStore)

	router := chi.NewRouter()
	router.Post("/match/request",                    httpHandler.RequestMatch)
	router.Post("/match/offer/{offer_id}/accept",    httpHandler.AcceptOffer)
	router.Post("/match/offer/{offer_id}/reject",    httpHandler.RejectOffer)
	router.Post("/match/offer/{offer_id}/cancel", httpHandler.CancelOffer)


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