'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TddTaskCard from './TddTaskCard';
import type { TddColumn } from '@/types/tdd-task';

interface TddKanbanColumnProps {
  column: TddColumn;
  tasks: any[];
  onTaskClick?: (task: any) => void;
}

const columnColors: Record<string, { bg: string; border: string; text: string }> = {
  gray: { bg: 'bg-gray-50 dark:bg-gray-900/30', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-600 dark:text-gray-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600 dark:text-blue-400' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-600 dark:text-yellow-400' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-600 dark:text-red-400' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-600 dark:text-green-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-600 dark:text-purple-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600 dark:text-emerald-400' },
};

export default function TddKanbanColumn({ column, tasks, onTaskClick }: TddKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const colors = columnColors[column.color] || columnColors.gray;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 min-w-72 rounded-xl border-2 ${colors.border} ${
        isOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      }`}
    >
      {/* Column Header */}
      <div className={`px-4 py-3 rounded-t-lg ${colors.bg}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-sm ${colors.text}`}>
            {column.title}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
            {tasks.length}
          </span>
        </div>
        {column.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {column.description}
          </p>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white dark:bg-gray-800">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              No tasks
            </div>
          ) : (
            tasks.map((task) => (
              <TddTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
