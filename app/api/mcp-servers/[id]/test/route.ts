import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * POST /api/mcp-servers/[id]/test
 * Test connection to an MCP server
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const server = await statements.getMcpServer.get(id) as any;
    if (!server) {
      return NextResponse.json(
        { success: false, error: 'Server not found' },
        { status: 404 }
      );
    }

    console.log(`🧪 Testing connection to MCP server: ${server.server_name}`);

    // Build the connection URL
    const url = `${server.protocol_type}://${server.server_address}:${server.port}${server.connection_path}`;
    
    console.log(`   URL: ${url}`);
    console.log(`   Auth Type: ${server.auth_type}`);

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication
      if (server.auth_type === 'bearer' && server.auth_token) {
        headers['Authorization'] = `Bearer ${server.auth_token}`;
      } else if (server.auth_type === 'apiKey' && server.auth_token) {
        const keyName = server.auth_key_name || 'X-API-Key';
        headers[keyName] = server.auth_token;
      } else if (server.auth_type === 'basic' && server.auth_token) {
        headers['Authorization'] = `Basic ${server.auth_token}`;
      }

      // Add additional headers
      if (server.additional_headers) {
        try {
          const additionalHeaders = JSON.parse(server.additional_headers);
          Object.assign(headers, additionalHeaders);
        } catch (e) {
          console.warn('Failed to parse additional headers:', e);
        }
      }

      // Make a test request (assuming MCP servers have a health/info endpoint)
      // Try common endpoints: /, /health, /info, /tools
      const endpoints = ['/', '/health', '/info', '/tools'];
      let testResult: any = null;
      let availableTools: any = null;

      for (const endpoint of endpoints) {
        try {
          const testUrl = `${server.protocol_type}://${server.server_address}:${server.port}${endpoint}`;
          console.log(`   Trying endpoint: ${testUrl}`);
          
          const response = await fetch(testUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });

          if (response.ok) {
            testResult = {
              status: response.status,
              statusText: response.statusText,
              endpoint,
            };

            // Try to parse response
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
              const data = await response.json();
              testResult.data = data;

              // If this is a tools endpoint, save the tools
              if (endpoint.includes('tool') && Array.isArray(data)) {
                availableTools = data;
              } else if (data.tools && Array.isArray(data.tools)) {
                availableTools = data.tools;
              }
            }

            break; // Found a working endpoint
          }
        } catch (endpointError: any) {
          console.log(`   Endpoint ${endpoint} failed: ${endpointError.message}`);
        }
      }

      if (testResult) {
        // Connection successful
        await statements.updateMcpServerTestResult.run(
          'success',
          null,
          availableTools ? JSON.stringify(availableTools) : null,
          id
        );

        console.log(`✅ MCP server test successful: ${server.server_name}`);

        return NextResponse.json({
          success: true,
          status: 'success',
          message: 'Connection successful',
          result: testResult,
          availableTools,
        });
      } else {
        // All endpoints failed
        const errorMessage = 'All test endpoints failed to respond';

        await statements.updateMcpServerTestResult.run(
          'failed',
          errorMessage,
          null,
          id
        );

        console.log(`❌ MCP server test failed: ${server.server_name} - ${errorMessage}`);

        return NextResponse.json({
          success: false,
          status: 'failed',
          error: errorMessage,
        }, { status: 503 });
      }
    } catch (error: any) {
      // Connection error
      const errorMessage = error.message || 'Connection failed';

      await statements.updateMcpServerTestResult.run(
        'error',
        errorMessage,
        null,
        id
      );

      console.log(`❌ MCP server test error: ${server.server_name} - ${errorMessage}`);

      return NextResponse.json({
        success: false,
        status: 'error',
        error: errorMessage,
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Error testing MCP server:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to test MCP server' },
      { status: 500 }
    );
  }
}

