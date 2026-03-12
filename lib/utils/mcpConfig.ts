/**
 * MCP Configuration Utility
 * Handles MCP server configuration for Claude Agent SDK
 */

import { statements } from '@/lib/db/postgres';

/**
 * HTTP/WebSocket MCP Server Configuration
 */
export interface MCPServerConfig {
  type?: 'http' | 'websocket' | 'stdio'; // Optional in file config, but good for SDK
  url: string;
  headers?: Record<string, string>;
}

/**
 * Stdio MCP Server Configuration (for CLI-based MCP servers like npx)
 */
export interface MCPStdioServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Combined MCP Server Configuration type
 */
export type AnyMCPServerConfig = MCPServerConfig | MCPStdioServerConfig;

/**
 * Get Confluence MCP server configuration
 * Returns stdio-based configuration for Atlassian Confluence MCP server
 * Uses hardcoded credentials as specified
 */
export function getConfluenceMCPConfig(): MCPStdioServerConfig {
  return {
    command: 'npx',
    args: ['-y', '@aashari/mcp-server-atlassian-confluence'],
    env: {
      ATLASSIAN_SITE_NAME: 'luckyvr',
      ATLASSIAN_USER_EMAIL: 'seyoon@getluckyvr.com',
      ATLASSIAN_API_TOKEN: 'ATATT3xFfGF0pShn2PAPT84T7HrkPu7R9cRweSv6Re24ZQGMFM5qe6kWqvoJcsRt_RBKasrz32sZ-nlpYaHXJvggWMEiJn5ECOPV8wam7QoyqZU3UqQCC3ZckGeMzaXnq4BOqOZ0PTaAeY5pq-BvE1JER37vm-_ABr_-P07dq0dMHHX9CK0lOd0=5517D5AA',
    },
  };
}

/**
 * Get Context7 MCP server configuration
 * Returns configuration object if API key is available, null otherwise
 */
export async function getContext7MCPConfig(): Promise<MCPServerConfig | null> {
  try {
    const settings = await statements.getAppSettings.get() as any;
    const apiKey = settings?.context7_api_key;

    if (!apiKey) {
      console.log('ℹ️  Context7 MCP: API key not configured');
      return null;
    }

    console.log(`✅ Context7 MCP: API key found (ends with: ...${apiKey.slice(-4)})`);
    
    return {
      type: 'http', // Explicitly set type for SDK compatibility
      url: 'https://mcp.context7.com/mcp',
      headers: {
        'CONTEXT7_API_KEY': apiKey,
      },
    };
  } catch (error) {
    console.error('❌ Error loading Context7 MCP config:', error);
    return null;
  }
}

/**
 * Build MCP servers configuration for Claude Agent SDK
 * @param useContext7 - Whether to include Context7 MCP server
 * @param useConfluence - Whether to include Confluence MCP server (default: true)
 * @returns Record of MCP server configs, or undefined if no servers enabled
 */
export async function buildMCPServersConfig(
  useContext7: boolean,
  useConfluence: boolean = true
): Promise<Record<string, AnyMCPServerConfig> | undefined> {
  const servers: Record<string, AnyMCPServerConfig> = {};
  let hasServers = false;

  // Add Confluence MCP server (always available with hardcoded credentials)
  if (useConfluence) {
    servers['confluence'] = getConfluenceMCPConfig();
    hasServers = true;
    console.log('🔗 Confluence MCP server added to configuration');
  }

  // Add Context7 MCP server (requires API key)
  if (useContext7) {
    const context7Config = await getContext7MCPConfig();
    if (context7Config) {
      servers['context7'] = context7Config;
      hasServers = true;
      console.log('🔗 Context7 MCP server added to configuration');
    } else {
      console.warn('⚠️  Context7 MCP requested but API key not configured');
    }
  }

  // Return undefined if no servers (SDK expects undefined, not empty object)
  return hasServers ? servers : undefined;
}

/**
 * Check if Context7 MCP is configured and available
 */
export async function isContext7MCPAvailable(): Promise<boolean> {
  const config = await getContext7MCPConfig();
  return config !== null;
}

/**
 * Check if Confluence MCP is available
 * Always returns true since credentials are hardcoded
 */
export function isConfluenceMCPAvailable(): boolean {
  return true;
}

/**
 * Build prompt instruction for Context7 usage
 * Appends context7 usage instruction to the prompt when enabled
 */
export async function buildContext7Instruction(originalPrompt: string, useContext7: boolean): Promise<string> {
  if (!useContext7) {
    return originalPrompt;
  }

  const config = await getContext7MCPConfig();
  if (!config) {
    console.warn('⚠️  Context7 requested but not available, skipping instruction');
    return originalPrompt;
  }

  // Append simple instruction as requested
  return `${originalPrompt}

- use context7`;
}

/**
 * Build prompt instruction for Confluence usage
 * Appends confluence usage instruction to the prompt when enabled
 */
export function buildConfluenceInstruction(originalPrompt: string, useConfluence: boolean): string {
  if (!useConfluence) {
    return originalPrompt;
  }

  // Append Confluence usage instruction
  return `${originalPrompt}

- You have access to Confluence via the 'confluence' MCP server. Use it to search and retrieve documentation when needed.`;
}

