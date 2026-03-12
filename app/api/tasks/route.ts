import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// Helper to transform SQLite snake_case to camelCase and include prompt/impl status
async function transformTask(task: any) {
  // Get prompt status
  const prompt = await statements.getPrompt.get(task.id) as any;

  // Get implementation status
  const impl = await statements.getImplementation.get(task.id) as any;

  // Parse workflow IDs from JSON string
  let workflowIds: string[] = [];
  if (task.workflow_ids) {
    try {
      workflowIds = JSON.parse(task.workflow_ids);
    } catch (error) {
      console.error('Error parsing workflow_ids:', error);
    }
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    boardId: task.board_id,
    assignee: task.assignee,
    workflowIds: workflowIds.length > 0 ? workflowIds : undefined,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    labels: [], // Will be populated later if needed
    // Add prompt and implementation status
    prompt_status: prompt?.status,
    prompt_approved: prompt?.approved === 1,
    prompt_refining: prompt?.refinement_status === 'refining',
    impl_status: impl?.status,
    impl_elapsed: impl?.elapsed_seconds || 0,
    impl_refinement_status: impl?.refinement_status || 'idle',
    impl_refinement_round: impl?.refinement_round || 1,
    report_status: impl?.report_status || 'pending',
    has_report: !!impl?.implementation_report,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    const rawTasks = boardId
      ? await statements.getTasksByBoard.all(boardId)
      : await statements.getAllTasks.all();

    const tasks = await Promise.all(rawTasks.map(transformTask));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, boardId, priority = 'medium', referenceTaskIds, workflowIds, useContext7 = true, useConfluence = true, skipQueue = false } = await request.json();

    if (!title || !boardId) {
      return NextResponse.json(
        { error: 'Title and boardId are required' },
        { status: 400 }
      );
    }

    // Store reference task IDs as JSON string
    const referenceTaskIdsJson = referenceTaskIds && referenceTaskIds.length > 0
      ? JSON.stringify(referenceTaskIds)
      : null;

    // Store workflow IDs as JSON string
    const workflowIdsJson = workflowIds && workflowIds.length > 0
      ? JSON.stringify(workflowIds)
      : null;

    const result = await statements.createTask.run(
      title,
      description || '',
      'todo',
      priority,
      boardId,
      referenceTaskIdsJson,
      workflowIdsJson,
      useContext7 ? 1 : 0,
      useConfluence ? 1 : 0
    );

    const taskId = result.lastInsertRowid;

    // Add to queue for processing (unless explicitly skipped)
    if (!skipQueue) {
      await statements.enqueueTask.run(taskId);
      console.log(`✅ Task #${taskId} created and enqueued for processing`);
    } else {
      console.log(`✅ Task #${taskId} created (queue skipped - will be enqueued manually)`);
    }

    // Create prompt record
    await statements.createPrompt.run(taskId, description || title);

    const rawTask = await statements.getTask.get(taskId);
    const task = await transformTask(rawTask);

    return NextResponse.json({ task, id: taskId }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
