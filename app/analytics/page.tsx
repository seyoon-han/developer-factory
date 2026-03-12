'use client';

import dynamic from 'next/dynamic';
import SummaryCards from '@/components/analytics/SummaryCards';
import ClientOnly from '@/components/analytics/ClientOnly';
import { ErrorBoundary } from '@/components/analytics/ErrorBoundary';
import { useAnalytics, useTrends, usePerformance } from '@/components/analytics/useAnalytics';

// Dynamically import chart components to prevent SSR issues
const StatusChart = dynamic(() => import('@/components/analytics/StatusChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-card p-6 rounded-lg border border-border">
      <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
  )
});

const TrendsChart = dynamic(() => import('@/components/analytics/TrendsChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-card p-6 rounded-lg border border-border">
      <h3 className="text-lg font-semibold mb-4">Task Activity (Last 30 Days)</h3>
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
  )
});

const PerformanceMetrics = dynamic(() => import('@/components/analytics/PerformanceMetrics'), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">Implementation Performance</h3>
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    </div>
  )
});

const TimeBreakdownSection = dynamic(() => import('@/components/analytics/TimeBreakdownSection'), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">Task Time Analysis</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    </div>
  )
});

const TokenUsageAnalytics = dynamic(() => import('@/components/analytics/TokenUsageAnalytics'), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">Token Usage & Cost Analysis</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    </div>
  )
});

export default function AnalyticsPage() {
  const { data: analytics, loading: analyticsLoading, error: analyticsError } = useAnalytics();
  const { data: trends, loading: trendsLoading } = useTrends();
  const { data: performance, loading: performanceLoading } = usePerformance();

  if (analyticsError) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Analytics</h2>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Analytics</h3>
          <p className="text-red-600 dark:text-red-400">{analyticsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        {analyticsLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading...
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <SummaryCards data={analytics?.summary} loading={analyticsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Chart */}
        <ErrorBoundary>
          <ClientOnly>
            <StatusChart data={analytics?.breakdown.byStatus} loading={analyticsLoading} />
          </ClientOnly>
        </ErrorBoundary>

        {/* Task Creation Trends */}
        <ErrorBoundary>
          <ClientOnly>
            <TrendsChart
              data={trends?.daily.taskCreation}
              loading={trendsLoading}
              title="Task Activity (Last 30 Days)"
            />
          </ClientOnly>
        </ErrorBoundary>
      </div>

      {/* Performance Metrics */}
      <ErrorBoundary>
        <ClientOnly>
          <PerformanceMetrics
            implementation={performance?.implementation}
            presubmit={performance?.presubmit}
            timeDistribution={performance?.timeDistribution}
            loading={performanceLoading}
          />
        </ClientOnly>
      </ErrorBoundary>

      {/* Time Breakdown Section */}
      <ErrorBoundary>
        <ClientOnly>
          <TimeBreakdownSection />
        </ClientOnly>
      </ErrorBoundary>

      {/* Token Usage & Cost Analysis */}
      <ErrorBoundary>
        <ClientOnly>
          <TokenUsageAnalytics />
        </ClientOnly>
      </ErrorBoundary>

      {/* Priority Distribution */}
      {analytics?.breakdown.byPriority && analytics.breakdown.byPriority.length > 0 && (
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-4">Priority Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.breakdown.byPriority.map((priority) => (
              <div key={priority.priority} className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  priority.priority === 'critical' ? 'text-red-500' :
                  priority.priority === 'high' ? 'text-orange-500' :
                  priority.priority === 'medium' ? 'text-yellow-500' :
                  'text-muted-foreground'
                }`}>
                  {priority.count}
                </div>
                <div className="text-sm text-muted-foreground capitalize">
                  {priority.priority}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
