import { NextRequest, NextResponse } from 'next/server';
import { esmlService } from '@/lib/tdd/esml/skillsManager';

/**
 * GET /api/tdd/skills
 * List all external skills
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'all' | 'active' | 'core'

    await esmlService.initialize();

    let skills;
    switch (filter) {
      case 'active':
        skills = await esmlService.getActiveSkills();
        break;
      case 'core':
        skills = await esmlService.getCoreSkills();
        break;
      default:
        skills = await esmlService.getAllSkills();
    }

    return NextResponse.json({
      success: true,
      skills,
      count: skills.length
    });
  } catch (error: any) {
    console.error('Error listing skills:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
