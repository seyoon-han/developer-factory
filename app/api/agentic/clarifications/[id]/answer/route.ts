/**
 * Submit answer to a single clarification
 * POST /api/agentic/clarifications/[id]/answer
 */

import { NextRequest, NextResponse } from 'next/server';
import { clarificationService } from '@/lib/agentic/services/clarificationService';
import { pipelineOrchestrator } from '@/lib/agentic/pipeline/pipelineOrchestrator';
import { statements } from '@/lib/db/postgres';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API] POST /api/agentic/clarifications/[id]/answer - Start');
  
  try {
    const { id } = await params;
    const clarificationId = parseInt(id, 10);
    console.log(`[API] Clarification ID: ${clarificationId}`);
    
    let body;
    try {
      body = await request.json();
      console.log('[API] Request body:', JSON.stringify(body));
    } catch (parseError) {
      console.error('[API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { answer, resumePipeline } = body;

    if (!answer || typeof answer !== 'string') {
      console.error('[API] Invalid answer:', { answer, type: typeof answer });
      return NextResponse.json(
        { success: false, error: 'Answer is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Submitting answer: "${answer.substring(0, 100)}..."`);
    
    // Submit the answer
    const clarification = await clarificationService.submitAnswer(clarificationId, {
      value: answer,
    });
    console.log('[API] Answer submitted successfully');

    // Get the task ID from the clarification
    const row = await statements.getAgenticClarification.get(clarificationId) as any;
    const taskId = row?.task_id;
    console.log(`[API] Task ID from clarification: ${taskId}`);

    if (taskId) {
      // Check if all required clarifications are answered
      const status = await clarificationService.getClarificationStatus(taskId);
      console.log('[API] Clarification status:', JSON.stringify(status));

      // Optionally resume pipeline
      if (resumePipeline && status.allRequiredAnswered) {
        console.log('[API] Resuming pipeline...');
        await pipelineOrchestrator.resumePipeline(taskId);
      }

      return NextResponse.json({
        success: true,
        clarification,
        status,
        pipelineResumed: resumePipeline && status.allRequiredAnswered,
      });
    }

    return NextResponse.json({
      success: true,
      clarification,
    });
  } catch (error) {
    console.error('[API] ❌ Failed to submit clarification answer:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit answer' },
      { status: 500 }
    );
  }
}

