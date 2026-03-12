/**
 * Start Agentic Task Pipeline
 * POST - Start or resume task execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { pipelineOrchestrator } from '@/lib/agentic/pipeline/pipelineOrchestrator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);

    const state = await pipelineOrchestrator.startPipeline(taskId);

    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error) {
    console.error('Failed to start agentic task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start task' },
      { status: 500 }
    );
  }
}
