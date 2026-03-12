import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);
    const { enhancedPrompt } = await request.json();

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    if (!enhancedPrompt || enhancedPrompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Enhanced prompt is required' },
        { status: 400 }
      );
    }

    // Update the enhanced prompt in the database
    await statements.updatePrompt.run(enhancedPrompt, taskId);

    console.log(`✅ Updated enhanced prompt for task #${taskId}`);

    return NextResponse.json({
      success: true,
      message: 'Prompt updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating prompt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update prompt' },
      { status: 500 }
    );
  }
}
