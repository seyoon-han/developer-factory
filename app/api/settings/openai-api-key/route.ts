import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * GET /api/settings/openai-api-key
 * Get OpenAI API key status (masked, not the actual key)
 */
export async function GET() {
  try {
    const settings = await statements.getAppSettings.get() as any;
    const hasApiKey = Boolean(settings?.openai_api_key);
    
    return NextResponse.json({
      configured: hasApiKey,
      masked: hasApiKey ? '••••••••' + settings.openai_api_key.slice(-4) : null,
    });
  } catch (error: any) {
    console.error('Error fetching OpenAI API key status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch OpenAI API key status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/openai-api-key
 * Update OpenAI API key
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

    // Basic validation - OpenAI keys start with 'sk-'
    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid API key format. OpenAI keys start with "sk-"' },
        { status: 400 }
      );
    }

    // Update in database
    await statements.updateOpenAiApiKey.run(apiKey);
    
    console.log(`🔑 OpenAI API key updated (ends with: ...${apiKey.slice(-4)})`);
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API key updated successfully',
      masked: '••••••••' + apiKey.slice(-4),
    });
  } catch (error: any) {
    console.error('Error updating OpenAI API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update OpenAI API key' },
      { status: 500 }
    );
  }
}

