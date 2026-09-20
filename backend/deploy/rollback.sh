#!/usr/bin/env bash
# Restores the most recent bite-server.bak-* binary on the droplet and
# restarts bite.service. Use after a deploy.sh that broke something.
#
# Config: same as deploy.sh (DROPLET_HOST required, reads deploy.env if present).
set -euo pipefail

cd "$(dirname "$0")"
[ -f deploy.env ] && source deploy.env

: "${DROPLET_HOST:?Set DROPLET_HOST (e.g. root@1.2.3.4), or copy deploy.env.example to deploy.env}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
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
