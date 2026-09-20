# 🍊 Bite — daily nutrition tracker

A fast calorie and macro tracker built with React + Vite on the frontend and a
Go + SQLite backend. Access is invite-only — an admin creates accounts via the
server's CLI, there's no public signup.

## Architecture

```
frontend/   React + Vite SPA — deploys independently (e.g. Vercel)
backend/    Go API server + SQLite — deploys independently (e.g. a droplet)
```

The two are separate deployments on separate domains, talking over CORS with
credentialed (cookie-based) requests. The frontend never touches the database
directly — everything goes through the backend's JSON API.

## Getting started

### Backend

```bash
cd backend
go run ./cmd/server -createuser yourname   # prompts for a password, seeds default data
CORS_ORIGINS=http://localhost:5271 COOKIE_SAMESITE=lax COOKIE_INSECURE=1 go run ./cmd/server
```

Config is via environment variables:

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `8080` | |
| `DB_PATH` | `./bite.db` | SQLite file path |
| `JWT_SECRET` | random per-run | **set explicitly in production** — restarts otherwise invalidate all sessions |
| `ACCESS_TOKEN_TTL` | `15m` | |
| `REFRESH_TOKEN_TTL` | `720h` (30d) | |
| `CORS_ORIGINS` | `http://localhost:5271` | comma-separated list of allowed frontend origins |
| `COOKIE_SAMESITE` | `lax` | set to `none` for a real cross-domain deployment (requires HTTPS) |
| `COOKIE_INSECURE` | unset | set to any value to allow the refresh cookie over plain HTTP in local dev |

### Frontend

```bash
cd frontend
npm install
npm run dev      # reads VITE_API_URL from .env.development (defaults to http://localhost:8080)
npm run build    # production build, for whatever host you deploy to (e.g. Vercel)
```

Set `VITE_API_URL` to your backend's origin — locally via `.env.development`
(already committed), in production via your host's environment variables
(e.g. Vercel project settings). See `frontend/.env.example`.

## Deploying

See [docs/DEPLOYING.md](docs/DEPLOYING.md) for the actual droplet + Vercel
setup, and `backend/deploy/` for the deploy/rollback scripts and reference
infra config.

## Features

- **Daily logging** — log foods into customizable meal sections (Breakfast,
  Lunch, Dinner, Snacks by default — add, rename, or remove your own), with a
  running calorie ring and protein/carbs/fat progress bars against your goals.
- **Food library** — build up a personal library of foods with per-portion
  gram weights and full macro/micronutrient breakdowns.
- **Custom amounts & quantities** — log by a saved portion, a quantity
  multiplier, or a custom gram amount.
- **JSON food import** — paste or import structured JSON to add foods in bulk.
- **Water tracking** and a **weekly trend** chart of calories/macros over time.
- **Backup & transfer** — export/import a single day's log or your whole food
  library as JSON files.
- **Goals & settings** — set calorie, protein, carb, fat, and water goals.

## Tech stack

- Frontend: [React](https://react.dev/) 19 + [Vite](https://vite.dev/),
  [Framer Motion](https://www.framer.com/motion/) for sheet/transition
  animations, [Recharts](https://recharts.org/) for the weekly trend chart.
- Backend: Go (stdlib `net/http` with method-aware routing, no router
  dependency), [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite)
  (pure-Go, no CGO — keeps the binary small and memory overhead low),
  [golang-jwt](https://github.com/golang-jwt/jwt) for access tokens,
  `golang.org/x/crypto/bcrypt` for password hashing.

## Auth model

- No public signup. An admin runs `go run ./cmd/server -createuser <name>` to
  create an account (prompts for a password, seeds default meals/foods/goals).
- Login issues a short-lived JWT access token (kept in memory in the browser,
  never localStorage) plus a long-lived refresh token in an httpOnly cookie.
- The frontend silently refreshes the access token on load and on 401s; the
  refresh token rotates on every use and is revoked on logout.

## Project structure

```
frontend/src/
  components/   UI components (sheets, cards, shared IconButton, etc.)
  context/      App-wide state (AppContext) — now backed by the API, not localStorage
  api/          Fetch client for the backend
  data/         Nutrient definitions
  utils/        Date helpers, nutrition math, JSON import/export

backend/
  cmd/server/       entrypoint + createuser CLI
  internal/api/     HTTP handlers, routing, CORS, SQLite-backed store
  internal/auth/    password hashing, JWT + refresh-session logic
  internal/config/  env-based configuration
  internal/db/      SQLite connection + schema
  internal/models/  shared JSON shapes + seed food data
```
