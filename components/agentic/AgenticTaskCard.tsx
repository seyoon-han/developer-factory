'use client';

/**
 * Agentic Task Card Component
 * Displays a single agentic task with real-time log streaming mini-terminal
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AgenticTask, AgenticPhase, AgenticLog } from '@/types/agentic-task';
import { useAgenticStore } from '@/lib/store/agenticStore';
import { cn } from '@/lib/utils/cn';
import { MiniTerminal } from './MiniTerminal';

interface AgenticTaskCardProps {
  task: AgenticTask;
  onSelect?: (task: AgenticTask) => void;
  showLogs?: boolean;
  className?: string;
}

// Phase display config - includes both UI and DB phase values
const phaseConfig: Record<AgenticPhase, { label: string; color: string; icon: string }> = {
  idle: { label: 'READY', color: 'bg-[hsl(var(--muted))]', icon: '' },
  todo: { label: 'TODO', color: 'bg-[hsl(var(--muted))]', icon: '' },
  brainstorming: { label: 'BRAINSTORM', color: 'bg-[hsl(var(--chart-3))]', icon: '' },
  clarifying: { label: 'CLARIFY', color: 'bg-[hsl(var(--chart-4))]', icon: '' },
  awaiting_clarification: { label: 'CLARIFY', color: 'bg-[hsl(var(--chart-4))]', icon: '' },
  planning: { label: 'PLANNING', color: 'bg-[hsl(var(--chart-2))]', icon: '' },
  plan_review: { label: 'REVIEW', color: 'bg-[hsl(var(--chart-5))]', icon: '' },
  awaiting_plan_review: { label: 'REVIEW', color: 'bg-[hsl(var(--chart-5))]', icon: '' },
  in_progress: { label: 'IN PROGRESS', color: 'bg-[hsl(var(--chart-1))]', icon: '' },
  executing: { label: 'EXECUTING', color: 'bg-[hsl(var(--chart-1))]', icon: '' },
  reviewing: { label: 'REVIEWING', color: 'bg-[hsl(var(--chart-5))]', icon: '' },
  verifying: { label: 'VERIFYING', color: 'bg-[hsl(var(--chart-2))]', icon: '' },
  creating_pr: { label: 'PR', color: 'bg-[hsl(var(--chart-5))]', icon: '' },
  awaiting_pr_review: { label: 'PR REVIEW', color: 'bg-[hsl(var(--chart-3))]', icon: '' },
  merging: { label: 'MERGING', color: 'bg-[hsl(var(--chart-4))]', icon: '' },
  done: { label: 'DONE', color: 'bg-[hsl(var(--primary))]', icon: '' },
  complete: { label: 'DONE', color: 'bg-[hsl(var(--primary))]', icon: '' },
  failed: { label: 'FAILED', color: 'bg-[hsl(var(--destructive))]', icon: '' },
  paused: { label: 'PAUSED', color: 'bg-[hsl(var(--accent))]', icon: '' },
};

// Priority colors - Updated for Lucky Logic
const priorityColors = {
  urgent: 'border-l-[hsl(var(--destructive))]',
  high: 'border-l-[hsl(var(--accent))]',
  medium: 'border-l-[hsl(var(--primary))]',
  low: 'border-l-[hsl(var(--muted-foreground))]',
};

export function AgenticTaskCard({ task, onSelect, showLogs = false, className }: AgenticTaskCardProps) {
  // Get entire log/clarification state and derive from it (stable selector)
  const taskLogs = useAgenticStore((s) => s.taskLogs);
  const taskClarifications = useAgenticStore((s) => s.taskClarifications);
  const fetchTaskLogs = useAgenticStore((s) => s.fetchTaskLogs);
  const fetchClarifications = useAgenticStore((s) => s.fetchClarifications);
  
  // Derive task-specific data with useMemo
  const logs = useMemo(() => taskLogs[task.id] || [], [taskLogs, task.id]);
  const clarifications = useMemo(() => taskClarifications[task.id] || [], [taskClarifications, task.id]);
  const pendingClarifications = useMemo(() => clarifications.filter((c) => !c.userAnswer), [clarifications]);

  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(showLogs);
  const [isHovered, setIsHovered] = useState(false);

  // Fetch logs and clarifications on mount
  useEffect(() => {
    if (task.id) {
      fetchTaskLogs(task.id);
      fetchClarifications(task.id);
    }
  }, [task.id, fetchTaskLogs, fetchClarifications]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsContainerRef.current && isExpanded) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  const phase = phaseConfig[task.currentPhase] || phaseConfig.idle;
  const hasPendingClarifications = pendingClarifications.length > 0;
  const isActive = ['brainstorming', 'planning', 'in_progress', 'executing', 'verifying', 'creating_pr', 'merging'].includes(task.currentPhase);

  return (
    <div
      className={cn(
        'bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[3px] shadow-sm',
        'transition-all duration-200 cursor-pointer',
        'hover:shadow-[var(--glow)] hover:border-[hsl(var(--primary))]',
        `border-l-4 ${priorityColors[task.priority]}`,
        isActive && 'shadow-[var(--glow)]',
        className
      )}
      onClick={() => onSelect?.(task)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-mono font-medium text-xs text-[hsl(var(--foreground))] line-clamp-2">
            {task.title}
          </h3>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold text-black whitespace-nowrap uppercase',
              phase.color
            )}
          >
            {phase.label}
          </span>
        </div>

        {task.description && (
          <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))] line-clamp-2 font-mono">
            {task.description}
          </p>
        )}
      </div>

      {/* Progress indicators */}
      {(task.currentStepIndex !== undefined && task.totalSteps !== undefined && task.totalSteps > 0) && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-[hsl(var(--muted))] overflow-hidden">
              <div
                className="h-full bg-[hsl(var(--primary))] transition-all duration-300"
                style={{ width: `${((task.currentStepIndex + 1) / task.totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
              {task.currentStepIndex + 1}/{task.totalSteps}
            </span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {hasPendingClarifications && (
        <div className="mx-3 mb-2 px-2 py-1 bg-[hsl(var(--accent))]/10 border border-[hsl(var(--accent))]/30 rounded-[2px] text-[10px] font-mono text-[hsl(var(--accent))]">
          [ACTION REQUIRED] {pendingClarifications.length} clarification{pendingClarifications.length > 1 ? 's' : ''} needed
        </div>
      )}

      {task.currentPhase === 'plan_review' && (
        <div className="mx-3 mb-2 px-2 py-1 bg-[hsl(var(--chart-4))]/10 border border-[hsl(var(--chart-4))]/30 rounded-[2px] text-[10px] font-mono text-[hsl(var(--chart-4))]">
          [REVIEW] Plan ready
        </div>
      )}

      {/* Token usage */}
      {task.tokenUsage && (task.tokenUsage.inputTokens > 0 || task.tokenUsage.outputTokens > 0) && (
        <div className="px-3 pb-2 flex items-center gap-3 text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
          <span title="Input tokens">IN: {formatTokens(task.tokenUsage.inputTokens)}</span>
          <span title="Output tokens">OUT: {formatTokens(task.tokenUsage.outputTokens)}</span>
          {task.tokenUsage.estimatedCost && (
            <span title="Estimated cost">${task.tokenUsage.estimatedCost.toFixed(4)}</span>
          )}
        </div>
      )}

      {/* Mini Terminal for live log streaming (shows last 3-5 lines) */}
      {isActive && logs.length > 0 && (
        <div className="mx-3 mb-2">
          <MiniTerminal
            logs={logs}
            maxLines={4}
            isStreaming={isActive}
            phase={task.currentPhase}
            onClick={(e) => {
              e?.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          />
        </div>
      )}

      {/* Expandable full logs section */}
      {(isExpanded || (isHovered && logs.length > 0 && !isActive)) && (
        <div className="border-t border-[hsl(var(--border))]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full px-3 py-1.5 text-[10px] font-mono text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] flex items-center justify-between"
          >
            <span>LOGS ({logs.length})</span>
            <span>{isExpanded ? '[-]' : '[+]'}</span>
          </button>

          {isExpanded && (
            <div
              ref={logsContainerRef}
              className="max-h-40 overflow-y-auto bg-black font-mono text-[10px] p-2 border-t border-[hsl(var(--border))]"
            >
              {logs.length === 0 ? (
                <div className="text-[hsl(var(--muted-foreground))] opacity-50">No logs yet...</div>
              ) : (
                logs.slice(-20).map((log, i) => (
                  <LogLine key={log.id || i} log={log} />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
        <span>#{task.id}</span>
        <span>{formatRelativeTime(task.updatedAt)}</span>
      </div>
    </div>
  );
}

// Log line component
function LogLine({ log }: { log: AgenticLog }) {
  const levelColors: Record<string, string> = {
    info: 'text-[hsl(var(--text-primary))]',
    warning: 'text-[hsl(var(--accent))]',
    error: 'text-[hsl(var(--destructive))]',
    debug: 'text-[hsl(var(--muted-foreground))]',
    success: 'text-[hsl(var(--primary))]',
  };

  const level = log.level || 'info';
  const levelColor = levelColors[level] || 'text-[hsl(var(--muted-foreground))]';

  return (
    <div className="py-0.5 flex gap-2">
      <span className="text-[hsl(var(--muted-foreground))] select-none opacity-50">
        {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
      </span>
      <span className={cn('uppercase w-10 text-right', levelColor)}>
        {level.slice(0, 4)}
      </span>
      <span className="text-[hsl(var(--foreground))] flex-1 break-all opacity-90">{log.message}</span>
    </div>
  );
}

// Helpers
function formatTokens(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default AgenticTaskCard;
