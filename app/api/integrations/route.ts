import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/integrations - Get all integration configs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let integrations;
    
    if (activeOnly) {
      integrations = await statements.getActiveIntegrationConfigs.all();
    } else {
      integrations = await statements.getAllIntegrationConfigs.all();
    }

    // Parse config JSON
    const integrationsWithParsedConfig = integrations.map((integration: any) => ({
      ...integration,
      config: JSON.parse(integration.config),
    }));

    return NextResponse.json({
      success: true,
      integrations: integrationsWithParsedConfig,
    });
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
















