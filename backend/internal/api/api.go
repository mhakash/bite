// Package api implements the HTTP surface: authentication and CRUD
// endpoints for foods, meals, log entries, water, and settings.
package api

import (
	"encoding/json"
	"net/http"
	"time"

	"bite/internal/auth"
)

type API struct {
	store           *Store
	auth            *auth.Service
	refreshTokenTTL time.Duration
	cookieSameSite  http.SameSite
	cookieSecure    bool
}

// NewOptions configures cookie behavior for the refresh-token cookie.
// SameSiteNone is required whenever the frontend and backend are on
// different domains (e.g. Vercel + a separate API host) and forces Secure,
// since browsers reject SameSite=None cookies without it.
type NewOptions struct {
	RefreshTokenTTL time.Duration
	CookieSameSite  http.SameSite
	CookieSecure    bool
}

func New(store *Store, authSvc *auth.Service, opts NewOptions) *API {
	secure := opts.CookieSecure || opts.CookieSameSite == http.SameSiteNoneMode
	return &API{
		store:           store,
		auth:            authSvc,
		refreshTokenTTL: opts.RefreshTokenTTL,
		cookieSameSite:  opts.CookieSameSite,
		cookieSecure:    secure,
	}
}

// Routes registers every /api/* endpoint on mux, using Go 1.22+'s
// method-aware ServeMux patterns instead of pulling in a router dependency.
func (a *API) Routes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/login", a.handleLogin)
	mux.HandleFunc("POST /api/auth/refresh", a.handleRefresh)
	mux.HandleFunc("POST /api/auth/logout", a.handleLogout)

	mux.HandleFunc("GET /api/bootstrap", a.requireAuth(a.handleBootstrap))

	mux.HandleFunc("POST /api/foods", a.requireAuth(a.handleCreateFood))
	mux.HandleFunc("POST /api/foods/bulk", a.requireAuth(a.handleBulkCreateFoods))
	mux.HandleFunc("PATCH /api/foods/{id}", a.requireAuth(a.handleUpdateFood))
	mux.HandleFunc("DELETE /api/foods/{id}", a.requireAuth(a.handleDeleteFood))

	mux.HandleFunc("GET /api/meals", a.requireAuth(a.handleListMeals))
	mux.HandleFunc("POST /api/meals", a.requireAuth(a.handleCreateMeal))
	mux.HandleFunc("PATCH /api/meals/{id}", a.requireAuth(a.handleUpdateMeal))
	mux.HandleFunc("DELETE /api/meals/{id}", a.requireAuth(a.handleDeleteMeal))

	mux.HandleFunc("GET /api/logs", a.requireAuth(a.handleListLogs))
	mux.HandleFunc("GET /api/logs/dates", a.requireAuth(a.handleLoggedDates))
	mux.HandleFunc("POST /api/logs", a.requireAuth(a.handleCreateLog))
	mux.HandleFunc("PATCH /api/logs/{id}", a.requireAuth(a.handleUpdateLog))
	mux.HandleFunc("DELETE /api/logs/{id}", a.requireAuth(a.handleDeleteLog))
	mux.HandleFunc("POST /api/logs/copy", a.requireAuth(a.handleCopyDay))

	mux.HandleFunc("GET /api/water/{date}", a.requireAuth(a.handleGetWater))
	mux.HandleFunc("PUT /api/water/{date}", a.requireAuth(a.handleSetWater))

	mux.HandleFunc("PATCH /api/settings", a.requireAuth(a.handleUpdateSettings))

	mux.HandleFunc("POST /api/days/import", a.requireAuth(a.handleImportDay))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func decodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}
