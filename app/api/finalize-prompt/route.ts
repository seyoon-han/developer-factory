import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

export async function POST(request: Request) {
  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get task details
    const task = await statements.getTask.get(taskId) as any;
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get all questions and answers
    const questions = await statements.getQuestions.all(taskId) as any[];

    // Check if all questions are answered
    const unansweredQuestions = questions.filter(q => !q.answer);
    if (unansweredQuestions.length > 0) {
      return NextResponse.json(
        {
          error: 'Not all questions have been answered',
          unansweredCount: unansweredQuestions.length
        },
        { status: 400 }
      );
    }

    // Build enhanced prompt from original description + Q&A
    const enhancedPrompt = buildEnhancedPrompt(task, questions);

    // Save enhanced prompt to database
    await statements.updatePrompt.run(enhancedPrompt, taskId);

    // Update task status to in-progress
    await statements.updateTaskStatus.run('in-progress', taskId);

    console.log(`✅ Finalized prompt for task #${taskId}`);

    return NextResponse.json({
      success: true,
      enhancedPrompt,
      message: 'Prompt finalized successfully',
    });
  } catch (error: any) {
    console.error('❌ Error finalizing prompt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to finalize prompt' },
      { status: 500 }
    );
  }
}

/**
 * Build enhanced prompt from task and Q&A
 */
function buildEnhancedPrompt(task: any, questions: any[]): string {
  const qaPairs = questions
    .map((q, idx) => `${idx + 1}. **${q.question}**\n   Answer: ${q.answer}`)
    .join('\n\n');

  return `# Task: ${task.title}

## Original Description
${task.description || 'No description provided'}

## Additional Context (from clarifying questions)

${qaPairs}

## Implementation Requirements

Based on the information above, please:
1. Analyze the requirements and context
2. Create a detailed implementation plan
3. Provide step-by-step instructions
4. Include code examples where applicable
5. Consider edge cases and error handling

Priority: ${task.priority}
Status: Ready for implementation
`;
}

