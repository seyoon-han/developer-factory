import { NextResponse } from 'next/server';
import { tddQueueProcessor } from '@/lib/tdd/queue/tddProcessor';

/**
 * GET /api/tdd/queue/status
 * Get TDD queue processor status
 */
export async function GET() {
  try {
    const status = tddQueueProcessor.getStatus();

    return NextResponse.json({
      success: true,
      status
    });
  } catch (error: any) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
