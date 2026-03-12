import { NextRequest, NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tdd/tasks/[id]
 * Get TDD task details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tddTask = await statements.getTddTask.get(parseInt(id)) as any;

    if (!tddTask) {
      return NextResponse.json(
        { success: false, error: 'TDD task not found' },
        { status: 404 }
      );
    }

    // Get main task
    const mainTask = await statements.getTask.get(tddTask.task_id) as any;

    // Get clarifications
    const clarifications = await statements.getTddClarifications.all(tddTask.id);

    // Get execution logs
    const logs = await statements.getTddExecutionLogs.all(tddTask.id);

    // Get test results
    const testResults = await statements.getTddTestResults.all(tddTask.id);

    return NextResponse.json({
      success: true,
      task: {
        ...tddTask,
        title: mainTask?.title,
        description: mainTask?.description,
        priority: mainTask?.priority
      },
      clarifications,
      logs,
      testResults
    });
  } catch (error: any) {
    console.error('Error getting TDD task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tdd/tasks/[id]
 * Update TDD task
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tdd_status, current_phase, specification, acceptance_criteria, test_code, implementation_code } = body;

    const tddTask = await statements.getTddTask.get(parseInt(id)) as any;
    if (!tddTask) {
      return NextResponse.json(
        { success: false, error: 'TDD task not found' },
        { status: 404 }
      );
    }

    // Update status if provided
    if (tdd_status || current_phase) {
      await statements.updateTddTaskStatus.run(
        tdd_status || tddTask.tdd_status,
        current_phase || tddTask.current_phase,
        tddTask.id
      );
    }

    // Update specification if provided
    if (specification !== undefined || acceptance_criteria !== undefined) {
      await statements.updateTddTaskSpecification.run(
        specification ?? tddTask.specification,
        acceptance_criteria ?? tddTask.acceptance_criteria,
        tddTask.id
      );
    }

    // Update test code if provided
    if (test_code !== undefined) {
      await statements.updateTddTaskTestCode.run(test_code, tddTask.id);
    }

    // Update implementation if provided
    if (implementation_code !== undefined) {
      await statements.updateTddTaskImplementation.run(implementation_code, tddTask.id);
    }

    // Get updated task
    const updated = await statements.getTddTask.get(tddTask.id);
    const mainTask = await statements.getTask.get(tddTask.task_id) as any;

    return NextResponse.json({
      success: true,
      task: {
        ...updated,
        title: mainTask?.title,
        description: mainTask?.description,
        priority: mainTask?.priority
      }
    });
  } catch (error: any) {
    console.error('Error updating TDD task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tdd/tasks/[id]
 * Delete TDD task
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tddTask = await statements.getTddTask.get(parseInt(id));

    if (!tddTask) {
      return NextResponse.json(
        { success: false, error: 'TDD task not found' },
        { status: 404 }
      );
    }

    await statements.deleteTddTask.run(parseInt(id));

    return NextResponse.json({
      success: true,
      message: `TDD task #${id} deleted`
    });
  } catch (error: any) {
    console.error('Error deleting TDD task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
