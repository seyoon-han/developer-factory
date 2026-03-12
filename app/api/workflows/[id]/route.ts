/**
 * Individual Workflow API Routes
 * GET /api/workflows/[id] - Get workflow details
 * PUT /api/workflows/[id] - Update workflow
 * DELETE /api/workflows/[id] - Delete workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowsDb } from '@/lib/db/workflows';
import { workflowStorage } from '@/lib/workflows/storage';

/**
 * GET /api/workflows/[id]
 * Get workflow details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflow = workflowsDb.getById(params.id);

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workflow',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workflows/[id]
 * Update workflow
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();

    // Get existing workflow
    const existing = workflowsDb.getById(params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Update workflow in SQLite
    const updated = workflowsDb.update(params.id, updates);
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update workflow' },
        { status: 500 }
      );
    }

    // Update files if content changed
    if (updates.commandFile || updates.yamlDefinition) {
      await workflowStorage.saveWorkflow(
        updated.name,
        updates.commandFile || existing.commandFile,
        updates.yamlDefinition || existing.yamlDefinition
      );
    }

    return NextResponse.json({
      success: true,
      workflow: updated,
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update workflow',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/[id]
 * Delete workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get workflow to delete files
    const workflow = workflowsDb.getById(params.id);

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Delete from SQLite database (cascades to executions via foreign key)
    const deleted = workflowsDb.delete(params.id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete workflow' },
        { status: 500 }
      );
    }

    // Delete files
    await workflowStorage.deleteWorkflow(workflow.name);

    return NextResponse.json({
      success: true,
      message: `Workflow "${workflow.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete workflow',
      },
      { status: 500 }
    );
  }
}

