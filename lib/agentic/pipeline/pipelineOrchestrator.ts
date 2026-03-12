/**
 * Pipeline Orchestrator
 * Manages the complete agentic workflow from brainstorming to completion
 */

import { agenticTaskService } from '../services/taskService';
import { projectGroupService } from '../services/projectGroupService';
import { planService } from '../services/planService';
import { clarificationService } from '../services/clarificationService';
import { worktreeManager } from '../git/worktreeManager';
import { prCoordinator } from '../git/prCoordinator';
import { agenticLogsStore } from '../logs/agenticLogsStore';
import { slackNotifier } from '../notifications/slackNotifier';
import { brainstormingExecutor } from '../executors/brainstormingExecutor';
import { planningExecutor } from '../executors/planningExecutor';
import { implementationExecutor } from '../executors/implementationExecutor';
import { verificationExecutor } from '../executors/verificationExecutor';
import { statements } from '@/lib/db/postgres';
import { AgenticTask, AgenticPhase, AgenticStatus, AgenticPlan } from '@/types/agentic-task';

export interface PipelineState {
  taskId: number;
  currentPhase: AgenticPhase;
  status: AgenticStatus;
  isRunning: boolean;
  isPaused: boolean;
  requiresUserInput: boolean;
  error?: string;
}

export interface PhaseResult {
  success: boolean;
  nextPhase?: AgenticPhase;
  requiresUserInput?: boolean;
  error?: string;
  data?: any;
}

export class PipelineOrchestrator {
  private runningTasks: Map<number, PipelineState> = new Map();

  /**
   * Start or resume a task pipeline
   */
  async startPipeline(taskId: number): Promise<PipelineState> {
    const task = await agenticTaskService.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check if already running
    if (this.runningTasks.has(taskId)) {
      const state = this.runningTasks.get(taskId)!;
      if (state.isRunning && !state.isPaused) {
        return state;
      }
    }

    // Initialize state
    const state: PipelineState = {
      taskId,
      currentPhase: task.currentPhase,
      status: task.status,
      isRunning: true,
      isPaused: false,
      requiresUserInput: false,
    };

    this.runningTasks.set(taskId, state);

    // Notify start
    if (task.projectGroupId) {
      await slackNotifier.notifyTaskStarted(task.projectGroupId, taskId, task.title);
    }

    // Run pipeline
    this.runPipeline(task).catch(error => {
      this.handlePipelineError(taskId, error);
    });

    return state;
  }

  /**
   * Run the pipeline for a task
   */
  private async runPipeline(task: AgenticTask): Promise<void> {
    const taskId = task.id;
    let currentTask = task;

    agenticLogsStore.info(taskId, 'pipeline', `Starting pipeline from phase: ${currentTask.currentPhase}`);

    while (true) {
      const state = this.runningTasks.get(taskId);
      if (!state || !state.isRunning || state.isPaused) {
        agenticLogsStore.info(taskId, 'pipeline', 'Pipeline paused or stopped');
        break;
      }

      const result = await this.executePhase(currentTask);

      if (!result.success) {
        this.updateState(taskId, { error: result.error });
        agenticLogsStore.error(taskId, 'pipeline', `Phase failed: ${result.error}`);

        // Handle based on error handling strategy
        if (currentTask.errorHandling === 'stop_on_error') {
          break;
        }
      }

      if (result.requiresUserInput) {
        this.updateState(taskId, { requiresUserInput: true, isPaused: true });
        agenticLogsStore.info(taskId, 'pipeline', 'Waiting for user input');
        break;
      }

      if (!result.nextPhase || result.nextPhase === 'done') {
        agenticLogsStore.success(taskId, 'pipeline', 'Pipeline completed');
        await this.completePipeline(taskId);
        break;
      }

      // Advance to next phase
      currentTask = await agenticTaskService.updateTaskPhase(taskId, result.nextPhase) as AgenticTask;
      this.updateState(taskId, { currentPhase: result.nextPhase });

      // Check auto-advance setting
      if (!currentTask.autoAdvance && this.requiresUserConfirmation(result.nextPhase)) {
        this.updateState(taskId, { requiresUserInput: true, isPaused: true });
        agenticLogsStore.info(taskId, 'pipeline', `Waiting for confirmation to enter ${result.nextPhase}`);
        break;
      }
    }
  }

