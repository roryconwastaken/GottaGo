package proxy

import (
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/yourname/gotta-go/api-gateway/middleware"
)

// New creates a reverse proxy that forwards requests to target.
// It injects the verified user ID into the request headers so
// downstream services know who is making the call without
// needing to verify the JWT themselves.
func New(target string) http.HandlerFunc {
	url, err := url.Parse(target)
	if err != nil {
		panic("invalid proxy target: " + target)
	}

	proxy := httputil.NewSingleHostReverseProxy(url)

	// ModifyRequest runs on every forwarded request before it
	// leaves the gateway — this is where we inject the user identity.
	proxy.Director = func(r *http.Request) {
		// Set the target host and scheme.
		r.URL.Scheme = url.Scheme
		r.URL.Host = url.Host

		// Strip the /api prefix from the path so matching-svc
		// receives /match/request not /api/match/request.
		// Each service only knows its own paths, not the gateway prefix.
		if len(r.URL.Path) >= 4 && r.URL.Path[:4] == "/api" {
			r.URL.Path = r.URL.Path[4:]
		}

		r.Host = url.Host

		// Inject the verified user identity as a header.
		// Downstream services trust this header because requests
		// only reach them via the gateway which already verified the JWT.
		claims := middleware.GetClaims(r)
		if claims != nil {
			r.Header.Set("X-User-ID", claims.UserID)
			r.Header.Set("X-User-Role", claims.Role)
		}
	}

	return func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	}
}
