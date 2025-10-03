#!/usr/bin/env bash
set -euo pipefail

# Cleanup script for Auraa Luxury deployment stack
# Usage:
#   chmod +x cleanup.sh
#   ./cleanup.sh
#
# Actions:
# - Stops and removes containers (docker compose down)
# - (Optional) remove generated files and build artifacts when --purge is passed
# - (Optional) remove Docker images with --rmi

PURGE=false
RMI=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge)
      PURGE=true
      shift
      ;;
    --rmi)
      RMI=true
      shift
      ;;
    *)
      echo "Unknown arg: $1"
      exit 1
      ;;
  esac
done

if command -v docker >/dev/null 2>&1; then
  echo "==> Stopping containers..."
  docker compose down || true
else
  echo "Docker not found. Nothing to stop."
fi

if [[ "$RMI" == true ]]; then
  echo "==> Removing related images (python:3.11-slim, node:18, caddy:latest will NOT be removed automatically)."
  echo "   Skipping image removal to avoid impacting other stacks."
fi

if [[ "$PURGE" == true ]]; then
  echo "==> Removing generated files (docker-compose.yml, Caddyfile, frontend_build)"
  rm -f docker-compose.yml Caddyfile || true
  rm -rf frontend_build || true
fi

echo "==> Cleanup completed."
