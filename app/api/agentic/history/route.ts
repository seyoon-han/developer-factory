/**
 * Agentic Task History API
 * GET - Fetch all archived task history
 */

import { NextRequest, NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

export async function GET(request: NextRequest) {
  try {
    const entries = await statements.getAllAgenticTaskHistory.all();

    return NextResponse.json({
      success: true,
      entries: entries || [],
    });
  } catch (error) {
    console.error('Failed to fetch task history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task history', entries: [] },
      { status: 500 }
    );
  }
}
