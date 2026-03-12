'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TimeDistributionData {
  timeRange: string;
  implementationCount: number;
  evaluationCount: number;
}

interface TimeDistributionChartProps {
  data: TimeDistributionData[];
  loading: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {`Time Range: ${label}`}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.dataKey === 'implementationCount' ? 'Implementation' : 'Evaluation'}: ${entry.value} task${entry.value !== 1 ? 's' : ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function TimeDistributionChart({ data, loading }: TimeDistributionChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Time Distribution
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <p>No time distribution data available</p>
        </div>
      </div>
    );
  }

  // Filter out ranges with no data
  const filteredData = data.filter(item =>
    item.implementationCount > 0 || item.evaluationCount > 0
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Time Distribution
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Tasks grouped by time spent
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="timeRange"
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                paddingTop: '10px'
              }}
            />
            <Bar
              dataKey="implementationCount"
              name="Implementation"
              fill="#10b981"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="evaluationCount"
              name="Evaluation"
              fill="#8b5cf6"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>Shows number of tasks by time spent in each phase. Implementation and evaluation times are tracked separately.</p>
      </div>
    </div>
  );
}