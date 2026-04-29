package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/go-chi/chi/v5"
	"github.com/yourname/gotta-go/location-svc/handler"
	pb "github.com/yourname/gotta-go/location-svc/proto"
	"github.com/yourname/gotta-go/location-svc/publisher"
	"github.com/yourname/gotta-go/location-svc/store"
	"google.golang.org/grpc"
)

func main() {
	// --- 1. Connect to dependencies ---

	redisAddr := envOr("REDIS_ADDR", "localhost:6379")
	natsURL := envOr("NATS_URL", "nats://localhost:4222")

	redisStore, err := store.New(redisAddr)
	if err != nil {
		log.Fatalf("could not connect to Redis: %v", err)
	}
	log.Println("connected to Redis at", redisAddr)

	natsPublisher, err := publisher.New(natsURL)
	if err != nil {
		log.Fatalf("could not connect to NATS: %v", err)
	}
	defer natsPublisher.Close()
	log.Println("connected to NATS at", natsURL)

	// --- 2. Build handlers ---

	httpHandler := handler.NewHTTPHandler(redisStore, natsPublisher)
	grpcHandler := handler.NewGRPCHandler(redisStore)

	// --- 3. Start HTTP server ---

	router := chi.NewRouter()
	router.Post("/location/update", httpHandler.UpdateLocation)
	router.Post("/operator/offline", httpHandler.GoOffline)

	httpServer := &http.Server{
		Addr:    envOr("HTTP_ADDR", ":8081"),
		Handler: router,
	}

	go func() {
		log.Println("HTTP server listening on", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// --- 4. Start gRPC server ---

	grpcAddr := envOr("GRPC_ADDR", ":9091")
	lis, err := net.Listen("tcp", grpcAddr)
	if err != nil {
		log.Fatalf("failed to listen on %s: %v", grpcAddr, err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterLocationServiceServer(grpcServer, grpcHandler)

	go func() {
		log.Println("gRPC server listening on", grpcAddr)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("gRPC server error: %v", err)
		}
	}()

	// --- 5. Wait for shutdown signal ---

	// This blocks until you press Ctrl+C or the process is killed.
	// Then we shut down cleanly instead of just dying mid-request.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down...")
	grpcServer.GracefulStop()
	httpServer.Shutdown(context.Background())
	log.Println("stopped")
}

// envOr reads an environment variable, falling back to a default.
// This means the service works out of the box locally, but can be
// configured differently in production via environment variables.
func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	fmt.Printf("env %s not set, using default: %s\n", key, fallback)
	return fallback
}
