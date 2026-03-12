import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { gitManager } from '@/lib/projects/git';
import { getTargetProjectPath } from '@/lib/config/workspace';

export async function POST(
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

    // Get task and prompt
    const task = await statements.getTask.get(taskId) as any;
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const prompt = await statements.getPrompt.get(taskId) as any;
    if (!prompt || !prompt.enhanced_prompt) {
      return NextResponse.json(
        { error: 'No enhanced prompt to approve' },
        { status: 400 }
      );
    }

    if (prompt.approved) {
      return NextResponse.json(
        { error: 'Prompt already approved' },
        { status: 400 }
      );
    }

    console.log(`✅ Approving prompt for task #${taskId}`);

    // 1. Approve the prompt
    await statements.approvePrompt.run(taskId);
    console.log(`✅ Prompt approved in database for task #${taskId}`);

    // 2. Create git restore point in TARGET project (not dev-automation-board)
    let gitCommitHash = '';
    const targetPath = getTargetProjectPath();
    
    console.log(`📍 Creating git restore point for task #${taskId}`);
    console.log(`🎯 Target project: ${targetPath}`);
    
    try {
      gitCommitHash = await gitManager.createRestorePoint(targetPath, taskId);
      console.log(`✅ Git restore point created: ${gitCommitHash.substring(0, 7)}`);
    } catch (error: any) {
      console.error('❌ Git restore point creation failed:', error.message);
      console.error('   Error details:', error);
      // Continue anyway - don't fail approval due to git issues
      gitCommitHash = 'git-error';
    }

    // 3. Create implementation record and add to queue (lock priority)
    try {
      await statements.createImplementation.run(taskId, 'waiting', gitCommitHash, task.priority);
      console.log(`📋 Task #${taskId} added to implementation queue with priority: ${task.priority}`);
    } catch (error: any) {
      // Implementation record might already exist
      console.log(`📋 Implementation record already exists for task #${taskId}`);
    }

    // 4. Move task to in-progress status
    await statements.updateTaskStatus.run('in-progress', taskId);

    // 5. Check if this task can start implementation (no other active task)
    const activeImpl = await statements.getActiveImplementation.get() as any;
    if (!activeImpl) {
      // No active implementation, this task can start immediately
      console.log(`🚀 No active implementation, task #${taskId} can start immediately`);
      
      // Trigger implementation processor using internal API call (no network fetch)
      // We'll import and call the implementation processor directly
      import('../../../implementation/process/route').then((module) => {
        module.POST().catch((err: any) => console.error('Failed to trigger implementation:', err));
      });
    } else {
      console.log(`⏳ Task #${taskId} waiting in queue (Task #${activeImpl.task_id} is active)`);
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt approved and queued for implementation',
      gitCommitHash,
    });
  } catch (error: any) {
    console.error('❌ Error approving prompt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve prompt' },
      { status: 500 }
    );
  }
}

