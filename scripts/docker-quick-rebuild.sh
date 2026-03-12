#!/bin/bash
# Quick rebuild without stopping - for fast iterations

echo "🔨 Quick rebuild (keeping container running)..."
docker-compose build && docker-compose restart && echo "✅ Rebuilt and restarted!"

