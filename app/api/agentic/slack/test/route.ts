/**
 * Test Slack Webhook API
 * POST - Send test message to webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { slackNotifier } from '@/lib/agentic/notifications/slackNotifier';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'webhookUrl is required' },
        { status: 400 }
      );
    }

    const result = await slackNotifier.testWebhook(webhookUrl);

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('Failed to test slack webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test webhook' },
      { status: 500 }
    );
  }
}
