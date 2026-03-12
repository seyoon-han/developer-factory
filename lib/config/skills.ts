/**
 * Skills Configuration
 * Configure Claude Agent SDK and available skills
 */

import { statements } from '@/lib/db/postgres';

// Cache for API keys (to avoid async in getters)
let cachedAnthropicKey: string | null = null;
let cachedOpenAiKey: string | null = null;

/**
 * Initialize API keys from database (call this at startup)
 */
export async function initializeApiKeys(): Promise<void> {
  try {
    const settings = await statements.getAppSettings.get() as any;
    if (settings?.anthropic_api_key) {
      cachedAnthropicKey = settings.anthropic_api_key;
      console.log(`🔑 Anthropic API key loaded from database (ends with: ...${settings.anthropic_api_key.slice(-4)})`);
    } else {
      console.log('⚠️  No Anthropic API key found in database');
      // Try environment variable as fallback
      if (process.env.ANTHROPIC_API_KEY) {
        cachedAnthropicKey = process.env.ANTHROPIC_API_KEY;
        console.log(`🔑 Anthropic API key loaded from environment (ends with: ...${process.env.ANTHROPIC_API_KEY.slice(-4)})`);
      }
    }
    if (settings?.openai_api_key) {
      cachedOpenAiKey = settings.openai_api_key;
      console.log(`🔑 OpenAI API key loaded from database`);
    }
  } catch (error: any) {
    console.warn('⚠️  Failed to load API keys from database:', error.message);
    // Database not ready or no settings, fall back to env
    if (process.env.ANTHROPIC_API_KEY) {
      cachedAnthropicKey = process.env.ANTHROPIC_API_KEY;
      console.log(`🔑 Anthropic API key loaded from environment (fallback)`);
    }
  }
}

/**
 * Get Anthropic API key from cache or environment variable
 * Priority: Cache (from Database) > Environment Variable
 */
function getAnthropicApiKey(): string {
  if (cachedAnthropicKey) {
    return cachedAnthropicKey;
  }
  // Fallback to environment variable
  return process.env.ANTHROPIC_API_KEY || '';
}

/**
 * Get OpenAI API key from cache or environment variable
 * Priority: Cache (from Database) > Environment Variable
 */
function getOpenAiApiKey(): string {
  if (cachedOpenAiKey) {
    return cachedOpenAiKey;
  }
  // Fallback to environment variable
  return process.env.OPENAI_API_KEY || '';
}

/**
 * Detect if running in Docker container
 */
function isDocker(): boolean {
  // Check for Docker-specific environment or file markers
  return process.env.DOCKER_ENV === 'true' || 
         process.cwd() === '/app' ||
         process.env.HOSTNAME === '0.0.0.0';
}

/**
 * Get Claude CLI path based on environment
 * Docker: /usr/local/bin/claude
 * Local: /Users/shan/.local/bin/claude
 */
function getClaudeCliPath(): string {
  // Allow override via environment variable
  if (process.env.CLAUDE_CLI_PATH) {
    return process.env.CLAUDE_CLI_PATH;
  }
  
  // Detect environment
  if (isDocker()) {
    return '/usr/local/bin/claude';
  }
  
  // Local development default
  return '/Users/shan/.local/bin/claude';
}

/**
 * Get skills directory path based on environment
 * Docker: /app/.claude/skills
 * Local: /Users/shan/factory/.claude/skills
 */
function getSkillsDirectory(): string {
  // Allow override via environment variable
  if (process.env.SKILLS_DIRECTORY) {
    return process.env.SKILLS_DIRECTORY;
  }
  
  // Detect environment
  if (isDocker()) {
    return '/app/.claude/skills';
  }
  
  // Local development default
  return '/Users/shan/factory/.claude/skills';
}

export const SKILLS_CONFIG = {
  // Claude API Configuration
  // Load from database (Settings page) or environment variable (.env)
  get anthropicApiKey(): string {
    return getAnthropicApiKey();
  },

  // OpenAI API Configuration
  // Load from database (Settings page) or environment variable (.env)
  get openaiApiKey(): string {
    return getOpenAiApiKey();
  },

  // Skills Directory (environment-aware: Docker or local)
  get skillsDirectory(): string {
    return getSkillsDirectory();
  },

  // Claude Code CLI Path (environment-aware: Docker or local)
  get claudeCliPath(): string {
    return getClaudeCliPath();
  },

  // Execution Settings
  defaultTimeout: 90000, // 90 seconds
  maxRetries: 2,

  // Execution Method: 'sdk' | 'api' | 'cli'
  // 'sdk': Uses Claude Agent SDK with persistent sessions (RECOMMENDED - best context retention)
  // 'api': Uses Anthropic Skills API with scanned project context (fast & has project access)
  // 'cli': Uses local Claude Code CLI (experimental, may have issues)
  executionMethod: 'sdk' as 'sdk' | 'api' | 'cli',

  // Available Skills
  availableSkills: [
    'prompt-enhancer',
    'code-changelog',
    'codex',
    'codex-claude-loop',
    'codex-claude-cursor-loop',
    'nextjs15-init',
    'landing-page-guide',
    'web-to-markdown',
    'flutter-init',
    'card-news-generator',
    'card-news-generator-v2',
    'midjourney-cardnews-bg',
    'meta-prompt-generator',
  ],

  // Skill-specific configurations
  promptEnhancer: {
    skillName: 'prompt-enhancer',
    skillId: 'skill_01Bz7chaxK2uHQThcS2RdUkr',
    timeout: 90000,
    maxQuestions: 10,
    model: 'claude-sonnet-4-20250514' as const,
  },

  aiCodeReviewLoop: {
    skillName: 'ai-code-review-loop',  // Actual name from SKILL.md
    skillDirectory: 'codex-claude-loop',  // Directory name
    get skillPath(): string {
      const skillsDir = getSkillsDirectory();
      return `${skillsDir}/codex-claude-loop`;
    },
    timeout: 300000, // 5 minutes
    model: 'claude-sonnet-4-20250514' as const,
  },
} as const;

export type SkillName = typeof SKILLS_CONFIG.availableSkills[number];
