import { NextResponse } from 'next/server';
import { getActiveProject } from '@/lib/config/workspace';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/code-editor/terminal/execute
 * Execute a command in the active project directory
 */
export async function POST(request: Request) {
  try {
    const { command } = await request.json();

    if (!command || !command.trim()) {
      return NextResponse.json(
        { error: 'Command is required' },
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

    console.log(`🖥️  Executing: ${command} in ${projectPath}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        timeout: 60000, // 60 second timeout
        maxBuffer: 1024 * 1024 * 5, // 5MB max output
      });

      const output = stdout + (stderr ? `\n${stderr}` : '');

      return NextResponse.json({
        output,
        exitCode: 0,
        success: true,
      });
    } catch (error: any) {
      // Command failed, but that's okay - return the output
      return NextResponse.json({
        output: error.stdout + error.stderr,
        exitCode: error.code || 1,
        success: false,
      });
    }
  } catch (error: any) {
    console.error('Error executing command:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute command' },
      { status: 500 }
    );
  }
}

