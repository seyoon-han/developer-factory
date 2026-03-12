import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { presubmitExecutor } from '@/lib/queue/presubmitExecutor';
import { EXPERT_SKILLS, getExpertByRole } from '@/lib/config/expertSkills';

// GET - Fetch all presubmit evaluations for a task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const evaluations = await statements.getPresubmitEvaluations.all(taskId);

    return NextResponse.json({ evaluations });
  } catch (error: any) {
    console.error('Error fetching presubmit evaluations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch evaluations' },
      { status: 500 }
    );
  }
}

// POST - Run a specific expert evaluation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);
    const { expertRole } = await request.json();

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    if (!expertRole) {
      return NextResponse.json({ error: 'Expert role is required' }, { status: 400 });
    }

    // Get expert configuration
    const expert = getExpertByRole(expertRole);
    if (!expert) {
      return NextResponse.json({ error: 'Invalid expert role' }, { status: 400 });
    }

    // Get task and implementation report
    const task = await statements.getTask.get(taskId) as any;
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const impl = await statements.getImplementation.get(taskId) as any;
    if (!impl || !impl.implementation_report) {
      return NextResponse.json(
        { error: 'No implementation report found' },
        { status: 400 }
      );
    }

    // Create or get existing evaluation record
    let evaluation = await statements.getPresubmitEvaluation.get(taskId, expertRole) as any;
    if (!evaluation) {
      await statements.createPresubmitEvaluation.run(taskId, expertRole);
      evaluation = await statements.getPresubmitEvaluation.get(taskId, expertRole);
    }

    // Check if already completed
    if (evaluation.status === 'completed') {
      return NextResponse.json({
        message: 'Evaluation already completed',
        evaluation,
      });
    }

    // Mark as running
    await statements.startPresubmitEvaluation.run(taskId, expertRole);

    // Execute evaluation in background
    executeEvaluationAsync(taskId, expert, impl.implementation_report);

    return NextResponse.json({
      success: true,
      message: `${expert.displayName} evaluation started`,
      expert: expertRole,
    });
  } catch (error: any) {
    console.error('Error starting presubmit evaluation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start evaluation' },
      { status: 500 }
    );
  }
}

/**
 * Execute evaluation asynchronously
 */
async function executeEvaluationAsync(
  taskId: number,
  expert: any,
  implementationReport: string
) {
  const startTime = Date.now();

  try {
    console.log(`🔍 Executing ${expert.displayName} evaluation for task #${taskId}...`);

    const result = await presubmitExecutor.executeExpertEvaluation(
      taskId,
      expert,
      implementationReport
    );

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    if (result.success) {
      console.log(`✅ ${expert.displayName} evaluation completed in ${elapsedSeconds}s`);

      // Save evaluation results
      await statements.completePresubmitEvaluation.run(
        elapsedSeconds,
        result.evaluationReport || '',
        JSON.stringify(result.actionPoints || []),
        result.overallOpinion || '',
        result.severity || 'low',
        taskId,
        expert.role
      );
    } else {
      throw new Error(result.error || 'Evaluation failed');
    }
  } catch (error: any) {
    console.error(`❌ ${expert.displayName} evaluation failed:`, error);

    // Mark as error
    await statements.failPresubmitEvaluation.run(
      error.message || 'Unknown error',
      taskId,
      expert.role
    );
  }
}

