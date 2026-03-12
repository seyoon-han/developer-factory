import { NextRequest, NextResponse } from 'next/server';
import { pool, DEFAULT_USER_ID } from '@/lib/db/postgres';
import { z } from 'zod';

// Query parameter validation schema
const querySchema = z.object({
  days: z.coerce.number().min(1).max(365).optional().default(7),
  sort: z.enum(['created_at', 'title', 'status', 'total_time', 'implementation_time', 'evaluation_time']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0)
});

interface TaskTimeData {
  id: number;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  implementation: {
    elapsed_seconds: number | null;
    status: string | null;
    started_at: string | null;
    completed_at: string | null;
  };
  evaluations: Array<{
    expert_role: string;
    elapsed_seconds: number;
    status: string;
  }>;
  totalTime: number;
}

interface TimeBreakdownResponse {
  summary: {
    totalTasks: number;
    avgImplementationTime: number;
    avgEvaluationTime: number;
    totalTimeInvested: number;
  };
  tasks: TaskTimeData[];
  distribution: Array<{
    timeRange: string;
    implementationCount: number;
    evaluationCount: number;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

function parseEvaluations(evaluationsStr: string | null): TaskTimeData['evaluations'] {
  if (!evaluationsStr) return [];

  return evaluationsStr.split(',').map(evalStr => {
    const [expert_role, elapsed_seconds, status] = evalStr.split(':');
    return {
      expert_role: expert_role || 'Unknown',
      elapsed_seconds: parseInt(elapsed_seconds) || 0,
      status: status || 'unknown'
    };
  }).filter(evalItem => evalItem.elapsed_seconds > 0);
}

function calculateTimeDistribution(tasks: TaskTimeData[]): TimeBreakdownResponse['distribution'] {
  const ranges = [
    { range: '0-30min', min: 0, max: 1800 },
    { range: '30min-1h', min: 1800, max: 3600 },
    { range: '1-2h', min: 3600, max: 7200 },
    { range: '2-4h', min: 7200, max: 14400 },
    { range: '4h+', min: 14400, max: Infinity }
  ];

  return ranges.map(({ range, min, max }) => {
    let implementationCount = 0;
    let evaluationCount = 0;

    tasks.forEach(task => {
      const implTime = task.implementation.elapsed_seconds || 0;
      const evalTime = task.evaluations.reduce((sum, evalItem) => sum + evalItem.elapsed_seconds, 0);

      if (implTime >= min && implTime < max) {
        implementationCount++;
      }
      if (evalTime >= min && evalTime < max && evalTime > 0) {
        evaluationCount++;
      }
    });

    return {
      timeRange: range,
      implementationCount,
      evaluationCount
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    // Build the ORDER BY clause based on sort parameter
    let orderByClause = 't.created_at DESC';
    switch (params.sort) {
      case 'title':
        orderByClause = `t.title ${params.order.toUpperCase()}`;
        break;
      case 'status':
        orderByClause = `t.status ${params.order.toUpperCase()}`;
        break;
      case 'created_at':
        orderByClause = `t.created_at ${params.order.toUpperCase()}`;
        break;
      case 'total_time':
        orderByClause = `total_time ${params.order.toUpperCase()}`;
        break;
      case 'implementation_time':
        orderByClause = `COALESCE(ti.elapsed_seconds, 0) ${params.order.toUpperCase()}`;
        break;
      case 'evaluation_time':
        orderByClause = `COALESCE(eval_total, 0) ${params.order.toUpperCase()}`;
        break;
    }

    // Main query with time data
    const query = `
      SELECT
        t.id,
        t.title,
        t.status,
        t.priority,
        t.created_at,
        t.updated_at,
        ti.elapsed_seconds as impl_elapsed,
        ti.status as impl_status,
        ti.started_at as impl_started,
        ti.completed_at as impl_completed,
        STRING_AGG(
          CASE
            WHEN pe.expert_role IS NOT NULL AND pe.elapsed_seconds > 0
            THEN pe.expert_role || ':' || pe.elapsed_seconds || ':' || pe.status
          END,
          ','
        ) as evaluations,
        COALESCE(ti.elapsed_seconds, 0) + COALESCE(
          (SELECT SUM(pe2.elapsed_seconds)
           FROM presubmit_evaluations pe2
           WHERE pe2.task_id = t.id AND pe2.user_id = $1 AND pe2.elapsed_seconds > 0), 0
        ) as total_time,
        COALESCE(
          (SELECT SUM(pe3.elapsed_seconds)
           FROM presubmit_evaluations pe3
           WHERE pe3.task_id = t.id AND pe3.user_id = $1 AND pe3.elapsed_seconds > 0), 0
        ) as eval_total
      FROM tasks t
      LEFT JOIN task_implementation ti ON t.id = ti.task_id AND ti.user_id = $1
      LEFT JOIN presubmit_evaluations pe ON t.id = pe.task_id AND pe.user_id = $1
      WHERE t.user_id = $1 AND (
        t.created_at >= NOW() - ($2 || ' days')::INTERVAL
        OR t.updated_at >= NOW() - ($2 || ' days')::INTERVAL
      )
      AND (
        (ti.elapsed_seconds IS NOT NULL AND ti.elapsed_seconds > 0)
        OR EXISTS(
          SELECT 1 FROM presubmit_evaluations pe_check
          WHERE pe_check.task_id = t.id AND pe_check.user_id = $1 AND pe_check.elapsed_seconds > 0
        )
      )
      GROUP BY t.id, t.title, t.status, t.priority, t.created_at, t.updated_at,
               ti.elapsed_seconds, ti.status, ti.started_at, ti.completed_at
      ORDER BY ${orderByClause}
      LIMIT $3 OFFSET $4
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM tasks t
      LEFT JOIN task_implementation ti ON t.id = ti.task_id AND ti.user_id = $1
      LEFT JOIN presubmit_evaluations pe ON t.id = pe.task_id AND pe.user_id = $1
      WHERE t.user_id = $1 AND (
        t.created_at >= NOW() - ($2 || ' days')::INTERVAL
        OR t.updated_at >= NOW() - ($2 || ' days')::INTERVAL
      )
      AND (
        (ti.elapsed_seconds IS NOT NULL AND ti.elapsed_seconds > 0)
        OR EXISTS(
          SELECT 1 FROM presubmit_evaluations pe_check
          WHERE pe_check.task_id = t.id AND pe_check.user_id = $1 AND pe_check.elapsed_seconds > 0
        )
      )
    `;

    // Execute queries
    const rowsResult = await pool.query(query, [DEFAULT_USER_ID, params.days, params.limit, params.offset]);
    const countResult = await pool.query(countQuery, [DEFAULT_USER_ID, params.days]);

    const rows = rowsResult.rows;
    const total = parseInt(countResult.rows[0]?.total) || 0;

    // Transform the results
    const tasks: TaskTimeData[] = rows.map((row: any) => {
      const evaluations = parseEvaluations(row.evaluations);
      const totalEvaluationTime = evaluations.reduce((sum, evalItem) => sum + evalItem.elapsed_seconds, 0);

      return {
        id: row.id,
        title: row.title,
        status: row.status,
        priority: row.priority,
        created_at: row.created_at,
        updated_at: row.updated_at,
        implementation: {
          elapsed_seconds: row.impl_elapsed,
          status: row.impl_status,
          started_at: row.impl_started,
          completed_at: row.impl_completed,
        },
        evaluations,
        totalTime: (row.impl_elapsed || 0) + totalEvaluationTime
      };
    });

    // Calculate summary statistics
    const totalTasks = tasks.length;
    const implementationTimes = tasks
      .map(t => t.implementation.elapsed_seconds)
      .filter((time): time is number => time !== null && time > 0);

    const allEvaluationTimes = tasks
      .flatMap(t => t.evaluations.map(e => e.elapsed_seconds))
      .filter(time => time > 0);

    const avgImplementationTime = implementationTimes.length > 0
      ? Math.round(implementationTimes.reduce((sum, time) => sum + time, 0) / implementationTimes.length)
      : 0;

    const avgEvaluationTime = allEvaluationTimes.length > 0
      ? Math.round(allEvaluationTimes.reduce((sum, time) => sum + time, 0) / allEvaluationTimes.length)
      : 0;

    const totalTimeInvested = tasks.reduce((sum, task) => sum + task.totalTime, 0);

    // Calculate distribution
    const distribution = calculateTimeDistribution(tasks);

    const response: TimeBreakdownResponse = {
      summary: {
        totalTasks,
        avgImplementationTime,
        avgEvaluationTime,
        totalTimeInvested
      },
      tasks,
      distribution,
      pagination: {
        total,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < total
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });

  } catch (error) {
    console.error('Error fetching time breakdown:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
