# Analytics Dashboard

This directory contains the comprehensive analytics dashboard implementation for the Dev Automation Board. The analytics system provides real-time insights into task performance, workflow efficiency, and team productivity.

## Features

### 📊 Summary Cards
- **Total Tasks**: Complete count of all tasks in the system
- **Completed Tasks**: Tasks that have reached the "publish" status
- **In Progress Tasks**: Tasks in enhance_requirement, implement, or presubmit_evaluation stages
- **Todo Tasks**: Tasks waiting to be started

### 📈 Interactive Charts
- **Status Distribution**: Pie chart showing task distribution across all workflow stages
- **Task Activity Trends**: Line chart displaying task creation and completion over time
- **Implementation Time Distribution**: Bar chart showing time ranges for task implementations
- **Performance Metrics**: Key metrics for implementation and presubmit evaluation success rates

### ⚡ Real-time Updates
- Auto-refreshes every 5 seconds for summary data (matching board refresh rate)
- Trends and performance data refresh every 30 seconds
- Optimized caching with stale-while-revalidate for better performance

## API Endpoints

### `/api/analytics`
Main analytics endpoint providing summary statistics, status/priority breakdowns, and recent activity trends.
- **Cache**: 30s with 60s stale-while-revalidate
- **Refresh**: Every 5 seconds on frontend

### `/api/analytics/trends?period=30`
Time-series data for task creation, completion, and implementation trends.
- **Parameters**: `period` (7-365 days)
- **Cache**: 5 minutes with 10 minutes stale-while-revalidate

### `/api/analytics/performance`
Detailed performance metrics for implementations and presubmit evaluations.
- **Cache**: 2 minutes with 4 minutes stale-while-revalidate
- **Includes**: Success rates, time distributions, expert performance analysis

## Components

### Core Components
- `SummaryCards.tsx`: Statistical overview cards
- `StatusChart.tsx`: Pie chart for status distribution (using Recharts)
- `TrendsChart.tsx`: Line chart for time-series data (using Recharts)
- `PerformanceMetrics.tsx`: Performance dashboard with multiple metrics

### Utilities
- `useAnalytics.ts`: Custom hooks for data fetching with automatic refresh
- `ClientOnly.tsx`: SSR-safe wrapper for client-only components
- `ErrorBoundary.tsx`: Error handling for chart components

## Database Schema

The analytics system leverages the existing SQLite database with the following key tables:
- `tasks`: Main task data with status, priority, timestamps
- `task_implementation`: Implementation tracking with timing metrics
- `presubmit_evaluations`: Expert evaluation data with performance metrics
- `task_prompts`: Prompt enhancement tracking
- `task_queue`: Queue processing statistics

## Performance Optimizations

1. **Server-Side Caching**: HTTP cache headers on API responses
2. **Client-Side Optimization**: Dynamic imports for chart components to prevent SSR issues
3. **Efficient Queries**: Indexed database queries with prepared statements
4. **Progressive Loading**: Skeleton states and graceful error handling
5. **Memory Management**: Proper cleanup of intervals in useEffect hooks

## Error Handling

- **API Errors**: Proper HTTP status codes and error messages
- **Component Errors**: Error boundaries prevent crash propagation
- **Network Issues**: Retry logic and fallback states
- **SSR Compatibility**: Client-only wrappers prevent hydration mismatches

## Usage

The analytics page is automatically available at `/analytics` in the application. No additional configuration is required as it uses the existing database and follows established patterns from the codebase.

## Testing

Basic unit tests are provided for the core components. The API endpoints return real data from the SQLite database and can be tested directly:

```bash
curl http://localhost:3000/api/analytics
curl http://localhost:3000/api/analytics/trends?period=7
curl http://localhost:3000/api/analytics/performance
```

## Future Enhancements

- Export functionality for reports
- Custom date range selection
- Advanced filtering options
- Email/Slack notifications for key metrics
- Historical data comparisons
- Custom dashboard layouts