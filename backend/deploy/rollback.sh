#!/usr/bin/env bash
# Restores the most recent bite-server.bak-* binary on the droplet and
# restarts bite.service. Use after a deploy.sh that broke something.
#
# Config (env vars, all optional): same as deploy.sh.
set -euo pipefail

DROPLET_HOST="${DROPLET_HOST:-root@REDACTED-DROPLET-IP}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/digitalocean}"
REMOTE_DIR="${REMOTE_DIR:-/opt/bite}"

ssh -i "$SSH_KEY" "$DROPLET_HOST" REMOTE_DIR="$REMOTE_DIR" bash -s <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"
latest="$(ls -t bite-server.bak-* 2>/dev/null | head -1)"
if [ -z "$latest" ]; then
  echo "no backup found in $REMOTE_DIR" >&2
  exit 1
fi
echo "Rolling back to $latest"
cp "$latest" bite-server
systemctl restart bite.service
sleep 1
systemctl is-active --quiet bite.service && echo "bite.service is active"
REMOTE
