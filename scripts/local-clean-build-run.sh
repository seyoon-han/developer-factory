#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=============================================="
echo "🧹 Local Clean Build & Run for Dev Automation Board"
echo "Working directory: $PROJECT_ROOT"
echo "=============================================="

# Check for Docker mode
if [ "${1:-}" == "--docker" ]; then
  echo ""
  echo "🐳 Running in DOCKER mode (Clean Rebuild)"
  echo "=============================================="
  
  echo "🛑 Stopping containers..."
  docker-compose down
  
  echo ""
  echo "🏗️  Rebuilding container (no cache)..."
  docker-compose build --no-cache dev-automation-board
  
  echo ""
  echo "🚀 Starting container..."
  docker-compose up -d dev-automation-board
  
  echo ""
  echo "✅ Done! Tailing logs..."
  docker-compose logs -f dev-automation-board
  exit 0
fi

echo ""
echo "🧼 Removing previous build artifacts (.next, .turbo)..."
rm -rf .next .turbo

if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  echo ""
  echo "📦 Performing clean dependency install (npm ci)..."
  npm ci
else
  echo ""
  echo "⚠️ SKIP_INSTALL=1 detected - skipping dependency install."
fi

# Ensure database is initialized (reflecting recent schema changes)
echo ""
echo "🗄️  Initializing Database..."
if [ -f "docker/init-db.js" ]; then
  # Ensure data directory exists for local run
  mkdir -p data
  DB_PATH="data/tasks.db" node docker/init-db.js
else
  echo "⚠️  docker/init-db.js not found, skipping DB init."
fi

echo ""
echo "🏗️ Building production bundle..."
npm run build

echo ""
echo "🚀 Starting production server (Ctrl+C to exit)..."
npm run start
