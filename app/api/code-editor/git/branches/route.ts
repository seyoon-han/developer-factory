import { NextResponse } from 'next/server';
import { getActiveProject } from '@/lib/config/workspace';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GET /api/code-editor/git/branches
 * List all branches in active project
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

    // Get all branches
    const { stdout } = await execAsync('git branch -a', { cwd: projectPath });
    
    const branches = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const isCurrent = line.startsWith('*');
        const name = line.replace('*', '').trim();
        const isRemote = name.startsWith('remotes/');
        
        return {
          name: isRemote ? name.replace('remotes/origin/', '') : name,
          current: isCurrent,
          remote: isRemote,
        };
      })
      .filter((branch, index, self) => 
        // Remove duplicates (local + remote with same name)
        self.findIndex(b => b.name === branch.name) === index
      );

    return NextResponse.json({ branches });
  } catch (error: any) {
    console.error('Error listing branches:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list branches' },
      { status: 500 }
    );
  }
}

