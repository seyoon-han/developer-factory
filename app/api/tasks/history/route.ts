import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// Helper to transform task with implementation data
async function transformTaskWithReport(task: any) {
  const prompt = await statements.getPrompt.get(task.id) as any;
  const impl = await statements.getImplementation.get(task.id) as any;

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
    impl_status: impl?.status,
    impl_elapsed: impl?.elapsed_seconds || 0,
    report_status: impl?.report_status || 'pending',
    has_report: !!impl?.implementation_report,
    implementation_report: impl?.implementation_report,
  };
}

export async function GET() {
  try {
    const rawTasks = await statements.getAllTasks.all();
    const tasks = await Promise.all(rawTasks.map(transformTaskWithReport));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching task history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task history' },
      { status: 500 }
    );
  }
}

