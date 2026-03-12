'use client';

import { useState, useEffect } from 'react';

// Ensure this only runs on client-side
const isBrowser = typeof window !== 'undefined';

interface AnalyticsData {
  summary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
  };
  breakdown: {
    byStatus: Array<{ status: string; count: number }>;
    byPriority: Array<{ priority: string; count: number }>;
  };
  implementation: {
    total_implementations: number;
    completed_implementations: number;
    success_rate: number;
    avg_implementation_time: number;
    tasks_with_reports: number;
    report_completion_rate: number;
  };
  presubmit: {
    total_evaluations: number;
    completed_evaluations: number;
    success_rate: number;
    avg_evaluation_time: number;
    high_severity_issues: number;
  };
  trends: {
    recentActivity: Array<{ date: string; tasks_created: number }>;
  };
}

interface TrendsData {
  period: number;
  daily: {
    taskCreation: Array<{ date: string; created: number; completed: number }>;
    implementation: Array<{ date: string; implementations_started: number; implementations_completed: number; avg_time: number }>;
  };
}

interface PerformanceData {
  implementation: {
    total_implementations: number;
    completed_implementations: number;
    success_rate: number;
    avg_implementation_time: number;
    tasks_with_reports: number;
    report_completion_rate: number;
  };
  timeDistribution: Array<{ time_range: string; count: number }>;
  presubmit: {
    total_evaluations: number;
    completed_evaluations: number;
    success_rate: number;
    avg_evaluation_time: number;
    high_severity_issues: number;
  };
}

export const useAnalytics = (refreshInterval: number = 5000) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!isBrowser) return;

    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isBrowser) {
      setLoading(false);
      return;
    }

    fetchAnalytics();

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { data, loading, error, refetch: fetchAnalytics };
};

export const useTrends = (period: number = 30, refreshInterval: number = 30000) => {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    if (!isBrowser) return;

    try {
      const response = await fetch(`/api/analytics/trends?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isBrowser) {
      setLoading(false);
      return;
    }

    fetchTrends();

    const interval = setInterval(fetchTrends, refreshInterval);
    return () => clearInterval(interval);
  }, [period, refreshInterval]);

  return { data, loading, error, refetch: fetchTrends };
};

export const usePerformance = (refreshInterval: number = 30000) => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = async () => {
    if (!isBrowser) return;

    try {
      const response = await fetch('/api/analytics/performance');
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isBrowser) {
      setLoading(false);
      return;
    }

    fetchPerformance();

    const interval = setInterval(fetchPerformance, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { data, loading, error, refetch: fetchPerformance };
};

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

interface TimeBreakdownData {
  summary: {
    totalTasks: number;
    avgImplementationTime: number;
    avgEvaluationTime: number;
    totalTimeInvested: number;
  };
  tasks: TaskTimeData[];
  distribution: Array<{
    timeRange: string;
    implementationCount: number;
    evaluationCount: number;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const useTimeBreakdown = (
  days: number = 7,
  sort: string = 'created_at',
  order: 'asc' | 'desc' = 'desc',
  limit: number = 50,
  offset: number = 0,
  refreshInterval: number = 60000
) => {
  const [data, setData] = useState<TimeBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeBreakdown = async () => {
    if (!isBrowser) return;

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        sort,
        order,
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`/api/analytics/time-breakdown?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch time breakdown data');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time breakdown data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isBrowser) {
      setLoading(false);
      return;
    }

    fetchTimeBreakdown();

    const interval = setInterval(fetchTimeBreakdown, refreshInterval);
    return () => clearInterval(interval);
  }, [days, sort, order, limit, offset, refreshInterval]);

  return { data, loading, error, refetch: fetchTimeBreakdown };
};