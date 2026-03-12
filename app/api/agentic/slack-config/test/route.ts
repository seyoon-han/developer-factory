/**
 * Slack Webhook Test API
 * POST - Test webhook connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { slackNotifier } from '@/lib/agentic/notifications/slackNotifier';

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl } = await request.json();
    
    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    const result = await slackNotifier.testWebhook(webhookUrl);
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to test Slack webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test webhook' },
      { status: 500 }
    );
  }
}

