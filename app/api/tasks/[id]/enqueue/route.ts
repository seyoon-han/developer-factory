import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * POST /api/tasks/[id]/enqueue
 * 
 * Explicitly add a task to the processing queue.
 * This allows tasks to be created without immediate queue insertion,
 * giving users time to upload documents before processing begins.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Verify task exists
    const task = await statements.getTask.get(taskId) as any;
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if task is already in queue (to avoid duplicates)
    const existingQueueItem = await statements.getQueueItemByTaskId.get(taskId) as any;
    if (existingQueueItem && existingQueueItem.status !== 'completed' && existingQueueItem.status !== 'failed') {
      console.log(`📋 Task #${taskId} is already in queue with status: ${existingQueueItem.status}`);
      return NextResponse.json({
        success: true,
        message: 'Task already in queue',
        alreadyQueued: true,
      });
    }

    // Add task to queue
    await statements.enqueueTask.run(taskId);
    console.log(`✅ Task #${taskId} explicitly enqueued for processing`);

    return NextResponse.json({
      success: true,
      message: 'Task enqueued successfully',
      taskId,
    });
  } catch (error: any) {
    console.error('❌ Error enqueueing task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enqueue task' },
      { status: 500 }
    );
  }
}

