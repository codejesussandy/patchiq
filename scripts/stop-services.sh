#!/bin/bash

# Script to stop backend and frontend services started by start-services-for-tests.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=================================="
echo "Stopping PatchIQ Services"
echo "=================================="
echo ""

# Stop backend
if [ -f "$PROJECT_ROOT/logs/backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_ROOT/logs/backend.pid")
    if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true
        rm "$PROJECT_ROOT/logs/backend.pid"
        echo "✓ Backend stopped"
    else
        echo "⚠ Backend process not found"
        rm "$PROJECT_ROOT/logs/backend.pid"
    fi
else
    echo "⚠ No backend PID file found"
fi

# Stop frontend
if [ -f "$PROJECT_ROOT/logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_ROOT/logs/frontend.pid")
    if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null || true
        rm "$PROJECT_ROOT/logs/frontend.pid"
        echo "✓ Frontend stopped"
    else
        echo "⚠ Frontend process not found"
        rm "$PROJECT_ROOT/logs/frontend.pid"
    fi
else
    echo "⚠ No frontend PID file found"
fi

echo ""
echo "Services stopped."
echo ""
