import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);
    const { feedback } = await request.json();

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    if (!feedback || !feedback.trim()) {
      return NextResponse.json({ error: 'Feedback is required' }, { status: 400 });
    }

    // Get task, prompt, and implementation
    const task = await statements.getTask.get(taskId) as any;
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const prompt = await statements.getPrompt.get(taskId) as any;
    if (!prompt || !prompt.enhanced_prompt) {
      return NextResponse.json(
        { error: 'No enhanced prompt found' },
        { status: 400 }
      );
    }

    const impl = await statements.getImplementation.get(taskId) as any;
    if (!impl || !impl.implementation_report) {
      return NextResponse.json(
        { error: 'No implementation report found' },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting implementation refinement for task #${taskId}`);
    console.log(`💬 User Feedback: ${feedback.substring(0, 100)}...`);

    // Build refinement prompt combining original prompt + previous report + feedback
    const refinementPrompt = `${prompt.enhanced_prompt}

---

## Previous Implementation Report

${impl.implementation_report}

---

## User Feedback for Refinement

${feedback}

---

**Instructions:** Please refine the implementation based on the user's feedback above. Address the specific concerns and improve the implementation accordingly. Focus on the areas mentioned in the feedback while maintaining the overall structure and functionality.`;

    // Increment refinement round
    const nextRound = (impl.refinement_round || 1) + 1;

    console.log(`📝 Creating refinement round ${nextRound} for task #${taskId}`);

    // Update implementation record with refinement info
    await statements.updateImplementationRefinement.run('refining', nextRound, feedback, taskId);

    // Reset implementation status to waiting so it gets picked up by the queue
    await statements.updateImplementationStatus.run('waiting', taskId);

    // Update the enhanced prompt with refinement context
    await statements.updatePrompt.run(refinementPrompt, taskId);

    // Move task to in-progress status
    await statements.updateTaskStatus.run('in-progress', taskId);

    console.log(`✅ Refinement round ${nextRound} queued for task #${taskId}`);

    // Trigger implementation processor
    setTimeout(() => {
      import('../../../implementation/process/route').then((module) => {
        module.POST().catch((err: any) => 
          console.error('Failed to trigger implementation:', err)
        );
      });
    }, 500);

    return NextResponse.json({
      success: true,
      refinementRound: nextRound,
      message: `Refinement round ${nextRound} queued for implementation`,
    });
  } catch (error: any) {
    console.error('❌ Error refining implementation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refine implementation' },
      { status: 500 }
    );
  }
}

