import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * GET /api/projects
 * Get all projects with active project highlighted
 */
export async function GET() {
  try {
    const projects = await statements.getAllProjects.all() as any[];
    const activeProject = await statements.getActiveProject.get() as any;
    
    // Add status indicators
    const enrichedProjects = projects.map(p => ({
      ...p,
      is_active: Boolean(p.is_active),
      isReady: p.clone_status === 'ready',
    }));

    return NextResponse.json({
      projects: enrichedProjects,
      activeProjectId: activeProject?.id || null,
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}


