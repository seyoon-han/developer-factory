import { NextResponse } from 'next/server';
import { getActiveProject } from '@/lib/config/workspace';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/code-editor/git/checkout
 * Switch branch or create new branch
 */
export async function POST(request: Request) {
  try {
    const { branch, create } = await request.json();

    if (!branch || !branch.trim()) {
      return NextResponse.json(
        { error: 'Branch name is required' },
        { status: 400 }
      );
    }

    const activeProject = getActiveProject();
    
    if (!activeProject || !activeProject.local_path) {
      return NextResponse.json(
        { error: 'No active project' },
        { status: 404 }
      );
    }

    const projectPath = activeProject.local_path;

    if (create) {
      // Create and switch to new branch
      await execAsync(`git checkout -b "${branch}"`, { cwd: projectPath });
      console.log(`✅ Created and switched to branch: ${branch}`);
    } else {
      // Switch to existing branch
      await execAsync(`git checkout "${branch}"`, { cwd: projectPath });
      console.log(`✅ Switched to branch: ${branch}`);
    }

    return NextResponse.json({
      success: true,
      branch,
      message: `Switched to branch: ${branch}`,
    });
  } catch (error: any) {
    console.error('Error checking out branch:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to checkout branch' },
      { status: 500 }
    );
  }
}

