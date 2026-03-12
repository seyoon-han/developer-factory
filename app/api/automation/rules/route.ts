import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

// GET /api/automation/rules - Get all automation rules
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get('enabledOnly') === 'true';
    const triggerType = searchParams.get('triggerType');

    let rules;
    
    if (enabledOnly && triggerType) {
      rules = await statements.getAutomationRulesByTrigger.all(triggerType);
    } else if (enabledOnly) {
      rules = await statements.getEnabledAutomationRules.all();
    } else {
      rules = await statements.getAllAutomationRules.all();
    }

    // Parse JSON configs
    const rulesWithParsedConfigs = rules.map((rule: any) => ({
      ...rule,
      trigger_config: JSON.parse(rule.trigger_config),
      action_config: JSON.parse(rule.action_config),
    }));

    return NextResponse.json({
      success: true,
      rules: rulesWithParsedConfigs,
    });
  } catch (error: any) {
    console.error('Error fetching automation rules:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/automation/rules - Create a new automation rule
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      enabled,
      trigger_type,
      trigger_config,
      action_type,
      action_config,
      priority,
      description,
    } = body;

    if (!id || !name || !trigger_type || !trigger_config || !action_type || !action_config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: id, name, trigger_type, trigger_config, action_type, action_config',
        },
        { status: 400 }
      );
    }

    const triggerConfigJson = JSON.stringify(trigger_config);
    const actionConfigJson = JSON.stringify(action_config);

    await statements.createAutomationRule.run(
      id,
      name,
      enabled !== undefined ? (enabled ? 1 : 0) : 1,
      trigger_type,
      triggerConfigJson,
      action_type,
      actionConfigJson,
      priority || 0,
      description || null
    );

    const newRule = await statements.getAutomationRule.get(id) as any;

    return NextResponse.json({
      success: true,
      rule: {
        ...newRule,
        trigger_config: JSON.parse(newRule.trigger_config),
        action_config: JSON.parse(newRule.action_config),
      },
    });
  } catch (error: any) {
    console.error('Error creating automation rule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
















