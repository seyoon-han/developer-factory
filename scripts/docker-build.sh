#!/bin/bash
set -e

echo "🐳 Building Developer Factory Docker Image"
echo "=============================================="
echo ""

# Navigate to the repository root
cd "$(dirname "$0")/.."

echo "📂 Build context: $(pwd)"
echo ""

# Verify .claude directory exists
if [ ! -d ".claude/skills" ]; then
  echo "❌ Error: .claude/skills directory not found"
  echo "   Expected at: $(pwd)/.claude/skills"
  exit 1
fi

SKILL_COUNT=$(find .claude/skills -maxdepth 1 -type d 2>/dev/null | wc -l)
echo "✅ Found .claude/skills directory (${SKILL_COUNT} skills)"
echo ""

# Build from the repository root
echo "🔨 Building Docker image..."
echo "   Context: $(pwd)"
echo "   Dockerfile: Dockerfile"
echo ""

docker build \
  -f Dockerfile \
  -t dev-automation-board:latest \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  .

echo ""
echo "=============================================="
echo "✅ Build complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Start container: docker-compose up -d"
echo "  2. View logs: docker-compose logs -f"
echo "  3. Test: ./scripts/docker-test.sh"
echo ""

