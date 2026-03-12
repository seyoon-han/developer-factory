import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * GET /api/team-rulesets/[id]
 * Get a specific team ruleset
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ruleset = await statements.getTeamRuleset.get(id) as any;

    if (!ruleset) {
      return NextResponse.json(
        { error: 'Ruleset not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedRuleset = {
      ...ruleset,
      resources: ruleset.resources ? JSON.parse(ruleset.resources) : [],
      dependencies: ruleset.dependencies ? JSON.parse(ruleset.dependencies) : [],
      enabled: Boolean(ruleset.enabled),
    };

    return NextResponse.json(parsedRuleset);
  } catch (error: any) {
    console.error('Error fetching team ruleset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team ruleset' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/team-rulesets/[id]
 * Update a team ruleset
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, version, body: rulesetBody, whenApply, resources, dependencies } = body;

    // Check if ruleset exists
    const existing = await statements.getTeamRuleset.get(id) as any;
    if (!existing) {
      return NextResponse.json(
        { error: 'Ruleset not found' },
        { status: 404 }
      );
    }

    // Validation
    if (!name || !rulesetBody) {
      return NextResponse.json(
        { error: 'Name and body are required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Check for duplicate name (excluding current ruleset)
    const duplicate = await statements.getTeamRulesetByName.get(name) as any;
    if (duplicate && duplicate.id !== parseInt(id)) {
      return NextResponse.json(
        { error: 'A ruleset with this name already exists' },
        { status: 409 }
      );
    }

    // Update ruleset
    await statements.updateTeamRuleset.run(
      name,
      description || null,
      version || '1.0.0',
      rulesetBody,
      whenApply || null,
      JSON.stringify(resources || []),
      JSON.stringify(dependencies || []),
      id
    );

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
    console.error('Error updating team ruleset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update team ruleset' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team-rulesets/[id]
 * Delete a team ruleset
 */
export async function DELETE(
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

    // Delete ruleset
    await statements.deleteTeamRuleset.run(id);

    return NextResponse.json({ success: true, message: 'Ruleset deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting team ruleset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete team ruleset' },
      { status: 500 }
    );
  }
}

