#!/usr/bin/env bash
# Builds the backend for linux/amd64 and deploys it to the droplet running
# bite.service. See ../../README.md "Deploying" for the full setup this
# assumes (systemd unit, env file, nginx reverse proxy).
#
# Config (env vars, all optional):
#   DROPLET_HOST   ssh target, e.g. root@1.2.3.4   (default: root@REDACTED-DROPLET-IP)
#   SSH_KEY        private key path                (default: ~/.ssh/digitalocean)
#   REMOTE_DIR     app directory on the droplet     (default: /opt/bite)
#   KEEP_BACKUPS   how many old binaries to keep    (default: 5)
set -euo pipefail

DROPLET_HOST="${DROPLET_HOST:-root@REDACTED-DROPLET-IP}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/digitalocean}"
REMOTE_DIR="${REMOTE_DIR:-/opt/bite}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"

cd "$(dirname "$0")/.."

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
