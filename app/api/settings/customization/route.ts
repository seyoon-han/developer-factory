import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * GET /api/settings/customization
 * Returns the current customization values from the database
 */
export async function GET() {
  try {
    const settings = await statements.getAppSettings.get() as any;
    
    return NextResponse.json({
      boardName: settings?.board_name || 'Dev Automation Board',
      sidebarTitle: settings?.sidebar_title || 'Factory',
    });
  } catch (error) {
    console.error('Error getting customization settings:', error);
    return NextResponse.json(
      { error: 'Failed to get customization settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/customization
 * Validates and saves the customization settings to the database
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boardName, sidebarTitle } = body;

    // Validate board name
    if (!boardName || typeof boardName !== 'string') {
      return NextResponse.json(
        { error: 'Board name is required and must be a string' },
        { status: 400 }
      );
    }

    if (boardName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Board name cannot be empty' },
        { status: 400 }
      );
    }

    if (boardName.length > 100) {
      return NextResponse.json(
        { error: 'Board name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Validate sidebar title
    if (!sidebarTitle || typeof sidebarTitle !== 'string') {
      return NextResponse.json(
        { error: 'Sidebar title is required and must be a string' },
        { status: 400 }
      );
    }

    if (sidebarTitle.trim().length === 0) {
      return NextResponse.json(
        { error: 'Sidebar title cannot be empty' },
        { status: 400 }
      );
    }

    if (sidebarTitle.length > 50) {
      return NextResponse.json(
        { error: 'Sidebar title must be 50 characters or less' },
        { status: 400 }
      );
    }

    // Validate character content (basic sanitization)
    const allowedCharsRegex = /^[a-zA-Z0-9\s\-_.(),&]+$/;

    if (!allowedCharsRegex.test(boardName)) {
      return NextResponse.json(
        { error: 'Board name contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, periods, parentheses, commas, and ampersands are allowed.' },
        { status: 400 }
      );
    }

    if (!allowedCharsRegex.test(sidebarTitle)) {
      return NextResponse.json(
        { error: 'Sidebar title contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, periods, parentheses, commas, and ampersands are allowed.' },
        { status: 400 }
      );
    }

    // Save to database
    await statements.updateCustomization.run(boardName.trim(), sidebarTitle.trim());

    console.log(`✅ Customization settings saved - Board: "${boardName}", Sidebar: "${sidebarTitle}"`);

    return NextResponse.json({
      success: true,
      boardName: boardName.trim(),
      sidebarTitle: sidebarTitle.trim(),
      message: 'Customization settings saved successfully',
    });
  } catch (error) {
    console.error('Error saving customization settings:', error);
    return NextResponse.json(
      { error: 'Failed to save customization settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/customization
 * Alias for POST - validates and saves the customization settings to the database
 */
export async function PUT(request: Request) {
  return POST(request);
}
