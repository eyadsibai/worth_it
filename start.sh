#!/bin/bash
# Startup script for running both FastAPI backend and Streamlit frontend

echo "Starting Worth It Application..."
echo "================================"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "uv package manager not found. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Install/sync dependencies using uv
echo "Installing dependencies with uv..."
uv sync

# Start FastAPI backend in background
echo ""
echo "Starting FastAPI backend on http://localhost:8000..."
uv run uvicorn api:app --host 0.0.0.0 --port 8000 &
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

# Start Streamlit frontend
echo ""
echo "Starting Streamlit frontend on http://localhost:8501..."
uv run streamlit run app.py &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "Application is running!"
echo "================================"
echo ""
echo "FastAPI Backend:  http://localhost:8000"
echo "API Docs:         http://localhost:8000/docs"
echo "Streamlit UI:     http://localhost:8501"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Services stopped."
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait
