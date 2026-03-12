/**
 * Agentic Task Service
 * Main service for managing agentic workflow tasks
 */

import { statements } from '@/lib/db/postgres';
import {
  AgenticTask,
  AgenticTaskRow,
  AgenticStatus,
  AgenticPhase,
  TaskCreationData,
  rowToAgenticTask,
} from '@/types/agentic-task';
import { taskContextService } from './taskContextService';

export class AgenticTaskService {
  /**
   * Create a new agentic task
   */
  async createTask(data: TaskCreationData): Promise<AgenticTask> {
    const mcpServersConfig = data.mcpServersConfig || [];
    const verificationCommands = data.verificationCommands || [];
    const referenceTaskIds = data.referenceTaskIds || [];
    const globalDocumentIds = data.globalDocumentIds || [];
    const referenceTaskDocIds = data.referenceTaskDocIds || [];

    const result = await statements.createAgenticTask.run(
      data.title,
      data.description || null,
      'todo',     // status
      'idle',     // phase - must match DB CHECK constraint
      data.priority,
      data.projectGroupId || null,
      data.autoAdvance !== false ? 1 : 0,
      data.errorHandling || 'smart_recovery',
      data.executionStrategy || 'subagent_per_step',
      data.codeReviewPoint || 'before_verification',
      mcpServersConfig.length > 0 ? JSON.stringify(mcpServersConfig) : null,
      verificationCommands.length > 0 ? JSON.stringify(verificationCommands) : null,
      referenceTaskIds.length > 0 ? JSON.stringify(referenceTaskIds) : null
    );

    const taskId = Number(result.lastInsertRowid);

    // Link global documents
    for (const docId of globalDocumentIds) {
      await statements.addAgenticTaskDocument.run(taskId, 'global', docId);
    }

    // Link reference task documents
    for (const docId of referenceTaskDocIds) {
      await statements.addAgenticTaskDocument.run(taskId, 'reference', docId);
    }

    // Get the created task
    const task = await this.getTask(taskId) as AgenticTask;

    // Initialize the task context document
    try {
      taskContextService.initializeContext(task);
    } catch (error) {
      console.warn('[TaskService] Failed to initialize task context:', error);
    }

    return task;
  }

  /**
   * Get a task by ID
   */
  async getTask(id: number): Promise<AgenticTask | null> {
    const row = await statements.getAgenticTask.get(id) as AgenticTaskRow | undefined;
    if (!row) return null;
    return rowToAgenticTask(row);
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<AgenticTask[]> {
    const rows = await statements.getAllAgenticTasks.all() as AgenticTaskRow[];
    return rows.map(rowToAgenticTask);
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: AgenticStatus): Promise<AgenticTask[]> {
    const rows = await statements.getAgenticTasksByStatus.all(status) as AgenticTaskRow[];
    return rows.map(rowToAgenticTask);
  }

  /**
   * Get tasks by phase
   */
  async getTasksByPhase(phase: AgenticPhase): Promise<AgenticTask[]> {
    const rows = await statements.getAgenticTasksByPhase.all(phase) as AgenticTaskRow[];
    return rows.map(rowToAgenticTask);
  }

  /**
   * Get tasks by project group
   */
  async getTasksByProjectGroup(projectGroupId: number): Promise<AgenticTask[]> {
    const rows = await statements.getAgenticTasksByProjectGroup.all(projectGroupId) as AgenticTaskRow[];
    return rows.map(rowToAgenticTask);
  }

  /**
   * Update task status and phase
   */
  async updateTaskStatus(id: number, status: AgenticStatus, phase: AgenticPhase): Promise<AgenticTask | null> {
    await statements.updateAgenticTaskStatus.run(status, phase, id);
    return this.getTask(id);
  }

  /**
   * Update task phase only
   */
  async updateTaskPhase(id: number, phase: AgenticPhase): Promise<AgenticTask | null> {
    await statements.updateAgenticTaskPhase.run(phase, id);
    return this.getTask(id);
  }

  /**
   * Update token usage
   */
  async updateTokenUsage(
    id: number,
    inputTokens: number,
    outputTokens: number,
    costUsd: number
  ): Promise<void> {
    await statements.updateAgenticTaskTokens.run(inputTokens, outputTokens, costUsd, id);
  }

  /**
   * Delete a task
   */
  async deleteTask(id: number): Promise<boolean> {
    const result = await statements.deleteAgenticTask.run(id);
    return result.changes > 0;
  }

  /**
   * Get task documents
   */
  async getTaskDocuments(taskId: number): Promise<{ type: string; documentId: number }[]> {
    const rows = await statements.getAgenticTaskDocuments.all(taskId) as any[];
    return rows.map(row => ({
      type: row.document_type,
      documentId: row.document_id,
    }));
  }

  /**
   * Get task uploads
   */
  async getTaskUploads(taskId: number): Promise<any[]> {
    return await statements.getAgenticTaskUploads.all(taskId) as any[];
  }

  /**
   * Transition task to next status based on workflow
   */
  async transitionTask(id: number, action: 'start' | 'next' | 'complete' | 'fail'): Promise<AgenticTask | null> {
    const task = await this.getTask(id);
    if (!task) return null;

    const transitions: Record<AgenticStatus, { next: AgenticStatus; phase: AgenticPhase }> = {
      'todo': { next: 'brainstorming', phase: 'brainstorming' },
      'brainstorming': { next: 'clarifying', phase: 'clarifying' },
      'clarifying': { next: 'planning', phase: 'planning' },
      'planning': { next: 'plan-review', phase: 'plan_review' },
      'plan-review': { next: 'in-progress', phase: 'in_progress' },
      'in-progress': { next: 'verifying', phase: 'verifying' },
      'verifying': { next: 'done', phase: 'done' },
      'done': { next: 'done', phase: 'done' },
    };

    if (action === 'start' && task.status === 'todo') {
      return this.updateTaskStatus(id, 'brainstorming', 'brainstorming');
    }

    if (action === 'next') {
      const transition = transitions[task.status];
      if (transition) {
        return this.updateTaskStatus(id, transition.next, transition.phase);
      }
    }

    if (action === 'complete') {
      return this.updateTaskStatus(id, 'done', 'done');
    }

    return task;
  }

  /**
   * Get workflow status summary
   */
  async getWorkflowSummary(): Promise<Record<AgenticStatus, number>> {
    const tasks = await this.getAllTasks();
    const summary: Record<AgenticStatus, number> = {
      'todo': 0,
      'brainstorming': 0,
      'clarifying': 0,
      'planning': 0,
      'plan-review': 0,
      'in-progress': 0,
      'verifying': 0,
      'done': 0,
    };

    for (const task of tasks) {
      summary[task.status]++;
    }

    return summary;
  }

  /**
   * Get tasks that need user attention
   */
  async getTasksNeedingAttention(): Promise<AgenticTask[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter(task =>
      task.status === 'clarifying' ||
      task.status === 'plan-review' ||
      (task.status === 'verifying' && task.currentPhase === 'verifying')
    );
  }

  /**
   * Get active tasks (not done, not in backlog)
   */
  async getActiveTasks(): Promise<AgenticTask[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter(task => task.status !== 'todo' && task.status !== 'done');
  }
}

// Singleton instance
export const agenticTaskService = new AgenticTaskService();
export default agenticTaskService;
