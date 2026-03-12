/**
 * Agentic Task by ID API
 * GET - Get task details
 * PATCH - Update task
 * DELETE - Delete task
 */

import { NextRequest, NextResponse } from 'next/server';
import { agenticTaskService } from '@/lib/agentic/services/taskService';
import { clarificationService } from '@/lib/agentic/services/clarificationService';
import { planService } from '@/lib/agentic/services/planService';
import { agenticLogsStore } from '@/lib/agentic/logs/agenticLogsStore';
import { worktreeManager } from '@/lib/agentic/git/worktreeManager';
import { prCoordinator } from '@/lib/agentic/git/prCoordinator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    const task = await agenticTaskService.getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get related data
    const clarifications = await clarificationService.getClarificationsForTask(taskId);
    const plan = await planService.getPlanForTask(taskId);
    const logs = agenticLogsStore.getRecentLogs(taskId, 50);
    const worktrees = await worktreeManager.getWorktreesForTask(taskId);
    const pullRequests = await prCoordinator.getPRsForTask(taskId);

    return NextResponse.json({
      success: true,
      task,
      clarifications,
      plan,
      logs,
      worktrees,
      pullRequests,
    });
  } catch (error) {
    console.error('Failed to get agentic task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get task' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    const body = await request.json();

    if (body.status || body.phase) {
      const task = await agenticTaskService.updateTaskStatus(
        taskId,
        body.status,
        body.phase
      );
      return NextResponse.json({ success: true, task });
    }

    // For other updates, just return the current task for now
    // TODO: Add full update support
    const task = await agenticTaskService.getTask(taskId);
    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Failed to update agentic task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);

    // Clean up related resources
    await worktreeManager.removeWorktreesForTask(taskId);
    await agenticTaskService.deleteTask(taskId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agentic task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
