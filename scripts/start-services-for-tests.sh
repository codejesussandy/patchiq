#!/bin/bash

# Script to start backend and frontend services for testing
# This script is helpful when services are not already running

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=================================="
echo "PatchIQ Services Startup"
echo "=================================="
echo ""

# Check if services are already running
BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ Backend already running on port 3000"
    BACKEND_RUNNING=true
else
    echo "⚠ Backend not running on port 3000"
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✓ Frontend already running on port 5173"
    FRONTEND_RUNNING=true
else
    echo "⚠ Frontend not running on port 5173"
fi

echo ""

# Start backend if not running
if [ "$BACKEND_RUNNING" = false ]; then
    echo "Starting backend..."
    cd "$PROJECT_ROOT/backend"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing backend dependencies..."
        npm install
    fi

    # Start backend in background
    echo "Starting backend server on port 3000..."
    npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    echo "$BACKEND_PID" > ../logs/backend.pid

    # Wait for backend to be ready
    echo "Waiting for backend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo "✓ Backend is ready!"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
fi

# Start frontend if not running
if [ "$FRONTEND_RUNNING" = false ]; then
    echo "Starting frontend..."
    cd "$PROJECT_ROOT/frontend"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi

    # Start frontend in background
    echo "Starting frontend server on port 5173..."
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    echo "$FRONTEND_PID" > ../logs/frontend.pid

    # Wait for frontend to be ready
    echo "Waiting for frontend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            echo "✓ Frontend is ready!"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
fi

echo ""
echo "=================================="
echo "Services Status"
echo "=================================="
echo ""

# Final status check
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ Backend: http://localhost:3000"
else
    echo "✗ Backend: FAILED TO START"
    echo "Check logs: tail -f logs/backend.log"
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✓ Frontend: http://localhost:5173"
else
    echo "✗ Frontend: FAILED TO START"
    echo "Check logs: tail -f logs/frontend.log"
fi

echo ""
echo "=================================="
echo "Ready for Testing!"
echo "=================================="
echo ""
echo "Run authentication tests:"
echo "  ./scripts/run-auth-tests.sh"
echo ""
echo "View logs:"
echo "  Backend:  tail -f logs/backend.log"
echo "  Frontend: tail -f logs/frontend.log"
echo ""
echo "Stop services:"
echo "  ./scripts/stop-services.sh"
echo ""
