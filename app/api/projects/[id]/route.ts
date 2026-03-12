import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { gitManager } from '@/lib/projects/git';
import fs from 'fs';

/**
 * GET /api/projects/[id]
 * Get a specific project
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await statements.getProject.get(id) as any;

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...project,
      is_active: Boolean(project.is_active),
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project and its local directory
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await statements.getProject.get(id) as any;

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting active project
    if (project.is_active) {
      return NextResponse.json(
        { error: 'Cannot delete active project. Deactivate it first.' },
        { status: 400 }
      );
    }

    console.log(`🗑️  Deleting project: ${project.name}`);

    // Delete local directory if it exists
    if (fs.existsSync(project.local_path)) {
      try {
        fs.rmSync(project.local_path, { recursive: true, force: true });
        console.log(`   ✅ Deleted local directory: ${project.local_path}`);
      } catch (error: any) {
        console.error(`   ⚠️  Failed to delete directory: ${error.message}`);
      }
    }

    // Delete from database
    await statements.deleteProject.run(id);
    console.log(`   ✅ Deleted from database`);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}


