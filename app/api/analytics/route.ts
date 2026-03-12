import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/postgres';
import { DEFAULT_USER_ID } from '@/lib/db/postgres';

export async function GET() {
  try {
    // Get overall task statistics
    const totalTasksResult = await pool.query(
      'SELECT COUNT(*) as count FROM tasks WHERE user_id = $1',
      [DEFAULT_USER_ID]
    );
    const totalTasks = totalTasksResult.rows[0]?.count || 0;

    // Task status breakdown
    const statusBreakdownResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM tasks
      WHERE user_id = $1
      GROUP BY status
      ORDER BY count DESC
    `, [DEFAULT_USER_ID]);
    const statusBreakdown = statusBreakdownResult.rows;

    // Priority breakdown
    const priorityBreakdownResult = await pool.query(`
      SELECT priority, COUNT(*) as count
      FROM tasks
      WHERE user_id = $1
      GROUP BY priority
      ORDER BY count DESC
    `, [DEFAULT_USER_ID]);
    const priorityBreakdown = priorityBreakdownResult.rows;

    // Implementation statistics
    const implementationStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_implementations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_implementations,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_implementations,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_implementations,
        AVG(CASE WHEN elapsed_seconds > 0 THEN elapsed_seconds END) as avg_implementation_time,
        COUNT(CASE WHEN implementation_report IS NOT NULL THEN 1 END) as tasks_with_reports
      FROM task_implementation
      WHERE user_id = $1
    `, [DEFAULT_USER_ID]);
    const implementationStats = implementationStatsResult.rows[0];

    // Presubmit evaluation statistics
    const presubmitStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_evaluations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_evaluations,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_evaluations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_evaluations,
        AVG(CASE WHEN elapsed_seconds > 0 THEN elapsed_seconds END) as avg_evaluation_time
      FROM presubmit_evaluations
      WHERE user_id = $1
    `, [DEFAULT_USER_ID]);
    const presubmitStats = presubmitStatsResult.rows[0];

    // Recent activity (last 30 days)
    const recentActivityResult = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as tasks_created
      FROM tasks
      WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [DEFAULT_USER_ID]);
    const recentActivity = recentActivityResult.rows;

    const response = NextResponse.json({
      summary: {
        totalTasks: parseInt(totalTasks),
        completedTasks: parseInt(statusBreakdown.find((s: any) => s.status === 'publish')?.count || 0),
        inProgressTasks: statusBreakdown.filter((s: any) => ['enhance_requirement', 'implement', 'presubmit_evaluation'].includes(s.status)).reduce((sum: number, s: any) => sum + parseInt(s.count), 0),
        todoTasks: parseInt(statusBreakdown.find((s: any) => s.status === 'todo')?.count || 0)
      },
      breakdown: {
        byStatus: statusBreakdown,
        byPriority: priorityBreakdown
      },
      implementation: {
        ...implementationStats,
        avg_implementation_time: Math.round(parseFloat(implementationStats.avg_implementation_time) || 0)
      },
      presubmit: {
        ...presubmitStats,
        avg_evaluation_time: Math.round(parseFloat(presubmitStats.avg_evaluation_time) || 0)
      },
      trends: {
        recentActivity: recentActivity.reverse() // Show chronologically
      }
    });

    // Add cache headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
