import { NextResponse } from 'next/server';
import { getActiveProject } from '@/lib/config/workspace';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/code-editor/git/commit
 * Commit changes in active project
 */
export async function POST(request: Request) {
  try {
    const { message, files } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Commit message is required' },
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

    // Stage files (or all if not specified)
    if (files && files.length > 0) {
      for (const file of files) {
        await execAsync(`git add "${file}"`, { cwd: projectPath });
      }
    } else {
      await execAsync('git add -A', { cwd: projectPath });
    }

    // Commit
    const sanitizedMessage = message.replace(/"/g, '\\"');
    await execAsync(`git commit -m "${sanitizedMessage}"`, { cwd: projectPath });

    // Get commit hash
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: projectPath });
    const commitHash = stdout.trim();

    console.log(`✅ Committed: ${commitHash.substring(0, 7)} - ${message}`);

    return NextResponse.json({
      success: true,
      commitHash,
      message: 'Changes committed successfully',
    });
  } catch (error: any) {
    console.error('Error committing changes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to commit changes' },
      { status: 500 }
    );
  }
}

