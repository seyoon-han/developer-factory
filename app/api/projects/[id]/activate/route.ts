import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { workspaceManager } from '@/lib/config/workspace';

/**
 * POST /api/projects/[id]/activate
 * Set a project as the active work target
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Validate project exists and is ready
    const project = await statements.getProject.get(projectId) as any;
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.clone_status !== 'ready') {
      return NextResponse.json(
        { error: `Project is not ready: ${project.clone_status}` },
        { status: 400 }
      );
    }

    console.log(`🎯 Setting active project to: ${project.name}`);

    // Use workspace manager to handle activation
    await workspaceManager.setActiveProject(projectId);

    return NextResponse.json({
      success: true,
      message: `Project "${project.name}" is now active`,
      projectId,
      projectName: project.name,
      projectPath: project.local_path,
    });

  } catch (error: any) {
    console.error('Error activating project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to activate project' },
      { status: 500 }
    );
  }
}


