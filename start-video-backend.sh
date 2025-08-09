#!/bin/bash

# Start Video Processing Backend
# This script starts the Python video processing backend

echo "🎥 Starting Video Processing Backend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo -e "${YELLOW}Redis is not running. Starting Redis...${NC}"
    if command -v brew &> /dev/null; then
        brew services start redis
    else
        redis-server --daemonize yes
    fi
    sleep 2
fi

# Navigate to backend directory
cd api/video-processor

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt --quiet

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${RED}⚠️  Please edit api/video-processor/.env and add your OpenAI API key${NC}"
fi

# Start the backend
echo -e "${GREEN}Starting Video Processor API...${NC}"
echo "📍 API URL: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo "🌸 Flower Monitor: http://localhost:5555"
echo ""
echo "Press Ctrl+C to stop all services"

# Run the start script
./start.sh