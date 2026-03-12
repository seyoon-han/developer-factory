import { NextResponse } from 'next/server';
import { workspaceManager } from '@/lib/config/workspace';

/**
 * POST /api/projects/deactivate
 * Deactivate all projects (enter demo mode - work on dev-automation-board itself)
 */
export async function POST() {
  try {
    console.log(`🎭 Deactivating all projects - entering demo mode`);

    await workspaceManager.deactivateAll();

    return NextResponse.json({
      success: true,
      message: 'All projects deactivated - demo mode active',
      demoMode: true,
    });

  } catch (error: any) {
    console.error('Error deactivating projects:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate projects' },
      { status: 500 }
    );
  }
}


