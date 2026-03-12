/**
 * Tests for MiniTerminal Component
 * Following TDD: Write tests first, watch them fail, then implement
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MiniTerminal } from '@/components/agentic/MiniTerminal';
import { AgenticLog } from '@/types/agentic-task';

// Mock logs data
const mockLogs: AgenticLog[] = [
  {
    id: 1,
    taskId: 1,
    level: 'info',
    phase: 'execution',
    message: 'Starting implementation step 1...',
    timestamp: new Date().toISOString(),
  },
  {
    id: 2,
    taskId: 1,
    level: 'info',
    phase: 'execution',
    message: 'Creating file: src/utils/auth.ts',
    timestamp: new Date().toISOString(),
  },
  {
    id: 3,
    taskId: 1,
    level: 'success',
    phase: 'execution',
    message: 'File created successfully',
    timestamp: new Date().toISOString(),
  },
  {
    id: 4,
    taskId: 1,
    level: 'info',
    phase: 'execution',
    message: 'Writing authentication middleware...',
    timestamp: new Date().toISOString(),
  },
  {
    id: 5,
    taskId: 1,
    level: 'info',
    phase: 'execution',
    message: 'Running TypeScript compilation...',
    timestamp: new Date().toISOString(),
  },
  {
    id: 6,
    taskId: 1,
    level: 'info',
    phase: 'execution',
    message: 'Compilation successful. No errors found.',
    timestamp: new Date().toISOString(),
  },
];

describe('MiniTerminal', () => {
  describe('Display', () => {
    test('renders terminal container', () => {
      render(<MiniTerminal logs={mockLogs} maxLines={5} />);
      expect(screen.getByTestId('mini-terminal')).toBeInTheDocument();
    });

    test('displays only last N lines based on maxLines prop', () => {
      render(<MiniTerminal logs={mockLogs} maxLines={3} />);
      
      const terminal = screen.getByTestId('mini-terminal');
      const lines = terminal.querySelectorAll('[data-testid="log-line"]');
      
      expect(lines).toHaveLength(3);
    });

    test('shows latest logs (last 5 by default)', () => {
      render(<MiniTerminal logs={mockLogs} />);
      
      // Should show last 5 logs
      expect(screen.getByText(/Compilation successful/)).toBeInTheDocument();
      expect(screen.getByText(/Running TypeScript/)).toBeInTheDocument();
      expect(screen.getByText(/Writing authentication/)).toBeInTheDocument();
      expect(screen.getByText(/File created successfully/)).toBeInTheDocument();
      expect(screen.getByText(/Creating file: src\/utils\/auth/)).toBeInTheDocument();
      
      // Should NOT show first log (oldest)
      expect(screen.queryByText(/Starting implementation step 1/)).not.toBeInTheDocument();
    });

    test('shows empty state when no logs', () => {
      render(<MiniTerminal logs={[]} maxLines={5} />);
      
      expect(screen.getByText(/Waiting for output/i)).toBeInTheDocument();
    });
  });

  describe('Log Level Styling', () => {
    test('applies correct color for info level', () => {
      const infoLogs: AgenticLog[] = [{
        id: 1,
        taskId: 1,
        level: 'info',
        phase: 'execution',
        message: 'Info message',
        timestamp: new Date().toISOString(),
      }];

      render(<MiniTerminal logs={infoLogs} maxLines={5} />);
      
      const line = screen.getByTestId('log-line');
      expect(line).toHaveClass('text-[hsl(var(--muted-foreground))]');
    });

    test('applies correct color for success level', () => {
      const successLogs: AgenticLog[] = [{
        id: 1,
        taskId: 1,
        level: 'success',
        phase: 'execution',
        message: 'Success message',
        timestamp: new Date().toISOString(),
      }];

      render(<MiniTerminal logs={successLogs} maxLines={5} />);
      
      const line = screen.getByTestId('log-line');
      expect(line).toHaveClass('text-[hsl(var(--primary))]');
    });

    test('applies correct color for error level', () => {
      const errorLogs: AgenticLog[] = [{
        id: 1,
        taskId: 1,
        level: 'error',
        phase: 'execution',
        message: 'Error message',
        timestamp: new Date().toISOString(),
      }];

      render(<MiniTerminal logs={errorLogs} maxLines={5} />);
      
      const line = screen.getByTestId('log-line');
      expect(line).toHaveClass('text-[hsl(var(--destructive))]');
    });

    test('applies correct color for warning level', () => {
      const warningLogs: AgenticLog[] = [{
        id: 1,
        taskId: 1,
        level: 'warning',
        phase: 'execution',
        message: 'Warning message',
        timestamp: new Date().toISOString(),
      }];

      render(<MiniTerminal logs={warningLogs} maxLines={5} />);
      
      const line = screen.getByTestId('log-line');
      expect(line).toHaveClass('text-[hsl(var(--chart-4))]');
    });
  });

  describe('Streaming Animation', () => {
    test('has terminal blink cursor when streaming', () => {
      render(<MiniTerminal logs={mockLogs} isStreaming={true} maxLines={5} />);
      
      expect(screen.getByTestId('blink-cursor')).toBeInTheDocument();
    });

    test('cursor is hidden when not streaming', () => {
      render(<MiniTerminal logs={mockLogs} isStreaming={false} maxLines={5} />);
      
      expect(screen.queryByTestId('blink-cursor')).not.toBeInTheDocument();
    });

    test('new logs appear when logs are added', async () => {
      const { rerender } = render(<MiniTerminal logs={mockLogs.slice(0, 3)} maxLines={5} />);
      
      // Should show 3 logs initially
      expect(screen.getAllByTestId('log-line')).toHaveLength(3);
      
      // Add more logs
      rerender(<MiniTerminal logs={mockLogs} maxLines={5} />);
      
      // Should now show 5 logs (maxLines)
      expect(screen.getAllByTestId('log-line')).toHaveLength(5);
    });
  });

  describe('Terminal Header', () => {
    test('shows terminal header when showHeader is true', () => {
      render(<MiniTerminal logs={mockLogs} showHeader={true} maxLines={5} />);
      
      expect(screen.getByTestId('terminal-header')).toBeInTheDocument();
    });

    test('hides terminal header when showHeader is false', () => {
      render(<MiniTerminal logs={mockLogs} showHeader={false} maxLines={5} />);
      
      expect(screen.queryByTestId('terminal-header')).not.toBeInTheDocument();
    });

    test('header shows phase name', () => {
      render(<MiniTerminal logs={mockLogs} showHeader={true} phase="execution" maxLines={5} />);
      
      expect(screen.getByText(/execution/i)).toBeInTheDocument();
    });
  });

  describe('Truncation', () => {
    test('truncates long messages', () => {
      const longLog: AgenticLog[] = [{
        id: 1,
        taskId: 1,
        level: 'info',
        phase: 'execution',
        message: 'A'.repeat(200),
        timestamp: new Date().toISOString(),
      }];

      render(<MiniTerminal logs={longLog} maxLines={5} maxChars={100} />);
      
      const line = screen.getByTestId('log-line');
      expect(line.textContent?.length).toBeLessThan(200);
      expect(line.textContent).toContain('...');
    });
  });

  describe('Click Handling', () => {
    test('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<MiniTerminal logs={mockLogs} maxLines={5} onClick={handleClick} />);
      
      const terminal = screen.getByTestId('mini-terminal');
      terminal.click();
      
      expect(handleClick).toHaveBeenCalled();
    });
  });
});

