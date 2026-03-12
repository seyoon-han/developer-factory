import { NextResponse } from 'next/server';
import { pool, DEFAULT_USER_ID } from '@/lib/db/postgres';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const periodNum = Math.min(Math.max(parseInt(period), 7), 365); // Between 7 and 365 days

    // Task creation trends
    const taskCreationTrendsResult = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as created,
        COUNT(CASE WHEN status = 'publish' THEN 1 END) as completed
      FROM tasks
      WHERE user_id = $1 AND created_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [DEFAULT_USER_ID, periodNum]);
    const taskCreationTrends = taskCreationTrendsResult.rows;

    // Implementation performance trends (tasks that have implementations)
    const implementationTrendsResult = await pool.query(`
      SELECT
        DATE(ti.created_at) as date,
        COUNT(*) as implementations_started,
        COUNT(CASE WHEN ti.status = 'completed' THEN 1 END) as implementations_completed,
        AVG(CASE WHEN ti.elapsed_seconds > 0 THEN ti.elapsed_seconds END) as avg_time
      FROM task_implementation ti
      WHERE ti.user_id = $1 AND ti.created_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL
      GROUP BY DATE(ti.created_at)
      ORDER BY date ASC
    `, [DEFAULT_USER_ID, periodNum]);
    const implementationTrends = implementationTrendsResult.rows;

    // Weekly aggregated trends for longer periods
    let weeklyTrends: any[] = [];
    if (periodNum > 60) {
      const weeklyTrendsResult = await pool.query(`
        SELECT
          TO_CHAR(created_at, 'IYYY-"W"IW') as week,
          MIN(DATE(created_at)) as week_start,
          COUNT(*) as created,
          COUNT(CASE WHEN status = 'publish' THEN 1 END) as completed
        FROM tasks
        WHERE user_id = $1 AND created_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL
        GROUP BY TO_CHAR(created_at, 'IYYY-"W"IW')
        ORDER BY week ASC
      `, [DEFAULT_USER_ID, periodNum]);
      weeklyTrends = weeklyTrendsResult.rows;
    }

    // Status transition velocity (how fast tasks move through stages)
    const statusVelocityResult = await pool.query(`
      SELECT
        status,
        COUNT(*) as current_count,
        AVG(
          CASE
            WHEN updated_at != created_at
            THEN EXTRACT(EPOCH FROM (updated_at - created_at))
            ELSE NULL
          END
        ) as avg_time_in_status_seconds
      FROM tasks
      WHERE user_id = $1 AND created_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL
      GROUP BY status
    `, [DEFAULT_USER_ID, periodNum]);
    const statusVelocity = statusVelocityResult.rows;

    const response = NextResponse.json({
      period: periodNum,
      daily: {
        taskCreation: taskCreationTrends,
        implementation: implementationTrends.map((trend: any) => ({
          ...trend,
          avg_time: Math.round(parseFloat(trend.avg_time) || 0)
        }))
      },
      weekly: weeklyTrends,
      velocity: statusVelocity.map((v: any) => ({
        ...v,
        avg_time_in_status_seconds: Math.round(parseFloat(v.avg_time_in_status_seconds) || 0),
        avg_time_in_status_hours: Math.round((parseFloat(v.avg_time_in_status_seconds) || 0) / 3600 * 10) / 10
      }))
    });

    // Cache trends data for longer since it changes less frequently
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error('Error fetching trends analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch trends analytics' }, { status: 500 });
  }
}
