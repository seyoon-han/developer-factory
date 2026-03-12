/**
 * Agentic Tasks API
 * GET - List all agentic tasks
 * POST - Create a new agentic task
 */

import { NextRequest, NextResponse } from 'next/server';
import { agenticTaskService } from '@/lib/agentic/services/taskService';
import { TaskCreationData } from '@/types/agentic-task';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const phase = searchParams.get('phase');
    const projectGroupId = searchParams.get('projectGroupId');

    let tasks;

    if (status) {
      tasks = await agenticTaskService.getTasksByStatus(status as any);
    } else if (phase) {
      tasks = await agenticTaskService.getTasksByPhase(phase as any);
    } else if (projectGroupId) {
      tasks = await agenticTaskService.getTasksByProjectGroup(parseInt(projectGroupId, 10));
    } else {
      tasks = await agenticTaskService.getAllTasks();
    }

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('Failed to get agentic tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const taskData: TaskCreationData = {
      title: body.title,
      description: body.description || '',
      priority: body.priority || 'medium',
      projectGroupId: body.projectGroupId,
      autoAdvance: body.autoAdvance ?? true,
      errorHandling: body.errorHandling || 'smart_recovery',
      executionStrategy: body.executionStrategy || 'subagent_per_step',
      codeReviewPoint: body.codeReviewPoint || 'before_verification',
      mcpServersConfig: body.mcpServersConfig || [],
      verificationCommands: body.verificationCommands || [],
      referenceTaskIds: body.referenceTaskIds || [],
      globalDocumentIds: body.globalDocumentIds || [],
      referenceTaskDocIds: body.referenceTaskDocIds || [],
      uploadedFiles: [], // Files are handled separately via multipart form
    };

    const task = await agenticTaskService.createTask(taskData);

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Failed to create agentic task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
