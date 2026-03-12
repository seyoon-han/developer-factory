/**
 * Slack Config API Routes by ID
 * GET - Fetch config for project group
 * DELETE - Delete slack config
 */

import { NextRequest, NextResponse } from 'next/server';
import { slackNotifier } from '@/lib/agentic/notifications/slackNotifier';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectGroupId = parseInt(id, 10);
    
    const config = await slackNotifier.getConfig(projectGroupId);
    
    return NextResponse.json({ 
      success: true, 
      config: config || null 
    });
  } catch (error) {
    console.error('Failed to fetch Slack config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const configId = parseInt(id, 10);
    
    await slackNotifier.deleteConfig(configId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete Slack config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}

