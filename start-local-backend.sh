#!/usr/bin/env bash
# ------------------------------------------------------------------
# start-local-backend.sh
#
# Stops the Docker backend container and runs the FastAPI backend
# natively on the host so it can access USB serial devices (Arduino).
#
# The Docker database and frontend containers keep running.
# The frontend already points at http://localhost:8000 so it
# connects to the local backend automatically.
#
# Usage:  ./start-local-backend.sh          (foreground, Ctrl-C to stop)
#         ./start-local-backend.sh --restore (stop local, restart Docker backend)
# ------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yaml"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Database URL rewritten for host access (Docker DB is exposed on localhost:5433)
LOCAL_DB_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/fitness_tracker_db"

# Helper: get PID of process LISTENING on port 8000 (ignores client connections)
port_listener_pid() {
    lsof -iTCP:8000 -sTCP:LISTEN -t 2>/dev/null | head -1 || true
}

# Helper: kill a PID and wait for the port to be released (up to N seconds)
kill_and_wait() {
    local pid="$1" sig="${2:-TERM}" max_wait="${3:-5}"
    kill -"$sig" "$pid" 2>/dev/null || true
    for (( i=0; i<max_wait; i++ )); do
        if ! kill -0 "$pid" 2>/dev/null; then return 0; fi
        sleep 1
    done
    # Still alive — SIGKILL
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
}

# ---- Restore mode: bring back the Docker backend ----
if [[ "${1:-}" == "--restore" ]]; then
    echo "🔄 Restoring Docker backend..."

    LISTEN_PID=$(port_listener_pid)
    if [[ -n "$LISTEN_PID" ]]; then
        echo "   Stopping local backend (PID $LISTEN_PID)..."
        kill_and_wait "$LISTEN_PID"
    fi

    docker compose -f "$COMPOSE_FILE" up -d backend frontend
    echo "✅ Docker backend and frontend are running again."
    exit 0
fi

# ---- Pre-flight checks ----
echo "🔍 Checking prerequisites..."

# Poetry
if ! command -v poetry &>/dev/null; then
    echo "❌ Poetry is not installed. Install it first: https://python-poetry.org"
    exit 1
fi

# Docker DB must be running
if ! docker ps --format '{{.Names}}' | grep -q fitness_tracker_db; then
    echo "⚙️  Database container not running — starting db + frontend..."
    docker compose -f "$COMPOSE_FILE" up -d db frontend
    echo "   Waiting for database to be healthy..."
    until docker exec fitness_tracker_db pg_isready -U postgres -d fitness_tracker_db &>/dev/null; do
        sleep 1
    done
fi

# ---- Free port 8000 ----
PID="$(port_listener_pid)"
if [[ -n "$PID" ]]; then
    echo "⚠️  Port 8000 is in use (PID $PID). Freeing it..."
    # If it's the Docker backend, stop just the backend container
    if docker ps --format '{{.Names}}' | grep -q fitness_tracker_backend; then
        docker compose -f "$COMPOSE_FILE" stop backend
        sleep 1
    fi
    # Kill any remaining listener (e.g. a stale uvicorn from a previous run)
    PID="$(port_listener_pid)"
    if [[ -n "$PID" ]]; then
        echo "   Killing listener PID $PID..."
        kill_and_wait "$PID"
    fi
    # Final check
    if [[ -n "$(port_listener_pid)" ]]; then
        echo "❌ Port 8000 is still in use:"
        lsof -iTCP:8000 -sTCP:LISTEN
        exit 1
    fi
    echo "   ✅ Port 8000 is free."
fi

# ---- Stop Docker backend (if still running) ----
if docker ps --format '{{.Names}}' | grep -q fitness_tracker_backend; then
    echo "🐳 Stopping Docker backend container..."
    docker compose -f "$COMPOSE_FILE" stop backend
fi

# Make sure frontend is running (docker stop backend may have stopped it due to depends_on)
if ! docker ps --format '{{.Names}}' | grep -q fitness_tracker_frontend; then
    echo "🐳 Starting frontend container..."
    docker compose -f "$COMPOSE_FILE" up -d frontend
fi

# ---- Install deps if needed ----
echo "📦 Ensuring backend dependencies are installed..."
cd "$BACKEND_DIR"
poetry install --no-interaction --quiet 2>/dev/null || poetry install --no-interaction

# ---- Ensure uploads directory exists ----
mkdir -p "$BACKEND_DIR/uploads"

# ---- Check for Arduino ----
if ls /dev/ttyACM* &>/dev/null; then
    echo "✅ Arduino detected: $(ls /dev/ttyACM*)"
elif ls /dev/ttyUSB* &>/dev/null; then
    echo "✅ Serial device detected: $(ls /dev/ttyUSB*)"
else
    echo "⚠️  No Arduino/serial device detected (you can still connect later)"
fi

# ---- Start the backend ----
echo ""
echo "🚀 Starting local backend on http://localhost:8000"
echo "   Database: $LOCAL_DB_URL"
echo "   Press Ctrl-C to stop"
echo "   Run './start-local-backend.sh --restore' to switch back to Docker"
echo ""

# Export the local DB URL and any other vars from .env (minus DATABASE_URL)
set -a
if [[ -f "$SCRIPT_DIR/.env" ]]; then
    while IFS= read -r line; do
        [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
        [[ "$line" =~ ^DATABASE_URL= ]] && continue
        export "$line"
    done < "$SCRIPT_DIR/.env"
fi
export DATABASE_URL="$LOCAL_DB_URL"
export PYTHONPATH="$BACKEND_DIR${PYTHONPATH:+:$PYTHONPATH}"
set +a

cd "$BACKEND_DIR"
exec poetry run uvicorn server:app --host 0.0.0.0 --port 8000 --reload
