package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/yourname/gotta-go/api-gateway/model"
	"github.com/yourname/gotta-go/api-gateway/store"
	"github.com/yourname/gotta-go/api-gateway/token"
)

// AuthHandler holds the dependencies for auth endpoints.
type AuthHandler struct {
	store        *store.PostgresStore
	tokenManager *token.Manager
}

// NewAuthHandler creates an AuthHandler with its dependencies injected.
func NewAuthHandler(s *store.PostgresStore, tm *token.Manager) *AuthHandler {
	return &AuthHandler{store: s, tokenManager: tm}
}

// registerRequest is the expected JSON body for registration.
type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// loginRequest is the expected JSON body for login.
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// tokenResponse is what we send back after a successful login or register.
type tokenResponse struct {
	Token string     `json:"token"`
	User  model.User `json:"user"`
}

// Register handles POST /auth/register
// Creates a new user account and returns a token immediately
// so the user doesn't have to log in separately after registering.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields.
	if req.Email == "" || req.Password == "" {
		http.Error(w, "email and password are required", http.StatusBadRequest)
		return
	}

	// Default to customer if no role provided.
	role := model.Role(strings.ToLower(req.Role))
	if role != model.RoleOperator {
		role = model.RoleCustomer
	}

	// Minimum password length — short passwords are easy to brute force.
	if len(req.Password) < 8 {
		http.Error(w, "password must be at least 8 characters", http.StatusBadRequest)
		return
	}

	user, err := h.store.CreateUser(r.Context(), model.RegisterParams{
		Email:    req.Email,
		Password: req.Password,
		Role:     role,
	})
	if err != nil {
		// A duplicate email produces a Postgres unique constraint error.
		// We check for that specifically to return a helpful message.
		if strings.Contains(err.Error(), "unique") {
			http.Error(w, "email already registered", http.StatusConflict)
			return
		}
		http.Error(w, "registration failed", http.StatusInternalServerError)
		return
	}

	// Generate a token so the user is immediately logged in.
	t, err := h.tokenManager.Generate(user.ID, string(user.Role))
	if err != nil {
		http.Error(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(tokenResponse{Token: t, User: user})
}

// Login handles POST /auth/login
// Verifies credentials and returns a signed JWT if correct.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "email and password are required", http.StatusBadRequest)
		return
	}

	// Look up the user by email.
	user, err := h.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		// We return the same error whether the email doesn't exist
		// or the password is wrong — this prevents attackers from
		// using the error message to enumerate valid email addresses.
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	// Check the password against the stored hash.
	if err := store.CheckPassword(user.PasswordHash, req.Password); err != nil {
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	// Generate and return the token.
	t, err := h.tokenManager.Generate(user.ID, string(user.Role))
	if err != nil {
		http.Error(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokenResponse{Token: t, User: user})
}
