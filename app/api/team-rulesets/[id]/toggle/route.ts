import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * POST /api/team-rulesets/[id]/toggle
 * Toggle enabled status of a team ruleset
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if ruleset exists
    const existing = await statements.getTeamRuleset.get(id) as any;
    if (!existing) {
      return NextResponse.json(
        { error: 'Ruleset not found' },
        { status: 404 }
      );
    }

    // Toggle enabled status
    await statements.toggleTeamRuleset.run(id);

    const updatedRuleset = await statements.getTeamRuleset.get(id) as any;
    
    // Parse JSON fields
    const parsedRuleset = {
      ...updatedRuleset,
      resources: updatedRuleset.resources ? JSON.parse(updatedRuleset.resources) : [],
      dependencies: updatedRuleset.dependencies ? JSON.parse(updatedRuleset.dependencies) : [],
      enabled: Boolean(updatedRuleset.enabled),
    };

    return NextResponse.json(parsedRuleset);
  } catch (error: any) {
    console.error('Error toggling team ruleset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle team ruleset' },
      { status: 500 }
    );
  }
}

