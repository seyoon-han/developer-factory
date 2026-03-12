import { NextResponse } from 'next/server';
import { tddQueueProcessor } from '@/lib/tdd/queue/tddProcessor';

/**
 * POST /api/tdd/queue/stop
 * Stop the TDD queue processor
 */
export async function POST() {
  try {
    if (!tddQueueProcessor.isRunning()) {
      return NextResponse.json({
        success: true,
        message: 'TDD queue processor already stopped',
        status: tddQueueProcessor.getStatus()
      });
    }

    tddQueueProcessor.stop();

    return NextResponse.json({
      success: true,
      message: 'TDD queue processor stopped',
      status: tddQueueProcessor.getStatus()
    });
  } catch (error: any) {
    console.error('Error stopping queue processor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
