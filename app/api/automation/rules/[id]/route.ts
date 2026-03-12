import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/automation/rules/[id] - Get a specific automation rule
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rule = await statements.getAutomationRule.get(resolvedParams.id) as any;

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        trigger_config: JSON.parse(rule.trigger_config),
        action_config: JSON.parse(rule.action_config),
      },
    });
  } catch (error: any) {
    console.error('Error fetching automation rule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/automation/rules/[id] - Update an automation rule
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const {
      name,
      enabled,
      trigger_type,
      trigger_config,
      action_type,
      action_config,
      priority,
      description,
    } = body;

    // Check if rule exists
    const existingRule = await statements.getAutomationRule.get(resolvedParams.id);
    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    if (!name || !trigger_type || !trigger_config || !action_type || !action_config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, trigger_type, trigger_config, action_type, action_config',
        },
        { status: 400 }
      );
    }

    const triggerConfigJson = JSON.stringify(trigger_config);
    const actionConfigJson = JSON.stringify(action_config);

    await statements.updateAutomationRule.run(
      name,
      enabled !== undefined ? (enabled ? 1 : 0) : 1,
      trigger_type,
      triggerConfigJson,
      action_type,
      actionConfigJson,
      priority || 0,
      description || null,
      resolvedParams.id
    );

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
    console.error('Error updating automation rule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/automation/rules/[id] - Delete an automation rule
export async function DELETE(
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

    await statements.deleteAutomationRule.run(resolvedParams.id);

    return NextResponse.json({
      success: true,
      message: 'Automation rule deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting automation rule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
