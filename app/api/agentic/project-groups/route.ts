/**
 * Project Groups API
 * GET - List all project groups
 * POST - Create a new project group
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectGroupService } from '@/lib/agentic/services/projectGroupService';

export async function GET() {
  try {
    const groups = await projectGroupService.getAllGroups();

    return NextResponse.json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error('Failed to get project groups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get project groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, isDefault } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const group = await projectGroupService.createGroup(name, description, isDefault);

    return NextResponse.json({
      success: true,
      group,
    });
  } catch (error) {
    console.error('Failed to create project group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project group' },
      { status: 500 }
    );
  }
}