  /**
   * Execute current phase
   */
  private async executePhase(task: AgenticTask): Promise<PhaseResult> {
    const taskId = task.id;
    const phase = task.currentPhase;

    agenticLogsStore.info(taskId, phase, `Executing phase: ${phase}`);

    switch (phase) {
      case 'idle':
      case 'todo':
        return this.executeIdlePhase(task);

      case 'brainstorming':
        return this.executeBrainstormingPhase(task);

      case 'clarifying':
        return this.checkClarificationPhase(task);

      case 'planning':
        return this.executePlanningPhase(task);

      case 'plan_review':
        return this.checkPlanReviewPhase(task);

      case 'in_progress':
        return this.executeImplementationPhase(task);

      case 'verifying':
        return this.executeVerificationPhase(task);

      case 'creating_pr':
        return this.executeCreatePRPhase(task);

      case 'awaiting_pr_review':
        return { success: true, requiresUserInput: true };

      case 'merging':
        return this.executeMergePhase(task);

      case 'done':
        return { success: true };

      default:
        return { success: false, error: `Unknown phase: ${phase}` };
    }
  }

  /**
   * Execute idle phase - setup worktrees
   */
  private async executeIdlePhase(task: AgenticTask): Promise<PhaseResult> {
    const taskId = task.id;

    try {
      // Create worktrees for all projects in the group
      if (task.projectGroupId) {
        const projects = await projectGroupService.getProjectsInGroup(task.projectGroupId);

        if (projects.length > 0) {
          agenticLogsStore.info(taskId, 'idle', `Creating worktrees for ${projects.length} projects`);

          for (const project of projects) {
            await worktreeManager.createWorktree(
              project.localPath,
              taskId,
              project.id,
              project.gitBranch
            );
          }
        }
      }

      await agenticTaskService.updateTaskStatus(taskId, 'brainstorming', 'brainstorming');
      return { success: true, nextPhase: 'brainstorming' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup worktrees',
      };
    }
  }

  /**
   * Execute brainstorming phase
   */
  private async executeBrainstormingPhase(task: AgenticTask): Promise<PhaseResult> {
    const result = await brainstormingExecutor.execute(task);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (result.questions.length > 0) {
      await agenticTaskService.updateTaskStatus(task.id, 'clarifying', 'clarifying');
      return { success: true, nextPhase: 'clarifying', requiresUserInput: true };
    }

    // No questions - skip to planning
    await agenticTaskService.updateTaskStatus(task.id, 'planning', 'planning');
    return { success: true, nextPhase: 'planning' };
  }

  /**
   * Check if clarifications are complete
   */
  private async checkClarificationPhase(task: AgenticTask): Promise<PhaseResult> {
    const clarifications = await clarificationService.getClarificationsForTask(task.id);
    const unanswered = clarifications.filter(c => !c.userAnswer);

    if (unanswered.length > 0) {
      return { success: true, requiresUserInput: true };
    }

    await agenticTaskService.updateTaskStatus(task.id, 'planning', 'planning');
    return { success: true, nextPhase: 'planning' };
  }

  /**
   * Execute planning phase
   */
  private async executePlanningPhase(task: AgenticTask): Promise<PhaseResult> {
    const result = await planningExecutor.execute(task);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    await agenticTaskService.updateTaskStatus(task.id, 'plan-review', 'plan_review');
    return { success: true, nextPhase: 'plan_review', requiresUserInput: true };
  }

  /**
   * Check if plan review is complete
   */
  private async checkPlanReviewPhase(task: AgenticTask): Promise<PhaseResult> {
    const plan = await planService.getPlanForTask(task.id);

    if (!plan) {
      return { success: false, error: 'No plan found' };
    }

    if (plan.status === 'approved') {
      await agenticTaskService.updateTaskStatus(task.id, 'in-progress', 'in_progress');
      return { success: true, nextPhase: 'in_progress' };
    }

    if (plan.status === 'rejected') {
      // Go back to planning
      await agenticTaskService.updateTaskStatus(task.id, 'planning', 'planning');
      return { success: true, nextPhase: 'planning' };
    }

    return { success: true, requiresUserInput: true };
  }

  /**
   * Execute implementation phase
   */
  private async executeImplementationPhase(task: AgenticTask): Promise<PhaseResult> {
    const plan = await planService.getPlanForTask(task.id);

    if (!plan) {
      return { success: false, error: 'No plan found' };
    }

    const result = await implementationExecutor.execute(task, plan);

    if (!result.success && task.errorHandling === 'stop_on_error') {
      return { success: false, error: result.error };
    }

    await agenticTaskService.updateTaskStatus(task.id, 'verifying', 'verifying');
    return { success: true, nextPhase: 'verifying' };
  }

