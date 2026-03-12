import { NextRequest, NextResponse } from 'next/server';
import { esmlService } from '@/lib/tdd/esml/skillsManager';

/**
 * POST /api/tdd/skills/sync
 * Sync skills from repository/manifest into database
 */
export async function POST(request: NextRequest) {
  try {
    await esmlService.initialize();

    // Check if we have a manifest
    const manifest = await esmlService.getManifest();

    let result;
    if (manifest) {
      // Sync from manifest (preferred - already parsed)
      console.log('Syncing skills from manifest...');
      result = await esmlService.syncFromManifest();
    } else {
      // Sync directly from repository
      console.log('Syncing skills from repository...');
      result = await esmlService.syncFromRepository();
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Skills synced successfully',
        result
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Sync completed with errors',
          result
        },
        { status: 207 } // Multi-Status
      );
    }
  } catch (error: any) {
    console.error('Error syncing skills:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
