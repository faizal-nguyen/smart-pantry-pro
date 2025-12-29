#!/bin/bash

echo "🚀 Starting Smart Pantry Pro Development Environment..."
echo ""

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# Start API server
echo "📡 Starting API server (apps/api) on port 4000..."
npm run api:dev &
API_PID=$!

# Wait a moment for API to start
sleep 2

# Start Vite dev server
echo "🌐 Starting Vite dev server on port 3002..."
npm run dev:vite &
VITE_PID=$!

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🔗 Application: http://localhost:3002"
echo "🔗 API Server: http://localhost:4000"
echo ""
echo "📋 To stop: Press Ctrl+C"
echo ""

# Handle Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $API_PID $VITE_PID 2>/dev/null; exit" INT

# Wait for processes
wait
