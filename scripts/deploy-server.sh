#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/rental-booking/app}"
SERVICE_NAME="${SERVICE_NAME:-rental-booking}"

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this command as the deploy user, not root." >&2
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Application checkout not found at $APP_DIR." >&2
  exit 1
fi

cd "$APP_DIR"

git fetch origin main
LOCAL_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse origin/main)"
BASE_COMMIT="$(git merge-base HEAD origin/main)"

if [ "$LOCAL_COMMIT" != "$BASE_COMMIT" ]; then
  echo "Server checkout has local commits. Resolve them before deploying." >&2
  exit 1
fi

if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
  git merge --ff-only origin/main
fi

source /home/deploy/.nvm/nvm.sh
nvm use --silent
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl is-active --quiet "$SERVICE_NAME"

echo "Deployment complete: $(git rev-parse --short HEAD)"