  /**
   * Execute verification phase
   */
  private async executeVerificationPhase(task: AgenticTask): Promise<PhaseResult> {
    const result = await verificationExecutor.execute(task);

    if (!result.success && !result.requiredPassed) {
      // Verification failed - may need to go back to implementation
      if (task.errorHandling === 'smart_recovery') {
        await agenticTaskService.updateTaskStatus(task.id, 'in-progress', 'in_progress');
        return { success: true, nextPhase: 'in_progress' };
      }
      return { success: false, error: 'Verification failed' };
    }

    // Check if we should create PRs
    if (task.codeReviewPoint === 'before_verification' || task.codeReviewPoint === 'after_step') {
      await agenticTaskService.updateTaskPhase(task.id, 'creating_pr');
      return { success: true, nextPhase: 'creating_pr' };
    }

    // Complete without PR
    return { success: true, nextPhase: 'done' };
  }

  /**
   * Execute create PR phase
   */
  private async executeCreatePRPhase(task: AgenticTask): Promise<PhaseResult> {
    try {
      const prResult = await prCoordinator.createCoordinatedPRs(
        task.id,
        `[Agentic] ${task.title}`,
        this.buildPRBody(task)
      );

      // Notify PR created
      if (task.projectGroupId && prResult.prs.length > 0) {
        await slackNotifier.notifyPRCreated(
          task.projectGroupId,
          task.id,
          task.title,
          prResult.prs.map(pr => ({
            repoName: `Repo ${pr.projectId}`,
            url: pr.prUrl || '#',
          }))
        );
      }

      await agenticTaskService.updateTaskPhase(task.id, 'awaiting_pr_review');
      return { success: true, nextPhase: 'awaiting_pr_review', requiresUserInput: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create PRs',
      };
    }
  }

  /**
   * Execute merge phase
   */
  private async executeMergePhase(task: AgenticTask): Promise<PhaseResult> {
    try {
      const prs = await prCoordinator.getPRsForTask(task.id);
      const prGroupId = prs[0]?.prGroupId;

      if (prGroupId) {
        const mergeResult = await prCoordinator.mergeAllPRs(prGroupId);

        if (!mergeResult.success) {
          return { success: false, error: mergeResult.error };
        }

        // Notify merge
        if (task.projectGroupId) {
          await slackNotifier.notifyPRsMerged(
            task.projectGroupId,
            task.id,
            task.title,
            mergeResult.mergedPRs.length
          );
        }
      }

      return { success: true, nextPhase: 'done' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to merge PRs',
      };
    }
  }

  /**
   * Complete the pipeline
   */
  private async completePipeline(taskId: number): Promise<void> {
    await agenticTaskService.updateTaskStatus(taskId, 'done', 'done');

    const task = await agenticTaskService.getTask(taskId);
    if (task?.projectGroupId) {
      await slackNotifier.notifyTaskCompleted(task.projectGroupId, taskId, task.title);
    }

    // Save to task history
    await this.saveTaskHistory(taskId);

    // Cleanup
    this.runningTasks.delete(taskId);
  }

  /**
   * Handle pipeline error
   */
  private async handlePipelineError(taskId: number, error: Error): Promise<void> {
    agenticLogsStore.error(taskId, 'pipeline', `Pipeline error: ${error.message}`);

    const task = await agenticTaskService.getTask(taskId);
    if (task?.projectGroupId) {
      await slackNotifier.notifyTaskError(
        task.projectGroupId,
        taskId,
        task?.title || 'Unknown',
        error.message,
        task?.currentPhase || 'todo'
      );
    }

    this.updateState(taskId, {
      isRunning: false,
      error: error.message,
    });
  }

  /**
   * Pause pipeline
   */
  pausePipeline(taskId: number): void {
    this.updateState(taskId, { isPaused: true });
    agenticLogsStore.info(taskId, 'pipeline', 'Pipeline paused');
  }

