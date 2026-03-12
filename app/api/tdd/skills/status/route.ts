import { NextRequest, NextResponse } from 'next/server';
import { esmlService } from '@/lib/tdd/esml/skillsManager';

/**
 * GET /api/tdd/skills/status
 * Get skills sync status
 */
export async function GET() {
  try {
    await esmlService.initialize();

    const status = await esmlService.getSyncStatus();

    return NextResponse.json({
      success: true,
      status
    });
  } catch (error: any) {
    console.error('Error getting skills status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
