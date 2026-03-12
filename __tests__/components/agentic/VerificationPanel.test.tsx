/**
 * Tests for VerificationPanel Component
 * Following TDD: Write tests first, watch them fail, then implement
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerificationPanel } from '@/components/agentic/VerificationPanel';

// Mock verification results
const mockVerifications = [
  {
    id: 1,
    name: 'TypeScript Check',
    command: 'npm run type-check',
    success: true,
    output: 'No errors found',
    executionTime: 2500,
    required: true,
  },
  {
    id: 2,
    name: 'ESLint',
    command: 'npm run lint',
    success: true,
    output: 'Lint passed: 0 errors, 0 warnings',
    executionTime: 1800,
    required: false,
  },
  {
    id: 3,
    name: 'Build',
    command: 'npm run build',
    success: false,
    output: 'Build output...',
    error: 'Error: Cannot find module "@/types/missing"',
    executionTime: 15000,
    required: true,
  },
  {
    id: 4,
    name: 'Tests',
    command: 'npm test',
    success: true,
    output: 'Tests: 45 passed, 45 total\nTime: 8.234s',
    executionTime: 8234,
    required: true,
  },
];

const mockOnRerun = jest.fn();
const mockOnRerunFailed = jest.fn();
const mockOnApprove = jest.fn();

describe('VerificationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display', () => {
    test('renders verification panel', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByTestId('verification-panel')).toBeInTheDocument();
    });

    test('displays all verification results', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('TypeScript Check')).toBeInTheDocument();
      expect(screen.getByText('ESLint')).toBeInTheDocument();
      expect(screen.getByText('Build')).toBeInTheDocument();
      expect(screen.getByText('Tests')).toBeInTheDocument();
    });

    test('shows pass/fail icons for each verification', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      const passIcons = screen.getAllByTestId('status-pass');
      const failIcons = screen.getAllByTestId('status-fail');

      expect(passIcons).toHaveLength(3);
      expect(failIcons).toHaveLength(1);
    });

    test('shows required badge on required checks', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      const requiredBadges = screen.getAllByText(/required/i);
      expect(requiredBadges.length).toBeGreaterThan(0);
    });

    test('shows execution time for each check', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText(/2\.5s/)).toBeInTheDocument();
      expect(screen.getByText(/1\.8s/)).toBeInTheDocument();
    });
  });

  describe('Summary', () => {
    test('shows summary with passed/failed counts', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText(/3 passed/i)).toBeInTheDocument();
      expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
    });

    test('shows overall status as failed when any required check fails', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByTestId('overall-status')).toHaveTextContent(/failed/i);
    });

    test('shows overall status as passed when all required checks pass', () => {
      const passingVerifications = mockVerifications.map(v => ({ ...v, success: true }));
      
      render(
        <VerificationPanel
          verifications={passingVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByTestId('overall-status')).toHaveTextContent(/passed/i);
    });
  });

  describe('Expandable Output', () => {
    test('expands to show full output when clicked', async () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      const expandButtons = screen.getAllByTestId('expand-output-button');
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('No errors found')).toBeInTheDocument();
      });
    });

    test('shows error output for failed checks', async () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      // Find and expand the failed check (Build)
      const expandButtons = screen.getAllByTestId('expand-output-button');
      fireEvent.click(expandButtons[2]); // Build is third

      await waitFor(() => {
        expect(screen.getByText(/Cannot find module/)).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    test('re-run all button calls onRerun', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      const rerunButton = screen.getByTestId('rerun-all-button');
      fireEvent.click(rerunButton);

      expect(mockOnRerun).toHaveBeenCalled();
    });

    test('re-run failed button calls onRerunFailed', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      const rerunFailedButton = screen.getByTestId('rerun-failed-button');
      fireEvent.click(rerunFailedButton);

      expect(mockOnRerunFailed).toHaveBeenCalled();
    });

    test('re-run failed button is disabled when no failures', () => {
      const passingVerifications = mockVerifications.map(v => ({ ...v, success: true }));
      
      render(
        <VerificationPanel
          verifications={passingVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      const rerunFailedButton = screen.getByTestId('rerun-failed-button');
      expect(rerunFailedButton).toBeDisabled();
    });

    test('approve anyway button calls onApprove when there are failures', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      const approveButton = screen.getByTestId('approve-anyway-button');
      fireEvent.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    test('shows loading state when isRunning is true', () => {
      render(
        <VerificationPanel
          verifications={[]}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
          isRunning={true}
        />
      );

      expect(screen.getByText(/running verifications/i)).toBeInTheDocument();
    });

    test('disables buttons when running', () => {
      render(
        <VerificationPanel
          verifications={mockVerifications}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
          isRunning={true}
        />
      );

      expect(screen.getByTestId('rerun-all-button')).toBeDisabled();
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no verifications', () => {
      render(
        <VerificationPanel
          verifications={[]}
          onRerun={mockOnRerun}
          onRerunFailed={mockOnRerunFailed}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText(/No verifications run yet/i)).toBeInTheDocument();
    });
  });
});

