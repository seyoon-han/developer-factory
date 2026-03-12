/**
 * Agentic Task Clarifications API
 * GET - Get all clarifications for a task
 * POST - Submit answers to clarifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { clarificationService } from '@/lib/agentic/services/clarificationService';
import { pipelineOrchestrator } from '@/lib/agentic/pipeline/pipelineOrchestrator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API] GET /api/agentic/tasks/[id]/clarifications - Start');
  
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    console.log(`[API] Task ID: ${taskId}`);

    const clarifications = await clarificationService.getClarificationsForTask(taskId);
    const status = await clarificationService.getClarificationStatus(taskId);
    
    console.log(`[API] Found ${clarifications.length} clarifications`);
    console.log('[API] Clarifications with options:', clarifications.map(c => ({
      id: c.id,
      question: c.questionText?.substring(0, 50),
      optionCount: c.suggestedOptions?.length || 0,
      answered: !!c.userAnswer
    })));
    console.log('[API] Status:', JSON.stringify(status));

    return NextResponse.json({
      success: true,
      clarifications,
      status,
    });
  } catch (error) {
    console.error('[API] ❌ Failed to get clarifications:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { success: false, error: 'Failed to get clarifications' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API] POST /api/agentic/tasks/[id]/clarifications - Start');
  
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    console.log(`[API] Task ID: ${taskId}`);
    
    let body;
    try {
      body = await request.json();
      console.log('[API] Request body:', JSON.stringify(body));
    } catch (parseError) {
      console.error('[API] ❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Body format: { answers: { [clarificationId]: { value: string, selectedOptions?: string[], customText?: string } } }
    const { answers, resumePipeline } = body;

    if (answers) {
      console.log('[API] Submitting batch answers:', Object.keys(answers).length);
      await clarificationService.submitBatchAnswers(answers);
      console.log('[API] Batch answers submitted successfully');
    }

    // Check if all required clarifications are answered
    const status = await clarificationService.getClarificationStatus(taskId);
    console.log('[API] Status after submission:', JSON.stringify(status));

    // Optionally resume pipeline after answering
    console.log(`[API] resumePipeline flag: ${resumePipeline}, allRequiredAnswered: ${status.allRequiredAnswered}`);
    if (resumePipeline) {
      if (status.allRequiredAnswered) {
        console.log('[API] ✅ Resuming pipeline - all required answered');
        try {
          await pipelineOrchestrator.resumePipeline(taskId);
          console.log('[API] ✅ Pipeline resumed successfully');
        } catch (resumeError) {
          console.error('[API] ❌ Failed to resume pipeline:', resumeError);
          throw resumeError;
        }
      } else {
        console.log('[API] ⚠️ Cannot resume pipeline - not all required answered');
        console.log(`[API]    Required pending: ${status.requiredPending}`);
      }
    }

    const clarifications = await clarificationService.getClarificationsForTask(taskId);

    return NextResponse.json({
      success: true,
      clarifications,
      status,
      pipelineResumed: resumePipeline && status.allRequiredAnswered,
    });
  } catch (error) {
    console.error('[API] ❌ Failed to submit clarifications:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit clarifications' },
      { status: 500 }
    );
  }
}
