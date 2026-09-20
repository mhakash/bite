#!/usr/bin/env bash
# Builds the backend for linux/amd64 and deploys it to the droplet running
# bite.service. See ../../docs/DEPLOYING.md for the full setup this assumes
# (systemd unit, env file, nginx reverse proxy).
#
# Config (env vars, all optional except DROPLET_HOST):
#   DROPLET_HOST   ssh target, e.g. root@1.2.3.4   (required)
#   SSH_KEY        private key path                (default: ~/.ssh/id_rsa)
#   REMOTE_DIR     app directory on the droplet     (default: /opt/bite)
#   KEEP_BACKUPS   how many old binaries to keep    (default: 5)
#
# This repo is public, so real infra details (droplet IP, key path) are kept
# out of version control. Set them via env vars, or copy deploy.env.example
# to deploy.env (gitignored) and this script will source it automatically.
set -euo pipefail

cd "$(dirname "$0")"
[ -f deploy.env ] && source deploy.env
cd ..

: "${DROPLET_HOST:?Set DROPLET_HOST (e.g. root@1.2.3.4), or copy deploy/deploy.env.example to deploy/deploy.env}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
REMOTE_DIR="${REMOTE_DIR:-/opt/bite}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"

echo "==> Building linux/amd64 binary"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tmp/bite-server-new ./cmd/server

echo "==> Copying to $DROPLET_HOST:$REMOTE_DIR"
scp -i "$SSH_KEY" /tmp/bite-server-new "$DROPLET_HOST:$REMOTE_DIR/bite-server-new"
rm -f /tmp/bite-server-new

echo "==> Installing and restarting bite.service"
ssh -i "$SSH_KEY" "$DROPLET_HOST" REMOTE_DIR="$REMOTE_DIR" KEEP_BACKUPS="$KEEP_BACKUPS" bash -s <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"
cp bite-server "bite-server.bak-$(date +%Y%m%d%H%M%S)"
chmod +x bite-server-new
mv bite-server-new bite-server
systemctl restart bite.service
sleep 1
systemctl is-active --quiet bite.service && echo "bite.service is active"
# Keep only the newest $KEEP_BACKUPS binary backups.
ls -t bite-server.bak-* 2>/dev/null | tail -n "+$((KEEP_BACKUPS + 1))" | xargs -r rm --
REMOTE

echo "==> Done. Roll back with ./deploy/rollback.sh if needed."
