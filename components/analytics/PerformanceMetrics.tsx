'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ImplementationMetrics {
  total_implementations: number;
  completed_implementations: number;
  success_rate: number;
  avg_implementation_time: number;
  tasks_with_reports: number;
  report_completion_rate: number;
}

interface PresubmitMetrics {
  total_evaluations: number;
  completed_evaluations: number;
  success_rate: number;
  avg_evaluation_time: number;
  high_severity_issues: number;
}

interface TimeDistribution {
  time_range: string;
  count: number;
}

interface PerformanceMetricsProps {
  implementation?: ImplementationMetrics;
  presubmit?: PresubmitMetrics;
  timeDistribution?: TimeDistribution[];
  loading?: boolean;
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600 * 10) / 10}h`;
};

const MetricCard = ({
  title,
  value,
  subtitle,
  color = 'text-blue-500',
  loading
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  loading?: boolean;
}) => (
  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</h4>
    {loading ? (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-1"></div>
        {subtitle && <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>}
      </div>
    ) : (
      <>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-semibold">{label}</p>
        <p style={{ color: payload[0].color }}>
          Tasks: <span className="font-medium">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function PerformanceMetrics({
  implementation,
  presubmit,
  timeDistribution,
  loading
}: PerformanceMetricsProps) {
  return (
    <div className="space-y-6">
      {/* Implementation Metrics */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Implementation Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Success Rate"
            value={loading ? '-' : `${implementation?.success_rate || 0}%`}
            subtitle={loading ? '' : `${implementation?.completed_implementations || 0}/${implementation?.total_implementations || 0} tasks`}
            color="text-green-500"
            loading={loading}
          />
          <MetricCard
            title="Avg Time"
            value={loading ? '-' : formatTime(implementation?.avg_implementation_time || 0)}
            subtitle="per implementation"
            color="text-blue-500"
            loading={loading}
          />
          <MetricCard
            title="Report Rate"
            value={loading ? '-' : `${implementation?.report_completion_rate || 0}%`}
            subtitle={loading ? '' : `${implementation?.tasks_with_reports || 0} with reports`}
            color="text-purple-500"
            loading={loading}
          />
          <MetricCard
            title="Total Implementations"
            value={loading ? '-' : implementation?.total_implementations || 0}
            color="text-gray-500"
            loading={loading}
          />
        </div>
      </div>

      {/* Presubmit Metrics */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Presubmit Evaluation Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Success Rate"
            value={loading ? '-' : `${presubmit?.success_rate || 0}%`}
            subtitle={loading ? '' : `${presubmit?.completed_evaluations || 0}/${presubmit?.total_evaluations || 0} evaluations`}
            color="text-green-500"
            loading={loading}
          />
          <MetricCard
            title="Avg Time"
            value={loading ? '-' : formatTime(presubmit?.avg_evaluation_time || 0)}
            subtitle="per evaluation"
            color="text-blue-500"
            loading={loading}
          />
          <MetricCard
            title="High Priority Issues"
            value={loading ? '-' : presubmit?.high_severity_issues || 0}
            subtitle="critical/high severity"
            color="text-red-500"
            loading={loading}
          />
          <MetricCard
            title="Total Evaluations"
            value={loading ? '-' : presubmit?.total_evaluations || 0}
            color="text-gray-500"
            loading={loading}
          />
        </div>
      </div>

      {/* Implementation Time Distribution */}
      {timeDistribution && timeDistribution.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Implementation Time Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time_range" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}