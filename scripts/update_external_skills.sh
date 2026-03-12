#!/bin/bash
# update_external_skills.sh
# Non-interactive script to update external skills from superpowers repository
# This script is designed to run inside the Docker container
#
# Usage:
#   ./update_external_skills.sh [--force]
#
# Options:
#   --force   Force re-clone even if repository exists

set -e

# Configuration
SKILLS_DIR="${EXTERNAL_SKILLS_DIR:-/app/external-skills}"
SUPERPOWERS_DIR="${SKILLS_DIR}/superpowers"
REPO_URL="${SUPERPOWERS_REPO:-https://github.com/obra/superpowers.git}"
MANIFEST_FILE="${SKILLS_DIR}/manifest.json"
LAST_SYNC_FILE="${SKILLS_DIR}/last_sync.txt"
API_ENDPOINT="${API_BASE_URL:-http://localhost:3000}/api/tdd/skills/sync"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
FORCE_CLONE=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --force) FORCE_CLONE=true ;;
        -h|--help)
            echo "Usage: $0 [--force]"
            echo ""
            echo "Options:"
            echo "  --force   Force re-clone even if repository exists"
            echo "  -h,--help Show this help message"
            exit 0
            ;;
        *) log_error "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

log_info "Starting external skills update..."
log_info "Skills directory: ${SKILLS_DIR}"
log_info "Repository URL: ${REPO_URL}"

# Create directories if they don't exist
mkdir -p "${SKILLS_DIR}"

# Handle force clone
if [ "$FORCE_CLONE" = true ] && [ -d "${SUPERPOWERS_DIR}" ]; then
    log_warning "Force clone requested, removing existing repository..."
    rm -rf "${SUPERPOWERS_DIR}"
fi

# Clone or pull repository
if [ -d "${SUPERPOWERS_DIR}/.git" ]; then
    log_info "Repository exists, pulling latest changes..."
    cd "${SUPERPOWERS_DIR}"

    # Fetch and reset to ensure clean state
    git fetch origin 2>&1 || {
        log_error "Failed to fetch from origin"
        exit 1
    }

    # Get current and remote hashes
    LOCAL_HASH=$(git rev-parse HEAD)
    REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null || git rev-parse origin/master 2>/dev/null)

    if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
        log_info "Already up to date (${LOCAL_HASH:0:8})"
    else
        log_info "Updating from ${LOCAL_HASH:0:8} to ${REMOTE_HASH:0:8}..."
        git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null
        git clean -fd
        log_success "Repository updated successfully"
    fi
else
    log_info "Cloning repository..."
    git clone --depth 1 "${REPO_URL}" "${SUPERPOWERS_DIR}" 2>&1 || {
        log_error "Failed to clone repository"
        exit 1
    }
    log_success "Repository cloned successfully"
fi

# Verify skills directory exists
SKILLS_PATH="${SUPERPOWERS_DIR}/skills"
if [ ! -d "${SKILLS_PATH}" ]; then
    log_error "Skills directory not found at ${SKILLS_PATH}"
    exit 1
fi

# Count skills
SKILL_COUNT=$(find "${SKILLS_PATH}" -maxdepth 2 -name "SKILL.md" | wc -l | tr -d ' ')
log_info "Found ${SKILL_COUNT} skill files"

# Core TDD skills to flag
CORE_SKILLS=(
    "test-driven-development"
    "brainstorming"
    "writing-plans"
    "verification-before-completion"
    "systematic-debugging"
    "receiving-code-review"
)

# Generate manifest using Node.js
log_info "Generating skills manifest..."

node << 'NODESCRIPT'
const fs = require('fs');
const path = require('path');

