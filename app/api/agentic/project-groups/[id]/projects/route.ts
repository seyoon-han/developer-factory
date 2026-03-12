/**
 * Project Group Members API
 * GET - Get projects in group
 * POST - Add project to group
 * DELETE - Remove project from group
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

    const members = await projectGroupService.getGroupMembers(groupId);

    return NextResponse.json({
      success: true,
      projects: members,
    });
  } catch (error) {
    console.error('Failed to get group projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get group projects' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id, 10);
    const body = await request.json();

    const { projectId, isPrimary } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const member = await projectGroupService.addProjectToGroup(
      groupId,
      projectId,
      isPrimary
    );

    return NextResponse.json({
      success: true,
      member,
    });
  } catch (error) {
    console.error('Failed to add project to group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add project to group' },
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
    const body = await request.json();

    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const removed = await projectGroupService.removeProjectFromGroup(groupId, projectId);

    return NextResponse.json({
      success: removed,
    });
  } catch (error) {
    console.error('Failed to remove project from group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove project from group' },
      { status: 500 }
    );
  }
}
