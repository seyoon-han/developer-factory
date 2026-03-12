import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { gitManager } from '@/lib/projects/git';

/**
 * POST /api/projects/[id]/sync
 * Pull latest changes from remote repository
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

    const project = await statements.getProject.get(projectId) as any;
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.clone_status !== 'ready') {
      return NextResponse.json(
        { error: 'Project is not ready for sync' },
        { status: 400 }
      );
    }

    console.log(`🔄 Syncing project: ${project.name}`);

    // Pull latest changes
    await gitManager.pullLatest(project.local_path);

    // Get new commit hash
    const newCommit = await gitManager.getCurrentCommit(project.local_path);

    // Update in database
    await statements.updateProjectGitInfo.run(newCommit, projectId);

    console.log(`✅ Project synced: ${newCommit.substring(0, 7)}`);

    return NextResponse.json({
      success: true,
      message: 'Project synced successfully',
      commit: newCommit,
    });

  } catch (error: any) {
    console.error('Error syncing project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync project' },
      { status: 500 }
    );
  }
}


