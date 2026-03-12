'use client';

import { formatDurationCompact } from '@/lib/utils/dates';

interface TimeSummaryCardsProps {
  data: {
    totalTasks: number;
    avgImplementationTime: number;
    avgEvaluationTime: number;
    totalTimeInvested: number;
  } | null;
  loading: boolean;
}

export default function TimeSummaryCards({ data, loading }: TimeSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-yellow-800 dark:text-yellow-200 text-center">
            No time data available for the last 7 days
          </p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Tasks',
      value: data.totalTasks,
      suffix: data.totalTasks === 1 ? 'task' : 'tasks',
      description: 'Tasks with time data',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Avg Implementation',
      value: formatDurationCompact(data.avgImplementationTime),
      suffix: '',
      description: 'Per task implementation',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Avg Evaluation',
      value: formatDurationCompact(data.avgEvaluationTime),
      suffix: '',
      description: 'Per evaluation cycle',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Total Time',
      value: formatDurationCompact(data.totalTimeInvested),
      suffix: '',
      description: 'All tasks combined',
      color: 'text-orange-600 dark:text-orange-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              {card.title}
            </h3>
            <div className="flex items-baseline space-x-1">
              <span className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </span>
              {card.suffix && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {card.suffix}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {card.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}