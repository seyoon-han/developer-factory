'use client';

import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useState, useEffect } from 'react';
import TddKanbanColumn from './TddKanbanColumn';
import TddTaskCard from './TddTaskCard';
import ClarificationModal from '@/components/tdd/ClarificationModal';
import type { TddBoard, TddTask, TddStatus } from '@/types/tdd-task';
import type { UserAnswer } from '@/types/clarification';

interface TddKanbanBoardProps {
  board: TddBoard;
}

export default function TddKanbanBoard({ board }: TddKanbanBoardProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load TDD tasks
  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tdd/tasks');
      if (!response.ok) return;
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error loading TDD tasks:', error);
    }
  };

  const canDragTask = (task: any): boolean => {
    // Cannot drag if in processing phase
    if (task.current_phase === 'red_phase' || task.current_phase === 'green_phase') {
      return false;
    }
    // Cannot drag while awaiting clarification (must answer first)
    if (task.tdd_status === 'awaiting_clarification') {
      return false;
    }
    return true;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task && canDragTask(task)) {
      setDraggedTask(task);
      setActiveId(String(task.id));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !draggedTask) {
      setDraggedTask(null);
      setActiveId(null);
      return;
    }

    const taskId = active.id;
    let newStatus = over.id as TddStatus;

    // If dropped on another task, get that task's status
    const droppedOnTask = tasks.find((t) => String(t.id) === String(over.id));
    if (droppedOnTask) {
      newStatus = droppedOnTask.tdd_status;
    }

    if (newStatus !== draggedTask.tdd_status) {
      try {
        await fetch(`/api/tdd/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tdd_status: newStatus }),
        });
        await loadTasks();
      } catch (error) {
        console.error('Error updating TDD task:', error);
      }
    }

    setDraggedTask(null);
    setActiveId(null);
  };

  const handleTaskClick = (task: any) => {
    if (task.tdd_status === 'awaiting_clarification') {
      setSelectedTask(task);
      setIsClarificationModalOpen(true);
    }
  };

  const handleClarificationSubmit = async (answers: Record<number, UserAnswer>) => {
    if (!selectedTask) return;

    try {
      await fetch(`/api/tdd/tasks/${selectedTask.id}/clarifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      await loadTasks();
    } catch (error) {
      console.error('Error submitting clarifications:', error);
      throw error;
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {board.columns.map((column) => (
            <TddKanbanColumn
              key={column.id}
              column={column}
              tasks={tasks.filter((t) => t.tdd_status === column.id)}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId && draggedTask ? (
            <TddTaskCard task={draggedTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <ClarificationModal
          isOpen={isClarificationModalOpen}
          onClose={() => {
            setIsClarificationModalOpen(false);
            setSelectedTask(null);
          }}
          taskId={selectedTask.task_id}
          tddTaskId={selectedTask.id}
          onSubmit={handleClarificationSubmit}
        />
      )}
    </>
  );
}
