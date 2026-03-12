import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const questions = await statements.getQuestions.all(taskId);

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error('❌ Error fetching questions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);
    const { questionId, answer } = await request.json();

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    if (!questionId || !answer) {
      return NextResponse.json(
        { error: 'Question ID and answer are required' },
        { status: 400 }
      );
    }

    // Update the answer in the database
    await statements.answerQuestion.run(answer, questionId);

    console.log(`✅ Answered question #${questionId} for task #${taskId}`);

    // Get all questions to check if all are answered
    const questions = await statements.getQuestions.all(taskId) as any[];
    const allAnswered = questions.every(q => q.answer);

    if (allAnswered) {
      console.log(`🎉 All questions answered for task #${taskId}, auto-finalizing prompt...`);

      // Auto-finalize prompt when all questions are answered
      try {
        const task = await statements.getTask.get(taskId) as any;
        const enhancedPrompt = buildEnhancedPrompt(task, questions);

        await statements.updatePrompt.run(enhancedPrompt, taskId);
        await statements.updateTaskStatus.run('in-progress', taskId);
        
        console.log(`✨ Enhanced prompt finalized for task #${taskId}`);
      } catch (error) {
        console.error('⚠️  Failed to auto-finalize prompt:', error);
        // Continue anyway, user can manually finalize
      }
    }

    return NextResponse.json({ 
      questions,
      allAnswered,
      message: allAnswered ? 'All questions answered! Prompt finalized.' : 'Answer saved',
    });
  } catch (error: any) {
    console.error('❌ Error answering question:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to answer question' },
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