const SKILLS_PATH = process.env.SUPERPOWERS_DIR + '/skills' || '/app/external-skills/superpowers/skills';
const MANIFEST_PATH = process.env.SKILLS_DIR + '/manifest.json' || '/app/external-skills/manifest.json';

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
            if (currentKey) {
                frontmatter[currentKey] = currentValue.trim();
            }
            currentKey = keyMatch[1];
            currentValue = keyMatch[2];
        } else if (currentKey && line.startsWith('  ')) {
            currentValue += ' ' + line.trim();
        }
    }

    if (currentKey) {
        frontmatter[currentKey] = currentValue.trim();
    }

    return frontmatter;
}

function parseSkillFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseYamlFrontmatter(content);
    const skillDir = path.basename(path.dirname(filePath));

    return {
        name: frontmatter.name || skillDir,
        description: frontmatter.description || '',
        content: content,
        path: filePath,
        isCore: CORE_SKILLS.includes(frontmatter.name || skillDir),
        metadata: {
            hasChecklist: content.includes('## Checklist') ||
                         content.includes('## Verification') ||
                         content.includes('- [ ]'),
            hasDiagrams: content.includes('```dot') ||
                        content.includes('```mermaid') ||
                        content.includes('digraph'),
            hasExamples: content.includes('<example>') ||
                        content.includes('## Example') ||
                        content.includes('### Example')
        }
    };
}

function main() {
    const skills = [];
    let coreCount = 0;

    if (!fs.existsSync(SKILLS_PATH)) {
        console.error('ERROR: Skills directory not found:', SKILLS_PATH);
        process.exit(1);
    }

    const skillDirs = fs.readdirSync(SKILLS_PATH);

    for (const dir of skillDirs) {
        const skillPath = path.join(SKILLS_PATH, dir, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
            try {
                const skill = parseSkillFile(skillPath);
                skills.push(skill);

                const coreMarker = skill.isCore ? ' [CORE]' : '';
                console.log(`  + ${skill.name}${coreMarker}`);

                if (skill.isCore) coreCount++;
            } catch (e) {
                console.error(`  - Failed to parse: ${dir} (${e.message})`);
            }
        }
    }

    // Sort skills alphabetically
    skills.sort((a, b) => a.name.localeCompare(b.name));

    const manifest = {
        version: '1.0',
        lastSynced: new Date().toISOString(),
        sourceRepo: 'obra/superpowers',
        totalSkills: skills.length,
        coreSkills: coreCount,
        skills: skills.map(s => ({
            name: s.name,
            path: s.path,
            description: s.description,
            isCore: s.isCore,
            metadata: s.metadata
        }))
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    console.log('');
    console.log(`Manifest generated: ${skills.length} skills (${coreCount} core)`);
}

main();
NODESCRIPT

MANIFEST_RESULT=$?

if [ $MANIFEST_RESULT -ne 0 ]; then
    log_error "Failed to generate manifest"
    exit 1
fi

# Update last sync timestamp
SYNC_TIME=$(date -Iseconds 2>/dev/null || date +"%Y-%m-%dT%H:%M:%S%z")
echo "${SYNC_TIME}" > "${LAST_SYNC_FILE}"

# Verify manifest was created
if [ ! -f "${MANIFEST_FILE}" ]; then
    log_error "Manifest file was not created"
    exit 1
fi

# Try to notify the API about the sync (non-blocking)
if command -v curl &> /dev/null; then
    log_info "Notifying API about skill sync..."
    curl -s -X POST "${API_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "{\"manifestPath\": \"${MANIFEST_FILE}\", \"syncTime\": \"${SYNC_TIME}\"}" \
        > /dev/null 2>&1 || log_warning "Could not notify API (server may not be running)"
fi

log_success "External skills update complete!"
echo ""
echo "Summary:"
echo "  - Skills directory: ${SUPERPOWERS_DIR}/skills"
echo "  - Manifest file: ${MANIFEST_FILE}"
echo "  - Last sync: ${SYNC_TIME}"
echo ""
echo "To load skills into database, restart the application or call:"
echo "  curl -X POST ${API_ENDPOINT}"
