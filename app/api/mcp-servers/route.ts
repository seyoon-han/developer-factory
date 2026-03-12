import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// Transform database snake_case to camelCase
function transformMcpServer(server: any) {
  return {
    id: server.id,
    serverName: server.server_name,
    description: server.description,
    version: server.version,
    serverAddress: server.server_address,
    port: server.port,
    protocolType: server.protocol_type,
    connectionPath: server.connection_path,
    authType: server.auth_type,
    authToken: server.auth_token,
    authKeyName: server.auth_key_name,
    additionalHeaders: server.additional_headers ? JSON.parse(server.additional_headers) : null,
    serverArgs: server.server_args ? JSON.parse(server.server_args) : null,
    serverEnv: server.server_env ? JSON.parse(server.server_env) : null,
    isActive: server.is_active === 1,
    lastTestAt: server.last_test_at,
    lastTestStatus: server.last_test_status,
    lastTestError: server.last_test_error,
    availableTools: server.available_tools ? JSON.parse(server.available_tools) : null,
    createdAt: server.created_at,
    updatedAt: server.updated_at,
  };
}

/**
 * GET /api/mcp-servers
 * Get all MCP servers
 */
export async function GET() {
  try {
    const servers = await statements.getAllMcpServers.all();
    const transformed = servers.map(transformMcpServer);
    
    return NextResponse.json({
      success: true,
      servers: transformed,
    });
  } catch (error: any) {
    console.error('Error fetching MCP servers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch MCP servers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp-servers
 * Create a new MCP server
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      serverName,
      description,
      version,
      serverAddress,
      port,
      protocolType,
      connectionPath = '/',
      authType = 'none',
      authToken,
      authKeyName,
      additionalHeaders,
      serverArgs,
      serverEnv,
    } = body;

    // Validation
    if (!serverName || serverName.length < 1 || serverName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Server name is required and must be 1-100 characters' },
        { status: 400 }
      );
    }

    if (!protocolType || !['http', 'https', 'ws', 'wss', 'stdio'].includes(protocolType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid protocol type' },
        { status: 400 }
      );
    }

    // Protocol specific validation
    if (protocolType === 'stdio') {
      if (!serverAddress) {
        return NextResponse.json(
          { success: false, error: 'Command is required for STDIO' },
          { status: 400 }
        );
      }
      // Port is optional for STDIO
    } else {
      if (!serverAddress) {
        return NextResponse.json(
          { success: false, error: 'Server address is required' },
          { status: 400 }
        );
      }

      if (!port || port < 1 || port > 65535) {
        return NextResponse.json(
          { success: false, error: 'Port must be between 1 and 65535' },
          { status: 400 }
        );
      }
    }

    if (!['none', 'apiKey', 'bearer', 'oauth', 'basic'].includes(authType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid auth type' },
        { status: 400 }
      );
    }

    if (authType !== 'none' && !authToken) {
      return NextResponse.json(
        { success: false, error: 'Auth token is required when auth type is not "none"' },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await statements.getMcpServerByName.get(serverName);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Server name already exists' },
        { status: 400 }
      );
    }

    // Create server
    const result = await statements.createMcpServer.run(
      serverName,
      description || null,
      version || null,
      serverAddress,
      port || null,
      protocolType,
      connectionPath,
      authType,
      authToken || null,
      authKeyName || null,
      additionalHeaders ? JSON.stringify(additionalHeaders) : null,
      serverArgs ? JSON.stringify(serverArgs) : null,
      serverEnv ? JSON.stringify(serverEnv) : null
    );

    const server = await statements.getMcpServer.get(result.lastInsertRowid);
    const transformed = transformMcpServer(server);

    console.log(`✅ Created MCP server: ${serverName}`);

    return NextResponse.json({
      success: true,
      server: transformed,
    });
  } catch (error: any) {
    console.error('Error creating MCP server:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create MCP server' },
      { status: 500 }
    );
  }
}

