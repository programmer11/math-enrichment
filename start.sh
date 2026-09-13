#!/usr/bin/env bash
#
# One-command local startup for the Math Proficiency Assessment.
#
# What this does, in order:
#   1. Starts Postgres via `docker compose` (or `docker-compose`, whichever
#      is on your system) if it isn't already running.
#   2. Waits for Postgres to actually accept connections.
#   3. Creates a Python virtualenv for the backend (first run only) and
#      installs dependencies.
#   4. Installs frontend dependencies (first run only).
#   5. Starts the FastAPI backend (port 8000) and the Next.js frontend
#      (port 3000) together, and opens your browser to localhost:3000.
#
# Requirements: Docker (for Postgres), Python 3.10+, Node.js 18+.
# If you don't have Docker, see README.md's "Running it locally" section
# for how to point this at a locally-installed Postgres instead --
# everything below except step 1 still applies.
#
# Usage:
#   chmod +x start.sh   # first time only
#   ./start.sh
#
# Press Ctrl+C to stop both servers. Postgres keeps running in the
# background afterward (run `docker compose down` to stop it too).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Starting Postgres..."
HAVE_DOCKER=0
if docker compose version >/dev/null 2>&1; then
    docker compose up -d
    HAVE_DOCKER=1
elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose up -d
    HAVE_DOCKER=1
else
    echo "!! Docker not found. Either install Docker, or start your own"
    echo "!! Postgres instance and set DATABASE_URL in backend/.env --"
    echo "!! see README.md 'Running it locally' for details. Continuing"
    echo "!! on the assumption Postgres is already reachable..."
fi

if [ "$HAVE_DOCKER" = "1" ]; then
    echo "==> Waiting for Postgres to accept connections..."
    for i in $(seq 1 30); do
        if docker compose exec -T db pg_isready -U app_user -d math_assessment >/dev/null 2>&1; then
            echo "    Postgres is ready."
            break
        fi
        sleep 1
    done
fi

echo "==> Setting up backend..."
cd "$SCRIPT_DIR/backend"
if [ ! -d venv ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://app_user:app_password@localhost:5432/math_assessment}"

echo "==> Setting up frontend..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d node_modules ]; then
    npm install
fi
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
fi

echo "==> Starting backend (http://localhost:8000) and frontend (http://localhost:3000)..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "==> Stopping backend and frontend (Postgres keeps running -- 'docker compose down' to stop it too)..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit 0
}
trap cleanup INT TERM

sleep 3
echo ""
echo "=================================================="
echo " Ready! Open http://localhost:3000 in your browser"
echo " (backend API is at http://localhost:8000)"
echo " Press Ctrl+C here to stop both servers."
echo "=================================================="

wait
