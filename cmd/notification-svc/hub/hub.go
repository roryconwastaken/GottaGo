package hub

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"nhooyr.io/websocket"
)

// Client represents one connected user.
// A single user could have multiple connections open
// (phone + browser) so we store a slice of connections per user.
type Client struct {
	UserID string
	Conn   *websocket.Conn
}

// Hub maintains the registry of all active WebSocket connections.
// It is the single source of truth for who is currently connected.
type Hub struct {
	mu      sync.RWMutex
	clients map[string][]*Client // userID → list of connections
}

// New creates an empty Hub ready to accept connections.
func New() *Hub {
	return &Hub{
		clients: make(map[string][]*Client),
	}
}

// Register adds a new client connection to the hub.
// Called when a user successfully opens a WebSocket connection.
func (h *Hub) Register(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[client.UserID] = append(h.clients[client.UserID], client)
	log.Printf("hub: user %s connected (%d total connections)",
		client.UserID, len(h.clients[client.UserID]))
}

// Unregister removes a client connection from the hub.
// Called when a WebSocket connection closes — user navigated away,
// app went to background, network dropped, etc.
func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	conns := h.clients[client.UserID]
	updated := make([]*Client, 0, len(conns))
	for _, c := range conns {
		if c != client {
			updated = append(updated, c)
		}
	}

	if len(updated) == 0 {
		delete(h.clients, client.UserID)
	} else {
		h.clients[client.UserID] = updated
	}

	log.Printf("hub: user %s disconnected", client.UserID)
}

// Notify sends a message to all connections belonging to a specific user.
// If the user has no open connections, the message is silently dropped —
// that's fine, they'll get the current trip state when they reconnect.
func (h *Hub) Notify(userID string, payload any) {
	h.mu.RLock()
	conns := h.clients[userID]
	h.mu.RUnlock()

	if len(conns) == 0 {
		return
	}

	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("hub: failed to marshal payload: %v", err)
		return
	}

	// Send to every open connection for this user.
	// If one connection fails we remove it and continue
	// to the others — a broken connection shouldn't
	// stop other tabs from receiving the notification.
	for _, client := range conns {
		err := client.Conn.Write(context.Background(), websocket.MessageText, data)
		if err != nil {
			log.Printf("hub: failed to write to user %s: %v", userID, err)
			h.Unregister(client)
		}
	}
}
