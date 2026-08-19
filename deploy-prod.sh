#!/usr/bin/env bash
# Orchestrates a production run under PM2: build the app in production mode,
# copy the built entry into the sibling Frappe app if present (see CLAUDE.md
# "Build output goes to ../rndopsapp/public/frontend/"), then serve the build.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "[deploy-prod] building (mode=production)..."
npm run build -- --mode production

RNDOPSAPP_DIR="../rndopsapp"
if [ -d "$RNDOPSAPP_DIR" ]; then
    echo "[deploy-prod] copying build output into $RNDOPSAPP_DIR ..."
    mkdir -p "$RNDOPSAPP_DIR/public/frontend"
    cp -r dist/. "$RNDOPSAPP_DIR/public/frontend/"
    mkdir -p "$RNDOPSAPP_DIR/www"
    cp dist/index.html "$RNDOPSAPP_DIR/www/rndopsapp.html"
else
    echo "[deploy-prod] $RNDOPSAPP_DIR not found, skipping copy step."
fi

echo "[deploy-prod] starting preview server on port ${PORT:-8081}..."
exec npm run preview -- --port "${PORT:-8081}" --host 0.0.0.0
