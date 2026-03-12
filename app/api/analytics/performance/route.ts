import { NextResponse } from 'next/server';
import { pool, DEFAULT_USER_ID } from '@/lib/db/postgres';

export async function GET() {
  try {
    // Implementation performance metrics
    const implementationMetricsResult = await pool.query(`
      SELECT
        COUNT(*) as total_implementations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_implementations,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_implementations,
        AVG(CASE WHEN elapsed_seconds > 0 THEN elapsed_seconds END) as avg_implementation_time,
        MIN(CASE WHEN elapsed_seconds > 0 THEN elapsed_seconds END) as min_implementation_time,
        MAX(elapsed_seconds) as max_implementation_time,
        COUNT(CASE WHEN implementation_report IS NOT NULL THEN 1 END) as tasks_with_reports,
        COUNT(CASE WHEN report_status = 'completed' THEN 1 END) as tasks_with_complete_reports
      FROM task_implementation
      WHERE user_id = $1
    `, [DEFAULT_USER_ID]);
    const implementationMetrics = implementationMetricsResult.rows[0];

    // Implementation time distribution (histogram data)
    const implementationTimeDistributionResult = await pool.query(`
      SELECT
        CASE
          WHEN elapsed_seconds <= 60 THEN '0-1 min'
          WHEN elapsed_seconds <= 300 THEN '1-5 min'
          WHEN elapsed_seconds <= 600 THEN '5-10 min'
          WHEN elapsed_seconds <= 1800 THEN '10-30 min'
          WHEN elapsed_seconds <= 3600 THEN '30-60 min'
          ELSE '60+ min'
        END as time_range,
        COUNT(*) as count
      FROM task_implementation
      WHERE user_id = $1 AND elapsed_seconds > 0
      GROUP BY
        CASE
          WHEN elapsed_seconds <= 60 THEN '0-1 min'
          WHEN elapsed_seconds <= 300 THEN '1-5 min'
          WHEN elapsed_seconds <= 600 THEN '5-10 min'
          WHEN elapsed_seconds <= 1800 THEN '10-30 min'
          WHEN elapsed_seconds <= 3600 THEN '30-60 min'
          ELSE '60+ min'
        END
      ORDER BY MIN(elapsed_seconds)
    `, [DEFAULT_USER_ID]);
    const implementationTimeDistribution = implementationTimeDistributionResult.rows;

    // Presubmit evaluation performance
    const presubmitMetricsResult = await pool.query(`
      SELECT
        COUNT(*) as total_evaluations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_evaluations,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_evaluations,
        AVG(CASE WHEN elapsed_seconds > 0 THEN elapsed_seconds END) as avg_evaluation_time,
        COUNT(DISTINCT expert_role) as unique_expert_roles,
        COUNT(CASE WHEN severity IN ('critical', 'high') THEN 1 END) as high_severity_issues
      FROM presubmit_evaluations
      WHERE user_id = $1
    `, [DEFAULT_USER_ID]);
    const presubmitMetrics = presubmitMetricsResult.rows[0];

    // Expert role performance
    const expertRolePerformanceResult = await pool.query(`
      SELECT
        expert_role,
        COUNT(*) as total_evaluations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_evaluations,
        AVG(CASE WHEN elapsed_seconds > 0 THEN elapsed_seconds END) as avg_time,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_issues,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_issues
      FROM presubmit_evaluations
      WHERE user_id = $1
      GROUP BY expert_role
      ORDER BY COUNT(CASE WHEN status = 'completed' THEN 1 END) DESC
    `, [DEFAULT_USER_ID]);
    const expertRolePerformance = expertRolePerformanceResult.rows;

    // Success rates by task priority
    const successRateByPriorityResult = await pool.query(`
      SELECT
        t.priority,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN t.status = 'publish' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN ti.status = 'completed' THEN 1 END) as successful_implementations,
        AVG(CASE WHEN ti.elapsed_seconds > 0 THEN ti.elapsed_seconds END) as avg_implementation_time
      FROM tasks t
      LEFT JOIN task_implementation ti ON t.id = ti.task_id AND ti.user_id = $1
      WHERE t.user_id = $1
      GROUP BY t.priority
      ORDER BY
        CASE t.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `, [DEFAULT_USER_ID]);
    const successRateByPriority = successRateByPriorityResult.rows;

    const response = NextResponse.json({
      implementation: {
        ...implementationMetrics,
        total_implementations: parseInt(implementationMetrics.total_implementations) || 0,
        completed_implementations: parseInt(implementationMetrics.completed_implementations) || 0,
        failed_implementations: parseInt(implementationMetrics.failed_implementations) || 0,
        avg_implementation_time: Math.round(parseFloat(implementationMetrics.avg_implementation_time) || 0),
        min_implementation_time: Math.round(parseFloat(implementationMetrics.min_implementation_time) || 0),
        max_implementation_time: Math.round(parseFloat(implementationMetrics.max_implementation_time) || 0),
        success_rate: parseInt(implementationMetrics.total_implementations) > 0
          ? Math.round((parseInt(implementationMetrics.completed_implementations) / parseInt(implementationMetrics.total_implementations)) * 100)
          : 0,
        report_completion_rate: parseInt(implementationMetrics.tasks_with_reports) > 0
          ? Math.round((parseInt(implementationMetrics.tasks_with_complete_reports) / parseInt(implementationMetrics.tasks_with_reports)) * 100)
          : 0
      },
      timeDistribution: implementationTimeDistribution,
      presubmit: {
        ...presubmitMetrics,
        total_evaluations: parseInt(presubmitMetrics.total_evaluations) || 0,
        completed_evaluations: parseInt(presubmitMetrics.completed_evaluations) || 0,
        failed_evaluations: parseInt(presubmitMetrics.failed_evaluations) || 0,
        avg_evaluation_time: Math.round(parseFloat(presubmitMetrics.avg_evaluation_time) || 0),
        success_rate: parseInt(presubmitMetrics.total_evaluations) > 0
          ? Math.round((parseInt(presubmitMetrics.completed_evaluations) / parseInt(presubmitMetrics.total_evaluations)) * 100)
          : 0
      },
      expertPerformance: expertRolePerformance.map((expert: any) => ({
        ...expert,
        total_evaluations: parseInt(expert.total_evaluations) || 0,
        completed_evaluations: parseInt(expert.completed_evaluations) || 0,
        avg_time: Math.round(parseFloat(expert.avg_time) || 0),
        success_rate: parseInt(expert.total_evaluations) > 0
          ? Math.round((parseInt(expert.completed_evaluations) / parseInt(expert.total_evaluations)) * 100)
          : 0
      })),
      priorityAnalysis: successRateByPriority.map((priority: any) => ({
        ...priority,
        total_tasks: parseInt(priority.total_tasks) || 0,
        completed_tasks: parseInt(priority.completed_tasks) || 0,
        successful_implementations: parseInt(priority.successful_implementations) || 0,
        avg_implementation_time: Math.round(parseFloat(priority.avg_implementation_time) || 0),
        completion_rate: parseInt(priority.total_tasks) > 0
          ? Math.round((parseInt(priority.completed_tasks) / parseInt(priority.total_tasks)) * 100)
          : 0,
        implementation_success_rate: parseInt(priority.total_tasks) > 0
          ? Math.round((parseInt(priority.successful_implementations) / parseInt(priority.total_tasks)) * 100)
          : 0
      }))
    });

    // Cache performance data for longer since it changes less frequently
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=240');
    return response;
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch performance analytics' }, { status: 500 });
  }
}
