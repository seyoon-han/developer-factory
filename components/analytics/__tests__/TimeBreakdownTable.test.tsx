import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimeBreakdownTable from '../TimeBreakdownTable';

// Mock the date utility functions
jest.mock('@/lib/utils/dates', () => ({
  formatDate: jest.fn((date) => new Date(date).toLocaleDateString()),
  formatDurationCompact: jest.fn((seconds) => {
    if (!seconds) return '—';
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  }),
  getTimeColorClass: jest.fn(() => 'text-green-600 dark:text-green-400')
}));

// Mock Lucide React
jest.mock('lucide-react', () => ({
  ChevronUp: ({ className }: any) => <div className={`mock-chevron-up ${className}`}>↑</div>,
  ChevronDown: ({ className }: any) => <div className={`mock-chevron-down ${className}`}>↓</div>,
  Download: ({ className }: any) => <div className={`mock-download ${className}`}>⬇</div>
}));

const mockTaskData = [
  {
    id: 1,
    title: 'Implement user authentication',
    status: 'completed',
    priority: 'high',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
    implementation: {
      elapsed_seconds: 3600,
      status: 'completed',
      started_at: '2024-01-15T10:30:00Z',
      completed_at: '2024-01-15T11:30:00Z',
    },
    evaluations: [
      {
        expert_role: 'code_reviewer',
        elapsed_seconds: 1800,
        status: 'completed'
      },
      {
        expert_role: 'security_expert',
        elapsed_seconds: 900,
        status: 'completed'
      }
    ],
    totalTime: 6300
  },
  {
    id: 2,
    title: 'Add error handling to API endpoints',
    status: 'implementing',
    priority: 'medium',
    created_at: '2024-01-16T09:00:00Z',
    updated_at: '2024-01-16T09:30:00Z',
    implementation: {
      elapsed_seconds: 1800,
      status: 'in_progress',
      started_at: '2024-01-16T09:00:00Z',
      completed_at: null,
    },
    evaluations: [],
    totalTime: 1800
  }
];

describe('TimeBreakdownTable', () => {
  const defaultProps = {
    data: mockTaskData,
    loading: false,
    onSort: jest.fn(),
    onExport: jest.fn(),
    currentSort: 'created_at',
    currentOrder: 'desc' as 'desc'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with task data', () => {
    render(<TimeBreakdownTable {...defaultProps} />);

    expect(screen.getByText('Task Time Breakdown (Last 7 Days)')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Add error handling to API endpoints')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<TimeBreakdownTable {...defaultProps} loading={true} />);

    // Should show skeleton loaders
    expect(screen.getByText('Task Time Breakdown (Last 7 Days)')).toBeInTheDocument();

    // Check for loading elements (animate-pulse class indicates skeleton)
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no data', () => {
    render(<TimeBreakdownTable {...defaultProps} data={[]} />);

    expect(screen.getByText('No tasks with time data found in the last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Tasks appear here once they enter the implementation phase')).toBeInTheDocument();

    // Export button should be disabled
    const exportButton = screen.getByRole('button', { name: /export csv/i });
    expect(exportButton).toBeDisabled();
  });

  it('handles sorting when column headers are clicked', () => {
    const mockOnSort = jest.fn();
    render(<TimeBreakdownTable {...defaultProps} onSort={mockOnSort} />);

    // Click on Status column header
    const statusHeader = screen.getByRole('button', { name: /status/i });
    fireEvent.click(statusHeader);

    expect(mockOnSort).toHaveBeenCalledWith('status', 'desc');
  });

  it('toggles sort order when same column is clicked twice', () => {
    const mockOnSort = jest.fn();
    render(<TimeBreakdownTable
      {...defaultProps}
      onSort={mockOnSort}
      currentSort="title"
      currentOrder="desc"
    />);

    // Click on Title column header (which is currently sorted desc)
    const titleHeader = screen.getByRole('button', { name: /task/i });
    fireEvent.click(titleHeader);

    expect(mockOnSort).toHaveBeenCalledWith('created_at', 'asc');
  });

  it('expands and collapses evaluation details', () => {
    render(<TimeBreakdownTable {...defaultProps} />);

    // Task 1 has evaluations, so it should have an expand button
    const expandButtons = screen.getAllByRole('button').filter(button =>
      button.querySelector('.mock-chevron-up') || button.querySelector('.mock-chevron-down')
    );

    expect(expandButtons.length).toBeGreaterThan(0);

    // Click to expand
    fireEvent.click(expandButtons[0]);

    // Should show evaluation details
    expect(screen.getByText('Evaluation Details:')).toBeInTheDocument();
    expect(screen.getByText('code_reviewer:')).toBeInTheDocument();
    expect(screen.getByText('security_expert:')).toBeInTheDocument();
  });

  it('calls onExport when export button is clicked', () => {
    const mockOnExport = jest.fn();
    render(<TimeBreakdownTable {...defaultProps} onExport={mockOnExport} />);

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });

  it('displays correct status formatting and colors', () => {
    render(<TimeBreakdownTable {...defaultProps} />);

    // Check that status values are properly formatted (first letter uppercase)
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Implementing')).toBeInTheDocument();
  });

  it('displays priority with correct styling', () => {
    render(<TimeBreakdownTable {...defaultProps} />);

    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('shows task count in footer', () => {
    render(<TimeBreakdownTable {...defaultProps} />);

    expect(screen.getByText('Showing 2 tasks with time tracking data from the last 7 days.')).toBeInTheDocument();
  });

  it('handles tasks without evaluations correctly', () => {
    render(<TimeBreakdownTable {...defaultProps} />);

    // Task 2 has no evaluations - should not show expand button
    const taskRows = screen.getAllByRole('row');

    // There should be task rows + header row
    expect(taskRows.length).toBeGreaterThan(1);

    // Check that evaluation time shows properly formatted zero values
    expect(screen.getAllByText('—')).toHaveLength(1); // Task 2 should have no evaluation time
  });

  it('truncates long task titles with tooltip', () => {
    const longTitleTask = {
      ...mockTaskData[0],
      title: 'This is a very long task title that should be truncated to prevent table layout issues and should show a tooltip on hover'
    };

    render(<TimeBreakdownTable {...defaultProps} data={[longTitleTask]} />);

    const titleElement = screen.getByTitle(longTitleTask.title);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveClass('truncate');
  });

  it('shows proper time formatting', () => {
    render(<TimeBreakdownTable {...defaultProps} />);

    // Check that time values are formatted using our mock function
    expect(screen.getByText('1h')).toBeInTheDocument(); // Implementation time for task 1
    expect(screen.getByText('30m')).toBeInTheDocument(); // Implementation time for task 2
  });
});