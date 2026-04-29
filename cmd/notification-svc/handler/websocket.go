package handler

import (
	"log"
	"net/http"

	"github.com/yourname/gotta-go/notification-svc/hub"
	"nhooyr.io/websocket"
)

// WSHandler handles WebSocket connections.
type WSHandler struct {
	hub *hub.Hub
}

// NewWSHandler creates a WSHandler with its dependencies injected.
func NewWSHandler(h *hub.Hub) *WSHandler {
	return &WSHandler{hub: h}
}

// Connect handles GET /ws?user_id=xxx
// The client connects here and keeps the connection open.
// Messages flow from server to client whenever a notification arrives.
func (h *WSHandler) Connect(w http.ResponseWriter, r *http.Request) {
	// Read the user ID from the query string.
	// In production this would come from a verified JWT —
	// for now we trust the query param to keep things simple.
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	// Upgrade the HTTP connection to a WebSocket connection.
	// This is the handshake — after this line, normal HTTP is
	// over and we have a persistent two-way connection.
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		// Allow all origins for local development.
		// In production, restrict this to your frontend domain.
		InsecureSkipVerify: true,
	})
	if err != nil {
		log.Printf("websocket: failed to accept connection: %v", err)
		return
	}

	// Create a client and register it in the hub.
	client := &hub.Client{
		UserID: userID,
		Conn:   conn,
	}
	h.hub.Register(client)

	// Unregister when the connection closes — no matter the reason.
	// defer guarantees this runs even if the function panics.
	defer h.hub.Unregister(client)

	// Keep the connection open by reading from it.
	// We don't expect clients to send messages — this is a
	// one-way notification channel (server → client only).
	// But we still need to read to detect when the connection closes.
	// Read blocks until the client disconnects or sends something.
	for {
		_, _, err := conn.Read(r.Context())
		if err != nil {
			// Connection closed — normal, not an error we need to log.
			break
		}
	}
}
