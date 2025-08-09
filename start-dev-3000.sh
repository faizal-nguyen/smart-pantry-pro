#!/bin/bash

echo "🚀 Starting Smart Pantry Pro Development Environment..."
echo "📍 Frontend: http://localhost:3000"
echo "📍 API: http://localhost:3001"
echo ""

# Kill any existing processes on ports 3000 and 3001
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Start the API server in background
echo "🔧 Starting API server on port 3001..."
node start-local-api.js &
API_PID=$!

# Wait a bit for API to start
sleep 2

# Start Vite dev server
echo "🎨 Starting Vite dev server on port 3000..."
npm run dev:vite

# Clean up on exit
trap "kill $API_PID 2>/dev/null" EXIT