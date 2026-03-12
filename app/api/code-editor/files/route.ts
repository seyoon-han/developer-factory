import { NextResponse } from 'next/server';
import { getActiveProject } from '@/lib/config/workspace';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/code-editor/files
 * List files in active project for code editor
 */
export async function GET() {
  try {
    const activeProject = getActiveProject();
    
    if (!activeProject || !activeProject.local_path) {
      return NextResponse.json({
        files: [],
        message: 'No active project. Clone and activate a project first.',
      });
    }

    const projectPath = activeProject.local_path;
    const files = await scanDirectory(projectPath, projectPath);

    return NextResponse.json({
      projectName: activeProject.name,
      projectPath,
      files,
    });
  } catch (error: any) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}

/**
 * Recursively scan directory and return file tree
 */
async function scanDirectory(dirPath: string, basePath: string, depth: number = 0): Promise<any[]> {
  if (depth > 5) return []; // Limit recursion depth

  const items = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  // Ignore patterns
  const ignorePatterns = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.turbo',
    'coverage',
  ];

  for (const entry of entries) {
    // Skip ignored directories
    if (ignorePatterns.includes(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);

    if (entry.isDirectory()) {
      const children = await scanDirectory(fullPath, basePath, depth + 1);
      items.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        children,
      });
    } else {
      const stats = await fs.stat(fullPath);
      items.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
        size: stats.size,
      });
    }
  }

  return items.sort((a, b) => {
    // Directories first, then files, alphabetically
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

