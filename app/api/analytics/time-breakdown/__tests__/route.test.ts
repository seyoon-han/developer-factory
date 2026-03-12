import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock the database module
jest.mock('@/lib/db/postgres', () => ({
  pool: {
    query: jest.fn()
  },
  DEFAULT_USER_ID: 'test0'
}));

import { pool } from '@/lib/db/postgres';

describe('/api/analytics/time-breakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/analytics/time-breakdown');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return new NextRequest(url);
  };

  const mockTaskData = [
    {
      id: 1,
      title: 'Test task 1',
      status: 'completed',
      priority: 'high',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T12:00:00Z',
      impl_elapsed: 3600, // 1 hour
      impl_status: 'completed',
      impl_started: '2024-01-15T10:30:00Z',
      impl_completed: '2024-01-15T11:30:00Z',
      evaluations: 'code_reviewer:1800:completed,security_expert:900:completed',
      total_time: 6300,
      eval_total: 2700
    },
    {
      id: 2,
      title: 'Test task 2',
      status: 'implementing',
      priority: 'medium',
      created_at: '2024-01-16T09:00:00Z',
      updated_at: '2024-01-16T09:30:00Z',
      impl_elapsed: 1800, // 30 min
      impl_status: 'in_progress',
      impl_started: '2024-01-16T09:00:00Z',
      impl_completed: null,
      evaluations: null,
      total_time: 1800,
      eval_total: 0
    }
  ];

  it('should return time breakdown data with default parameters', async () => {
    // Mock pool.query to return different results based on query
    (pool.query as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '2' }] });
      }
      return Promise.resolve({ rows: mockTaskData });
    });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('tasks');
    expect(data).toHaveProperty('distribution');
    expect(data).toHaveProperty('pagination');

    // Check summary calculations
    expect(data.summary.totalTasks).toBe(2);
    expect(data.summary.avgImplementationTime).toBe(2700); // (3600 + 1800) / 2
    expect(data.summary.avgEvaluationTime).toBe(1350); // (1800 + 900) / 2
    expect(data.summary.totalTimeInvested).toBe(8100); // 6300 + 1800

    // Check tasks
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks[0].id).toBe(1);
    expect(data.tasks[0].totalTime).toBe(6300);
    expect(data.tasks[0].evaluations).toHaveLength(2);

    // Check pagination
    expect(data.pagination.total).toBe(2);
    expect(data.pagination.hasMore).toBe(false);
  });

  it('should handle query parameters correctly', async () => {
    (pool.query as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '1' }] });
      }
      return Promise.resolve({ rows: [mockTaskData[0]] });
    });

    const request = createMockRequest({
      days: '14',
      sort: 'total_time',
      order: 'asc',
      limit: '25',
      offset: '10'
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalled();
  });

  it('should validate query parameters and return 400 for invalid values', async () => {
    const request = createMockRequest({
      days: 'invalid',
      limit: '0'
    });

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Invalid query parameters');
  });

  it('should handle database errors', async () => {
    (pool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Internal server error');
  });

  it('should calculate time distribution correctly', async () => {
    const testData = [
      { ...mockTaskData[0], impl_elapsed: 1200, total_time: 1200 }, // 20 min - first bucket
      { ...mockTaskData[1], impl_elapsed: 2400, total_time: 2400 }, // 40 min - second bucket
    ];

    (pool.query as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '2' }] });
      }
      return Promise.resolve({ rows: testData });
    });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.distribution).toHaveLength(5);

    const first = data.distribution.find((d: any) => d.timeRange === '0-30min');
    const second = data.distribution.find((d: any) => d.timeRange === '30min-1h');

    expect(first.implementationCount).toBe(1);
    expect(second.implementationCount).toBe(1);
  });

  it('should handle empty evaluation strings correctly', async () => {
    const taskWithNoEvals = {
      ...mockTaskData[0],
      evaluations: null,
      eval_total: 0
    };

    (pool.query as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '1' }] });
      }
      return Promise.resolve({ rows: [taskWithNoEvals] });
    });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.tasks[0].evaluations).toHaveLength(0);
    expect(data.summary.avgEvaluationTime).toBe(0);
  });

  it('should handle malformed evaluation strings gracefully', async () => {
    const taskWithBadEvals = {
      ...mockTaskData[0],
      evaluations: 'invalid:format,another:bad:format:extra',
      eval_total: 0
    };

    (pool.query as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '1' }] });
      }
      return Promise.resolve({ rows: [taskWithBadEvals] });
    });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should still work, just with empty or filtered evaluations
    expect(data.tasks).toHaveLength(1);
  });

  it('should set appropriate cache headers', async () => {
    (pool.query as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '0' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const request = createMockRequest();
    const response = await GET(request);

    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toContain('s-maxage=60');
    expect(cacheControl).toContain('stale-while-revalidate=120');
  });

  it('should handle different sort columns correctly', async () => {
    (pool.query as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '2' }] });
      }
      return Promise.resolve({ rows: mockTaskData });
    });

    const sortColumns = ['title', 'status', 'implementation_time', 'evaluation_time'];

    for (const sort of sortColumns) {
      const request = createMockRequest({ sort, order: 'asc' });
      const response = await GET(request);

      expect(response.status).toBe(200);
    }
  });
});
