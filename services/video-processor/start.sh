#!/bin/bash

# Video Processor Backend Startup Script

set -e  # Exit on any error

echo "🚀 Starting Video Processor Backend..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads processed temp logs

# Check if Redis is running
echo "🔍 Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   - macOS: brew services start redis"
    echo "   - Linux: sudo systemctl start redis"
    echo "   - Docker: docker run -d -p 6379:6379 redis:alpine"
    exit 1
fi

echo "✅ Redis is running"

# Check environment variables
echo "🔧 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration before running again."
    exit 1
fi

# Check OpenAI API key
source .env
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
    echo "⚠️  Please set your OPENAI_API_KEY in the .env file"
    echo "   Get your API key from: https://platform.openai.com/api-keys"
    exit 1
fi

echo "✅ Environment configured"

# Install dependencies if needed
echo "📦 Checking Python dependencies..."
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

if ! pip list | grep -q "fastapi"; then
    echo "📥 Installing Python dependencies..."
    pip install -r requirements.txt
fi

echo "✅ Dependencies installed"

# Function to stop all processes
cleanup() {
    echo ""
    echo "🛑 Stopping all processes..."
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    if [ ! -z "$WORKER_PID" ]; then
        kill $WORKER_PID 2>/dev/null || true
    fi
    if [ ! -z "$FLOWER_PID" ]; then
        kill $FLOWER_PID 2>/dev/null || true
    fi
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo ""
echo "🎬 Starting Video Processor services..."
echo ""

# Start Celery worker in background
echo "👷 Starting Celery worker..."
celery -A celery_tasks worker --loglevel=info --concurrency=2 &
WORKER_PID=$!

# Start Flower monitoring in background (optional)
echo "🌸 Starting Flower monitoring..."
celery -A celery_tasks flower --port=5555 &
FLOWER_PID=$!

# Start FastAPI application
echo "🌟 Starting FastAPI application..."
uvicorn app:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📋 Service URLs:"
echo "   • API Documentation: http://localhost:8000/docs"
echo "   • Health Check: http://localhost:8000/health"
echo "   • Flower Monitoring: http://localhost:5555"
echo ""
echo "📊 Service Status:"
echo "   • FastAPI (PID: $API_PID)"
echo "   • Celery Worker (PID: $WORKER_PID)"
echo "   • Flower Monitor (PID: $FLOWER_PID)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all processes
wait