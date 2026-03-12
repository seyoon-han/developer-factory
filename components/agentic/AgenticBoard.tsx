'use client';

/**
 * Agentic Kanban Board Component
 * Displays tasks organized by workflow phase in a Kanban-style layout
 */

import React, { useEffect, useMemo } from 'react';
import { AgenticTask, AgenticPhase } from '@/types/agentic-task';
import { useAgenticStore } from '@/lib/store/agenticStore';
import { AgenticTaskCard } from './AgenticTaskCard';
import { cn } from '@/lib/utils/cn';

// Column definitions with phases
const columns: { id: string; title: string; phases: AgenticPhase[]; color: string }[] = [
  {
    id: 'todo',
    title: 'TODO',
    phases: ['todo', 'idle'],
    color: 'border-t-[hsl(var(--muted-foreground))]',
  },
  {
    id: 'brainstorming',
    title: 'BRAINSTORM',
    phases: ['brainstorming', 'clarifying', 'awaiting_clarification'],
    color: 'border-t-[hsl(var(--chart-3))]',
  },
  {
    id: 'planning',
    title: 'PLANNING',
    phases: ['planning', 'plan_review', 'awaiting_plan_review'],
    color: 'border-t-[hsl(var(--chart-4))]',
  },
  {
    id: 'in_progress',
    title: 'IN PROGRESS',
    phases: ['in_progress', 'executing', 'reviewing'],
    color: 'border-t-[hsl(var(--chart-1))]',
  },
  {
    id: 'verifying',
    title: 'VERIFYING',
    phases: ['verifying'],
    color: 'border-t-[hsl(var(--chart-2))]',
  },
  {
    id: 'pr',
    title: 'PULL REQUEST',
    phases: ['creating_pr', 'awaiting_pr_review', 'merging'],
    color: 'border-t-[hsl(var(--chart-5))]',
  },
  {
    id: 'done',
    title: 'DONE',
    phases: ['done', 'complete'],
    color: 'border-t-[hsl(var(--primary))]',
  },
];

interface AgenticBoardProps {
  projectGroupId?: number;
  onTaskSelect?: (task: AgenticTask) => void;
  className?: string;
}

export function AgenticBoard({ projectGroupId, onTaskSelect, className }: AgenticBoardProps) {
  const tasks = useAgenticStore((s) => s.tasks);
  const fetchTasks = useAgenticStore((s) => s.fetchTasks);
  const isLoadingTasks = useAgenticStore((s) => s.isLoadingTasks);

  // Fetch tasks on mount and when filter changes
  useEffect(() => {
    fetchTasks(projectGroupId ? { projectGroupId } : {});

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchTasks(projectGroupId ? { projectGroupId } : {});
    }, 5000);

    return () => clearInterval(interval);
  }, [projectGroupId, fetchTasks]);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, AgenticTask[]> = {};
    columns.forEach((col) => {
      grouped[col.id] = tasks.filter((t) => col.phases.includes(t.currentPhase));
    });
    // Also track failed and paused separately
    grouped['failed'] = tasks.filter((t) => t.currentPhase === 'failed');
    grouped['paused'] = tasks.filter((t) => t.currentPhase === 'paused');
    return grouped;
  }, [tasks]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Failed/Paused alerts */}
      {(tasksByColumn['failed']?.length > 0 || tasksByColumn['paused']?.length > 0) && (
        <div className="flex-shrink-0 p-4 border-b border-[hsl(var(--border))] flex gap-4 bg-[hsl(var(--background))]">
          {tasksByColumn['failed']?.length > 0 && (
            <div className="px-3 py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] rounded-[3px] text-xs font-mono bg-[hsl(var(--destructive))]/10">
              [FAILED] {tasksByColumn['failed'].length} task{tasksByColumn['failed'].length > 1 ? 's' : ''}
            </div>
          )}
          {tasksByColumn['paused']?.length > 0 && (
            <div className="px-3 py-2 border border-[hsl(var(--accent))] text-[hsl(var(--accent))] rounded-[3px] text-xs font-mono bg-[hsl(var(--accent))]/10">
              [PAUSED] {tasksByColumn['paused'].length} task{tasksByColumn['paused'].length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Board columns */}
      <div className="flex-1 overflow-x-auto bg-[hsl(var(--background))]">
        <div className="flex h-full min-w-max p-4 gap-4">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByColumn[column.id] || []}
              isLoading={isLoadingTasks}
              onTaskSelect={onTaskSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Column component
interface BoardColumnProps {
  title: string;
  color: string;
  tasks: AgenticTask[];
  isLoading?: boolean;
  onTaskSelect?: (task: AgenticTask) => void;
}

function BoardColumn({ title, color, tasks, isLoading, onTaskSelect }: BoardColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col w-80 bg-[hsl(var(--card))] rounded-[3px] border border-[hsl(var(--border))]',
        color.replace('border-t-', 'border-t-2 border-t-')
      )}
    >
      {/* Column header */}
      <div className="flex-shrink-0 p-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
        <div className="flex items-center justify-between">
          <h2 className="font-mono font-semibold text-xs text-[hsl(var(--foreground))] tracking-wider">{title}</h2>
          <span className="px-1.5 py-0.5 border border-[hsl(var(--border))] rounded-[3px] text-[10px] text-[hsl(var(--muted-foreground))] font-mono bg-[hsl(var(--background))]">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-xs font-mono text-[hsl(var(--muted-foreground))]">
            LOADING...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-xs font-mono text-[hsl(var(--muted-foreground))] opacity-50">
            NO TASKS
          </div>
        ) : (
          tasks.map((task) => (
            <AgenticTaskCard
              key={task.id}
              task={task}
              onSelect={onTaskSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default AgenticBoard;
