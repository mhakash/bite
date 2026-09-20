package api

import (
	"errors"
	"net/http"
	"time"

	"bite/internal/auth"
)

const refreshCookieName = "bite_refresh"

func (a *API) setRefreshCookie(w http.ResponseWriter, value string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    value,
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   a.cookieSecure,
		SameSite: a.cookieSameSite,
		MaxAge:   int(a.refreshTokenTTL.Seconds()),
	})
}

func (a *API) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   a.cookieSecure,
		SameSite: a.cookieSameSite,
		MaxAge:   -1,
	})
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type authResponse struct {
	AccessToken string `json:"accessToken"`
	ExpiresIn   int64  `json:"expiresIn"`
}

func (a *API) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	userID, refreshToken, err := a.auth.Authenticate(req.Username, req.Password)
	if errors.Is(err, auth.ErrInvalidCredentials) {
		writeError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not log in")
		return
	}

	accessToken, expires, err := a.auth.IssueAccessToken(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue access token")
		return
	}

	a.setRefreshCookie(w, refreshToken)
	writeJSON(w, http.StatusOK, authResponse{AccessToken: accessToken, ExpiresIn: int64(time.Until(expires).Seconds())})
}

func (a *API) handleRefresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "no refresh session")
		return
	}

	userID, newRefreshToken, err := a.auth.RotateSession(cookie.Value)
	if err != nil {
		a.clearRefreshCookie(w)
		writeError(w, http.StatusUnauthorized, "session expired, please log in again")
		return
	}

	accessToken, expires, err := a.auth.IssueAccessToken(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue access token")
		return
	}

	a.setRefreshCookie(w, newRefreshToken)
	writeJSON(w, http.StatusOK, authResponse{AccessToken: accessToken, ExpiresIn: int64(time.Until(expires).Seconds())})
}

func (a *API) handleLogout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(refreshCookieName); err == nil {
		a.auth.RevokeSession(cookie.Value)
	}
	a.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}
