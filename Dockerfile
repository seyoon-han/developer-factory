# ===================================
# Dev Automation Board - Docker Image
# Includes Board Application + Theia IDE
# ===================================

# ===================================
# Stage 1: Build Board Application
# ===================================
FROM node:20-alpine AS board-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application source (exclude lib/theia to avoid build-time analysis)
COPY app ./app
COPY components ./components
COPY types ./types
COPY public ./public
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./

# Copy lib directory EXCLUDING theia (causes build issues)
# Theia is Docker-only and added after build
COPY lib/db ./lib/db
COPY lib/ai ./lib/ai
COPY lib/agentic ./lib/agentic
COPY lib/analytics ./lib/analytics
COPY lib/auth ./lib/auth
COPY lib/config ./lib/config
COPY lib/integrations ./lib/integrations
COPY lib/queue ./lib/queue
COPY lib/projects ./lib/projects
COPY lib/store ./lib/store
COPY lib/utils ./lib/utils
COPY lib/workflows ./lib/workflows
COPY lib/tdd ./lib/tdd

# Build Next.js application
RUN npm run build

# ===================================
# Stage 2: Clone Superpowers Skills Repository
# ===================================
FROM node:20-alpine AS skills-builder

WORKDIR /skills

# Install git for cloning
RUN apk add --no-cache git

# Clone superpowers repository (TDD skills from obra/superpowers)
RUN git clone --depth 1 https://github.com/obra/superpowers.git /skills/superpowers

# Generate skills manifest with RUNTIME paths (not build-time paths)
# At runtime, skills will be at /app/external-skills/superpowers/skills/
RUN node << 'NODESCRIPT'
const fs = require('fs');
const path = require('path');

// Build-time path (where skills are cloned)
const BUILD_SKILLS_PATH = '/skills/superpowers/skills';
// Runtime path (where skills will be copied to)
const RUNTIME_SKILLS_PATH = '/app/external-skills/superpowers/skills';
const MANIFEST_PATH = '/skills/manifest.json';

const CORE_SKILLS = [
    'test-driven-development',
    'brainstorming',
    'writing-plans',
    'verification-before-completion',
    'systematic-debugging',
    'receiving-code-review'
];

function parseYamlFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const frontmatter = {};
    const lines = match[1].split('\n');
    let currentKey = null;
    let currentValue = '';
    for (const line of lines) {
        const keyMatch = line.match(/^(\w+):\s*(.*)$/);
        if (keyMatch) {
            if (currentKey) frontmatter[currentKey] = currentValue.trim();
            currentKey = keyMatch[1];
            currentValue = keyMatch[2];
        } else if (currentKey && line.startsWith('  ')) {
            currentValue += ' ' + line.trim();
        }
    }
    if (currentKey) frontmatter[currentKey] = currentValue.trim();
    return frontmatter;
}

function parseSkillFile(buildPath, skillDir) {
    const content = fs.readFileSync(buildPath, 'utf8');
    const frontmatter = parseYamlFrontmatter(content);
    // Generate runtime path instead of build path
    const runtimePath = path.join(RUNTIME_SKILLS_PATH, skillDir, 'SKILL.md');
    return {
        name: frontmatter.name || skillDir,
        description: frontmatter.description || '',
        content: content,
        path: runtimePath,  // Use runtime path in manifest
        isCore: CORE_SKILLS.includes(frontmatter.name || skillDir),
        metadata: {
            hasChecklist: content.includes('## Checklist') || content.includes('- [ ]'),
            hasDiagrams: content.includes('```mermaid') || content.includes('digraph'),
            hasExamples: content.includes('<example>') || content.includes('## Example')
        }
    };
}

const skills = [];
const skillDirs = fs.readdirSync(BUILD_SKILLS_PATH);

for (const dir of skillDirs) {
    const buildPath = path.join(BUILD_SKILLS_PATH, dir, 'SKILL.md');
    if (fs.existsSync(buildPath)) {
        try {
            const skill = parseSkillFile(buildPath, dir);
            skills.push(skill);
            console.log('  + ' + skill.name + (skill.isCore ? ' [CORE]' : ''));
        } catch (e) {
            console.error('  - Failed: ' + dir);
        }
    }
}

skills.sort((a, b) => a.name.localeCompare(b.name));

