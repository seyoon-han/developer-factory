/**
 * Project Group by ID API
 * GET - Get group details
 * PATCH - Update group
 * DELETE - Delete group
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectGroupService } from '@/lib/agentic/services/projectGroupService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id, 10);

    const group = await projectGroupService.getGroup(groupId);

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      group,
    });
  } catch (error) {
    console.error('Failed to get project group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get project group' },
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
    const groupId = parseInt(id, 10);
    const body = await request.json();

    const { name, description, setDefault } = body;

    if (setDefault) {
      await projectGroupService.setDefaultGroup(groupId);
    }

    if (name) {
      await projectGroupService.updateGroup(groupId, name, description);
    }

    const group = await projectGroupService.getGroup(groupId);

    return NextResponse.json({
      success: true,
      group,
    });
  } catch (error) {
    console.error('Failed to update project group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update project group' },
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
    const groupId = parseInt(id, 10);

    const deleted = await projectGroupService.deleteGroup(groupId);

    return NextResponse.json({
      success: deleted,
    });
  } catch (error) {
    console.error('Failed to delete project group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete project group' },
      { status: 500 }
    );
  }
}
