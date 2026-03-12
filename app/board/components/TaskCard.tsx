'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/types/task';
import { formatRelativeTime } from '@/lib/utils/dates';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onTaskClick?: (taskId: string | number) => void;
}

export default function TaskCard({ task, isDragging = false, onTaskClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Using hardcoded colors for priority is fine as they are semantic indicators
  // but we can make them slightly more "zinc" friendly if we wanted. 
  // For now, let's keep them but maybe adjust text opacity.
  const priorityColors = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Prevent drag from triggering click
        if (!isDragging) {
          onTaskClick?.(task.id);
        }
      }}
      className={`bg-card rounded-lg p-4 shadow-sm border border-border cursor-pointer hover:shadow-md hover:border-primary/50 transition-all ${
        isDragging ? 'opacity-50 ring-2 ring-primary' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              #{task.id}
            </span>
            <h4 className="font-medium text-foreground text-sm">
              {task.title}
            </h4>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatRelativeTime(task.createdAt)}</span>
        {task.labels.length > 0 && (
          <div className="flex gap-1">
            {task.labels.slice(0, 2).map((label) => (
              <span
                key={label.id}
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{ backgroundColor: label.color + '20', color: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {task.ciStatus && (
        <div className="mt-2 pt-2 border-t border-border">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            task.ciStatus === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
            task.ciStatus === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
            task.ciStatus === 'running' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            CI: {task.ciStatus}
          </span>
        </div>
      )}

      {task.status === 'verifying' && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            {(task as any).prompt_refining ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-500 border-t-transparent"></div>
                <span className="text-xs text-purple-600 dark:text-purple-400">
                  Refining...
                </span>
              </>
            ) : (task as any).prompt_status === 'completed' && !(task as any).prompt_approved ? (
              <>
                <div className="rounded-full h-3 w-3 bg-yellow-500"></div>
                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                  Awaiting approval
                </span>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Enhancing...
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {task.status === 'in-progress' && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            {(task as any).impl_refinement_status === 'refining' ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Refining
                  {(task as any).impl_refinement_round > 1 && ` (${(task as any).impl_refinement_round})`}
                </span>
              </>
            ) : (task as any).impl_status === 'waiting' ? (
              <>
                <div className="rounded-full h-3 w-3 bg-muted-foreground animate-pulse"></div>
                <span className="text-xs text-muted-foreground">
                  Waiting...
                </span>
              </>
            ) : (task as any).impl_status === 'running' ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-500 border-t-transparent"></div>
                <span className="text-xs text-green-600 dark:text-green-400">
                  Implementing ({(task as any).impl_elapsed || 0}s)
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}

      {task.status === 'writing-tests' && (task as any).has_report && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="rounded-full h-3 w-3 bg-purple-500"></div>
            <span className="text-xs text-purple-600 dark:text-purple-400">
              Ready for presubmit
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
