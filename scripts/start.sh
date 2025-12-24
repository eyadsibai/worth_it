#!/bin/bash
# Startup script for running both FastAPI backend and Next.js frontend (monorepo)
# Usage: ./scripts/start.sh [--clean] [--stop]
#   --clean: Kill existing processes on ports 8000/3000 before starting
#   --stop:  Stop all running Worth It services and exit

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Worth It Application Launcher${NC}"
echo "============================================"

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
CLEAN_MODE=false
STOP_MODE=false
for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN_MODE=true
            ;;
        --stop)
            STOP_MODE=true
            ;;
        --help|-h)
            echo ""
            echo "Usage: ./scripts/start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --clean    Kill existing processes on ports 8000/3000 before starting"
            echo "  --stop     Stop all running Worth It services and exit"
            echo "  --help     Show this help message"
            echo ""
            exit 0
            ;;
    esac
done

# Function to check if a port is in use
port_in_use() {
    lsof -ti :"$1" > /dev/null 2>&1
}

# Function to get process using a port
get_port_process() {
    lsof -ti :"$1" 2>/dev/null | head -1
}

# Function to kill processes on a port
kill_port() {
    local port=$1
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Killing processes on port $port: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Function to clean up Next.js lock files
clean_nextjs_locks() {
    local lock_file="$PROJECT_ROOT/frontend/.next/dev/lock"
    if [ -f "$lock_file" ]; then
        echo -e "${YELLOW}Removing stale Next.js lock file...${NC}"
        rm -f "$lock_file"
    fi
}

# Function to stop all services
stop_services() {
    echo -e "${YELLOW}Stopping all Worth It services...${NC}"

    # Kill by port
    kill_port 8000
    kill_port 3000

    # Kill by process name patterns
    pkill -f "uvicorn worth_it.api:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    # Clean up lock files
    clean_nextjs_locks

    echo -e "${GREEN}✓ All services stopped${NC}"
}

# Handle --stop flag
if [ "$STOP_MODE" = true ]; then
    stop_services
    exit 0
fi

# Check prerequisites
echo ""
echo "Checking prerequisites..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}uv package manager not found.${NC}"
    echo ""
    echo "Please install uv using one of these methods:"
    echo ""
    echo "  macOS (Homebrew):  brew install uv"
    echo "  Linux (Homebrew):  brew install uv"
    echo "  pipx:              pipx install uv"
    echo "  pip:               pip install uv"
    echo "  Official script:   curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo ""
    echo "For more options, see: https://docs.astral.sh/uv/getting-started/installation/"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ uv is installed${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm not found. Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm is installed${NC}"

# Check for port conflicts
echo ""
echo "Checking port availability..."

PORTS_BLOCKED=false
if port_in_use 8000; then
    echo -e "${YELLOW}⚠ Port 8000 is in use (PID: $(get_port_process 8000))${NC}"
    PORTS_BLOCKED=true
fi
if port_in_use 3000; then
    echo -e "${YELLOW}⚠ Port 3000 is in use (PID: $(get_port_process 3000))${NC}"
    PORTS_BLOCKED=true
fi

if [ "$PORTS_BLOCKED" = true ]; then
    if [ "$CLEAN_MODE" = true ]; then
        echo -e "${YELLOW}Clean mode enabled. Killing existing processes...${NC}"
        kill_port 8000
        kill_port 3000
        clean_nextjs_locks
        echo -e "${GREEN}✓ Ports cleared${NC}"
    else
        echo ""
        echo -e "${RED}ERROR: Required ports are in use.${NC}"
        echo ""
        echo "Options:"
        echo "  1. Run with --clean flag to automatically kill existing processes:"
        echo "     ./scripts/start.sh --clean"
        echo ""
        echo "  2. Stop services manually:"
        echo "     ./scripts/start.sh --stop"
        echo ""
        echo "  3. Kill processes manually:"
        echo "     lsof -ti :8000 :3000 | xargs kill -9"
        echo ""
        exit 1
    fi
else
    echo -e "${GREEN}✓ Ports 8000 and 3000 are available${NC}"
fi

# Clean up any stale Next.js lock files
clean_nextjs_locks

# Install backend dependencies
echo ""
echo "Installing backend dependencies with uv..."
if ! cd "$PROJECT_ROOT/backend"; then
    echo -e "${RED}ERROR: Backend directory not found at $PROJECT_ROOT/backend${NC}"
    exit 1
fi
uv sync

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies with npm..."
if ! cd "$PROJECT_ROOT/frontend"; then
    echo -e "${RED}ERROR: Frontend directory not found at $PROJECT_ROOT/frontend${NC}"
    exit 1
fi
npm install

# Start FastAPI backend in background
echo ""
echo -e "${BLUE}Starting FastAPI backend on http://localhost:8000...${NC}"
if ! cd "$PROJECT_ROOT/backend"; then
    echo -e "${RED}ERROR: Cannot change to backend directory${NC}"
    exit 1
fi
uv run uvicorn worth_it.api:app --host 0.0.0.0 --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to start with retry loop
echo "Waiting for backend to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
    printf "."
done
echo ""

# Check if backend is running
if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}ERROR: FastAPI backend failed to start after ${MAX_RETRIES} seconds${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check if port 8000 is still in use: lsof -i :8000"
    echo "  2. Check backend logs above for errors"
    echo "  3. Try running backend manually:"
    echo "     cd backend && uv run uvicorn worth_it.api:app --reload --port 8000"
    echo ""
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✓ FastAPI backend is running (PID: $BACKEND_PID)${NC}"

# Start Next.js frontend
echo ""
echo -e "${BLUE}Starting Next.js frontend on http://localhost:3000...${NC}"
if ! cd "$PROJECT_ROOT/frontend"; then
    echo -e "${RED}ERROR: Cannot change to frontend directory${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to be ready..."
sleep 3
FRONTEND_RETRIES=0
while [ $FRONTEND_RETRIES -lt 20 ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        break
    fi
    FRONTEND_RETRIES=$((FRONTEND_RETRIES + 1))
    sleep 1
    printf "."
done
echo ""

if [ $FRONTEND_RETRIES -eq 20 ]; then
    echo -e "${YELLOW}⚠ Frontend may still be compiling. Check http://localhost:3000 in a moment.${NC}"
else
    echo -e "${GREEN}✓ Next.js frontend is running (PID: $FRONTEND_PID)${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Application is running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${BLUE}Frontend:${NC}     http://localhost:3000"
echo -e "  ${BLUE}Backend API:${NC}  http://localhost:8000"
echo -e "  ${BLUE}API Docs:${NC}     http://localhost:8000/docs"
echo ""
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop both services"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    # Kill any remaining processes
    pkill -f "uvicorn worth_it.api:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    clean_nextjs_locks
    echo -e "${GREEN}Services stopped.${NC}"
    exit 0
}

# Trap Ctrl+C and other signals
trap cleanup INT TERM

# Wait for processes
wait
