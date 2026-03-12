/**
 * Task Queue Processor
 * Manages concurrent task execution with configurable limits
 */

import { agenticTaskService } from '../services/taskService';
import { pipelineOrchestrator, PipelineState } from '../pipeline/pipelineOrchestrator';
import { agenticLogsStore } from '../logs/agenticLogsStore';
import { AgenticTask, AgenticStatus } from '@/types/agentic-task';

export interface QueueConfig {
  maxConcurrentTasks: number;
  pollIntervalMs: number;
  autoStartEnabled: boolean;
}

export interface QueueStats {
  running: number;
  queued: number;
  completed: number;
  failed: number;
  maxConcurrent: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrentTasks: 3,
  pollIntervalMs: 5000,
  autoStartEnabled: true,
};

export class TaskQueueProcessor {
  private config: QueueConfig;
  private isRunning: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private activeTasks: Set<number> = new Set();
  private completedCount: number = 0;
  private failedCount: number = 0;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the queue processor
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('[Queue] Starting task queue processor');

    this.pollInterval = setInterval(() => {
      this.processQueue().catch(error => {
        console.error('[Queue] Error processing queue:', error);
      });
    }, this.config.pollIntervalMs);

    // Process immediately
    this.processQueue();
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    this.isRunning = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    console.log('[Queue] Stopped task queue processor');
  }

  /**
   * Process the queue - start pending tasks up to limit
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning) return;

    // Check how many slots are available
    const availableSlots = this.config.maxConcurrentTasks - this.activeTasks.size;
    if (availableSlots <= 0) return;

    // Get tasks ready to start
    const pendingTasks = await this.getTasksReadyToStart();
    const tasksToStart = pendingTasks.slice(0, availableSlots);

    for (const task of tasksToStart) {
      await this.startTask(task);
    }
  }

  /**
   * Get tasks that are ready to start
   */
  private async getTasksReadyToStart(): Promise<AgenticTask[]> {
    const allTasks = await agenticTaskService.getAllTasks();

    // Filter for tasks that can be started
    return allTasks.filter(task => {
      // Skip if already running
      if (this.activeTasks.has(task.id)) return false;

      // Start tasks in 'todo' status if auto-start is enabled
      if (task.status === 'todo' && this.config.autoStartEnabled) {
        return true;
      }

      // Resume tasks that were paused and are now ready
      const state = pipelineOrchestrator.getPipelineState(task.id);
      if (state?.isPaused && !state.requiresUserInput) {
        return true;
      }

      return false;
    }).sort((a, b) => {
      // Sort by priority (urgent > high > medium > low)
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
  }

  /**
   * Start a task
   */
  private async startTask(task: AgenticTask): Promise<void> {
    console.log(`[Queue] Starting task ${task.id}: ${task.title}`);
    this.activeTasks.add(task.id);

    try {
      await pipelineOrchestrator.startPipeline(task.id);

      // Monitor task completion
      this.monitorTask(task.id);
    } catch (error) {
      console.error(`[Queue] Failed to start task ${task.id}:`, error);
      this.activeTasks.delete(task.id);
      this.failedCount++;
    }
  }

  /**
   * Monitor a task for completion
   */
  private monitorTask(taskId: number): void {
    const checkInterval = setInterval(async () => {
      const task = await agenticTaskService.getTask(taskId);
      const state = pipelineOrchestrator.getPipelineState(taskId);

      if (!task) {
        clearInterval(checkInterval);
        this.activeTasks.delete(taskId);
        return;
      }

      // Task completed
      if (task.status === 'done') {
        clearInterval(checkInterval);
        this.activeTasks.delete(taskId);
        this.completedCount++;
        console.log(`[Queue] Task ${taskId} completed`);
        return;
      }

      // Task paused for user input
      if (state?.isPaused && state.requiresUserInput) {
        clearInterval(checkInterval);
        this.activeTasks.delete(taskId);
        console.log(`[Queue] Task ${taskId} paused for user input`);
        return;
      }

      // Task failed
      if (state?.error) {
        clearInterval(checkInterval);
        this.activeTasks.delete(taskId);
        this.failedCount++;
        console.log(`[Queue] Task ${taskId} failed: ${state.error}`);
        return;
      }
    }, 2000);
  }

  /**
   * Add a task to the queue
   */
  async queueTask(taskId: number): Promise<void> {
    const task = await agenticTaskService.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // If slots available, start immediately
    if (this.activeTasks.size < this.config.maxConcurrentTasks) {
      await this.startTask(task);
    }
    // Otherwise it will be picked up in the next poll cycle
  }

  /**
   * Remove a task from the queue
   */
  removeFromQueue(taskId: number): void {
    pipelineOrchestrator.stopPipeline(taskId);
    this.activeTasks.delete(taskId);
  }

  /**
   * Update queue configuration
   */
  updateConfig(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const allTasks = await agenticTaskService.getAllTasks();
    const queued = allTasks.filter(t =>
      t.status === 'todo' && !this.activeTasks.has(t.id)
    ).length;

    return {
      running: this.activeTasks.size,
      queued,
      completed: this.completedCount,
      failed: this.failedCount,
      maxConcurrent: this.config.maxConcurrentTasks,
    };
  }

  /**
   * Get active task IDs
   */
  getActiveTasks(): number[] {
    return Array.from(this.activeTasks);
  }

  /**
   * Check if a task is active
   */
  isTaskActive(taskId: number): boolean {
    return this.activeTasks.has(taskId);
  }

  /**
   * Get current configuration
   */
  getConfig(): QueueConfig {
    return { ...this.config };
  }

  /**
   * Pause all active tasks
   */
  pauseAll(): void {
    for (const taskId of this.activeTasks) {
      pipelineOrchestrator.pausePipeline(taskId);
    }
  }

  /**
   * Resume all paused tasks
   */
  async resumeAll(): Promise<void> {
    for (const taskId of this.activeTasks) {
      const state = pipelineOrchestrator.getPipelineState(taskId);
      if (state?.isPaused && !state.requiresUserInput) {
        await pipelineOrchestrator.resumePipeline(taskId);
      }
    }
  }
}

// Singleton instance with default config
export const taskQueueProcessor = new TaskQueueProcessor();
export default taskQueueProcessor;
