#!/usr/bin/env bash
# Erzeugt statische Folien-Miniaturen für uebersicht.html.
# Bei jedem Veröffentlichen ausführen, besonders nach neuen oder geänderten Folien.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright}"
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-/home/box/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell}"
exec node "$ROOT/scripts/vorschauen.js" "$@"
