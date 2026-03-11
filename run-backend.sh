#!/usr/bin/env bash
# -------------------------------------------------------------------
# Run the FastAPI backend NATIVELY (outside Docker) so it can access
# USB serial devices like the Arduino.
#
# The DB still runs in Docker — we just override DATABASE_URL to
# point at localhost:5433 (the port Docker exposes).
#
# Usage:
#   1. Make sure the DB container is running:  docker compose up -d db
#   2. Stop the Dockerised backend:            docker compose stop backend
#   3. Run this script:                        ./run-backend.sh
# -------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/backend"

# Override DATABASE_URL to reach the Dockerised Postgres via the
# host-mapped port (5433 → container 5432).
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/fitness_tracker_db"

# Load remaining env vars from the project .env (SECRET_KEY, etc.)
set -a
source ../.env 2>/dev/null || true
set +a
# Re-apply the override (source may have overwritten it)
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/fitness_tracker_db"

echo "==> Installing backend dependencies…"
poetry install --no-interaction --quiet 2>/dev/null || poetry install --no-interaction

echo "==> Starting backend on http://0.0.0.0:8000 (native, with serial access)"
poetry run uvicorn server:app --host 0.0.0.0 --port 8000 --reload
