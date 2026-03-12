import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getTargetProjectPath } from '@/lib/config/workspace';

const execAsync = promisify(exec);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId);

    if (isNaN(taskIdNum)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Get task and implementation record
    const task = await statements.getTask.get(taskIdNum) as any;
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const impl = await statements.getImplementation.get(taskIdNum) as any;
    if (!impl) {
      return NextResponse.json({ error: 'No implementation found' }, { status: 404 });
    }

    // Check if implementation is running or waiting
    if (impl.status !== 'running' && impl.status !== 'waiting') {
      return NextResponse.json(
        { error: `Cannot cancel implementation with status: ${impl.status}` },
        { status: 400 }
      );
    }

    console.log(`🛑 Cancelling implementation for task #${taskIdNum}`);
    console.log(`   Current status: ${impl.status}`);
    console.log(`   Restore point: ${impl.git_restore_point}`);

    // Rollback git changes to restore point
    const targetPath = getTargetProjectPath();
    if (impl.git_restore_point && impl.git_restore_point !== 'git-error') {
      try {
        console.log(`🔄 Rolling back git changes to restore point...`);
        console.log(`   Target path: ${targetPath}`);
        
        // Reset to restore point
        await execAsync(`git reset --hard ${impl.git_restore_point}`, { cwd: targetPath });
        
        // Clean any untracked files
        await execAsync('git clean -fd', { cwd: targetPath });
        
        console.log(`✅ Git rollback completed for task #${taskIdNum}`);
      } catch (error: any) {
        console.error(`⚠️  Git rollback failed for task #${taskIdNum}:`, error.message);
        // Continue with cancellation even if git rollback fails
      }
    } else {
      console.log(`⚠️  No valid restore point found, skipping git rollback`);
    }

    // Mark implementation as cancelled
    await statements.updateImplementationStatus.run('cancelled', taskIdNum);
    console.log(`❌ Implementation marked as cancelled for task #${taskIdNum}`);

    // Move task back to verifying status
    await statements.updateTaskStatus.run('verifying', taskIdNum);
    console.log(`⬅️  Task #${taskIdNum} moved back to 'verifying' status`);

    // Reset prompt approval so user can re-approve
    await statements.resetPromptApproval.run(taskIdNum);
    console.log(`🔓 Prompt approval reset for task #${taskIdNum}`);

    // Process next task in queue if any
    processNextTask();

    return NextResponse.json({
      success: true,
      message: `Implementation cancelled for task #${taskIdNum}`,
      rolledBack: impl.git_restore_point && impl.git_restore_point !== 'git-error',
    });
  } catch (error: any) {
    console.error('❌ Error cancelling implementation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel implementation' },
      { status: 500 }
    );
  }
}

/**
 * Trigger processing of next task in queue
 */
function processNextTask() {
  setTimeout(() => {
    // Import and call the implementation processor
    import('../../process/route').then((module) => {
      module.POST().catch((err: any) => 
        console.error('Failed to process next task:', err)
      );
    });
  }, 1000); // 1 second delay
}

