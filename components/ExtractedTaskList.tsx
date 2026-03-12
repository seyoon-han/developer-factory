'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertTriangle, AlertOctagon, Plus, Check } from 'lucide-react';
import TaskCreateModal from './TaskCreateModal';
import { useBoardStore } from '@/lib/store/boardStore';
import type { ExtractedTask } from '@/app/api/task-identifier/extract/route';

interface ExtractedTaskListProps {
  tasks: ExtractedTask[];
  onTaskCreated: () => void;
}

export function ExtractedTaskList({ tasks, onTaskCreated }: ExtractedTaskListProps) {
  const [selectedTask, setSelectedTask] = useState<ExtractedTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdTaskIds, setCreatedTaskIds] = useState<Set<number>>(new Set());
  const { activeBoard } = useBoardStore();
  
  // Use the active board ID from the store, fallback to default-board
  const boardId = activeBoard?.id || 'default-board';

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertOctagon className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleCreateTask = (task: ExtractedTask, index: number) => {
    setSelectedTask({ ...task, index } as any);
    setShowCreateModal(true);
  };

  const handleTaskCreated = (task: any) => {
    console.log('Task created from extracted item:', task);
    if (selectedTask && (selectedTask as any).index !== undefined) {
      setCreatedTaskIds(prev => new Set(prev).add((selectedTask as any).index));
    }
    onTaskCreated();
  };

  const isTaskCreated = (index: number) => createdTaskIds.has(index);

  return (
    <>
      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
        {tasks.map((task, index) => (
          <div
            key={index}
            className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  {getPriorityIcon(task.priority)}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
              {isTaskCreated(index) ? (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-sm font-medium">
                  <Check className="h-4 w-4" />
                  Created
                </div>
              ) : (
                <button
                  onClick={() => handleCreateTask(task, index)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap"
                  title="Create task from this item"
                >
                  <Plus className="h-4 w-4" />
                  Create Task
                </button>
              )}
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                {task.description}
              </p>
            )}

            {task.context && (
              <div className="mt-3 p-2 bg-accent/50 rounded-md border border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Context:</span> {task.context}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Task Creation Modal */}
      {selectedTask && (
        <TaskCreateModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTask(null);
          }}
          boardId={boardId}
          onTaskCreated={handleTaskCreated}
          initialTitle={selectedTask.title}
          initialDescription={selectedTask.description}
          initialPriority={selectedTask.priority}
        />
      )}
    </>
  );
}

