#!/bin/bash
# Quick Docker Build & Run Script
# Stops existing container, rebuilds, and starts fresh

set -e

echo "=================================================="
echo "🐳 Docker Quick Test - Dev Automation Board"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Stop and remove existing container
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down 2>/dev/null || true
echo -e "${GREEN}✅ Containers stopped${NC}"
echo ""

# Step 2: Clean up (optional - uncomment to clean volumes too)
# echo -e "${YELLOW}🧹 Cleaning up volumes...${NC}"
# docker-compose down -v
# rm -rf data/tasks.db*
# echo -e "${GREEN}✅ Volumes cleaned${NC}"
# echo ""

# Step 3: Build the image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
echo "   (This may take 15-20 minutes on first build)"
echo "   (Subsequent builds will be faster with cache)"
echo ""

if docker-compose build; then
  echo ""
  echo -e "${GREEN}✅ Build successful!${NC}"
else
  echo ""
  echo -e "${RED}❌ Build failed!${NC}"
  echo "   Check the errors above"
  exit 1
fi

echo ""

# Step 4: Start containers
echo -e "${YELLOW}🚀 Starting containers...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✅ Containers started!${NC}"
echo ""

# Step 5: Wait for initialization
echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 15

# Step 6: Health check
echo -e "${YELLOW}🔍 Checking health...${NC}"
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null || echo "failed")

if echo "$HEALTH" | grep -q "healthy"; then
  echo -e "${GREEN}✅ Health check passed!${NC}"
  echo ""
  echo "=================================================="
  echo -e "${GREEN}🎉 Success! Your platform is running!${NC}"
  echo "=================================================="
  echo ""
  echo "📍 Access Points:"
  echo "   Board:        http://localhost:3001"
  echo "   Code Editor:  http://localhost:3101 (if available)"
  echo ""
  echo "📋 Next Steps:"
  echo "   1. Open http://localhost:3001"
  echo "   2. Go to Settings → Anthropic API Key"
  echo "   3. Enter your key and save"
  echo "   4. Settings → Clone a project"
  echo "   5. Start creating tasks!"
  echo ""
  echo "📊 Useful Commands:"
  echo "   View logs:    docker-compose logs -f"
  echo "   Stop:         docker-compose down"
  echo "   Restart:      docker-compose restart"
  echo "   Shell:        docker-compose exec dev-automation-board sh"
  echo ""
else
  echo -e "${RED}❌ Health check failed${NC}"
  echo "   Response: $HEALTH"
  echo ""
  echo "📋 Troubleshooting:"
  echo "   Check logs:   docker-compose logs"
  echo "   Check status: docker-compose ps"
  echo ""
fi

echo "=================================================="

