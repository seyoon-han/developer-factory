/**
 * Agentic Task Plan API
 * GET - Get task plan
 * POST - Approve/Reject plan (Actions)
 * PATCH - Update plan content
 */

import { NextRequest, NextResponse } from 'next/server';
import { planService } from '@/lib/agentic/services/planService';
import { pipelineOrchestrator } from '@/lib/agentic/pipeline/pipelineOrchestrator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);

    const plan = await planService.getPlanForTask(taskId);
    const progress = plan ? await planService.getProgress(taskId) : null;

    return NextResponse.json({
      success: true,
      plan,
      progress,
    });
  } catch (error) {
    console.error('Failed to get plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get plan' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    const body = await request.json();

    const { action, resumePipeline, reason } = body;

    let plan;

    switch (action) {
      case 'approve':
        plan = await planService.approvePlan(taskId);
        // Automatically resume pipeline on approval if requested or default
        // Default behavior: approval transitions phase, orchestrator should handle it?
        // resumePipeline param is useful for explicit control
        if (resumePipeline !== false) {
             await pipelineOrchestrator.resumePipeline(taskId);
        }
        break;

      case 'reject':
        plan = await planService.rejectPlan(taskId);
        // Maybe trigger re-planning or just leave it in rejected state
        // reason is available here
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('Failed to process plan action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process plan action' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    const body = await request.json();

    // Body contains partial plan update
    const plan = await planService.updatePlan(taskId, body);

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('Failed to update plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update plan' },
      { status: 500 }
    );
  }
}
