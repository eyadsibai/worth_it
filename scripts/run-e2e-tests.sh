#!/bin/bash
# Run Playwright E2E tests with automatic server startup/shutdown
# Usage: ./scripts/run-e2e-tests.sh [playwright args...]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "Stopped backend server"
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "Stopped frontend server"
    fi
}

trap cleanup EXIT

echo -e "${GREEN}Starting E2E test environment...${NC}\n"

# Start backend server
echo -e "${YELLOW}Starting backend server...${NC}"
cd backend
uv run uvicorn worth_it.api:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "Waiting for backend (http://localhost:8000)..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}Backend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Backend failed to start${NC}"
        exit 1
    fi
    sleep 1
done

# Start frontend server
echo -e "\n${YELLOW}Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
echo "Waiting for frontend (http://localhost:3000)..."
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}Frontend is ready!${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}Frontend failed to start${NC}"
        exit 1
    fi
    sleep 1
done

# Run Playwright tests
echo -e "\n${GREEN}Running Playwright tests...${NC}\n"
npx playwright test "$@"
TEST_EXIT_CODE=$?

# Exit with test exit code
exit $TEST_EXIT_CODE
