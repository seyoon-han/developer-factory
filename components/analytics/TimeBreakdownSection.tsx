'use client';

import React, { useState, useCallback } from 'react';
import { useTimeBreakdown } from './useAnalytics';
import TimeSummaryCards from './TimeSummaryCards';
import TimeDistributionChart from './TimeDistributionChart';
import TimeBreakdownTable from './TimeBreakdownTable';

export default function TimeBreakdownSection() {
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, loading, error } = useTimeBreakdown(
    7, // days
    sortColumn,
    sortOrder,
    50, // limit
    0, // offset
    60000 // refresh interval (60 seconds)
  );

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortOrder(direction);
  }, []);

  const handleExport = useCallback(() => {
    if (!data || !data.tasks || data.tasks.length === 0) {
      return;
    }

    // Prepare CSV data
    const headers = [
      'Task ID',
      'Title',
      'Status',
      'Priority',
      'Created At',
      'Implementation Time (seconds)',
      'Evaluation Time (seconds)',
      'Total Time (seconds)',
      'Implementation Status',
      'Evaluations Count'
    ];

    const csvData = data.tasks.map(task => {
      const evaluationTime = task.evaluations.reduce((sum, evalItem) => sum + evalItem.elapsed_seconds, 0);

      return [
        task.id,
        `"${task.title.replace(/"/g, '""')}"`, // Escape quotes in title
        task.status,
        task.priority || 'Normal',
        task.created_at,
        task.implementation.elapsed_seconds || 0,
        evaluationTime,
        task.totalTime,
        task.implementation.status || 'N/A',
        task.evaluations.length
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `task-time-analytics-${today}.csv`);

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-2">
            <div className="text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
              Failed to Load Time Data
            </h3>
          </div>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
          >
            Try refreshing the page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Task Time Analysis
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Detailed breakdown of time spent on tasks over the last 7 days
        </p>
      </div>

      {/* Summary Cards */}
      <TimeSummaryCards
        data={data?.summary || null}
        loading={loading}
      />

      {/* Time Distribution Chart */}
      <TimeDistributionChart
        data={data?.distribution || []}
        loading={loading}
      />

      {/* Detailed Table */}
      <TimeBreakdownTable
        data={data?.tasks || []}
        loading={loading}
        onSort={handleSort}
        onExport={handleExport}
        currentSort={sortColumn}
        currentOrder={sortOrder}
      />
    </div>
  );
}