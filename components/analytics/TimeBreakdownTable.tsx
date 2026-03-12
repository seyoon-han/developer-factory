'use client';

import React, { useState } from 'react';
import { formatDate, formatDuration, formatDurationCompact, getTimeColorClass } from '@/lib/utils/dates';
import { ChevronUp, ChevronDown, Download } from 'lucide-react';

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

interface TimeBreakdownTableProps {
  data: TaskTimeData[];
  loading: boolean;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onExport: () => void;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
}

type SortableColumns = 'created_at' | 'title' | 'status' | 'total_time' | 'implementation_time' | 'evaluation_time';

export default function TimeBreakdownTable({
  data,
  loading,
  onSort,
  onExport,
  currentSort,
  currentOrder
}: TimeBreakdownTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpansion = (taskId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (column: SortableColumns) => {
    const newOrder = currentSort === column && currentOrder === 'desc' ? 'asc' : 'desc';
    onSort(column, newOrder);
  };

  const SortButton = ({ column, children }: { column: SortableColumns; children: React.ReactNode }) => {
    const isActive = currentSort === column;
    const Icon = isActive && currentOrder === 'desc' ? ChevronDown : ChevronUp;

    return (
      <button
        onClick={() => handleSort(column)}
        className="flex items-center space-x-1 text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <span>{children}</span>
        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
      </button>
    );
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'in_progress': case 'implementing': return 'text-blue-600 dark:text-blue-400';
      case 'failed': case 'error': return 'text-red-600 dark:text-red-400';
      case 'pending': case 'todo': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        </div>
        <div className="animate-pulse p-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4 py-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Task Time Breakdown (Last 7 Days)
            </h3>
            <button
              onClick={onExport}
              disabled
              className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>No tasks with time data found in the last 7 days</p>
            <p className="text-sm mt-2">Tasks appear here once they enter the implementation phase</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Task Time Breakdown (Last 7 Days)
          </h3>
          <button
            onClick={onExport}
            className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <SortButton column="created_at">Task</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <SortButton column="status">Status</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <SortButton column="implementation_time">Implementation</SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <SortButton column="evaluation_time">Evaluation</SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <SortButton column="total_time">Total Time</SortButton>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((task) => {
              const evaluationTime = task.evaluations.reduce((sum, evalItem) => sum + evalItem.elapsed_seconds, 0);
              const isExpanded = expandedRows.has(task.id);

              return (
                <React.Fragment key={task.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleRowExpansion(task.id)}
                          className="mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {task.evaluations.length > 0 ? (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            #{task.id}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={task.title}>
                            {task.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                        {formatStatus(task.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(task.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={getTimeColorClass(task.implementation.elapsed_seconds)}>
                        {formatDurationCompact(task.implementation.elapsed_seconds)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={getTimeColorClass(evaluationTime)}>
                        {formatDurationCompact(evaluationTime)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span className={getTimeColorClass(task.totalTime)}>
                        {formatDurationCompact(task.totalTime)}
                      </span>
                    </td>
                  </tr>

                  {isExpanded && task.evaluations.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-3 bg-gray-50 dark:bg-gray-900">
                        <div className="ml-6">
                          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Evaluation Details:
                          </h4>
                          <div className="space-y-1">
                            {task.evaluations.map((evaluation, index) => (
                              <div key={index} className="flex justify-between items-center text-xs">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {evaluation.expert_role}:
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className={getStatusColor(evaluation.status)}>
                                    {formatStatus(evaluation.status)}
                                  </span>
                                  <span className={getTimeColorClass(evaluation.elapsed_seconds)}>
                                    {formatDurationCompact(evaluation.elapsed_seconds)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing {data.length} task{data.length !== 1 ? 's' : ''} with time tracking data from the last 7 days.
          Click the expand icon to see detailed evaluation breakdowns.
        </p>
      </div>
    </div>
  );
}