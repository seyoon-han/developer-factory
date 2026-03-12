/**
 * Slack Config API Routes
 * POST - Create/Update slack config
 */

import { NextRequest, NextResponse } from 'next/server';
import { slackNotifier } from '@/lib/agentic/notifications/slackNotifier';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const config = await slackNotifier.saveConfig({
      projectGroupId: data.projectGroupId,
      webhookUrl: data.webhookUrl,
      notifyPhaseChanges: data.notifyPhaseChanges ?? true,
      notifyUserAction: data.notifyUserAction ?? true,
      notifyCompletion: data.notifyCompletion ?? true,
      notifyErrors: data.notifyErrors ?? true,
      includeTokenUsage: data.includeTokenUsage ?? false,
      isActive: data.isActive ?? true,
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Failed to save Slack config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

