#!/usr/bin/env bash

set -euo pipefail
cd "$(dirname "$0")/backend"

export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/fitness_tracker_db"

set -a
source ../.env 2>/dev/null || true
set +a
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/fitness_tracker_db"

echo "==> Installing backend dependencies…"
poetry install --no-interaction --quiet 2>/dev/null || poetry install --no-interaction

echo "==> Starting backend on http://0.0.0.0:8000 (native, with serial access)"
poetry run uvicorn server:app --host 0.0.0.0 --port 8000 --reload
