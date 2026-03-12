import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { initializeApiKeys } from '@/lib/config/skills';

/**
 * GET /api/settings/api-key
 * Get API key status (masked, not the actual key)
 */
export async function GET() {
  try {
    const settings = await statements.getAppSettings.get() as any;
    const hasApiKey = Boolean(settings?.anthropic_api_key);
    
    return NextResponse.json({
      configured: hasApiKey,
      masked: hasApiKey ? '••••••••' + settings.anthropic_api_key.slice(-4) : null,
    });
  } catch (error: any) {
    console.error('Error fetching API key status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch API key status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/api-key
 * Update Anthropic API key
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

    // Basic validation - Anthropic keys start with 'sk-ant-'
    if (!apiKey.startsWith('sk-ant-')) {
      return NextResponse.json(
        { error: 'Invalid API key format. Anthropic keys start with "sk-ant-"' },
        { status: 400 }
      );
    }

    // Update in database
    await statements.updateApiKey.run(apiKey);
    
    // Refresh cache immediately
    await initializeApiKeys();
    
    console.log(`🔑 API key updated (ends with: ...${apiKey.slice(-4)})`);
    
    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
      masked: '••••••••' + apiKey.slice(-4),
    });
  } catch (error: any) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update API key' },
      { status: 500 }
    );
  }
}

