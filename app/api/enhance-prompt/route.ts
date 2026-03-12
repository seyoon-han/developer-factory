import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { skillExecutor } from '@/lib/queue/skillExecutor';

export async function POST(request: Request) {
  try {
    const { taskId, title, description } = await request.json();

    console.log(`📝 Starting prompt enhancement for task #${taskId}`);

    // Execute prompt-enhancer skill using Claude Agent SDK
    const skillResult = await skillExecutor.executePromptEnhancer(
      title,
      description || '',
      { timeout: 90000, retries: 2 }
    );

    if (skillResult.success && skillResult.questions && skillResult.questions.length > 0) {
      // Add questions to database
      for (const question of skillResult.questions) {
        await statements.addQuestion.run(taskId, question);
      }

      console.log(`✅ Generated ${skillResult.questions.length} questions for task #${taskId}`);

      return NextResponse.json({
        success: true,
        questionsGenerated: skillResult.questions.length,
        executionTime: skillResult.metadata?.executionTime,
      });
    } else {
      // Skill execution failed
      const errorMsg = skillResult.error || 'Unknown error during skill execution';
      console.error(`❌ Skill execution failed: ${errorMsg}`);

      return NextResponse.json(
        { error: `Skill execution failed: ${errorMsg}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('💥 Error enhancing prompt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enhance prompt' },
      { status: 500 }
    );
  }
}
