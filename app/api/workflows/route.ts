/**
 * Workflows API Routes - CRUD Operations
 * GET /api/workflows - List all workflows
 * POST /api/workflows - Create new workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowsDb } from '@/lib/db/workflows';
import { workflowStorage } from '@/lib/workflows/storage';
import type { CreateWorkflowRequest, CreateWorkflowResponse, ListWorkflowsResponse } from '@/types/workflow';

/**
 * GET /api/workflows
 * List all workflows
 */
export async function GET() {
  try {
    const workflows = workflowsDb.getAll();

    const response: ListWorkflowsResponse = {
      success: true,
      workflows, // Already sorted by created_at DESC
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching workflows:', error);

    const response: ListWorkflowsResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch workflows',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/workflows
 * Create new workflow
 */
export async function POST(request: NextRequest) {
  try {
    const data: CreateWorkflowRequest = await request.json();

    // Validate required fields
    if (!data.name || !data.yamlDefinition || !data.commandFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, yamlDefinition, commandFile',
        } as CreateWorkflowResponse,
        { status: 400 }
      );
    }

    // Validate workflow name (kebab-case only)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.name)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid workflow name: must be kebab-case (e.g., my-workflow-name)',
        } as CreateWorkflowResponse,
        { status: 400 }
      );
    }

    // Check if workflow already exists
    const exists = await workflowStorage.workflowExists(data.name);
    if (exists) {
      return NextResponse.json(
        {
          success: false,
          error: `Workflow "${data.name}" already exists`,
        } as CreateWorkflowResponse,
        { status: 409 }
      );
    }

    // Create workflow record
    const workflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      nlInput: data.nlInput,
      framework: data.framework || 'bmad',
      yamlDefinition: data.yamlDefinition,
      commandFile: data.commandFile,
      category: data.category || 'custom',
      status: 'draft' as const,
      version: 1,
      tags: data.tags || [],
      icon: data.icon || 'Workflow',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save to SQLite database
    workflowsDb.create(workflow);

    // Write files to disk (framework-aware)
    const { commandPath, workflowPath } = await workflowStorage.saveWorkflow(
      workflow.name,
      workflow.commandFile,
      workflow.yamlDefinition,
      workflow.framework
    );

    const response: CreateWorkflowResponse = {
      success: true,
      workflowId: workflow.id,
      claudeCommand: `/${workflow.name}`,
      files: {
        command: commandPath,
        workflow: workflowPath,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);

    const response: CreateWorkflowResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create workflow',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

