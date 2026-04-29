package token

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is what we embed inside the token.
// UserID tells us who this token belongs to.
// Role tells us whether they are an operator or customer.
// RegisteredClaims handles expiry, issued-at, etc automatically.
type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// Manager handles creating and verifying tokens.
// It holds the secret key so nothing else in the codebase needs to.
type Manager struct {
	secret []byte
	ttl    time.Duration
}

// NewManager creates a Manager with a secret key and token lifetime.
// The secret should be a long random string — never hardcoded in production.
func NewManager(secret string, ttl time.Duration) *Manager {
	return &Manager{
		secret: []byte(secret),
		ttl:    ttl,
	}
}

// Generate creates a signed JWT for a given user.
// The token expires after the Manager's TTL — typically 24 hours.
func (m *Manager) Generate(userID, role string) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	// Sign the token using HMAC-SHA256 — fast and secure for this use case.
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(m.secret)
}

// Verify checks that a token string is valid and returns its claims.
// Returns an error if the token is expired, tampered with, or malformed.
func (m *Manager) Verify(tokenStr string) (*Claims, error) {
	t, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		// Make sure the signing method is what we expect.
		// Rejecting unexpected methods prevents algorithm-switching attacks.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := t.Claims.(*Claims)
	if !ok || !t.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
