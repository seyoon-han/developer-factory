import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// POST /api/labels/[id]/tasks - Add label to task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId is required' },
        { status: 400 }
      );
    }

    // Check if label exists
    const label = await statements.getLabel.get(resolvedParams.id);
    if (!label) {
      return NextResponse.json(
        { success: false, error: 'Label not found' },
        { status: 404 }
      );
    }

    // Check if task exists
    const task = await statements.getTask.get(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    await statements.addTaskLabel.run(parseInt(taskId), resolvedParams.id);

    return NextResponse.json({
      success: true,
      message: 'Label added to task successfully',
    });
  } catch (error: any) {
    console.error('Error adding label to task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/labels/[id]/tasks?taskId=X - Remove label from task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId query parameter is required' },
        { status: 400 }
      );
    }

    await statements.removeTaskLabel.run(parseInt(taskId), resolvedParams.id);

    return NextResponse.json({
      success: true,
      message: 'Label removed from task successfully',
    });
  } catch (error: any) {
    console.error('Error removing label from task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