  /**
   * Resume pipeline after user input (e.g., clarifications answered)
   */
  async resumePipeline(taskId: number): Promise<PipelineState | null> {
    console.log(`[PipelineOrchestrator] resumePipeline called for task ${taskId}`);
    agenticLogsStore.info(taskId, 'pipeline', '▶️ Resuming pipeline after clarifications...');
    
    let state = this.runningTasks.get(taskId);
    
    // Get the task first
    const task = await agenticTaskService.getTask(taskId);
    if (!task) {
      console.error(`[PipelineOrchestrator] Task ${taskId} not found`);
      agenticLogsStore.error(taskId, 'pipeline', '❌ Task not found');
      return null;
    }
    
    console.log(`[PipelineOrchestrator] Task found: status=${task.status}, phase=${task.currentPhase}`);
    agenticLogsStore.info(taskId, 'pipeline', `Task status: ${task.status}, phase: ${task.currentPhase}`);

    // If no existing state, create one and start pipeline
    if (!state) {
      console.log(`[PipelineOrchestrator] No existing state, starting fresh pipeline`);
      agenticLogsStore.info(taskId, 'pipeline', 'No existing pipeline state, starting fresh');
      
      state = {
        taskId,
        currentPhase: task.currentPhase,
        status: task.status,
        isRunning: true,
        isPaused: false,
        requiresUserInput: false,
      };
      this.runningTasks.set(taskId, state);
    } else {
      console.log(`[PipelineOrchestrator] Existing state found, resuming`);
      state.isPaused = false;
      state.requiresUserInput = false;
    }

    // Run the pipeline
    console.log(`[PipelineOrchestrator] Starting runPipeline...`);
    this.runPipeline(task).catch(error => {
      console.error(`[PipelineOrchestrator] Pipeline error:`, error);
      this.handlePipelineError(taskId, error);
    });

    return state;
  }

  /**
   * Stop pipeline
   */
  stopPipeline(taskId: number): void {
    this.updateState(taskId, { isRunning: false });
    this.runningTasks.delete(taskId);
    agenticLogsStore.info(taskId, 'pipeline', 'Pipeline stopped');
  }

  /**
   * Get pipeline state
   */
  getPipelineState(taskId: number): PipelineState | null {
    return this.runningTasks.get(taskId) || null;
  }

  /**
   * Update state helper
   */
  private updateState(taskId: number, updates: Partial<PipelineState>): void {
    const state = this.runningTasks.get(taskId);
    if (state) {
      Object.assign(state, updates);
    }
  }

  /**
   * Check if phase requires user confirmation
   */
  private requiresUserConfirmation(phase: AgenticPhase): boolean {
    return [
      'awaiting_clarification',
      'awaiting_plan_review',
      'awaiting_pr_review',
    ].includes(phase);
  }

  /**
   * Build PR body
   */
  private buildPRBody(task: AgenticTask): string {
    return `## Summary
This PR implements Task #${task.id}: ${task.title}

${task.description || ''}

---
*Generated by Agentic Dev Workflow*`;
  }

  /**
   * Save task to history
   */
  private async saveTaskHistory(taskId: number): Promise<void> {
    const task = await agenticTaskService.getTask(taskId);
    if (!task) return;

    const plan = await planService.getPlanForTask(taskId);
    const clarifications = await clarificationService.getClarificationsForTask(taskId);
    const logs = agenticLogsStore.getAllLogsFromDB(taskId);
    const worktrees = await worktreeManager.getWorktreesForTask(taskId);
    const prs = await prCoordinator.getPRsForTask(taskId);

    const snapshotData = {
      task,
      plan,
      clarifications,
      logsCount: logs.length,
      worktrees,
      prs,
    };

    // Build PR group info from coordinated PRs
    const prGroupInfo = prs.length > 0 ? {
      prGroupId: prs[0]?.prGroupId,
      totalPRs: prs.length,
      prs: prs.map(pr => ({
        projectId: pr.projectId,
        prNumber: pr.prNumber,
        prUrl: pr.prUrl,
        status: pr.prStatus,
      })),
    } : null;

    // Build rollback info from worktrees
    const rollbackInfo = worktrees.length > 0 ? {
      branches: worktrees.map(wt => ({
        projectId: wt.projectId,
        branchName: wt.branchName,
        baseBranch: wt.baseBranch,
      })),
    } : null;

    // Generate context summary from task data
    const contextSummary = `Task: ${task.title}\nStatus: ${task.status}\nPhase: ${task.currentPhase}\nSteps: ${plan?.planSteps?.length || 0}\nClarifications: ${clarifications.length} answered`;

    await statements.createAgenticTaskHistory.run(
      taskId,
      JSON.stringify(snapshotData),
      contextSummary,
      task.status, // finalStatus
      prGroupInfo ? JSON.stringify(prGroupInfo) : null,
      rollbackInfo ? JSON.stringify(rollbackInfo) : null
    );
  }
}

// Singleton instance
export const pipelineOrchestrator = new PipelineOrchestrator();
export default pipelineOrchestrator;
