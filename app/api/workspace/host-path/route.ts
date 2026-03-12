import { NextResponse } from 'next/server';
import { getActiveProject } from '@/lib/config/workspace';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * GET /api/workspace/host-path
 * Get the absolute path to workspace on host OS
 * Returns the path where users can access files on their local machine
 */
export async function GET() {
  try {
    const activeProject = getActiveProject();
    
    // Determine if running in Docker or locally
    const isDocker = process.env.NODE_ENV === 'production' || fs.existsSync('/.dockerenv');
    
    // Get the workspace base path on host
    let hostBasePath: string;
    
    if (isDocker) {
      // In Docker, workspace is mounted from host
      // The mount point is defined in docker-compose.yml: ./workspace:/app/workspace
      // We need to return the host path where docker-compose.yml is located
      
      // Get from environment variable if set, otherwise use common location
      hostBasePath = process.env.HOST_WORKSPACE_PATH || 
                     process.env.PWD?.replace('/app', '/workspace') ||
                     path.join(os.homedir(), 'dev-automation-board', 'workspace');
    } else {
      // Local development - use actual cwd
      hostBasePath = path.join(process.cwd(), 'workspace');
    }

    // If active project, append project name
    const hostPath = activeProject?.name
      ? path.join(hostBasePath, activeProject.name)
      : hostBasePath;

    // Get OS-specific formatted path
    const platform = os.platform();
    let displayPath = hostPath;
    
    // Convert to platform-specific format
    if (platform === 'win32') {
      // Windows: Convert forward slashes to backslashes
      displayPath = hostPath.replace(/\//g, '\\');
    }

    return NextResponse.json({
      hostPath: displayPath,
      projectName: activeProject?.name || null,
      platform,
      isDocker,
      instructions: getInstructions(displayPath, platform),
    });
  } catch (error: any) {
    console.error('Error getting host path:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get host path' },
      { status: 500 }
    );
  }
}

function getInstructions(path: string, platform: string): string {
  switch (platform) {
    case 'darwin': // macOS
      return `Open in terminal: cd ${path}\nOpen in Finder: open ${path}\nOpen in VS Code: code ${path}`;
    case 'win32': // Windows
      return `Open in Command Prompt: cd ${path}\nOpen in Explorer: explorer ${path}\nOpen in VS Code: code ${path}`;
    case 'linux':
      return `Open in terminal: cd ${path}\nOpen in file manager: xdg-open ${path}\nOpen in VS Code: code ${path}`;
    default:
      return `Path: ${path}`;
  }
}

