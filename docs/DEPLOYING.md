# Deploying

Current setup: backend on a DigitalOcean droplet, frontend on Vercel (or
similar) auto-deployed from `origin/main` on push.

## Backend (droplet)

Runs as `bite.service` (systemd) at `/opt/bite/bite-server`, config from
`/etc/bite.env`, reverse-proxied by nginx at `engine.mhakash.com` →
`127.0.0.1:8080`. Reference copies of these live in `backend/deploy/`
(`bite.service`, `bite.env.example`, `nginx-bite.conf`) — not applied
automatically, just documentation for re-provisioning.

To ship a backend change:

```bash
cd backend
DROPLET_HOST=root@your.droplet.ip SSH_KEY=~/.ssh/your_key ./deploy/deploy.sh
```

This cross-compiles for `linux/amd64`, copies the binary over, backs up the
previous one on the droplet as `bite-server.bak-<timestamp>` (keeping the
last 5), and restarts `bite.service`. Defaults for `DROPLET_HOST`/`SSH_KEY`/
`REMOTE_DIR` are baked into the script for this project's droplet — override
via env vars if deploying elsewhere. If a deploy goes bad:

```bash
./deploy/rollback.sh   # restores the most recent bite-server.bak-* and restarts
```

The SQLite schema only ever adds tables/columns via `CREATE TABLE IF NOT
EXISTS` (see `backend/internal/db/schema.sql`), so a plain binary swap is
safe — no separate migration step.

## Frontend (Vercel)

Push to `origin/main` (`git push origin main`, over SSH since this repo's
git remote is `git@github.com:mhakash/bite.git`) — Vercel is already wired
to auto-build and deploy `frontend/` from there. `VITE_API_URL` is set in
the Vercel project's environment variables, pointing at
`https://engine.mhakash.com`. No manual step beyond pushing.
