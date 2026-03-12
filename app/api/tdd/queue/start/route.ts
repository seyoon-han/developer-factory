import { NextResponse } from 'next/server';
import { tddQueueProcessor } from '@/lib/tdd/queue/tddProcessor';

/**
 * POST /api/tdd/queue/start
 * Start the TDD queue processor
 */
export async function POST() {
  try {
    if (tddQueueProcessor.isRunning()) {
      return NextResponse.json({
        success: true,
        message: 'TDD queue processor already running',
        status: tddQueueProcessor.getStatus()
      });
    }

    await tddQueueProcessor.start();

    return NextResponse.json({
      success: true,
      message: 'TDD queue processor started',
      status: tddQueueProcessor.getStatus()
    });
  } catch (error: any) {
    console.error('Error starting queue processor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
