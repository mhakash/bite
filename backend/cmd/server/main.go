// Command server runs the Bite backend API. The frontend is a separate
// deployment (e.g. on Vercel) that talks to this over CORS, so this binary
// only ever serves JSON under /api/*. It also doubles as a CLI for creating
// users since there is no public signup — access is granted by whoever runs
// this binary.
package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"syscall"

	"golang.org/x/term"

	"bite/internal/api"
	"bite/internal/auth"
	"bite/internal/config"
	"bite/internal/db"
)

func main() {
	createUser := flag.String("createuser", "", "create a user with this username and exit")
	flag.Parse()

	cfg := config.Load()

	sqlDB, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer sqlDB.Close()

	store := api.NewStore(sqlDB)

	if *createUser != "" {
		if err := runCreateUser(store, *createUser); err != nil {
			log.Fatalf("create user: %v", err)
		}
		return
	}

	authSvc := auth.NewService(sqlDB, cfg.JWTSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)

	sameSite := http.SameSiteLaxMode
	if cfg.CookieSameSite == "none" {
		sameSite = http.SameSiteNoneMode
	}
	apiServer := api.New(store, authSvc, api.NewOptions{
		RefreshTokenTTL: cfg.RefreshTokenTTL,
		CookieSameSite:  sameSite,
		CookieSecure:    os.Getenv("COOKIE_INSECURE") == "",
	})

	mux := http.NewServeMux()
	apiServer.Routes(mux)

	handler := api.CORS(cfg.CORSOrigins, mux)

	addr := ":" + cfg.Port
	log.Printf("bite server listening on %s (db: %s, cors: %v)", addr, cfg.DBPath, cfg.CORSOrigins)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func runCreateUser(store *api.Store, username string) error {
	password, err := readPassword()
	if err != nil {
		return err
	}
	if strings.TrimSpace(password) == "" {
		return fmt.Errorf("password cannot be empty")
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	userID, err := store.CreateUser(username, hash)
	if err != nil {
		return fmt.Errorf("insert user (username may already exist): %w", err)
	}
	if err := store.SeedNewUser(userID); err != nil {
		return fmt.Errorf("seed default data: %w", err)
	}

	fmt.Printf("Created user %q (id %d) with the default food library, meals, and settings.\n", username, userID)
	return nil
}

func readPassword() (string, error) {
	fmt.Print("Password: ")
	if term.IsTerminal(int(syscall.Stdin)) {
		bytePassword, err := term.ReadPassword(int(syscall.Stdin))
		fmt.Println()
		return string(bytePassword), err
	}
	reader := bufio.NewReader(os.Stdin)
	line, err := reader.ReadString('\n')
	return strings.TrimRight(line, "\r\n"), err
}
