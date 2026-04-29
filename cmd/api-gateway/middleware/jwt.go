package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/yourname/gotta-go/api-gateway/token"
)

// contextKey is a private type for context keys.
// Using a custom type prevents collisions with other packages
// that might also store things in the request context.
type contextKey string

const ClaimsKey contextKey = "claims"

// Authenticate is the middleware function. It wraps any HTTP handler
// and checks for a valid JWT before allowing the request through.
func Authenticate(tm *token.Manager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Tokens arrive in the Authorization header like this:
			// Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			// Split "Bearer <token>" and take the second part.
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, "invalid authorization format", http.StatusUnauthorized)
				return
			}

			// Verify the token signature and expiry.
			claims, err := tm.Verify(parts[1])
			if err != nil {
				http.Error(w, "invalid or expired token", http.StatusUnauthorized)
				return
			}

			// Attach the verified claims to the request context so
			// handlers downstream can read the user's ID and role
			// without re-parsing the token.
			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaims retrieves the verified claims from the request context.
// Handlers call this to find out who is making the request.
func GetClaims(r *http.Request) *token.Claims {
	claims, _ := r.Context().Value(ClaimsKey).(*token.Claims)
	return claims
}
