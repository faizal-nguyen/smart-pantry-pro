#!/bin/bash

echo "🚀 Starting Smart Pantry Pro Development Environment..."
echo ""

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start API server
echo "📡 Starting API server on port 3001..."
npm run api &
API_PID=$!

# Wait a moment for API to start
sleep 2

# Start Vite dev server
echo "🌐 Starting Vite dev server on port 8080..."
npm run dev:vite &
VITE_PID=$!

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🔗 Application: http://localhost:8080"
echo "🔗 API Server: http://localhost:3001"
echo ""
echo "📋 To stop: Press Ctrl+C"
echo ""

# Handle Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $API_PID $VITE_PID 2>/dev/null; exit" INT

# Wait for processes
wait