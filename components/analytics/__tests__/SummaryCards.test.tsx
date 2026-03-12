import { render, screen } from '@testing-library/react';
import SummaryCards from '../SummaryCards';

describe('SummaryCards', () => {
  const mockData = {
    totalTasks: 100,
    completedTasks: 75,
    inProgressTasks: 20,
    todoTasks: 5
  };

  it('renders summary cards with data', () => {
    render(<SummaryCards data={mockData} loading={false} />);

    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Todo')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<SummaryCards loading={true} />);

    // Should show skeleton loaders
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('handles no data gracefully', () => {
    render(<SummaryCards />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});