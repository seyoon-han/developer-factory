import { create } from 'zustand';
import type { Task } from '@/types/task';
import type { TaskStatus } from '@/types/task';

interface TaskState {
  tasks: Task[];
  draggedTask: Task | null;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, newStatus: TaskStatus, newOrder: number) => void;
  setDraggedTask: (task: Task | null) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  draggedTask: null,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task],
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    ),
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),

  moveTask: (taskId, newStatus, newOrder) => set((state) => ({
    tasks: state.tasks.map((t) =>
      t.id === taskId
        ? { ...t, status: newStatus, order: newOrder, updatedAt: new Date() }
        : t
    ),
  })),

  setDraggedTask: (task) => set({ draggedTask: task }),

  getTasksByStatus: (status) => {
    return get().tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);
  },
}));
