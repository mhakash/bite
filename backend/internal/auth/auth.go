// Package auth handles password hashing and the access/refresh token pair:
// short-lived JWT access tokens verified statelessly, backed by long-lived
// opaque refresh tokens stored (hashed) in the sessions table so they can be
// rotated and revoked.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrSessionNotFound = errors.New("session not found or expired")

type Service struct {
	db              *sql.DB
	jwtSecret       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

func NewService(db *sql.DB, jwtSecret []byte, accessTTL, refreshTTL time.Duration) *Service {
	return &Service{db: db, jwtSecret: jwtSecret, accessTokenTTL: accessTTL, refreshTokenTTL: refreshTTL}
}

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

type claims struct {
	UserID int64 `json:"uid"`
	jwt.RegisteredClaims
}

// IssueAccessToken creates a short-lived JWT identifying userID.
func (s *Service) IssueAccessToken(userID int64) (string, time.Time, error) {
	expires := time.Now().Add(s.accessTokenTTL)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expires),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})
	signed, err := token.SignedString(s.jwtSecret)
	return signed, expires, err
}

// VerifyAccessToken returns the user ID encoded in a valid, unexpired token.
func (s *Service) VerifyAccessToken(tokenString string) (int64, error) {
	parsed, err := jwt.ParseWithClaims(tokenString, &claims{}, func(t *jwt.Token) (any, error) {
		return s.jwtSecret, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !parsed.Valid {
		return 0, errors.New("invalid token")
	}
	c, ok := parsed.Claims.(*claims)
	if !ok {
		return 0, errors.New("invalid token claims")
	}
	return c.UserID, nil
}

func randomToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// Authenticate checks a username/password pair and, on success, creates a
// new refresh-token session for that user.
func (s *Service) Authenticate(username, password string) (userID int64, refreshToken string, err error) {
	var hash string
	err = s.db.QueryRow(`SELECT id, password_hash FROM users WHERE username = ?`, username).Scan(&userID, &hash)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, "", ErrInvalidCredentials
	}
	if err != nil {
		return 0, "", err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return 0, "", ErrInvalidCredentials
	}

	refreshToken, err = s.createSession(userID)
	if err != nil {
		return 0, "", err
	}
	return userID, refreshToken, nil
}

func (s *Service) createSession(userID int64) (string, error) {
	sessionID, err := randomToken()
	if err != nil {
		return "", err
	}
	refreshToken, err := randomToken()
	if err != nil {
		return "", err
	}
	_, err = s.db.Exec(
		`INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
		sessionID, userID, hashToken(refreshToken), time.Now().Add(s.refreshTokenTTL).Unix(), time.Now().Unix(),
	)
	if err != nil {
		return "", err
	}
	// The refresh token cookie carries "<sessionID>.<secret>" so we can look
	// up the session row by ID and then verify the secret's hash, instead of
	// scanning every session to find a hash match.
	return sessionID + "." + refreshToken, nil
}

func splitRefreshToken(cookie string) (sessionID, secret string, ok bool) {
	for i := 0; i < len(cookie); i++ {
		if cookie[i] == '.' {
			return cookie[:i], cookie[i+1:], true
		}
	}
	return "", "", false
}

// RotateSession validates a refresh token cookie, deletes it, and issues a
// replacement — rotation on every use limits the damage of a leaked token.
func (s *Service) RotateSession(cookieValue string) (userID int64, newRefreshToken string, err error) {
	sessionID, secret, ok := splitRefreshToken(cookieValue)
	if !ok {
		return 0, "", ErrSessionNotFound
	}

	var storedHash string
	var expiresAt int64
	err = s.db.QueryRow(
		`SELECT user_id, refresh_token_hash, expires_at FROM sessions WHERE id = ?`, sessionID,
	).Scan(&userID, &storedHash, &expiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, "", ErrSessionNotFound
	}
	if err != nil {
		return 0, "", err
	}
	if hashToken(secret) != storedHash || time.Now().Unix() > expiresAt {
		s.db.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
		return 0, "", ErrSessionNotFound
	}

	s.db.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	newRefreshToken, err = s.createSession(userID)
	return userID, newRefreshToken, err
}

// RevokeSession deletes the session behind a refresh token cookie (logout).
func (s *Service) RevokeSession(cookieValue string) error {
	sessionID, _, ok := splitRefreshToken(cookieValue)
	if !ok {
		return nil
	}
	_, err := s.db.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	return err
}
