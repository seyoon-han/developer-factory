'use client';

/**
 * Agentic Workflow Board Page
 * Main page displaying the Kanban board for agentic tasks
 */

import React, { useState, useEffect } from 'react';
import { AgenticBoard, TaskCreationWizard, TaskDetailPanel } from '@/components/agentic';
import { useAgenticStore } from '@/lib/store/agenticStore';
import { AgenticTask } from '@/types/agentic-task';
import { cn } from '@/lib/utils/cn';

export default function AgenticPage() {
  const [selectedTask, setSelectedTask] = useState<AgenticTask | null>(null);

  const projectGroups = useAgenticStore((s) => s.projectGroups);
  const selectedProjectGroupId = useAgenticStore((s) => s.selectedProjectGroupId);
  const selectProjectGroup = useAgenticStore((s) => s.selectProjectGroup);
  const fetchProjectGroups = useAgenticStore((s) => s.fetchProjectGroups);
  const error = useAgenticStore((s) => s.error);
  const clearError = useAgenticStore((s) => s.clearError);
  
  // Header state items (formerly in AgenticBoard)
  const fetchQueueStatus = useAgenticStore((s) => s.fetchQueueStatus);
  const queueStatus = useAgenticStore((s) => s.queueStatus);
  const openTaskCreationWizard = useAgenticStore((s) => s.openTaskCreationWizard);
  const startQueue = useAgenticStore((s) => s.startQueue);
  const pauseQueue = useAgenticStore((s) => s.pauseQueue);

  // Fetch project groups on mount
  useEffect(() => {
    fetchProjectGroups();
    fetchQueueStatus();
    
    // Poll for status updates (every 5 seconds, same as AgenticBoard tasks polling)
    // AgenticBoard does its own polling for tasks, but we need queue status up here too
    const interval = setInterval(() => {
      fetchQueueStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchProjectGroups, fetchQueueStatus]);

  const handleTaskSelect = (task: AgenticTask) => {
    setSelectedTask(task);
  };

  const handleCloseDetail = () => {
    setSelectedTask(null);
  };

  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--background))]">
      {/* Unified Header */}
      <header className="flex-shrink-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-[hsl(var(--primary))] uppercase tracking-wider font-mono">
              Agentic Workflow
            </h1>

            {/* Separator */}
            <div className="h-4 w-px bg-[hsl(var(--border))]" />

            {/* Project Group Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase">Group:</span>
              <select
                value={selectedProjectGroupId || ''}
                onChange={(e) => selectProjectGroup(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="px-2 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] text-xs font-mono text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))] uppercase cursor-pointer"
              >
                <option value="">ALL GROUPS</option>
                {projectGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Separator */}
            <div className="h-4 w-px bg-[hsl(var(--border))]" />

            {/* Queue status */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[hsl(var(--muted-foreground))]">STATUS:</span>
                <span className={cn(
                  'font-bold',
                  queueStatus.isRunning ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'
                )}>
                  {queueStatus.isRunning ? 'RUNNING' : 'PAUSED'}
                </span>
              </div>
              <span className="text-[hsl(var(--muted-foreground))]">|</span>
              <div className="flex items-center gap-2">
                 <span className="text-[hsl(var(--muted-foreground))]">ACTIVE:</span>
                 <span className="text-[hsl(var(--foreground))]">{queueStatus.activeTasks}/{queueStatus.maxConcurrent}</span>
              </div>
              <span className="text-[hsl(var(--muted-foreground))]">|</span>
              <div className="flex items-center gap-2">
                 <span className="text-[hsl(var(--muted-foreground))]">PENDING:</span>
                 <span className="text-[hsl(var(--foreground))]">{queueStatus.pendingTasks}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* History Link */}
            <a
              href="/agentic/history"
              className="text-xs font-mono text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors uppercase"
            >
              [History]
            </a>

            {/* Settings Link */}
            <a
              href="/agentic/settings"
              className="text-xs font-mono text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors uppercase"
            >
              [Settings]
            </a>

            {/* User Guide Button */}
            <a
              href="/agentic/guide"
              className="text-xs font-mono text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors uppercase flex items-center gap-1"
              title="User Guide"
            >
              [📖 Guide]
            </a>

            {/* Queue controls */}
            {queueStatus.isRunning ? (
              <button
                onClick={pauseQueue}
                className="btn btn-danger btn-small"
              >
                PAUSE QUEUE
              </button>
            ) : (
              <button
                onClick={startQueue}
                className="btn btn-primary btn-small"
              >
                START QUEUE
              </button>
            )}

            {/* New task button */}
            <button
              onClick={openTaskCreationWizard}
              className="btn btn-primary btn-small"
            >
              NEW TASK
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 px-6 py-3 bg-[hsl(var(--destructive))]/10 border-b border-[hsl(var(--destructive))]/20 flex items-center justify-between">
          <span className="text-xs font-mono text-[hsl(var(--destructive))] uppercase">[ERROR] {error}</span>
          <button
            onClick={clearError}
            className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--foreground))] text-xs font-mono uppercase hover:underline"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Main Board */}
      <main className="flex-1 overflow-hidden">
        <AgenticBoard
          projectGroupId={selectedProjectGroupId || undefined}
          onTaskSelect={handleTaskSelect}
          className="h-full"
        />
      </main>

      {/* Task Creation Wizard */}
      <TaskCreationWizard />

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel task={selectedTask} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
