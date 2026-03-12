import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// POST /api/automation/rules/[id]/toggle - Toggle automation rule enabled/disabled
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const existingRule = await statements.getAutomationRule.get(resolvedParams.id);
    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    await statements.toggleAutomationRule.run(resolvedParams.id);

    const updatedRule = await statements.getAutomationRule.get(resolvedParams.id) as any;

    return NextResponse.json({
      success: true,
      rule: {
        ...updatedRule,
        trigger_config: JSON.parse(updatedRule.trigger_config),
        action_config: JSON.parse(updatedRule.action_config),
      },
    });
  } catch (error: any) {
    console.error('Error toggling automation rule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
