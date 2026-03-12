import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// POST /api/integrations/[type]/test - Test an integration connection
export async function POST(
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

    const config = JSON.parse(integration.config);

    // TODO: Implement actual integration testing logic
    // For now, just return success with basic validation

    let testResult = { success: true, message: 'Connection test not implemented yet' };

    switch (resolvedParams.type) {
      case 'github':
        if (config.token) {
          testResult = { success: true, message: 'GitHub config looks valid (test not fully implemented)' };
        } else {
          testResult = { success: false, message: 'GitHub token is missing' };
        }
        break;
      case 'gitlab':
        if (config.token) {
          testResult = { success: true, message: 'GitLab config looks valid (test not fully implemented)' };
        } else {
          testResult = { success: false, message: 'GitLab token is missing' };
        }
        break;
      case 'jira':
        if (config.apiKey && config.domain) {
          testResult = { success: true, message: 'Jira config looks valid (test not fully implemented)' };
        } else {
          testResult = { success: false, message: 'Jira credentials incomplete' };
        }
        break;
      case 'slack':
        if (config.webhookUrl) {
          testResult = { success: true, message: 'Slack config looks valid (test not fully implemented)' };
        } else {
          testResult = { success: false, message: 'Slack webhook URL is missing' };
        }
        break;
    }

    if (testResult.success) {
      // Update last sync time on successful test
      await statements.updateIntegrationSync.run(resolvedParams.type);
    }

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      type: resolvedParams.type,
    });
  } catch (error: any) {
    console.error('Error testing integration:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

