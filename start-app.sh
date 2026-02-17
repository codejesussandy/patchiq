#!/bin/bash

# PatchIQ Application Startup Script
# This script starts all required services for the PatchIQ application

set -e

echo "🚀 Starting PatchIQ Application..."
echo ""

# Check if Docker is running
echo "1️⃣ Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi
echo "✅ Docker is running"
echo ""

# Start infrastructure services
echo "2️⃣ Starting infrastructure (PostgreSQL, Redis, MinIO)..."
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2
make dev-services
echo "✅ Infrastructure services started"
echo ""

# Wait for services to be ready
echo "3️⃣ Waiting for services to be ready..."
sleep 5
echo "✅ Services ready"
echo ""

# Start backend in background
echo "4️⃣ Starting backend API..."
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2
make dev-backend > /tmp/patchiq-backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend starting (PID: $BACKEND_PID)"
echo "   Logs: /tmp/patchiq-backend.log"
echo ""

# Wait for backend to be ready
echo "5️⃣ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# Start frontend in background
echo "6️⃣ Starting frontend..."
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/frontend
npm run dev > /tmp/patchiq-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend starting (PID: $FRONTEND_PID)"
echo "   Logs: /tmp/patchiq-frontend.log"
echo ""

# Wait for frontend to be ready
echo "7️⃣ Waiting for frontend to start..."
for i in {1..20}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ Frontend is ready!"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 PatchIQ Application is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Application URLs:"
echo "   Frontend:     http://localhost:5173"
echo "   Backend API:  http://localhost:3000"
echo "   API Docs:     http://localhost:3000/api-docs"
echo ""
echo "🔐 Login Credentials:"
echo "   Email:    admin@patchiq.io"
echo "   Password: admin123"
echo ""
echo "📊 Infrastructure:"
echo "   PostgreSQL:   localhost:4500"
echo "   Redis:        localhost:4501"
echo "   MinIO:        localhost:9000"
echo "   pgAdmin:      http://localhost:4502"
echo ""
echo "📝 Logs:"
echo "   Backend:  /tmp/patchiq-backend.log"
echo "   Frontend: /tmp/patchiq-frontend.log"
echo ""
echo "🛑 To stop all services:"
echo "   docker-compose down"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "✨ Ready to test table spacing improvements!"
echo "   Navigate to the following pages to see consistent spacing:"
echo "   • http://localhost:5173/assets"
echo "   • http://localhost:5173/patches"
echo "   • http://localhost:5173/vulnerability/vulnerabilities"
echo "   • http://localhost:5173/settings/user-management/users"
echo ""
