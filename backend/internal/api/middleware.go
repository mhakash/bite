package api

import (
	"context"
	"net/http"
	"strings"
)

type contextKey int

const userIDKey contextKey = 0

func userIDFromContext(ctx context.Context) (int64, bool) {
	id, ok := ctx.Value(userIDKey).(int64)
	return id, ok
}

// requireAuth wraps a handler so it only runs for requests carrying a valid
// access token, injecting the authenticated user's ID into the context.
func (a *API) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			writeError(w, http.StatusUnauthorized, "missing or malformed Authorization header")
			return
		}
		userID, err := a.auth.VerifyAccessToken(token)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid or expired access token")
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next(w, r.WithContext(ctx))
	}
}
