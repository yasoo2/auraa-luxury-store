#!/usr/bin/env bash
#
# Local pre-deploy verification.
#
# Runs the same checks CI would, so the project keeps a safety net without
# depending on GitHub Actions. Deployment happens through Render's and
# Cloudflare Pages' own Git integrations, which do not run these checks —
# so run this before you push.
#
#   ./scripts/verify.sh
#
set -uo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
FAILED=0

blue()  { printf '\033[1;34m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }

step() {
  local name="$1"; shift
  blue "→ $name"
  if "$@" > /tmp/verify-step.log 2>&1; then
    green "  ✓ $name"
  else
    red   "  ✗ $name"
    tail -25 /tmp/verify-step.log | sed 's/^/    /'
    FAILED=1
  fi
}

# --- Backend ---------------------------------------------------------------

PY=python3
[ -x "$ROOT/backend/venv/bin/python" ] && PY="$ROOT/backend/venv/bin/python"

export MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
export DB_NAME="${DB_NAME:-verify_db}"
export JWT_SECRET_KEY="${JWT_SECRET_KEY:-local-verify-secret}"
export ENV=test

if $PY -c "import fastapi" 2>/dev/null; then
  # Catches boot-time breakage: bad imports, names used before definition, and
  # the syntax error that once reduced the server from 63 routes to 8.
  step "Backend imports and registers routes" \
    bash -c "cd '$ROOT/backend' && $PY -c \"import server; n=len(server.app.routes); print(f'{n} routes'); assert n > 40, f'only {n} routes registered'\""

  if $PY -c "import mongomock_motor, pytest" 2>/dev/null; then
    step "Backend integration tests" $PY -m pytest tests/test_integration.py -q
  else
    red "  ! skipping tests — run: pip install mongomock_motor pytest"
  fi
else
  red "  ! skipping backend — run: pip install -r backend/requirements.txt"
fi

# --- Frontend --------------------------------------------------------------

if [ -d "$ROOT/frontend/node_modules" ]; then
  step "Frontend build" \
    bash -c "cd '$ROOT/frontend' && CI=false npx craco build"
else
  red "  ! skipping frontend — run: cd frontend && npm install --legacy-peer-deps"
fi

# ---------------------------------------------------------------------------

echo
if [ "$FAILED" -eq 0 ]; then
  green "✅ كل الفحوصات نجحت — آمن للدفع والنشر"
else
  red   "❌ فشل فحص أو أكثر — لا تدفع قبل الإصلاح"
fi
exit "$FAILED"
