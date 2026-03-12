/**
 * Claude Code MCP Configuration Manager
 * Dynamically manages MCP server configuration for Claude Code CLI
 */

import fs from 'fs';
import path from 'path';
import { statements } from '@/lib/db/postgres';

/**
 * Get the Claude Code settings directory path
 */
function getClaudeCodeSettingsDir(): string {
  const isDocker = process.env.DOCKER_ENV === 'true' || process.cwd() === '/app';
  
  if (isDocker) {
    return '/app/.claude';
  } else {
    // Local development - use parent directory's .claude
    return path.join(process.cwd(), '..', '.claude');
  }
}

/**
 * Get the path to Claude Code's MCP configuration file
 */
function getMcpConfigPath(): string {
  const settingsDir = getClaudeCodeSettingsDir();
  return path.join(settingsDir, 'mcp.json');
}

/**
 * Read current MCP configuration
 */
function readMcpConfig(): any {
  const configPath = getMcpConfigPath();
  
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading MCP config:', error);
  }
  
  // Return default structure
  return { mcpServers: {} };
}

/**
 * Write MCP configuration
 */
function writeMcpConfig(config: any): boolean {
  const configPath = getMcpConfigPath();
  const settingsDir = getClaudeCodeSettingsDir();
  
  try {
    // Ensure .claude directory exists
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    
    // Write config file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`✅ MCP config written to: ${configPath}`);
    return true;
  } catch (error) {
    console.error('Error writing MCP config:', error);
    return false;
  }
}

/**
 * Update Context7 MCP server configuration
 * Called when Context7 API key is saved or removed
 */
export async function updateContext7McpServer(): Promise<boolean> {
  try {
    // Get current API key from database
    const settings = await statements.getAppSettings.get() as any;
    const apiKey = settings?.context7_api_key;
    
    // Read current MCP config
    const config = readMcpConfig();
    
    if (apiKey) {
      // Add/update Context7 MCP server
      config.mcpServers = config.mcpServers || {};
      config.mcpServers.context7 = {
        url: 'https://mcp.context7.com/mcp',
        headers: {
          CONTEXT7_API_KEY: apiKey,
        },
      };
      console.log('🔗 Adding Context7 MCP server to Claude Code configuration');
    } else {
      // Remove Context7 MCP server if API key not configured
      if (config.mcpServers && config.mcpServers.context7) {
        delete config.mcpServers.context7;
        console.log('🗑️  Removing Context7 MCP server from Claude Code configuration');
      }
    }
    
    // Write updated config
    return writeMcpConfig(config);
  } catch (error) {
    console.error('Error updating Context7 MCP server:', error);
    return false;
  }
}

/**
 * Update Confluence MCP server configuration
 * Adds the Confluence MCP server to Claude Code configuration
 */
export function updateConfluenceMcpServer(): boolean {
  try {
    // Read current MCP config
    const config = readMcpConfig();
    
    // Add Confluence MCP server with hardcoded credentials
    config.mcpServers = config.mcpServers || {};
    config.mcpServers.confluence = {
      command: 'npx',
      args: ['-y', '@aashari/mcp-server-atlassian-confluence'],
      env: {
        ATLASSIAN_SITE_NAME: 'luckyvr',
        ATLASSIAN_USER_EMAIL: 'seyoon@getluckyvr.com',
        ATLASSIAN_API_TOKEN: 'ATATT3xFfGF0pShn2PAPT84T7HrkPu7R9cRweSv6Re24ZQGMFM5qe6kWqvoJcsRt_RBKasrz32sZ-nlpYaHXJvggWMEiJn5ECOPV8wam7QoyqZU3UqQCC3ZckGeMzaXnq4BOqOZ0PTaAeY5pq-BvE1JER37vm-_ABr_-P07dq0dMHHX9CK0lOd0=5517D5AA',
      },
    };
    console.log('🔗 Adding Confluence MCP server to Claude Code configuration');
    
    // Write updated config
    return writeMcpConfig(config);
  } catch (error) {
    console.error('Error updating Confluence MCP server:', error);
    return false;
  }
}

/**
 * Clear all MCP servers from mcp.json file
 * This prevents duplicate tool registration since MCP servers are now configured at runtime
 */
export function clearMcpServersFromJson(): boolean {
  try {
    const config = readMcpConfig();
    
    const hadServers = config.mcpServers && Object.keys(config.mcpServers).length > 0;
    if (hadServers) {
      const serverNames = Object.keys(config.mcpServers);
      console.log(`🗑️  Clearing ${serverNames.length} MCP server(s) from mcp.json: ${serverNames.join(', ')}`);
      config.mcpServers = {};
      return writeMcpConfig(config);
    }
    return true;
  } catch (error) {
    console.error('Error clearing MCP servers from mcp.json:', error);
    return false;
  }
}

/**
 * Initialize MCP configuration on application startup
 * IMPORTANT: All MCP servers (Confluence, Context7) are now configured at RUNTIME only
 * via the SDK's mcpServers option. This prevents duplicate tool registration errors.
 * The mcp.json file is cleared on startup to ensure no duplicates.
 */
export function initializeMcpConfiguration(): void {
  try {
    console.log('🔧 Initializing Claude Code MCP configuration...');
    const configPath = getMcpConfigPath();
    console.log(`   MCP config path: ${configPath}`);
    
    // IMPORTANT: Clear ALL MCP servers from mcp.json to prevent duplicate tool registration
    // All MCP servers (Confluence, Context7) are now configured at runtime only
    clearMcpServersFromJson();
    
    console.log('ℹ️  MCP servers are now configured at runtime only (not in mcp.json)');
    console.log('✅ Claude Code MCP configuration initialized');
  } catch (error) {
    console.error('Error initializing MCP configuration:', error);
    // Non-critical error - don't throw
  }
}

/**
 * Check if Context7 MCP is properly configured in Claude Code
 */
export function isContext7ConfiguredInClaudeCode(): boolean {
  try {
    const config = readMcpConfig();
    return !!(config.mcpServers && config.mcpServers.context7);
  } catch (error) {
    return false;
  }
}

/**
 * Check if Confluence MCP is properly configured in Claude Code
 */
export function isConfluenceConfiguredInClaudeCode(): boolean {
  try {
    const config = readMcpConfig();
    return !!(config.mcpServers && config.mcpServers.confluence);
  } catch (error) {
    return false;
  }
}






