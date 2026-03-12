import { NextResponse } from 'next/server';
import { getActiveProject } from '@/lib/config/workspace';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/code-editor/file?path=...
 * Read a file from active project
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    const activeProject = getActiveProject();
    if (!activeProject) {
      return NextResponse.json(
        { error: 'No active project' },
        { status: 404 }
      );
    }

    const fullPath = path.join(activeProject.local_path, filePath);
    
    // Security: Ensure path is within project
    if (!fullPath.startsWith(activeProject.local_path)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);

    return NextResponse.json({
      path: filePath,
      content,
      size: stats.size,
      modified: stats.mtime,
    });
  } catch (error: any) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read file' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/code-editor/file
 * Save a file in active project
 */
export async function POST(request: Request) {
  try {
    const { filePath, content } = await request.json();

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'File path and content are required' },
        { status: 400 }
      );
    }

    const activeProject = getActiveProject();
    if (!activeProject) {
      return NextResponse.json(
        { error: 'No active project' },
        { status: 404 }
      );
    }

    const fullPath = path.join(activeProject.local_path, filePath);
    
    // Security: Ensure path is within project
    if (!fullPath.startsWith(activeProject.local_path)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');

    console.log(`💾 File saved: ${filePath}`);

    return NextResponse.json({
      success: true,
      path: filePath,
      message: 'File saved successfully',
    });
  } catch (error: any) {
    console.error('Error saving file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save file' },
      { status: 500 }
    );
  }
}

