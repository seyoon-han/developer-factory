'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column } from '@/types/board';
import type { Task } from '@/types/task';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import TaskCreateModal from '@/components/TaskCreateModal';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  boardId: string;
  onTaskCreated: (task: any) => void;
  onTaskClick?: (taskId: string | number) => void;
}

export default function KanbanColumn({ column, tasks, boardId, onTaskCreated, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only show + button on "todo" column
  const showAddButton = column.id === 'todo';

  return (
    <>
      <div
        ref={setNodeRef}
        className={`flex flex-col bg-secondary/50 rounded-lg p-4 min-w-[320px] max-w-[320px] transition-colors border border-border/50 ${
          isOver ? 'bg-accent' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">
              {column.title}
            </h3>
            <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
          </div>
          {showAddButton && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Add task"
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground/50 text-sm">
            No tasks
          </div>
        )}
      </div>

      <TaskCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        boardId={boardId}
        onTaskCreated={(task) => {
          onTaskCreated(task);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
