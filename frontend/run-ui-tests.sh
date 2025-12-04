#!/bin/bash

echo "🧪 Running UI/UX Tests for Worth It Application"
echo "=============================================="
echo ""

# Check if servers are running
check_server() {
    local port=$1
    local name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ $name is running on port $port"
        return 0
    else
        echo "❌ $name is not running on port $port"
        return 1
    fi
}

# Check frontend
frontend_running=$(check_server 3000 "Frontend")

# Check backend
backend_running=$(check_server 8000 "Backend API")

echo ""

# If servers aren't running, start them
if [ -z "$frontend_running" ] || [ -z "$backend_running" ]; then
    echo "Starting servers..."
    echo ""

    # Start backend
    if [ -z "$backend_running" ]; then
        echo "Starting backend API..."
        cd ../backend
        uv run uvicorn worth_it.api:app --port 8000 > /tmp/backend.log 2>&1 &
        BACKEND_PID=$!
        sleep 3
    fi

    # Start frontend
    if [ -z "$frontend_running" ]; then
        echo "Starting frontend..."
        cd ../frontend
        npm run dev > /tmp/frontend.log 2>&1 &
        FRONTEND_PID=$!
        sleep 5
    fi

    echo ""
fi

# Run tests
cd /Users/eyad/dev/worth_it/frontend
echo "Running Playwright UI/UX tests..."
echo "================================="
echo ""

# Run tests without starting servers (they're already running)
npx playwright test --config playwright.config.ts --reporter=list

TEST_EXIT_CODE=$?

# Clean up if we started servers
if [ ! -z "$BACKEND_PID" ]; then
    echo ""
    echo "Stopping backend server..."
    kill $BACKEND_PID 2>/dev/null
fi

if [ ! -z "$FRONTEND_PID" ]; then
    echo "Stopping frontend server..."
    kill $FRONTEND_PID 2>/dev/null
fi

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed. Check the output above for details."
fi

exit $TEST_EXIT_CODE
