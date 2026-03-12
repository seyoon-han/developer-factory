/**
 * Tests for PRManagementPanel Component
 * Following TDD: Write tests first, watch them fail, then implement
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PRManagementPanel } from '@/components/agentic/PRManagementPanel';
import { AgenticPullRequest } from '@/types/agentic-task';

// Mock PR data
const mockPRs: AgenticPullRequest[] = [
  {
    id: 1,
    taskId: 1,
    prGroupId: 'group-123',
    projectId: 1,
    worktreeId: 1,
    prNumber: 42,
    prUrl: 'https://github.com/org/frontend/pull/42',
    prTitle: 'feat: Add user authentication',
    prBody: 'Implements login/logout functionality',
    prStatus: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    taskId: 1,
    prGroupId: 'group-123',
    projectId: 2,
    worktreeId: 2,
    prNumber: 15,
    prUrl: 'https://github.com/org/backend/pull/15',
    prTitle: 'feat: Add auth API endpoints',
    prBody: 'Implements auth API',
    prStatus: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    taskId: 1,
    prGroupId: 'group-123',
    projectId: 3,
    worktreeId: 3,
    prNumber: 8,
    prUrl: 'https://github.com/org/shared/pull/8',
    prTitle: 'feat: Add auth types',
    prBody: 'Shared types for auth',
    prStatus: 'merged',
    mergedAt: new Date().toISOString(),
    rollbackBranch: 'rollback/task-1-123456789',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock project data for display
const mockProjects = {
  1: { name: 'frontend', repoUrl: 'https://github.com/org/frontend' },
  2: { name: 'backend', repoUrl: 'https://github.com/org/backend' },
  3: { name: 'shared', repoUrl: 'https://github.com/org/shared' },
};

const mockOnMergeAll = jest.fn();
const mockOnRollback = jest.fn();
const mockOnSync = jest.fn();

describe('PRManagementPanel', () => {
  const originalConfirm = window.confirm;
  
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn().mockReturnValue(true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  describe('Display', () => {
    test('renders PR management panel', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByTestId('pr-management-panel')).toBeInTheDocument();
    });

    test('displays all PRs in the group', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('backend')).toBeInTheDocument();
      expect(screen.getByText('shared')).toBeInTheDocument();
    });

    test('shows PR numbers and links', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByText('#42')).toBeInTheDocument();
      expect(screen.getByText('#15')).toBeInTheDocument();
      expect(screen.getByText('#8')).toBeInTheDocument();
    });

    test('shows PR status badges', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByTestId('pr-status-open')).toBeInTheDocument();
      expect(screen.getByTestId('pr-status-approved')).toBeInTheDocument();
      expect(screen.getByTestId('pr-status-merged')).toBeInTheDocument();
    });

    test('shows PR title', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByText(/Add user authentication/)).toBeInTheDocument();
      expect(screen.getByText(/Add auth API endpoints/)).toBeInTheDocument();
    });
  });

  describe('Group Summary', () => {
    test('shows group ID', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByText(/group-123/i)).toBeInTheDocument();
    });

    test('shows total PR count', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByText(/3 PRs/i)).toBeInTheDocument();
    });

    test('shows merged count', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByText(/1 merged/i)).toBeInTheDocument();
    });
  });

  describe('Merge All Action', () => {
    test('merge all button calls onMergeAll', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      const mergeAllButton = screen.getByTestId('merge-all-button');
      fireEvent.click(mergeAllButton);

      expect(mockOnMergeAll).toHaveBeenCalledWith('group-123');
    });

    test('merge all button is disabled when all PRs are merged', () => {
      const allMergedPRs = mockPRs.map(pr => ({
        ...pr,
        prStatus: 'merged' as const,
        mergedAt: new Date().toISOString(),
      }));

      render(
        <PRManagementPanel
          prs={allMergedPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByTestId('merge-all-button')).toBeDisabled();
    });

    test('merge all button shows confirmation dialog', async () => {
      window.confirm = jest.fn().mockReturnValue(true);

      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      const mergeAllButton = screen.getByTestId('merge-all-button');
      fireEvent.click(mergeAllButton);

      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('Rollback Action', () => {
    test('rollback button is shown for merged PRs', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByTestId('rollback-button')).toBeInTheDocument();
    });

    test('rollback button calls onRollback with group ID', () => {
      window.confirm = jest.fn().mockReturnValue(true);

      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      const rollbackButton = screen.getByTestId('rollback-button');
      fireEvent.click(rollbackButton);

      expect(mockOnRollback).toHaveBeenCalledWith('group-123');
    });

    test('shows rollback branch info when available', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByText(/rollback\/task-1/)).toBeInTheDocument();
    });
  });

  describe('Sync Action', () => {
    test('sync button calls onSync', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      const syncButton = screen.getByTestId('sync-button');
      fireEvent.click(syncButton);

      expect(mockOnSync).toHaveBeenCalled();
    });
  });

  describe('External Links', () => {
    test('PR links open in new tab', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      const prLinks = screen.getAllByTestId('pr-link');
      expect(prLinks[0]).toHaveAttribute('target', '_blank');
      expect(prLinks[0]).toHaveAttribute('href', 'https://github.com/org/frontend/pull/42');
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no PRs', () => {
      render(
        <PRManagementPanel
          prs={[]}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
        />
      );

      expect(screen.getByText(/No pull requests/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('shows loading state when isMerging', () => {
      render(
        <PRManagementPanel
          prs={mockPRs}
          projects={mockProjects}
          onMergeAll={mockOnMergeAll}
          onRollback={mockOnRollback}
          onSync={mockOnSync}
          isMerging={true}
        />
      );

      // Should show "Merging pull requests..." message
      expect(screen.getByText(/Merging pull requests/i)).toBeInTheDocument();
    });
  });
});

