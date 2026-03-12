import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/integrations/[type] - Get a specific integration config
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> | { type: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const integration = await statements.getIntegrationConfig.get(resolvedParams.type) as any;

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      integration: {
        ...integration,
        config: JSON.parse(integration.config),
      },
    });
  } catch (error: any) {
    console.error('Error fetching integration:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/integrations/[type] - Create or update an integration config
export async function POST(
  request: Request,
  { params }: { params: Promise<{ type: string }> | { type: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const { config, isActive } = body;

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'config is required' },
        { status: 400 }
      );
    }

    // Validate integration type
    const validTypes = ['github', 'gitlab', 'jira', 'slack'];
    if (!validTypes.includes(resolvedParams.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid integration type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const configJson = JSON.stringify(config);

    await statements.createOrUpdateIntegrationConfig.run(
      resolvedParams.type,
      configJson,
      isActive !== undefined ? (isActive ? 1 : 0) : 1
    );

    const integration = await statements.getIntegrationConfig.get(resolvedParams.type) as any;

    return NextResponse.json({
      success: true,
      integration: {
        ...integration,
        config: JSON.parse(integration.config),
      },
    });
  } catch (error: any) {
    console.error('Error saving integration:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/[type] - Delete an integration config
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ type: string }> | { type: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const existingIntegration = await statements.getIntegrationConfig.get(resolvedParams.type);
    if (!existingIntegration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      );
    }

    await statements.deleteIntegrationConfig.run(resolvedParams.type);

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

