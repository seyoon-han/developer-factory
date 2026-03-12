#!/bin/bash
set -e

echo "=================================================="
echo "🚀 Developer Factory - Docker Container"
echo "=================================================="
echo ""

# Verify Claude Agent SDK is installed (via node_modules)
if [ -d /app/node_modules/@anthropic-ai/claude-agent-sdk ] || [ -d /app/node_modules/@anthropic-ai/sdk ]; then
  echo "✅ Claude Agent SDK installed"
else
  echo "⚠️  Claude Agent SDK not found - skills may not work"
fi

# Verify .claude directory and superpowers skills
if [ -d /app/.claude/skills ]; then
  LOCAL_SKILLS=$(find /app/.claude/skills -maxdepth 1 -type d 2>/dev/null | wc -l)
  echo "✅ Claude skills directory found (${LOCAL_SKILLS} local skills)"

  # Check for superpowers skills
  if [ -d /app/.claude/skills/superpowers ]; then
    SP_SKILLS=$(find /app/.claude/skills/superpowers -maxdepth 1 -type d 2>/dev/null | wc -l)
    echo "✅ Superpowers skills available for Agent SDK (${SP_SKILLS} skills)"
    echo "   Skills like brainstorming, TDD, debugging are now globally available"
  else
    echo "⚠️  Superpowers skills not found in .claude/skills"
  fi
else
  echo "⚠️  Claude skills directory not found"
fi

# Git configuration (if not mounted from host)
if [ ! -f /home/nodejs/.gitconfig ]; then
  git config --global user.name "${GIT_USER_NAME:-Developer Factory}"
  git config --global user.email "${GIT_USER_EMAIL:-automation@localhost}"
  git config --global init.defaultBranch main
  # Disable credential prompts for non-interactive environment
  git config --global credential.helper ""
  git config --global core.askPass ""
  echo "✅ Git configured"
fi

# Ensure directories exist and have correct permissions
mkdir -p /app/workspace /app/data /app/reports /app/external-skills /app/data/tdd-state
echo "✅ Directories verified"

# Verify TDD superpowers skills (pre-built in Docker image)
if [ -f /app/external-skills/manifest.json ]; then
  SKILL_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/app/external-skills/manifest.json')).totalSkills)")
  CORE_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/app/external-skills/manifest.json')).coreSkills)")
  echo "✅ TDD superpowers skills available (${SKILL_COUNT} skills, ${CORE_COUNT} core)"
else
  echo "⚠️  TDD superpowers skills not found - TDD board may not work"
fi

# Set up .claude folder for all workspace projects
# This ensures Claude SDK can find skills from any project directory
# For agentic dev workflow project groups, each project needs access to skills
echo "🔧 Setting up Claude skills for workspace projects..."
for project_dir in /app/workspace/*/; do
  if [ -d "$project_dir" ]; then
    project_name=$(basename "$project_dir")
    
    # Create .claude directory if it doesn't exist
    if [ ! -d "$project_dir.claude" ]; then
      mkdir -p "$project_dir.claude"
    fi
    
    # Create or update symlink to global skills
    if [ ! -L "$project_dir.claude/skills" ]; then
      rm -rf "$project_dir.claude/skills" 2>/dev/null || true
      ln -sf /app/.claude/skills "$project_dir.claude/skills"
      echo "   ✅ Skills linked to project: $project_name"
    fi
    
    # Create or update symlink to global commands
    if [ ! -L "$project_dir.claude/commands" ]; then
      rm -rf "$project_dir.claude/commands" 2>/dev/null || true
      ln -sf /app/.claude/commands "$project_dir.claude/commands"
    fi
  fi
done

# Also set up skills for project groups (subdirectories within workspace)
for group_dir in /app/workspace/*/*/; do
  if [ -d "$group_dir" ]; then
    group_name=$(basename "$group_dir")
    
    # Create .claude directory if it doesn't exist
    if [ ! -d "$group_dir.claude" ]; then
      mkdir -p "$group_dir.claude"
    fi
    
    # Create symlinks to global skills and commands
    if [ ! -L "$group_dir.claude/skills" ]; then
      rm -rf "$group_dir.claude/skills" 2>/dev/null || true
      ln -sf /app/.claude/skills "$group_dir.claude/skills"
    fi
    if [ ! -L "$group_dir.claude/commands" ]; then
      rm -rf "$group_dir.claude/commands" 2>/dev/null || true
      ln -sf /app/.claude/commands "$group_dir.claude/commands"
    fi
  fi
done
echo "✅ Claude skills setup complete"

# Initialize workspace structure
if [ ! -f /app/workspace/.gitignore ]; then
  echo "# Ignore all cloned projects
*
!.gitignore
!README.md" > /app/workspace/.gitignore
  echo "✅ Workspace .gitignore created"
fi

if [ ! -f /app/workspace/README.md ]; then
  echo "# Workspace Directory

This directory contains cloned external projects managed by Developer Factory.
Each subdirectory is a separate git repository." > /app/workspace/README.md
  echo "✅ Workspace README created"
fi

# Initialize database before starting app
echo "📊 Initializing database..."
cd /app
node /app/docker/init-db.js

# Start Board application with PM2
# Using standalone mode output (required by output: 'standalone' in next.config.mjs)
echo ""
echo "📱 Starting Developer Factory on port ${PORT:-3000}..."
cd /app/.next/standalone
pm2 start server.js --name "board" --node-args="--max-http-header-size=16384"

# Wait for board to be ready
echo "⏳ Waiting for board to initialize..."
sleep 5

# Check if board is running
RETRIES=10
until curl -sf http://localhost:${PORT:-3000}/api/health > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  echo "   Waiting for board... ($RETRIES retries left)"
  sleep 2
  RETRIES=$((RETRIES-1))
done

if [ $RETRIES -eq 0 ]; then
  echo "⚠️  Board health check timeout - continuing anyway"
else
  echo "✅ Board is ready!"
fi

echo ""
echo "💻 Theia IDE will start on-demand when you click 'Code Editor'"
echo "   Theia will run on port ${THEIA_PORT:-3100}"
echo ""
echo "=================================================="
echo "✅ Developer Factory is Ready!"
echo "=================================================="
echo ""
echo "📍 Access Points:"
echo "   Board:      http://localhost:${PORT:-3000}"
echo "   TDD Board:  http://localhost:${PORT:-3000}/tdd-board"
echo "   Theia IDE:  http://localhost:${THEIA_PORT:-3100} (on-demand)"
echo ""
echo "📂 Workspace:  /app/workspace"
echo "📊 Database:   /app/data/tasks.db"
echo ""
echo "=================================================="
echo "📋 Showing logs (Ctrl+C to stop logs, container continues)..."
echo "=================================================="
echo ""

# Show logs and keep container running
pm2 logs --raw

