import { NextRequest, NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * GET /api/tdd/tasks
 * List all TDD tasks with joined main task info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let tasks;
    if (status) {
      tasks = await statements.getTddTasksByStatus.all(status);
    } else {
      tasks = await statements.getAllTddTasks.all();
    }

    // Join with main tasks table to get title/description
    const tasksWithDetails = await Promise.all((tasks as any[]).map(async (tddTask) => {
      const mainTask = await statements.getTask.get(tddTask.task_id) as any;
      return {
        ...tddTask,
        title: mainTask?.title || `Task #${tddTask.task_id}`,
        description: mainTask?.description || '',
        priority: mainTask?.priority || 'medium'
      };
    }));

    return NextResponse.json({
      success: true,
      tasks: tasksWithDetails,
      count: tasksWithDetails.length
    });
  } catch (error: any) {
    console.error('Error listing TDD tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tdd/tasks
 * Create a new TDD task - either from an existing task or create a new one
 *
 * Option 1: Link to existing task
 *   { task_id: number }
 *
 * Option 2: Create new task and TDD task together
 *   { title: string, description: string, priority?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      task_id,
      title,
      description,
      priority = 'medium',
      tdd_status = 'backlog',
      current_phase = 'spec_elicitation'
    } = body;

    let mainTask: any;
    let taskId: number;

    // Option 1: Link to existing task
    if (task_id) {
      mainTask = await statements.getTask.get(task_id) as any;
      if (!mainTask) {
        return NextResponse.json(
          { success: false, error: `Task #${task_id} not found` },
          { status: 404 }
        );
      }
      taskId = task_id;

      // Check if TDD task already exists for this task
      const existing = await statements.getTddTaskByTaskId.get(task_id);
      if (existing) {
        return NextResponse.json(
          { success: false, error: `TDD task already exists for task #${task_id}` },
          { status: 409 }
        );
      }
    }
    // Option 2: Create new main task first
    else if (title && description) {
      // Get default board ID (TDD board)
      const defaultBoardId = 'tdd-board';

      // Create main task
      const taskResult = await statements.createTask.run(
        title,
        description,
        'todo',
        priority,
        defaultBoardId,
        null, // referenceTaskIds
        null, // workflowIds
        0,    // useContext7 - not needed for TDD
        0     // useConfluence - not needed for TDD
      );

      taskId = taskResult.lastInsertRowid as number;

      // Create prompt record
      await statements.createPrompt.run(taskId, description);

      mainTask = await statements.getTask.get(taskId) as any;
      console.log(`✅ Created main task #${taskId} for TDD workflow`);
    }
    else {
      return NextResponse.json(
        { success: false, error: 'Either task_id or (title and description) is required' },
        { status: 400 }
      );
    }

    // Create TDD task
    const result = await statements.createTddTask.run(taskId, tdd_status, current_phase);
    const tddTask = await statements.getTddTask.get(result.lastInsertRowid);

    console.log(`✅ Created TDD task #${(tddTask as any).id} for main task #${taskId}`);

    return NextResponse.json({
      success: true,
      tddTask: {
        ...tddTask,
        title: mainTask.title,
        description: mainTask.description,
        priority: mainTask.priority
      },
      mainTaskId: taskId
    });
  } catch (error: any) {
    console.error('Error creating TDD task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
