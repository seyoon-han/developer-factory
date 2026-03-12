'use client';

import { useEffect, useState } from 'react';

interface SummaryData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
}

interface SummaryCardsProps {
  data?: SummaryData;
  loading?: boolean;
}

const StatCard = ({
  title,
  value,
  color,
  loading
}: {
  title: string;
  value: number;
  color: string;
  loading?: boolean;
}) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    {loading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
    ) : (
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
    )}
  </div>
);

export default function SummaryCards({ data, loading }: SummaryCardsProps) {
  const [summary, setSummary] = useState<SummaryData>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0
  });

  useEffect(() => {
    if (data) {
      setSummary(data);
    }
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Tasks"
        value={summary.totalTasks}
        color="text-blue-500"
        loading={loading}
      />
      <StatCard
        title="Completed"
        value={summary.completedTasks}
        color="text-green-500"
        loading={loading}
      />
      <StatCard
        title="In Progress"
        value={summary.inProgressTasks}
        color="text-yellow-500"
        loading={loading}
      />
      <StatCard
        title="Todo"
        value={summary.todoTasks}
        color="text-gray-500"
        loading={loading}
      />
    </div>
  );
}