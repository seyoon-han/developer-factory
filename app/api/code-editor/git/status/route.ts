import { NextResponse } from 'next/server';
import { getActiveProject } from '@/lib/config/workspace';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GET /api/code-editor/git/status
 * Get git status for active project
 */
export async function GET() {
  try {
    const activeProject = getActiveProject();
    
    if (!activeProject || !activeProject.local_path) {
      return NextResponse.json(
        { error: 'No active project' },
        { status: 404 }
      );
    }

    const projectPath = activeProject.local_path;

    // Get current branch
    const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath });
    const branch = branchOutput.trim();

    // Get status
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: projectPath });
    
    // Parse status output
    const changes = statusOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const status = line.substring(0, 2);
        const path = line.substring(3);
        
        return {
          path,
          status: status.trim(),
          staged: status[0] !== ' ' && status[0] !== '?',
          modified: status.includes('M'),
          added: status.includes('A'),
          deleted: status.includes('D'),
          untracked: status.includes('?'),
        };
      });

    // Get ahead/behind info
    let ahead = 0, behind = 0;
    try {
      const { stdout } = await execAsync('git rev-list --left-right --count HEAD...@{upstream}', { cwd: projectPath });
      const [aheadStr, behindStr] = stdout.trim().split('\t');
      ahead = parseInt(aheadStr) || 0;
      behind = parseInt(behindStr) || 0;
    } catch (error) {
      // No upstream or other issue
    }

    return NextResponse.json({
      branch,
      changes,
      ahead,
      behind,
      hasChanges: changes.length > 0,
    });
  } catch (error: any) {
    console.error('Error getting git status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get git status' },
      { status: 500 }
    );
  }
}

