/**
 * Token Usage Analytics API
 * GET /api/analytics/token-usage
 * 
 * Query parameters:
 * - days: number of days to look back (default: 30)
 * - taskId: filter by specific task ID (optional)
 * - provider: filter by provider (claude, openai, other) (optional)
 * - phase: filter by phase (prompt_enhancement, implementation, refinement, presubmit, other) (optional)
 */

import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const taskId = searchParams.get('taskId');
    const provider = searchParams.get('provider');
    const phase = searchParams.get('phase');

    // Get total token usage by provider
    const totalByProvider = await statements.getTotalTokenUsage.all() as any[];

    // Get token usage over time
    const usageByDate = await statements.getTokenUsageByDateRange.all(days) as any[];

    // Get all task summaries
    let allTaskSummaries = await statements.getAllTokenUsageSummary.all() as any[];

    // Apply filters
    if (taskId) {
      allTaskSummaries = allTaskSummaries.filter((row: any) => row.task_id === parseInt(taskId));
    }
    if (provider) {
      allTaskSummaries = allTaskSummaries.filter((row: any) => row.provider === provider);
    }
    if (phase) {
      allTaskSummaries = allTaskSummaries.filter((row: any) => row.phase === phase);
    }

    // Group by task
    const taskSummaries: Record<number, any> = {};
    
    allTaskSummaries.forEach((row: any) => {
      const tid = row.task_id;
      
      if (!taskSummaries[tid]) {
        taskSummaries[tid] = {
          taskId: tid,
          taskTitle: row.task_title,
          taskStatus: row.task_status,
          totalTokens: 0,
          totalCost: 0,
          totalTurns: 0,
          totalCalls: 0,
          byPhase: {},
          byProvider: {},
        };
      }

      taskSummaries[tid].totalTokens += row.total_tokens || 0;
      taskSummaries[tid].totalCost += row.total_cost || 0;
      taskSummaries[tid].totalTurns += row.total_turns || 0;
      taskSummaries[tid].totalCalls += row.call_count || 0;

      // By phase
      if (!taskSummaries[tid].byPhase[row.phase]) {
        taskSummaries[tid].byPhase[row.phase] = {
          tokens: 0,
          cost: 0,
          turns: 0,
          calls: 0,
        };
      }
      taskSummaries[tid].byPhase[row.phase].tokens += row.total_tokens || 0;
      taskSummaries[tid].byPhase[row.phase].cost += row.total_cost || 0;
      taskSummaries[tid].byPhase[row.phase].turns += row.total_turns || 0;
      taskSummaries[tid].byPhase[row.phase].calls += row.call_count || 0;

      // By provider
      if (!taskSummaries[tid].byProvider[row.provider]) {
        taskSummaries[tid].byProvider[row.provider] = {
          tokens: 0,
          cost: 0,
          turns: 0,
          calls: 0,
        };
      }
      taskSummaries[tid].byProvider[row.provider].tokens += row.total_tokens || 0;
      taskSummaries[tid].byProvider[row.provider].cost += row.total_cost || 0;
      taskSummaries[tid].byProvider[row.provider].turns += row.total_turns || 0;
      taskSummaries[tid].byProvider[row.provider].calls += row.call_count || 0;
    });

    // Convert to array and sort by total cost descending
    const tasks = Object.values(taskSummaries).sort((a: any, b: any) => b.totalCost - a.totalCost);

    // Calculate grand totals
    const grandTotals = {
      totalTokens: totalByProvider.reduce((sum, row) => sum + (row.total_tokens || 0), 0),
      totalCost: totalByProvider.reduce((sum, row) => sum + (row.total_cost || 0), 0),
      totalCalls: totalByProvider.reduce((sum, row) => sum + (row.call_count || 0), 0),
      taskCount: totalByProvider.reduce((sum, row) => sum + (row.task_count || 0), 0),
      byProvider: {} as Record<string, any>,
    };

    totalByProvider.forEach((row) => {
      grandTotals.byProvider[row.provider] = {
        tokens: row.total_tokens || 0,
        cost: row.total_cost || 0,
        calls: row.call_count || 0,
        taskCount: row.task_count || 0,
      };
    });

    // Calculate totals by phase across all tasks
    const totalsByPhase: Record<string, any> = {};
    allTaskSummaries.forEach((row: any) => {
      if (!totalsByPhase[row.phase]) {
        totalsByPhase[row.phase] = {
          tokens: 0,
          cost: 0,
          turns: 0,
          calls: 0,
        };
      }
      totalsByPhase[row.phase].tokens += row.total_tokens || 0;
      totalsByPhase[row.phase].cost += row.total_cost || 0;
      totalsByPhase[row.phase].turns += row.total_turns || 0;
      totalsByPhase[row.phase].calls += row.call_count || 0;
    });

    // Format usage by date for charting
    const dateMap: Record<string, any> = {};
    usageByDate.forEach((row: any) => {
      const date = row.date;
      if (!dateMap[date]) {
        dateMap[date] = {
          date,
          totalTokens: 0,
          totalCost: 0,
          byPhase: {},
          byProvider: {},
        };
      }

      dateMap[date].totalTokens += row.total_tokens || 0;
      dateMap[date].totalCost += row.total_cost || 0;

      if (!dateMap[date].byPhase[row.phase]) {
        dateMap[date].byPhase[row.phase] = { tokens: 0, cost: 0 };
      }
      dateMap[date].byPhase[row.phase].tokens += row.total_tokens || 0;
      dateMap[date].byPhase[row.phase].cost += row.total_cost || 0;

      if (!dateMap[date].byProvider[row.provider]) {
        dateMap[date].byProvider[row.provider] = { tokens: 0, cost: 0 };
      }
      dateMap[date].byProvider[row.provider].tokens += row.total_tokens || 0;
      dateMap[date].byProvider[row.provider].cost += row.total_cost || 0;
    });

    const timeline = Object.values(dateMap).reverse(); // Most recent first

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          ...grandTotals,
          byPhase: totalsByPhase,
        },
        tasks,
        timeline,
      },
    });
  } catch (error: any) {
    console.error('Token usage analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch token usage analytics',
      },
      { status: 500 }
    );
  }
}
