const manifest = {
    version: '1.0',
    lastSynced: new Date().toISOString(),
    sourceRepo: 'obra/superpowers',
    totalSkills: skills.length,
    coreSkills: skills.filter(s => s.isCore).length,
    skills: skills.map(s => ({
        name: s.name,
        path: s.path,  // This is now the runtime path
        description: s.description,
        isCore: s.isCore,
        metadata: s.metadata
    }))
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log('\nManifest: ' + skills.length + ' skills (' + manifest.coreSkills + ' core)');
NODESCRIPT

# ===================================
# Stage 3: Build Theia IDE (DISABLED for now)
# TODO: Re-enable when Next.js module resolution issues are solved
# ===================================
FROM node:20-alpine AS theia-builder

WORKDIR /theia

# Install Theia build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy Theia package files
COPY theia-ide/package*.json ./

# Install Theia dependencies (use install, not ci, since we don't have lockfile)
RUN npm install --production=false

# Copy Theia configuration
COPY theia-ide/.theia ./.theia
COPY theia-ide/tsconfig.json ./

# Build Theia (this takes 5-10 minutes, needs more memory)
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# ===================================
# Stage 3: Production Runtime
# ===================================
FROM node:20-alpine AS runtime

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    shadow \
    python3 \
    py3-pip \
    && npm install -g pm2

# Pre-install MCP servers for faster runtime execution
# Confluence MCP server for Atlassian documentation search
RUN npx -y @aashari/mcp-server-atlassian-confluence --help || true

# Install Claude Code CLI (required by Claude Agent SDK)
# The SDK uses the CLI under the hood for execution
RUN npm install -g @anthropic-ai/claude-code && \
    echo "✅ Claude Code CLI installed at $(which claude)"

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built board application from builder (standalone mode)
# The standalone output includes everything needed to run the app
COPY --from=board-builder --chown=nodejs:nodejs /app/.next/standalone ./
# Copy static files into the standalone .next directory
COPY --from=board-builder --chown=nodejs:nodejs /app/.next/static ./.next/standalone/.next/static
# Also copy public folder to standalone directory
COPY --from=board-builder --chown=nodejs:nodejs /app/public ./.next/standalone/public
COPY --from=board-builder --chown=nodejs:nodejs /app/package*.json ./

# Also copy the full .next for API routes and development compatibility
COPY --from=board-builder --chown=nodejs:nodejs /app/.next ./.next
# Copy public to root as well
COPY --from=board-builder --chown=nodejs:nodejs /app/public ./public

# Copy node_modules for runtime dependencies (better-sqlite3, claude-agent-sdk, etc.)
# The standalone build only includes minimal deps, we need full node_modules
COPY --from=board-builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy lib directory from builder
COPY --from=board-builder --chown=nodejs:nodejs /app/lib ./lib

# Copy application source code needed at runtime (for file access in API routes)
COPY --chown=nodejs:nodejs app ./app
COPY --chown=nodejs:nodejs components ./components
COPY --chown=nodejs:nodejs types ./types
COPY --chown=nodejs:nodejs next.config.mjs ./
COPY --chown=nodejs:nodejs tsconfig.json ./

# Theia temporarily disabled - uncomment when ready
# COPY --from=theia-builder --chown=nodejs:nodejs /theia /theia

# Create necessary directories (including workflow and TDD directories)
RUN mkdir -p /app/workspace /app/data /app/reports \
    /app/.claude/commands /app/.claude/skills \
    /app/ai_context/workflows \
    /app/blueprints/bmad \
    /app/external-skills \
    /app/data/tdd-state && \
    chown -R nodejs:nodejs /app/workspace /app/data /app/reports \
    /app/.claude /app/ai_context /app/blueprints \
    /app/external-skills

# Copy superpowers skills from skills-builder (cloned at build time)
# Store in external-skills for database sync
COPY --from=skills-builder --chown=nodejs:nodejs /skills/superpowers /app/external-skills/superpowers
COPY --from=skills-builder --chown=nodejs:nodejs /skills/manifest.json /app/external-skills/manifest.json

# Copy .claude directory (skills and commands) from the repository root
# This makes all Claude Code skills and commands available inside the container
# The local .claude/skills/superpower/ folder contains brainstorming, writing-plans, 
# and other agentic workflow skills that are already customized for this project
COPY --chown=nodejs:nodejs .claude/skills /app/.claude/skills
COPY --chown=nodejs:nodejs .claude/commands /app/.claude/commands
# Note: settings.local.json and mcp.json will be created/updated at runtime

# Symlink superpower folder to superpowers for compatibility
# Some code may reference /superpowers/ (plural) while our local folder is /superpower/ (singular)
RUN ln -sf /app/.claude/skills/superpower /app/.claude/skills/superpowers 2>/dev/null || true

# Copy Docker scripts
COPY --chown=nodejs:nodejs docker/startup.sh /startup.sh
COPY --chown=nodejs:nodejs docker/init-db.js /app/docker/init-db.js

# Copy TDD external skills update script
COPY --chown=nodejs:nodejs scripts/update_external_skills.sh /app/scripts/update_external_skills.sh

RUN chmod +x /startup.sh /app/scripts/update_external_skills.sh

# Expose ports
EXPOSE 3000 3100

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    THEIA_PORT=3100 \
    HOSTNAME=0.0.0.0 \
    TDD_EXTERNAL_SKILLS_DIR=/app/external-skills \
    TDD_STATE_DIR=/app/data/tdd-state \
    TDD_SKILLS_REPO=https://github.com/obra/superpowers.git

# Switch to app user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start both services
CMD ["/startup.sh"]

