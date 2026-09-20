// Package config loads server configuration from environment variables so
// deployment can be tweaked (port, data path, token lifetimes) without
// recompiling the binary.
package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port            string
	DBPath          string
	JWTSecret       []byte
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	// CORSOrigins are the frontend origins allowed to call this API with
	// credentials (e.g. your Vercel deployment and local dev server).
	CORSOrigins []string
	// CookieSameSite is "none" for a cross-site deployment (frontend and
	// backend on different domains — requires HTTPS) or "lax" for same-site
	// local dev (frontend and backend both on localhost, different ports).
	CookieSameSite string
}

func Load() Config {
	return Config{
		Port:            envOr("PORT", "8080"),
		DBPath:          envOr("DB_PATH", "./bite.db"),
		JWTSecret:       []byte(envOr("JWT_SECRET", devSecret())),
		AccessTokenTTL:  envDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL: envDuration("REFRESH_TOKEN_TTL", 30*24*time.Hour),
		CORSOrigins:     envList("CORS_ORIGINS", []string{"http://localhost:5271"}),
		CookieSameSite:  envOr("COOKIE_SAMESITE", "lax"),
	}
}

func envList(key string, fallback []string) []string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

// devSecret is used only when JWT_SECRET is unset, so local `go run` works
// out of the box. Production deployments must set JWT_SECRET explicitly —
// every restart with this fallback invalidates all sessions since it's
// re-derived from the process start time.
func devSecret() string {
	return "dev-insecure-secret-set-JWT_SECRET-env-var-" + strconv.FormatInt(time.Now().Unix(), 36)
}
