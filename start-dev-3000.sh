#!/bin/bash

echo "🚀 Starting Smart Pantry Pro Development Environment..."
echo "📍 Frontend: http://localhost:3002"
echo "📍 API: http://localhost:4000"
echo ""

# Kill any existing processes on ports 3002 and 4000
echo "🧹 Cleaning up existing processes..."
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Start the API server in background
echo "🔧 Starting API server (apps/api) on port 4000..."
npm run api:dev &
API_PID=$!

# Wait a bit for API to start
sleep 2

# Start Vite dev server
echo "🎨 Starting Vite dev server on port 3002..."
npm run dev:vite

# Clean up on exit
trap "kill $API_PID 2>/dev/null" EXIT
