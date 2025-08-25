#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/Users/faizel/Documents/Mes documents/3_Dev/Projets/Smart Grocery/smart-pantry-pro"
cd "$PROJECT_ROOT"

echo "🔎 Checking and freeing required ports (3002 UI, 3003 API)"
for port in 3002 3003; do
  pids=$(lsof -ti tcp:$port || true)
  if [ -n "$pids" ]; then
    echo "⛔ Freeing port $port (PIDs: $pids)"
    kill -9 $pids || true
  fi
done

echo "🚀 Starting Smart Pantry Pro (Vite on :3002, API on :3003)"
echo "   - Keep this process running to keep the servers alive"

npm run dev


