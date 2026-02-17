#!/bin/bash
# Quick start script for PatchIQ

echo "🚀 Starting PatchIQ..."
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please start Docker Desktop:"
    echo "  1. Run: open -a Docker"
    echo "  2. Wait for Docker whale icon in menu bar"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Navigate to project directory
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2

echo "📦 Starting services..."
make dev-services

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "🔧 Starting backend..."
make dev-backend &

echo "⏳ Waiting for backend..."
sleep 10

echo "🎨 Starting frontend..."
cd frontend
npm run dev &

echo ""
echo "✅ All services started!"
echo ""
echo "Open in browser:"
echo "  http://localhost:5173"
echo ""
echo "Login:"
echo "  admin@patchiq.io / admin123"
echo ""
