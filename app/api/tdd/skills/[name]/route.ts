import { NextRequest, NextResponse } from 'next/server';
import { esmlService } from '@/lib/tdd/esml/skillsManager';

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/tdd/skills/[name]
 * Get a specific skill by name
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    await esmlService.initialize();

    const skill = await esmlService.getSkill(name);

    if (!skill) {
      return NextResponse.json(
        { success: false, error: `Skill not found: ${name}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      skill
    });
  } catch (error: any) {
    console.error('Error getting skill:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tdd/skills/[name]
 * Toggle skill active status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    await esmlService.initialize();

    const skill = await esmlService.getSkill(name);

    if (!skill) {
      return NextResponse.json(
        { success: false, error: `Skill not found: ${name}` },
        { status: 404 }
      );
    }

    const success = await esmlService.toggleSkillActive(skill.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to toggle skill status' },
        { status: 500 }
      );
    }

    // Get updated skill
    const updatedSkill = await esmlService.getSkill(name);

    return NextResponse.json({
      success: true,
      skill: updatedSkill
    });
  } catch (error: any) {
    console.error('Error toggling skill:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
