import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * GET /api/settings/github-token
 * Get GitHub token status (masked)
 */
export async function GET() {
  try {
    const settings = await statements.getAppSettings.get() as any;
    const hasToken = Boolean(settings?.github_token);
    
    return NextResponse.json({
      configured: hasToken,
      masked: hasToken ? '••••••••' + settings.github_token.slice(-4) : null,
    });
  } catch (error: any) {
    console.error('Error fetching GitHub token status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GitHub token status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/github-token
 * Update GitHub Personal Access Token
 */
export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'GitHub token is required and must be a string' },
        { status: 400 }
      );
    }

    // Basic validation - GitHub tokens start with 'ghp_' (classic) or 'github_pat_' (fine-grained)
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      return NextResponse.json(
        { error: 'Invalid GitHub token format. Tokens start with "ghp_" or "github_pat_"' },
        { status: 400 }
      );
    }

    // Update in database
    await statements.updateGitHubToken.run(token);
    
    console.log(`🔑 GitHub token updated (ends with: ...${token.slice(-4)})`);
    
    return NextResponse.json({
      success: true,
      message: 'GitHub token updated successfully',
      masked: '••••••••' + token.slice(-4),
    });
  } catch (error: any) {
    console.error('Error updating GitHub token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update GitHub token' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/github-token
 * Remove GitHub token
 */
export async function DELETE() {
  try {
    await statements.updateGitHubToken.run(null);
    
    return NextResponse.json({
      success: true,
      message: 'GitHub token removed',
    });
  } catch (error: any) {
    console.error('Error removing GitHub token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove GitHub token' },
      { status: 500 }
    );
  }
}

