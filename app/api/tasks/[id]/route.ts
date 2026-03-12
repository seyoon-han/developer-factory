import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// Helper to transform SQLite snake_case to camelCase
function transformTask(task: any) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    boardId: task.board_id,
    assignee: task.assignee,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    labels: [],  // Will be populated later if needed
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawTask = await statements.getTask.get(id);

    if (!rawTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = transformTask(rawTask);
    const prompt = await statements.getPrompt.get(id);
    const implementation = await statements.getImplementation.get(id);

    return NextResponse.json({ task, prompt, implementation });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    
    console.log(`📝 Updating task #${id} with:`, updates);

    if (updates.status) {
      await statements.updateTaskStatus.run(updates.status, id);

      // If status changed to "verifying", enqueue the task for processing
      if (updates.status === 'verifying') {
        await statements.enqueueTask.run(id);
        console.log(`✨ Prompt enhancement initiated for task #${id}`);
      }
    }

    const rawTask = await statements.getTask.get(id);
    const task = transformTask(rawTask);

    console.log(`✅ Task #${id} updated successfully. New status: ${task.status}`);

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Get task to check status
    const task = await statements.getTask.get(taskId) as any;
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    console.log(`🗑️  Deleting task #${taskId}: ${task.title} (status: ${task.status})`);

    // Cancel any pending enhancement queue items
    if (task.status === 'verifying') {
      await statements.cancelQueueItemsForTask.run(taskId);
      console.log(`❌ Cancelled enhancement queue for task #${taskId}`);
    }

    // Delete the task (CASCADE will handle related records)
    await statements.deleteTask.run(taskId);

    console.log(`✅ Task #${taskId} deleted successfully`);

    return NextResponse.json({ 
      success: true, 
      message: `Task #${taskId} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
