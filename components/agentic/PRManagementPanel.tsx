'use client';

/**
 * PRManagementPanel Component
 * Manages coordinated pull requests with merge all, rollback, and sync capabilities
 * Follows TDD - implemented to pass the test suite
 */

import React from 'react';
import { AgenticPullRequest, PRStatus } from '@/types/agentic-task';
import { cn } from '@/lib/utils/cn';

interface Project {
  name: string;
  repoUrl: string;
}

interface PRManagementPanelProps {
  prs: AgenticPullRequest[];
  projects: Record<number, Project>;
  onMergeAll: (prGroupId: string) => void;
  onRollback: (prGroupId: string) => void;
  onSync: () => void;
  isMerging?: boolean;
  className?: string;
}

export function PRManagementPanel({
  prs,
  projects,
  onMergeAll,
  onRollback,
  onSync,
  isMerging = false,
  className,
}: PRManagementPanelProps) {
  if (prs.length === 0) {
    return (
      <div
        data-testid="pr-management-panel"
        className={cn('space-y-4 font-mono', className)}
      >
        <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-xs uppercase">
          No pull requests created yet
        </div>
      </div>
    );
  }

  const prGroupId = prs[0].prGroupId;
  const mergedCount = prs.filter(pr => pr.prStatus === 'merged').length;
  const openCount = prs.filter(pr => pr.prStatus === 'open' || pr.prStatus === 'approved').length;
  const allMerged = mergedCount === prs.length;
  const hasMerged = mergedCount > 0;

  const handleMergeAll = () => {
    if (window.confirm(`Merge all ${openCount} open pull requests?`)) {
      onMergeAll(prGroupId);
    }
  };

  const handleRollback = () => {
    if (window.confirm('Create rollback branches for all merged PRs?')) {
      onRollback(prGroupId);
    }
  };

  const getStatusColor = (status: PRStatus): string => {
    switch (status) {
      case 'draft':
        return 'text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]';
      case 'open':
        return 'text-[hsl(var(--chart-1))] bg-[hsl(var(--chart-1))]/10';
      case 'approved':
        return 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10';
      case 'merged':
        return 'text-[hsl(var(--chart-5))] bg-[hsl(var(--chart-5))]/10';
      case 'closed':
        return 'text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10';
      default:
        return 'text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]';
    }
  };

  return (
    <div
      data-testid="pr-management-panel"
      className={cn('space-y-4 font-mono', className)}
    >
      {/* Header with Group Info */}
      <div className="flex items-center justify-between p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
        <div>
          <div className="text-xs font-bold text-[hsl(var(--foreground))] uppercase">
            Coordinated PRs
          </div>
          <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
            Group: {prGroupId} • {prs.length} PRs • {mergedCount} merged
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            data-testid="sync-button"
            onClick={onSync}
            disabled={isMerging}
            className="px-2 py-1 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] uppercase"
            title="Sync PR status from GitHub"
          >
            ↻ Sync
          </button>
          
          {hasMerged && (
            <button
              data-testid="rollback-button"
              onClick={handleRollback}
              disabled={isMerging}
              className="px-3 py-1 border border-[hsl(var(--chart-4))] text-[hsl(var(--chart-4))] rounded-[2px] text-[10px] uppercase hover:bg-[hsl(var(--chart-4))]/10 disabled:opacity-50"
            >
              Rollback
            </button>
          )}

          <button
            data-testid="merge-all-button"
            onClick={handleMergeAll}
            disabled={isMerging || allMerged}
            className={cn(
              'px-3 py-1 font-bold rounded-[2px] text-[10px] uppercase',
              allMerged
                ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                : 'bg-[hsl(var(--primary))] text-black hover:opacity-90'
            )}
          >
            {isMerging ? 'Merging...' : `Merge All (${openCount})`}
          </button>
        </div>
      </div>

      {/* PR List */}
      <div className="space-y-2">
        {prs.map(pr => {
          const project = projects[pr.projectId];
          
          return (
            <div
              key={pr.id}
              className="border border-[hsl(var(--border))] rounded-[2px] overflow-hidden bg-[hsl(var(--card))]"
            >
              <div className="flex items-center gap-3 p-3">
                {/* Repo Name */}
                <div className="w-24 flex-shrink-0">
                  <span className="font-bold text-xs text-[hsl(var(--foreground))]">
                    {project?.name || `Repo ${pr.projectId}`}
                  </span>
                </div>

                {/* PR Number Link */}
                <a
                  data-testid="pr-link"
                  href={pr.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[hsl(var(--chart-1))] hover:underline text-xs font-mono"
                >
                  #{pr.prNumber}
                </a>

                {/* PR Title */}
                <div className="flex-1 min-w-0 text-xs text-[hsl(var(--muted-foreground))] truncate">
                  {pr.prTitle}
                </div>

                {/* Status Badge */}
                <span
                  data-testid={`pr-status-${pr.prStatus}`}
                  className={cn(
                    'px-2 py-0.5 rounded-[2px] text-[8px] uppercase font-bold',
                    getStatusColor(pr.prStatus)
                  )}
                >
                  {pr.prStatus}
                </span>
              </div>

              {/* Rollback Branch Info */}
              {pr.rollbackBranch && (
                <div className="px-3 py-2 bg-[hsl(var(--muted))]/30 border-t border-[hsl(var(--border))]/50">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    Rollback branch:{' '}
                    <code className="text-[hsl(var(--chart-4))]">{pr.rollbackBranch}</code>
                  </span>
                </div>
              )}

              {/* Merged At Info */}
              {pr.mergedAt && (
                <div className="px-3 py-2 bg-[hsl(var(--chart-5))]/5 border-t border-[hsl(var(--border))]/50">
                  <span className="text-[10px] text-[hsl(var(--chart-5))]">
                    Merged: {new Date(pr.mergedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading Overlay */}
      {isMerging && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase">
            Merging pull requests...
          </span>
        </div>
      )}
    </div>
  );
}

export default PRManagementPanel;

