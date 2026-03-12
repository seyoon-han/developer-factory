import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * GET /api/settings/demo-mode
 * Get current demo mode setting
 */
export async function GET() {
  try {
    const settings = await statements.getAppSettings.get() as any;
    
    return NextResponse.json({
      demoMode: Boolean(settings?.demo_mode || 0),
    });
  } catch (error: any) {
    console.error('Error fetching demo mode:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch demo mode' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/demo-mode
 * Toggle demo mode
 */
export async function POST(request: Request) {
  try {
    const { enabled } = await request.json();
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    await statements.updateDemoMode.run(enabled ? 1 : 0);
    
    console.log(`🎭 Demo mode ${enabled ? 'enabled' : 'disabled'}`);
    
    return NextResponse.json({
      success: true,
      demoMode: enabled,
      message: `Demo mode ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error: any) {
    console.error('Error updating demo mode:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update demo mode' },
      { status: 500 }
    );
  }
}

