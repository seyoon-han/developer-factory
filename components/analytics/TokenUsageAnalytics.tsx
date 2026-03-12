'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TokenUsageData {
  summary: {
    totalTokens: number;
    totalCost: number;
    totalCalls: number;
    taskCount: number;
    byProvider: Record<string, {
      tokens: number;
      cost: number;
      calls: number;
      taskCount: number;
    }>;
    byPhase: Record<string, {
      tokens: number;
      cost: number;
      turns: number;
      calls: number;
    }>;
  };
  tasks: Array<{
    taskId: number;
    taskTitle: string;
    taskStatus: string;
    totalTokens: number;
    totalCost: number;
    totalTurns: number;
    totalCalls: number;
    byPhase: Record<string, any>;
    byProvider: Record<string, any>;
  }>;
  timeline: Array<{
    date: string;
    totalTokens: number;
    totalCost: number;
    byPhase: Record<string, any>;
    byProvider: Record<string, any>;
  }>;
}

const COLORS = {
  claude: '#9333ea',
  openai: '#10b981',
  other: '#6b7280',
  prompt_enhancement: '#3b82f6',
  implementation: '#f59e0b',
  refinement: '#ec4899',
  presubmit: '#8b5cf6',
  other_phase: '#6b7280',
};

const PHASE_LABELS: Record<string, string> = {
  prompt_enhancement: 'Prompt Enhancement',
  implementation: 'Implementation #1',
  refinement: 'Refinement',
  presubmit: 'Presubmit',
  other: 'Other',
};

export default function TokenUsageAnalytics() {
  const [data, setData] = useState<TokenUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ days: days.toString() });
      if (selectedTask) {
        params.set('taskId', selectedTask.toString());
      }
      
      const response = await fetch(`/api/analytics/token-usage?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch token usage data');
      }
      
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days, selectedTask]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Token Usage & Cost Analysis</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Token Usage & Cost Analysis</h3>
        <div className="text-red-500 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, tasks, timeline } = data;

  // Prepare data for provider pie chart
  const providerData = Object.entries(summary.byProvider).map(([provider, stats]) => ({
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    value: stats.cost,
    tokens: stats.tokens,
    calls: stats.calls,
  }));

  // Prepare data for phase breakdown chart
  const phaseData = Object.entries(summary.byPhase).map(([phase, stats]) => ({
    name: PHASE_LABELS[phase] || phase,
    tokens: stats.tokens,
    cost: stats.cost,
    calls: stats.calls,
  }));

  // Prepare timeline data for chart
  const timelineChartData = timeline.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cost: parseFloat(item.totalCost.toFixed(4)),
    tokens: Math.round(item.totalTokens / 1000), // In thousands
  }));

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Token Usage & Cost Analysis</h3>
          <div className="flex gap-4">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            {selectedTask && (
              <button
                onClick={() => setSelectedTask(null)}
                className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${summary.totalCost.toFixed(4)}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {(summary.totalTokens / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">API Calls</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {summary.totalCalls}
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Tasks Processed</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {summary.taskCount}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Provider Distribution & Phase Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold mb-4">Cost by Provider</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={providerData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: $${entry.value.toFixed(4)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {providerData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || COLORS.other} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: string, props: any) => [
                  `$${parseFloat(value).toFixed(4)} (${props.payload.tokens.toLocaleString()} tokens)`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Phase Breakdown Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold mb-4">Cost by Phase</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={phaseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip
                formatter={(value: any, name: string) =>
                  name === 'cost' ? `$${parseFloat(value).toFixed(4)}` : value.toLocaleString()
                }
              />
              <Legend />
              <Bar dataKey="cost" fill="#3b82f6" name="Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-semibold mb-4">Cost & Token Usage Over Time</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="cost"
              stroke="#3b82f6"
              name="Cost ($)"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="tokens"
              stroke="#10b981"
              name="Tokens (K)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Task-Level Breakdown Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-semibold mb-4">Task-Level Token Usage</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left py-2 px-2 text-sm font-medium">Task #</th>
                <th className="text-left py-2 px-2 text-sm font-medium">Title</th>
                <th className="text-right py-2 px-2 text-sm font-medium">Total Cost</th>
                <th className="text-right py-2 px-2 text-sm font-medium">Tokens</th>
                <th className="text-right py-2 px-2 text-sm font-medium">Calls</th>
                <th className="text-left py-2 px-2 text-sm font-medium">Phases</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 20).map((task) => (
                <tr
                  key={task.taskId}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                  onClick={() => setSelectedTask(task.taskId)}
                >
                  <td className="py-2 px-2 text-sm">#{task.taskId}</td>
                  <td className="py-2 px-2 text-sm max-w-xs truncate" title={task.taskTitle}>
                    {task.taskTitle}
                  </td>
                  <td className="py-2 px-2 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                    ${task.totalCost.toFixed(4)}
                  </td>
                  <td className="py-2 px-2 text-sm text-right">
                    {(task.totalTokens / 1000).toFixed(1)}K
                  </td>
                  <td className="py-2 px-2 text-sm text-right">{task.totalCalls}</td>
                  <td className="py-2 px-2 text-sm">
                    <div className="flex gap-1 flex-wrap">
                      {Object.keys(task.byPhase).map((phase) => (
                        <span
                          key={phase}
                          className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700"
                          title={`${PHASE_LABELS[phase]}: $${task.byPhase[phase].cost.toFixed(4)}`}
                        >
                          {PHASE_LABELS[phase]}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length > 20 && (
            <div className="text-center py-4 text-sm text-gray-500">
              Showing top 20 of {tasks.length} tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
















