import { NextRequest, NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { ucsService } from '@/lib/tdd/ucs/clarificationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tdd/tasks/[id]/clarifications
 * Get clarifications for a TDD task
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tddTaskId = parseInt(id);

    const clarifications = await ucsService.getClarifications(tddTaskId);
    const status = await ucsService.getClarificationStatus(tddTaskId);

    return NextResponse.json({
      success: true,
      clarifications,
      status
    });
  } catch (error: any) {
    console.error('Error getting clarifications:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tdd/tasks/[id]/clarifications
 * Submit answers to clarifications
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tddTaskId = parseInt(id);
    const body = await request.json();
    const { answers } = body;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { success: false, error: 'answers object is required' },
        { status: 400 }
      );
    }

    // Submit all answers
    const results = await ucsService.submitBatchAnswers({
      tdd_task_id: tddTaskId,
      answers
    });

    // Check if all required are answered
    const status = await ucsService.getClarificationStatus(tddTaskId);

    return NextResponse.json({
      success: true,
      results,
      status,
      message: status.all_required_answered
        ? 'All required clarifications answered'
        : `${status.required_pending} required clarifications still pending`
    });
  } catch (error: any) {
    console.error('Error submitting clarifications:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
