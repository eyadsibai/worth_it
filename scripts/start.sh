#!/bin/bash
# Startup script for running both FastAPI backend and Next.js frontend (monorepo)

echo "Starting Worth It Application (Monorepo)..."
echo "============================================"

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "uv package manager not found. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Install backend dependencies
echo ""
echo "Installing backend dependencies with uv..."
cd "$PROJECT_ROOT/backend"
uv sync

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies with npm..."
cd "$PROJECT_ROOT/frontend"
npm install

# Start FastAPI backend in background
echo ""
echo "Starting FastAPI backend on http://localhost:8000..."
cd "$PROJECT_ROOT/backend"
uv run uvicorn worth_it.api:app --host 0.0.0.0 --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "ERROR: FastAPI backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✓ FastAPI backend is running (PID: $BACKEND_PID)"

# Start Next.js frontend
echo ""
echo "Starting Next.js frontend on http://localhost:3000..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "Application is running!"
echo "============================================"
echo ""
echo "FastAPI Backend:  http://localhost:8000"
echo "API Docs:         http://localhost:8000/docs"
echo "Next.js Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Kill any remaining Next.js processes
    pkill -f "next dev" 2>/dev/null
    echo "Services stopped."
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait
