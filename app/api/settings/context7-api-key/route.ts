import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { updateContext7McpServer } from '@/lib/utils/claudeCodeMcpConfig';

/**
 * GET /api/settings/context7-api-key
 * Get Context7 API key status (masked, not the actual key)
 */
export async function GET() {
  try {
    const settings = await statements.getAppSettings.get() as any;
    const hasApiKey = Boolean(settings?.context7_api_key);
    
    return NextResponse.json({
      configured: hasApiKey,
      masked: hasApiKey ? '••••••••' + settings.context7_api_key.slice(-4) : null,
    });
  } catch (error: any) {
    console.error('Error fetching Context7 API key status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Context7 API key status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/context7-api-key
 * Update Context7 API key
 */
export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();
    
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required and must be a string' },
        { status: 400 }
      );
    }

    // Basic validation - Context7 keys start with 'ctx7sk-'
    if (!apiKey.startsWith('ctx7sk-')) {
      return NextResponse.json(
        { error: 'Invalid API key format. Context7 keys start with "ctx7sk-"' },
        { status: 400 }
      );
    }

    // Update in database
    await statements.updateContext7ApiKey.run(apiKey);

    console.log(`🔑 Context7 API key updated (ends with: ...${apiKey.slice(-4)})`);

    // Update Claude Code MCP configuration
    const mcpUpdated = await updateContext7McpServer();
    if (mcpUpdated) {
      console.log('✅ Context7 MCP server configured in Claude Code');
    } else {
      console.warn('⚠️  Failed to update Claude Code MCP configuration');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Context7 API key updated successfully',
      masked: '••••••••' + apiKey.slice(-4),
      mcpConfigured: mcpUpdated,
    });
  } catch (error: any) {
    console.error('Error updating Context7 API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update Context7 API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/context7-api-key
 * Remove Context7 API key
 */
export async function DELETE() {
  try {
    await statements.updateContext7ApiKey.run(null);

    console.log('🔑 Context7 API key removed');

    // Remove Context7 MCP server from Claude Code configuration
    const mcpUpdated = await updateContext7McpServer();
    if (mcpUpdated) {
      console.log('✅ Context7 MCP server removed from Claude Code');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Context7 API key removed successfully',
      mcpConfigured: false,
    });
  } catch (error: any) {
    console.error('Error removing Context7 API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove Context7 API key' },
      { status: 500 }
    );
  }
}

