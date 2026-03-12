'use client';

/**
 * Agentic Task History Page
 * Shows archived tasks with full context, PR info, and rollback capabilities
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface TaskHistoryEntry {
  id: number;
  taskId: number;
  archivedData: {
    task: {
      id: number;
      title: string;
      description?: string;
      status: string;
      currentPhase: string;
      priority: string;
      projectGroupId?: number;
    };
    plan?: {
      planOverview?: string;
      planSteps?: any[];
    };
    clarifications?: any[];
    logsCount: number;
    worktrees?: any[];
    prs?: any[];
  };
  contextSummary?: string;
  finalStatus: string;
  prGroupInfo?: {
    prGroupId: string;
    totalPRs: number;
    prs: { projectId: number; prNumber?: number; prUrl?: string; status: string }[];
  };
  rollbackInfo?: {
    branches: { projectId: number; branchName: string; baseBranch: string }[];
  };
  archivedAt: string;
}

export default function AgenticHistoryPage() {
  const [entries, setEntries] = useState<TaskHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<TaskHistoryEntry | null>(null);
  const [filter, setFilter] = useState<'all' | 'done' | 'with-pr'>('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/agentic/history');
      const data = await res.json();
      if (data.entries) {
        setEntries(data.entries.map((e: any) => ({
          ...e,
          archivedData: typeof e.archived_data === 'string' ? JSON.parse(e.archived_data) : e.archivedData,
          prGroupInfo: e.pr_group_info ? (typeof e.pr_group_info === 'string' ? JSON.parse(e.pr_group_info) : e.prGroupInfo) : null,
          rollbackInfo: e.rollback_info ? (typeof e.rollback_info === 'string' ? JSON.parse(e.rollback_info) : e.rollbackInfo) : null,
          contextSummary: e.context_summary,
          finalStatus: e.final_status,
          archivedAt: e.archived_at,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'done') return e.finalStatus === 'done';
    if (filter === 'with-pr') return e.prGroupInfo && e.prGroupInfo.totalPRs > 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/agentic"
              className="text-xs font-mono text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors uppercase"
            >
              ← Back to Board
            </a>
            <h1 className="text-xl font-bold text-[hsl(var(--primary))] uppercase tracking-wider font-mono">
              Task History
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] text-xs font-mono uppercase"
            >
              <option value="all">All Tasks</option>
              <option value="done">Completed Only</option>
              <option value="with-pr">With PRs</option>
            </select>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* History List */}
        <div className="w-1/2 border-r border-[hsl(var(--border))] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <span className="text-sm font-mono text-[hsl(var(--muted-foreground))] uppercase">Loading...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <span className="text-sm font-mono text-[hsl(var(--muted-foreground))] uppercase mb-2">No History</span>
              <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] opacity-70">
                Completed tasks will appear here
              </span>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-[hsl(var(--muted))] transition-colors',
                    selectedEntry?.id === entry.id && 'bg-[hsl(var(--muted))]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-mono text-sm text-[hsl(var(--foreground))] font-medium line-clamp-1">
                      {entry.archivedData?.task?.title || 'Untitled Task'}
                    </h3>
                    <StatusBadge status={entry.finalStatus} />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                    <span>#{entry.taskId}</span>
                    {entry.prGroupInfo && (
                      <span className="px-1.5 py-0.5 bg-[hsl(var(--chart-5))]/20 text-[hsl(var(--chart-5))] rounded-[2px]">
                        {entry.prGroupInfo.totalPRs} PR{entry.prGroupInfo.totalPRs > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="ml-auto">{new Date(entry.archivedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="w-1/2 overflow-y-auto bg-[hsl(var(--card))]">
          {selectedEntry ? (
            <HistoryDetail entry={selectedEntry} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-sm font-mono text-[hsl(var(--muted-foreground))] uppercase">
                Select a task to view details
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    done: 'bg-[hsl(var(--primary))]',
    'in-progress': 'bg-[hsl(var(--chart-1))]',
    verifying: 'bg-[hsl(var(--chart-2))]',
    failed: 'bg-[hsl(var(--destructive))]',
  };

  return (
    <span className={cn(
      'px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold text-black uppercase',
      colors[status] || 'bg-[hsl(var(--muted))]'
    )}>
      {status}
    </span>
  );
}

function HistoryDetail({ entry }: { entry: TaskHistoryEntry }) {
  const task = entry.archivedData?.task;
  const plan = entry.archivedData?.plan;
  const clarifications = entry.archivedData?.clarifications || [];
  const prs = entry.archivedData?.prs || [];

  return (
    <div className="p-6 space-y-6 font-mono">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">#{entry.taskId}</span>
          <StatusBadge status={entry.finalStatus} />
        </div>
        <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
          {task?.title || 'Untitled Task'}
        </h2>
        {task?.description && (
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Context Summary */}
      {entry.contextSummary && (
        <div className="p-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[2px]">
          <h3 className="text-xs font-bold text-[hsl(var(--primary))] uppercase mb-2">Summary</h3>
          <pre className="text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">
            {entry.contextSummary}
          </pre>
        </div>
      )}

      {/* Plan Overview */}
      {plan?.planOverview && (
        <div>
          <h3 className="text-xs font-bold text-[hsl(var(--primary))] uppercase mb-2">Plan Overview</h3>
          <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">
            {plan.planOverview}
          </p>
          {plan.planSteps && plan.planSteps.length > 0 && (
            <div className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">
              {plan.planSteps.length} steps executed
            </div>
          )}
        </div>
      )}

      {/* Clarifications */}
      {clarifications.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[hsl(var(--primary))] uppercase mb-2">
            Clarifications ({clarifications.length})
          </h3>
          <div className="space-y-2">
            {clarifications.slice(0, 5).map((c: any, i: number) => (
              <div key={i} className="p-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[2px]">
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{c.questionText || c.question}</div>
                <div className="text-xs text-[hsl(var(--foreground))] mt-1">→ {c.userAnswer}</div>
              </div>
            ))}
            {clarifications.length > 5 && (
              <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                + {clarifications.length - 5} more...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pull Requests */}
      {entry.prGroupInfo && entry.prGroupInfo.prs.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[hsl(var(--primary))] uppercase mb-2">Pull Requests</h3>
          <div className="space-y-2">
            {entry.prGroupInfo.prs.map((pr, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[2px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs">Project #{pr.projectId}</span>
                  {pr.prNumber && <span className="text-xs text-[hsl(var(--muted-foreground)))]">PR #{pr.prNumber}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={pr.status} />
                  {pr.prUrl && (
                    <a
                      href={pr.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[hsl(var(--primary))] hover:underline"
                    >
                      View →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rollback Info */}
      {entry.rollbackInfo && entry.rollbackInfo.branches.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[hsl(var(--primary))] uppercase mb-2">Rollback Branches</h3>
          <div className="space-y-1">
            {entry.rollbackInfo.branches.map((branch, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">Project #{branch.projectId}</span>
                <code className="px-1.5 py-0.5 bg-[hsl(var(--muted))] rounded-[2px] text-[10px]">
                  {branch.branchName}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="pt-4 border-t border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted-foreground))]">
        <div>Archived: {new Date(entry.archivedAt).toLocaleString()}</div>
        <div>Logs: {entry.archivedData?.logsCount || 0} entries</div>
      </div>
    </div>
  );
}

