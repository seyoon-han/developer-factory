'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatusData {
  status: string;
  count: number;
}

interface StatusChartProps {
  data?: StatusData[];
  loading?: boolean;
}

const STATUS_COLORS = {
  todo: '#6B7280',
  enhance_requirement: '#F59E0B',
  implement: '#3B82F6',
  presubmit_evaluation: '#8B5CF6',
  publish: '#10B981',
} as const;

const STATUS_LABELS = {
  todo: 'Todo',
  enhance_requirement: 'Enhancing',
  implement: 'Implementing',
  presubmit_evaluation: 'Evaluation',
  publish: 'Published',
} as const;

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-semibold">{STATUS_LABELS[data.status as keyof typeof STATUS_LABELS] || data.status}</p>
        <p className="text-sm">
          <span className="font-medium">{data.count}</span> tasks
          <span className="text-gray-500 ml-2">
            ({((data.count / data.total) * 100).toFixed(1)}%)
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export default function StatusChart({ data, loading }: StatusChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const totalTasks = data.reduce((sum, item) => sum + item.count, 0);
  const chartData = data.map(item => ({
    ...item,
    total: totalTasks,
    name: STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status,
    fill: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || '#6B7280'
  }));

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="count"
              label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}