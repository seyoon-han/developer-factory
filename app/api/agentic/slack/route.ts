/**
 * Slack Notification Config API
 * GET - Get slack config for a project group
 * POST - Create/update slack config
 */

import { NextRequest, NextResponse } from 'next/server';
import { slackNotifier } from '@/lib/agentic/notifications/slackNotifier';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectGroupId = searchParams.get('projectGroupId');

    if (!projectGroupId) {
      return NextResponse.json(
        { success: false, error: 'projectGroupId is required' },
        { status: 400 }
      );
    }

    const config = slackNotifier.getConfig(parseInt(projectGroupId, 10));

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Failed to get slack config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get slack config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      projectGroupId,
      webhookUrl,
      notifyPhaseChanges = true,
      notifyUserAction = true,
      notifyCompletion = true,
      notifyErrors = true,
      includeTokenUsage = true,
      isActive = true,
    } = body;

    if (!projectGroupId || !webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'projectGroupId and webhookUrl are required' },
        { status: 400 }
      );
    }

    const config = slackNotifier.saveConfig({
      projectGroupId,
      webhookUrl,
      notifyPhaseChanges,
      notifyUserAction,
      notifyCompletion,
      notifyErrors,
      includeTokenUsage,
      isActive,
    });

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Failed to save slack config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save slack config' },
      { status: 500 }
    );
  }
}
