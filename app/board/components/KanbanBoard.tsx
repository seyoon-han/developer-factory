'use client';

import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useState, useEffect } from 'react';
import type { Board } from '@/types/board';
import type { Task } from '@/types/task';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import TaskDetailModal from '@/components/TaskDetailModal';

interface KanbanBoardProps {
  board: Board;
}

export default function KanbanBoard({ board }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load tasks from SQLite
  useEffect(() => {
    loadTasks();

    // Poll for updates every 5 seconds
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [board.id]);

  const loadTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?boardId=${board.id}`);
      if (!response.ok) {
        console.error('Failed to load tasks:', response.status);
        return;
      }
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  /**
   * Check if a task can be dragged based on its status and related data
   */
  const canDragTask = (task: any): boolean => {
    // Enhancing Requirement lane: Cannot drag if enhancement is in progress
    if (task.status === 'verifying') {
      // Check if prompt is still being generated (pending status)
      if (task.prompt_status === 'pending' || task.prompt_refining) {
        console.log(`🚫 Cannot drag task #${task.id}: Enhancement in progress`);
        return false;
      }
    }

    // Implementation lane: Cannot drag if implementation is running or waiting
    if (task.status === 'in-progress') {
      const implStatus = task.impl_status;
      if (implStatus === 'running' || implStatus === 'waiting') {
        console.log(`🚫 Cannot drag task #${task.id}: Implementation ${implStatus}`);
        return false;
      }
      // Can drag if cancelled or error
      if (implStatus !== 'cancelled' && implStatus !== 'error' && implStatus !== 'completed') {
        console.log(`🚫 Cannot drag task #${task.id}: Implementation status ${implStatus}`);
        return false;
      }
    }

    return true;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      // Check if task can be dragged
      if (!canDragTask(task)) {
        // Don't set dragged task - this prevents the drag
        return;
      }
      setDraggedTask(task);
      setActiveId(String(task.id));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setDraggedTask(null);
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    let newStatus = over.id as string;

    // Check if dropped on a task (over.id is a number) or a column (over.id is a string status)
    // If dropped on a task, find that task's status to determine the column
    const droppedOnTask = tasks.find((t) => String(t.id) === String(over.id));
    if (droppedOnTask) {
      // Dropped on another task, use that task's status/column
      newStatus = droppedOnTask.status;
      console.log(`📍 Dropped on task #${droppedOnTask.id}, using its status: ${newStatus}`);
    } else {
      // Dropped on a column directly
      console.log(`📍 Dropped on column: ${newStatus}`);
    }

    if (newStatus !== draggedTask?.status) {
      // Update task status via API
      try {
        console.log(`🔄 Moving task #${taskId} from "${draggedTask?.status}" to "${newStatus}"`);
        
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        // Reload tasks
        await loadTasks();
      } catch (error) {
        console.error('Error updating task:', error);
      }
    }

    setDraggedTask(null);
    setActiveId(null);
  };

  const handleTaskClick = (taskId: string | number) => {
    setSelectedTaskId(typeof taskId === 'string' ? parseInt(taskId) : taskId);
    setIsDetailModalOpen(true);
  };

  const handleTaskCreated = () => {
    // Reload tasks after creation
    loadTasks();
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks.filter((t) => t.status === column.id)}
              boardId={board.id}
              onTaskCreated={handleTaskCreated}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId && draggedTask ? (
            <TaskCard task={draggedTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTaskId(null);
          loadTasks(); // Reload tasks when closing modal
        }}
        taskId={selectedTaskId}
      />
    </>
  );
}
