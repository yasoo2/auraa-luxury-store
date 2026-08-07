#!/usr/bin/env bash
#
# Install a pre-push hook that runs scripts/verify.sh.
#
# Since Render and Cloudflare Pages deploy straight from a push, the push is
# the last point where a broken commit can still be stopped.
#
#   ./scripts/install-hooks.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
HOOK=".git/hooks/pre-push"

cat > "$HOOK" <<'HOOK_BODY'
#!/usr/bin/env bash
# Installed by scripts/install-hooks.sh — bypass once with `git push --no-verify`.
echo "Running pre-push verification (scripts/verify.sh)..."
if ! ./scripts/verify.sh; then
  echo
  echo "Push aborted: verification failed."
  echo "Fix the failures, or push anyway with: git push --no-verify"
  exit 1
fi
HOOK_BODY

chmod +x "$HOOK"
echo "✅ تم تثبيت pre-push hook في $HOOK"
echo "   للتخطي مرة واحدة: git push --no-verify"
