import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { agentSdkExecutor } from '@/lib/queue/agentSdkExecutor';
import { skillExecutor } from '@/lib/queue/skillExecutor';
import { claudeCodeExecutor } from '@/lib/queue/claudeCodeExecutor';
import { SKILLS_CONFIG } from '@/lib/config/skills';

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

    // Get task details
    const task = await statements.getTask.get(taskId) as any;
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get current prompt
    const prompt = await statements.getPrompt.get(taskId) as any;
    if (!prompt || !prompt.enhanced_prompt) {
      return NextResponse.json(
        { error: 'No enhanced prompt found to refine' },
        { status: 400 }
      );
    }

    // Check if already approved
    if (prompt.approved) {
      return NextResponse.json(
        { error: 'Cannot refine approved prompt' },
        { status: 403 }
      );
    }

    console.log(`🔄 Refining prompt for task #${taskId} with user feedback`);
    console.log(`💬 Feedback: ${feedback}`);

    // Set refinement status to 'refining'
    await statements.setPromptRefinementStatus.run('refining', taskId);

    // Build refinement prompt
    const refinementDescription = `${task.description || task.title}

## Current Enhanced Requirements:
${prompt.enhanced_prompt}

## User Feedback for Refinement:
${feedback}

Please update the enhanced requirements based on the user's feedback. Maintain the same structure and format, but incorporate the requested changes and improvements.`;

    console.log(`📝 Refinement prompt prepared (${refinementDescription.length} chars)`);

    // Call prompt-enhancer skill again with refinement context
    const executionMethod = SKILLS_CONFIG.executionMethod;
    let skillResult;

    if (executionMethod === 'sdk') {
      console.log(`🤖 Refining via Claude Agent SDK`);
      skillResult = await agentSdkExecutor.executePromptEnhancer(
        taskId,
        `[REFINEMENT] ${task.title}`,
        refinementDescription,
        { timeout: 90000, retries: 2 }
      );
    } else if (executionMethod === 'cli') {
      console.log(`🖥️  Refining via Claude Code CLI`);
      skillResult = await claudeCodeExecutor.executePromptEnhancer(
        `[REFINEMENT] ${task.title}`,
        refinementDescription,
        { timeout: 90000, retries: 2 }
      );
    } else {
      console.log(`☁️  Refining via Anthropic Skills API`);
      skillResult = await skillExecutor.executePromptEnhancer(
        `[REFINEMENT] ${task.title}`,
        refinementDescription,
        { timeout: 90000, retries: 2, includeProjectContext: true }
      );
    }

    if (skillResult.success && skillResult.enhancedPrompt) {
      console.log(`✅ Refined prompt generated (${skillResult.enhancedPrompt.length} chars)`);

      // Update the enhanced prompt in database
      await statements.updatePrompt.run(skillResult.enhancedPrompt, taskId);

      // Set refinement status back to idle
      await statements.setPromptRefinementStatus.run('idle', taskId);

      console.log(`💾 Refined prompt saved for task #${taskId}`);

      return NextResponse.json({
        success: true,
        message: 'Prompt refined successfully',
        enhancedPrompt: skillResult.enhancedPrompt,
      });
    } else {
      // Set status back to idle on error
      await statements.setPromptRefinementStatus.run('idle', taskId);
      throw new Error(skillResult.error || 'Refinement failed');
    }
  } catch (error: any) {
    console.error('Error refining prompt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refine prompt' },
      { status: 500 }
    );
  }
}

