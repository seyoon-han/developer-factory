import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

/**
 * GET /api/team-rulesets
 * Get all team rulesets
 */
export async function GET() {
  try {
    const rulesets = await statements.getAllTeamRulesets.all() as any[];
    
    // Parse JSON fields
    const parsedRulesets = rulesets.map(ruleset => ({
      ...ruleset,
      resources: ruleset.resources ? JSON.parse(ruleset.resources) : [],
      dependencies: ruleset.dependencies ? JSON.parse(ruleset.dependencies) : [],
      enabled: Boolean(ruleset.enabled),
    }));

    return NextResponse.json(parsedRulesets);
  } catch (error: any) {
    console.error('Error fetching team rulesets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team rulesets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team-rulesets
 * Create a new team ruleset
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, version, body: rulesetBody, whenApply, resources, dependencies } = body;

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

    // Check for duplicate name
    const existing = await statements.getTeamRulesetByName.get(name) as any;
    if (existing) {
      return NextResponse.json(
        { error: 'A ruleset with this name already exists' },
        { status: 409 }
      );
    }

    // Insert new ruleset
    const result = await statements.createTeamRuleset.run(
      name,
      description || null,
      version || '1.0.0',
      rulesetBody,
      whenApply || null,
      JSON.stringify(resources || []),
      JSON.stringify(dependencies || [])
    );

    const newRuleset = await statements.getTeamRuleset.get(result.lastInsertRowid) as any;
    
    // Parse JSON fields
    const parsedRuleset = {
      ...newRuleset,
      resources: newRuleset.resources ? JSON.parse(newRuleset.resources) : [],
      dependencies: newRuleset.dependencies ? JSON.parse(newRuleset.dependencies) : [],
      enabled: Boolean(newRuleset.enabled),
    };

    return NextResponse.json(parsedRuleset, { status: 201 });
  } catch (error: any) {
    console.error('Error creating team ruleset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create team ruleset' },
      { status: 500 }
    );
  }
}

