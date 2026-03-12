#!/bin/bash
# Setup and build Theia IDE for local development

set -e

echo "=================================================="
echo "🔧 Setting up Theia IDE"
echo "=================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "Node version: $(node --version)"
echo ""

# Navigate to theia-ide directory
cd "$(dirname "$0")/../theia-ide"

echo "📦 Installing Theia dependencies..."
echo "   (This will take 5-10 minutes on first run)"
echo ""

npm install

echo ""
echo "🔨 Building Theia IDE..."
echo "   (This will take 5-10 minutes)"
echo ""

npm run build

echo ""
echo "=================================================="
echo "✅ Theia IDE Setup Complete!"
echo "=================================================="
echo ""
echo "You can now:"
echo "  1. Start the board: npm run dev"
echo "  2. Click 'Code Editor' in sidebar"
echo "  3. Theia will open automatically"
echo ""
echo "Or test Theia standalone:"
echo "  cd theia-ide && npm start"
echo "  Open: http://localhost:3100"
echo ""
echo "=================================================="

