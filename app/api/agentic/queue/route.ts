/**
 * Task Queue API
 * GET - Get queue status
 * POST - Control queue (start/stop/pause)
 */

import { NextRequest, NextResponse } from 'next/server';
import { taskQueueProcessor } from '@/lib/agentic/queue/processor';

export async function GET() {
  try {
    const stats = await taskQueueProcessor.getStats();
    const config = taskQueueProcessor.getConfig();
    const activeTasks = taskQueueProcessor.getActiveTasks();

    return NextResponse.json({
      success: true,
      stats,
      config,
      activeTasks,
    });
  } catch (error) {
    console.error('Failed to get queue status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    switch (action) {
      case 'start':
        taskQueueProcessor.start();
        break;

      case 'stop':
        taskQueueProcessor.stop();
        break;

      case 'pause':
        taskQueueProcessor.pauseAll();
        break;

      case 'resume':
        await taskQueueProcessor.resumeAll();
        break;

      case 'configure':
        if (config) {
          taskQueueProcessor.updateConfig(config);
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    const stats = await taskQueueProcessor.getStats();
    const currentConfig = taskQueueProcessor.getConfig();

    return NextResponse.json({
      success: true,
      action,
      stats,
      config: currentConfig,
    });
  } catch (error) {
    console.error('Failed to control queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to control queue' },
      { status: 500 }
    );
  }
}
