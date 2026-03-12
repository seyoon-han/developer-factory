/**
 * Agentic Workflow Zustand Store
 * Manages state for agentic tasks, project groups, and real-time updates
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  AgenticTask,
  AgenticPhase,
  AgenticPlan,
  AgenticClarification,
  AgenticLog,
  ProjectGroup,
  GlobalDocument,
} from '@/types/agentic-task';

// Queue status
interface QueueStatus {
  isRunning: boolean;
  maxConcurrent: number;
  activeTasks: number;
  pendingTasks: number;
}

// Store state
interface AgenticState {
  // Tasks
  tasks: AgenticTask[];
  selectedTaskId: number | null;
  taskFilter: {
    status?: string;
    phase?: AgenticPhase;
    projectGroupId?: number;
  };

  // Project Groups
  projectGroups: ProjectGroup[];
  selectedProjectGroupId: number | null;

  // Global Documents
  globalDocuments: GlobalDocument[];

  // Real-time logs (keyed by taskId)
  taskLogs: Record<number, AgenticLog[]>;

  // Clarifications (keyed by taskId)
  taskClarifications: Record<number, AgenticClarification[]>;

  // Plans (keyed by taskId)
  taskPlans: Record<number, AgenticPlan>;

  // Queue status
  queueStatus: QueueStatus;

  // Loading states
  isLoading: boolean;
  isLoadingTasks: boolean;
  isLoadingProjectGroups: boolean;
  isLoadingDocuments: boolean;

  // Error state
  error: string | null;

  // UI state
  isTaskCreationWizardOpen: boolean;
  wizardStep: number;
  isStreamingLogs: boolean;
}

// Store actions
interface AgenticActions {
  // Tasks
  fetchTasks: (filter?: AgenticState['taskFilter']) => Promise<void>;
  fetchTask: (taskId: number) => Promise<AgenticTask | null>;
  createTask: (data: Record<string, unknown>) => Promise<AgenticTask | null>;
  updateTask: (taskId: number, updates: Partial<AgenticTask>) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  startTask: (taskId: number) => Promise<void>;
  selectTask: (taskId: number | null) => void;
  setTaskFilter: (filter: AgenticState['taskFilter']) => void;

  // Project Groups
  fetchProjectGroups: () => Promise<void>;
  createProjectGroup: (data: Partial<ProjectGroup>) => Promise<ProjectGroup | null>;
  updateProjectGroup: (groupId: number, updates: Partial<ProjectGroup>) => Promise<void>;
  deleteProjectGroup: (groupId: number) => Promise<void>;
  selectProjectGroup: (groupId: number | null) => void;

  // Global Documents
  fetchGlobalDocuments: () => Promise<void>;
  uploadDocument: (file: File, metadata?: { description?: string; category?: string; tags?: string[] }) => Promise<GlobalDocument | null>;
  deleteDocument: (docId: number) => Promise<void>;

  // Logs
  fetchTaskLogs: (taskId: number) => Promise<void>;
  appendLog: (taskId: number, log: AgenticLog) => void;
  clearTaskLogs: (taskId: number) => void;

  // Clarifications
  fetchClarifications: (taskId: number) => Promise<void>;
  submitClarificationAnswer: (clarificationId: number, answer: string) => Promise<void>;
  resumePipeline: (taskId: number) => Promise<void>;

  // Plans
  fetchPlan: (taskId: number) => Promise<void>;
  updatePlanContent: (taskId: number, updates: Partial<AgenticPlan>) => Promise<void>;
  approvePlan: (taskId: number) => Promise<void>;
  rejectPlan: (taskId: number, reason: string) => Promise<void>;

  // Queue
  fetchQueueStatus: () => Promise<void>;
  startQueue: () => Promise<void>;
  pauseQueue: () => Promise<void>;

  // UI
  openTaskCreationWizard: () => void;
  closeTaskCreationWizard: () => void;
  setWizardStep: (step: number) => void;
  setStreamingLogs: (streaming: boolean) => void;

  // Error handling
  clearError: () => void;
}

// API helper
async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    const json = await response.json();
    if (!json.success) {
      return { success: false, error: json.error || 'Request failed' };
    }
    return { success: true, data: json };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export const useAgenticStore = create<AgenticState & AgenticActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    tasks: [],
    selectedTaskId: null,
    taskFilter: {},
    projectGroups: [],
    selectedProjectGroupId: null,
    globalDocuments: [],
    taskLogs: {},
    taskClarifications: {},
    taskPlans: {},
    queueStatus: {
      isRunning: false,
      maxConcurrent: 1,
      activeTasks: 0,
      pendingTasks: 0,
    },
    isLoading: false,
    isLoadingTasks: false,
    isLoadingProjectGroups: false,
    isLoadingDocuments: false,
    error: null,
    isTaskCreationWizardOpen: false,
    wizardStep: 0,
    isStreamingLogs: false,

    // Tasks
    fetchTasks: async (filter) => {
      set({ isLoadingTasks: true, error: null });
      const params = new URLSearchParams();
      if (filter?.status) params.set('status', filter.status);
      if (filter?.phase) params.set('phase', filter.phase);
      if (filter?.projectGroupId) params.set('projectGroupId', filter.projectGroupId.toString());

      const url = `/api/agentic/tasks${params.toString() ? `?${params}` : ''}`;
      const result = await apiRequest<{ tasks: AgenticTask[] }>(url);

      if (result.success && result.data) {
        set({ tasks: result.data.tasks, isLoadingTasks: false });
      } else {
        set({ error: result.error, isLoadingTasks: false });
      }
    },

    fetchTask: async (taskId) => {
      const result = await apiRequest<{ task: AgenticTask }>(`/api/agentic/tasks/${taskId}`);
      if (result.success && result.data) {
        const task = result.data.task;
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
        }));
        return task;
      }
      return null;
    },

    createTask: async (data) => {
      set({ isLoading: true, error: null });
      const result = await apiRequest<{ task: AgenticTask }>('/api/agentic/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (result.success && result.data) {
        const task = result.data.task;
        set((state) => ({
          tasks: [...state.tasks, task],
          isLoading: false,
          isTaskCreationWizardOpen: false,
          wizardStep: 0,
        }));
        return task;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    },

    updateTask: async (taskId, updates) => {
      const result = await apiRequest<{ task: AgenticTask }>(`/api/agentic/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (result.success && result.data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? result.data!.task : t)),
        }));
      } else {
        set({ error: result.error });
      }
    },

    deleteTask: async (taskId) => {
      const result = await apiRequest(`/api/agentic/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (result.success) {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
          selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
        }));
      } else {
        set({ error: result.error });
      }
    },

    startTask: async (taskId) => {
      const result = await apiRequest(`/api/agentic/tasks/${taskId}/start`, {
        method: 'POST',
      });

      if (result.success) {
        await get().fetchTask(taskId);
      } else {
        set({ error: result.error });
      }
    },

    selectTask: (taskId) => set({ selectedTaskId: taskId }),

    setTaskFilter: (filter) => {
      set({ taskFilter: filter });
      get().fetchTasks(filter);
    },

    // Project Groups
    fetchProjectGroups: async () => {
      set({ isLoadingProjectGroups: true, error: null });
      const result = await apiRequest<{ groups: ProjectGroup[] }>('/api/agentic/project-groups');

      if (result.success && result.data) {
        set({ projectGroups: result.data.groups, isLoadingProjectGroups: false });
      } else {
        set({ error: result.error, isLoadingProjectGroups: false });
      }
    },

    createProjectGroup: async (data) => {
      set({ isLoading: true, error: null });
      const result = await apiRequest<{ group: ProjectGroup }>('/api/agentic/project-groups', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (result.success && result.data) {
        const group = result.data.group;
        set((state) => ({
          projectGroups: [...state.projectGroups, group],
          isLoading: false,
        }));
        return group;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    },

    updateProjectGroup: async (groupId, updates) => {
      const result = await apiRequest<{ group: ProjectGroup }>(`/api/agentic/project-groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (result.success && result.data) {
        set((state) => ({
          projectGroups: state.projectGroups.map((g) => (g.id === groupId ? result.data!.group : g)),
        }));
      } else {
        set({ error: result.error });
      }
    },

    deleteProjectGroup: async (groupId) => {
      const result = await apiRequest(`/api/agentic/project-groups/${groupId}`, {
        method: 'DELETE',
      });

      if (result.success) {
        set((state) => ({
          projectGroups: state.projectGroups.filter((g) => g.id !== groupId),
          selectedProjectGroupId: state.selectedProjectGroupId === groupId ? null : state.selectedProjectGroupId,
        }));
      } else {
        set({ error: result.error });
      }
    },

    selectProjectGroup: (groupId) => {
      set({ selectedProjectGroupId: groupId });
      if (groupId) {
        get().setTaskFilter({ projectGroupId: groupId });
      } else {
        get().setTaskFilter({});
      }
    },

    // Global Documents
    fetchGlobalDocuments: async () => {
      set({ isLoadingDocuments: true, error: null });
      const result = await apiRequest<{ documents: GlobalDocument[] }>('/api/agentic/global-documents');

      if (result.success && result.data) {
        set({ globalDocuments: result.data.documents, isLoadingDocuments: false });
      } else {
        set({ error: result.error, isLoadingDocuments: false });
      }
    },

    uploadDocument: async (file, metadata) => {
      set({ isLoading: true, error: null });
      const formData = new FormData();
      formData.append('file', file);
      if (metadata?.description) formData.append('description', metadata.description);
      if (metadata?.category) formData.append('category', metadata.category);
      if (metadata?.tags) formData.append('tags', JSON.stringify(metadata.tags));

      try {
        const response = await fetch('/api/agentic/global-documents', {
          method: 'POST',
          body: formData,
        });
        const json = await response.json();

        if (json.success) {
          const doc = json.document;
          set((state) => ({
            globalDocuments: [...state.globalDocuments, doc],
            isLoading: false,
          }));
          return doc;
        } else {
          set({ error: json.error, isLoading: false });
          return null;
        }
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false });
        return null;
      }
    },

    deleteDocument: async (docId) => {
      const result = await apiRequest(`/api/agentic/global-documents/${docId}`, {
        method: 'DELETE',
      });

      if (result.success) {
        set((state) => ({
          globalDocuments: state.globalDocuments.filter((d) => d.id !== docId),
        }));
      } else {
        set({ error: result.error });
      }
    },

    // Logs
    fetchTaskLogs: async (taskId) => {
      const result = await apiRequest<{ logs: AgenticLog[] }>(`/api/agentic/tasks/${taskId}/logs`);

      if (result.success && result.data) {
        set((state) => ({
          taskLogs: { ...state.taskLogs, [taskId]: result.data!.logs },
        }));
      }
    },

    appendLog: (taskId, log) => {
      set((state) => ({
        taskLogs: {
          ...state.taskLogs,
          [taskId]: [...(state.taskLogs[taskId] || []), log],
        },
      }));
    },

    clearTaskLogs: (taskId) => {
      set((state) => {
        const newLogs = { ...state.taskLogs };
        delete newLogs[taskId];
        return { taskLogs: newLogs };
      });
    },

    // Clarifications
    fetchClarifications: async (taskId) => {
      const result = await apiRequest<{ clarifications: AgenticClarification[] }>(
        `/api/agentic/tasks/${taskId}/clarifications`
      );

      if (result.success && result.data) {
        set((state) => ({
          taskClarifications: { ...state.taskClarifications, [taskId]: result.data!.clarifications },
        }));
      }
    },

    submitClarificationAnswer: async (clarificationId, answer) => {
      const result = await apiRequest<{ clarification: AgenticClarification; status: any }>(
        `/api/agentic/clarifications/${clarificationId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ answer }),
        }
      );

      if (!result.success) {
        set({ error: result.error });
      } else if (result.data?.clarification) {
        // Update the clarification in state
        const clarification = result.data.clarification;
        const taskId = clarification.taskId;
        
        set((state) => {
          const existing = state.taskClarifications[taskId] || [];
          const updated = existing.map((c) =>
            c.id === clarificationId ? clarification : c
          );
          return {
            taskClarifications: { ...state.taskClarifications, [taskId]: updated },
          };
        });
      }
    },

    resumePipeline: async (taskId) => {
      console.log(`[Store] resumePipeline called for task ${taskId}`);
      
      try {
        const result = await apiRequest(`/api/agentic/tasks/${taskId}/clarifications`, {
          method: 'POST',
          body: JSON.stringify({ resumePipeline: true }),
        });

        console.log(`[Store] resumePipeline API result:`, result);

        if (result.success) {
          console.log(`[Store] resumePipeline success, refreshing task...`);
          // Refresh task data after resuming
          await get().fetchTask(taskId);
          console.log(`[Store] Task refreshed after resume`);
        } else {
          console.error(`[Store] resumePipeline failed:`, result.error);
          set({ error: result.error });
        }
      } catch (error) {
        console.error(`[Store] resumePipeline exception:`, error);
        set({ error: error instanceof Error ? error.message : 'Failed to resume pipeline' });
      }
    },

    // Plans
    fetchPlan: async (taskId) => {
      const result = await apiRequest<{ plan: AgenticPlan }>(`/api/agentic/tasks/${taskId}/plan`);

      if (result.success && result.data) {
        set((state) => ({
          taskPlans: { ...state.taskPlans, [taskId]: result.data!.plan },
        }));
      }
    },

    updatePlanContent: async (taskId, updates) => {
      const result = await apiRequest<{ plan: AgenticPlan }>(`/api/agentic/tasks/${taskId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (result.success && result.data) {
        set((state) => ({
          taskPlans: { ...state.taskPlans, [taskId]: result.data!.plan },
        }));
      } else {
        set({ error: result.error });
      }
    },

    approvePlan: async (taskId) => {
      const result = await apiRequest(`/api/agentic/tasks/${taskId}/plan`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      });

      if (result.success) {
        await get().fetchTask(taskId);
        await get().fetchPlan(taskId);
      } else {
        set({ error: result.error });
      }
    },

    rejectPlan: async (taskId, reason) => {
      const result = await apiRequest(`/api/agentic/tasks/${taskId}/plan`, {
        method: 'POST',
        body: JSON.stringify({ action: 'reject', reason }),
      });

      if (result.success) {
        await get().fetchTask(taskId);
        await get().fetchPlan(taskId);
      } else {
        set({ error: result.error });
      }
    },

    // Queue
    fetchQueueStatus: async () => {
      const result = await apiRequest<QueueStatus>('/api/agentic/queue');

      if (result.success && result.data) {
        set({ queueStatus: result.data });
      }
    },

    startQueue: async () => {
      const result = await apiRequest('/api/agentic/queue', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      });

      if (result.success) {
        await get().fetchQueueStatus();
      } else {
        set({ error: result.error });
      }
    },

    pauseQueue: async () => {
      const result = await apiRequest('/api/agentic/queue', {
        method: 'POST',
        body: JSON.stringify({ action: 'pause' }),
      });

      if (result.success) {
        await get().fetchQueueStatus();
      } else {
        set({ error: result.error });
      }
    },

    // UI
    openTaskCreationWizard: () => set({ isTaskCreationWizardOpen: true, wizardStep: 0 }),
    closeTaskCreationWizard: () => set({ isTaskCreationWizardOpen: false, wizardStep: 0 }),
    setWizardStep: (step) => set({ wizardStep: step }),
    setStreamingLogs: (streaming) => set({ isStreamingLogs: streaming }),

    // Error handling
    clearError: () => set({ error: null }),
  }))
);

// Selectors - use useCallback in components or inline selectors
export const selectSelectedTask = (state: AgenticState) =>
  state.tasks.find((t) => t.id === state.selectedTaskId) || null;

// Helper functions for creating selectors (use with useMemo in components)
export const getTaskLogs = (state: AgenticState, taskId: number) =>
  state.taskLogs[taskId] || [];

export const getTaskClarifications = (state: AgenticState, taskId: number) =>
  state.taskClarifications[taskId] || [];

export const getTaskPlan = (state: AgenticState, taskId: number) =>
  state.taskPlans[taskId] || null;

export const getPendingClarifications = (state: AgenticState, taskId: number) =>
  (state.taskClarifications[taskId] || []).filter((c) => !c.userAnswer);

export const getTasksByPhase = (state: AgenticState, phase: AgenticPhase) =>
  state.tasks.filter((t) => t.currentPhase === phase);

// Legacy selector factories - deprecated, use hooks with inline selectors instead
export const selectTaskLogs = (taskId: number) => (state: AgenticState) =>
  state.taskLogs[taskId] || [];

export const selectTaskClarifications = (taskId: number) => (state: AgenticState) =>
  state.taskClarifications[taskId] || [];

export const selectTaskPlan = (taskId: number) => (state: AgenticState) =>
  state.taskPlans[taskId] || null;

export const selectPendingClarifications = (taskId: number) => (state: AgenticState) =>
  (state.taskClarifications[taskId] || []).filter((c) => !c.userAnswer);

export const selectTasksByPhase = (phase: AgenticPhase) => (state: AgenticState) =>
  state.tasks.filter((t) => t.currentPhase === phase);

export default useAgenticStore;
