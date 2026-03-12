/**
 * Implementation Phase Executor
 * Executes plan steps using Claude Agent SDK with full code generation capabilities
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getPreferredModel } from '@/lib/utils/modelSelector';
import { buildMCPServersConfig } from '@/lib/utils/mcpConfig';
import { agenticLogsStore } from '../logs/agenticLogsStore';
import { planService } from '../services/planService';
import { clarificationService } from '../services/clarificationService';
import { globalDocumentService } from '../services/globalDocumentService';
import { taskContextService } from '../services/taskContextService';
import { worktreeManager } from '../git/worktreeManager';
import { statements } from '@/lib/db/postgres';
import { AgenticTask, AgenticPlan, AgenticPlanStep, TaskMCPConfig } from '@/types/agentic-task';

export interface StepExecutionResult {
  success: boolean;
  stepId: number;
  output?: string;
  filesChanged?: string[];
  commitHash?: string;
  error?: string;
  executionTime: number;
}

export interface ImplementationResult {
  success: boolean;
  stepsExecuted: number;
  stepsSucceeded: number;
  stepsFailed: number;
  stepResults: StepExecutionResult[];
  error?: string;
  metadata?: {
    totalExecutionTime: number;
    model: string;
  };
}

export class ImplementationExecutor {
  /**
   * Execute all pending steps in a plan
   */
  async execute(task: AgenticTask, plan: AgenticPlan): Promise<ImplementationResult> {
    const startTime = Date.now();
    const taskId = task.id;

    agenticLogsStore.info(taskId, 'implementation', '🚀 Starting implementation phase...');

    const stepResults: StepExecutionResult[] = [];
    let stepsSucceeded = 0;
    let stepsFailed = 0;
    let model = 'unknown';

    try {
      model = await getPreferredModel();
      agenticLogsStore.info(taskId, 'implementation', `Using model: ${model}`);

      // Get worktree for the task
      const worktrees = await worktreeManager.getWorktreesForTask(taskId);
      if (worktrees.length === 0) {
        throw new Error('No worktree found for task. Create worktrees first.');
      }

      // Log workspace scope for debugging
      agenticLogsStore.info(taskId, 'implementation', `📂 Worktrees (${worktrees.length}):`);
      worktrees.forEach((wt, i) => {
        agenticLogsStore.info(taskId, 'implementation', `   ${i + 1}. ${wt.worktreePath} (branch: ${wt.branchName})`);
      });
      agenticLogsStore.info(taskId, 'implementation', `📁 Primary working directory: ${worktrees[0].worktreePath}`);

      // Get pending steps
      const steps = await planService.getPlanSteps(plan.id);
      const pendingSteps = steps.filter(s => s.status === 'pending' || s.status === 'in_progress');

      agenticLogsStore.info(taskId, 'implementation', `Found ${pendingSteps.length} pending steps`);

      // Build context
      const clarifications = await clarificationService.getClarificationsForTask(taskId);
      const clarificationContext = clarificationService.formatForPrompt(
        clarifications.filter(c => c.userAnswer)
      );

      const taskDocs = await this.getTaskDocuments(taskId);
      let documentContext = '';
      if (taskDocs.length > 0) {
        documentContext = await globalDocumentService.formatForPrompt(taskDocs);
      }

      // Execute each step based on execution strategy
      for (const step of pendingSteps) {
        agenticLogsStore.info(
          taskId,
          'implementation',
          `📍 Executing step ${step.order + 1}: ${step.title}`,
          step.id
        );

        await planService.updateStepStatus(step.id, 'in_progress');

        const result = await this.executeStep(
          task,
          plan,
          step,
          worktrees[0], // Primary worktree
          clarificationContext,
          documentContext,
          model
        );

        stepResults.push(result);

        if (result.success) {
          stepsSucceeded++;
          await planService.updateStepStatus(step.id, 'completed', result.output);
          agenticLogsStore.success(
            taskId,
            'implementation',
            `✅ Step ${step.order + 1} completed`,
            step.id
          );

          // Update context file with progress
          try {
            taskContextService.addProgressNote(
              taskId,
              step.title,
              'completed',
              result.output?.substring(0, 200) || 'Step completed successfully'
            );
          } catch (e) {
            // Non-critical, continue execution
          }
        } else {
          stepsFailed++;
          await planService.updateStepStatus(step.id, 'failed', result.error);
          agenticLogsStore.error(
            taskId,
            'implementation',
            `❌ Step ${step.order + 1} failed: ${result.error}`,
            step.id
          );

          // Record failure in context file
          try {
            taskContextService.addProgressNote(taskId, step.title, 'failed', result.error);
            taskContextService.addIssueOrLearning(taskId, 'issue', `Step "${step.title}" failed: ${result.error}`);
          } catch (e) {
            // Non-critical, continue execution
          }

          // Handle based on error handling strategy
          if (task.errorHandling === 'stop_on_error') {
            break;
          } else if (task.errorHandling === 'smart_recovery') {
            // Try to recover - skip to next step
            agenticLogsStore.warning(
              taskId,
              'implementation',
              'Smart recovery: Continuing to next step',
              step.id
            );
            continue;
          }
          // continue_on_error: just continue
        }
      }

      const totalExecutionTime = Date.now() - startTime;

      agenticLogsStore.success(
        taskId,
        'implementation',
        `🎉 Implementation complete: ${stepsSucceeded}/${pendingSteps.length} steps succeeded`
      );

      return {
        success: stepsFailed === 0,
        stepsExecuted: stepResults.length,
        stepsSucceeded,
        stepsFailed,
        stepResults,
        metadata: {
          totalExecutionTime,
          model,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      agenticLogsStore.error(taskId, 'implementation', `❌ Failed: ${errorMessage}`);

      return {
        success: false,
        stepsExecuted: stepResults.length,
        stepsSucceeded,
        stepsFailed,
        stepResults,
        error: errorMessage,
        metadata: {
          totalExecutionTime: Date.now() - startTime,
          model,
        },
      };
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    task: AgenticTask,
    plan: AgenticPlan,
    step: AgenticPlanStep,
    worktree: { worktreePath: string; branchName: string },
    clarificationContext: string,
    documentContext: string,
    model: string
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const taskId = task.id;

    try {
      // Build step-specific prompt
      const prompt = this.buildStepPrompt(
        task,
        plan,
        step,
        clarificationContext,
        documentContext
      );

      // Build MCP config
      const mcpServers = this.buildMCPConfig(task.mcpServersConfig);

      // Verify API key is available
      const apiKey = SKILLS_CONFIG.anthropicApiKey;
      if (!apiKey) {
        agenticLogsStore.error(taskId, 'implementation', '❌ No Anthropic API key configured');
        return {
          success: false,
          filesChanged: [],
          error: 'No Anthropic API key configured. Please add your API key in Settings.',
          metadata: {
            executionTime: Date.now() - startTime,
            model,
            stepsCompleted: 0,
            totalSteps: plan.planSteps.length,
          },
        };
      }
      agenticLogsStore.info(taskId, 'implementation', `API key loaded (ends with: ...${apiKey.slice(-4)})`);
      agenticLogsStore.progress(taskId, 'implementation', `Running step: ${step.title}`, step.id);

      // Execute with Agent SDK - full permissions for implementation
      const queryGenerator = query({
        prompt,
        options: {
          model,
          cwd: worktree.worktreePath,
          additionalDirectories: [SKILLS_CONFIG.skillsDirectory],
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: apiKey,
          },
          executable: 'node',
          pathToClaudeCodeExecutable: '/usr/local/bin/claude',
          allowDangerouslySkipPermissions: true,
          permissionMode: 'default', // Full permissions for implementation
          mcpServers: mcpServers as any,
        },
      });

      // Collect output
      let output = '';
      for await (const message of queryGenerator as AsyncIterable<any>) {
        if (message.type === 'assistant') {
          const textContent = message.message?.content
            ?.filter((block: any) => block.type === 'text')
            ?.map((block: any) => block.text)
            ?.join('\n') || '';

          if (textContent) {
            output += textContent + '\n';
            const preview = textContent.slice(0, 80).replace(/\n/g, ' ');
            agenticLogsStore.progress(taskId, 'implementation', preview, step.id);
          }

          // Track tool usage
          const toolUse = message.message?.content?.filter((block: any) => block.type === 'tool_use') || [];
          for (const tool of toolUse) {
            agenticLogsStore.tool(taskId, 'implementation', `Tool: ${tool.name}`, step.id, {
              input: tool.input,
            });
          }
        } else if (message.type === 'result') {
          if (message.subtype === 'error_during_execution') {
            throw new Error(message.errors?.join(', ') || 'Execution error');
          }
        }
      }

      // Commit changes if any
      let commitHash: string | undefined;
      const hasChanges = worktreeManager.hasUncommittedChanges(worktree.worktreePath);

      if (hasChanges) {
        commitHash = await worktreeManager.commitChanges(
          worktree.worktreePath,
          `Step ${step.order + 1}: ${step.title}`,
          taskId
        );
        agenticLogsStore.info(
          taskId,
          'implementation',
          `Committed: ${commitHash.slice(0, 8)}`,
          step.id
        );
      }

      // Get changed files
      const filesChanged = hasChanges
        ? worktreeManager.getChangedFiles(worktree.worktreePath, worktree.branchName)
        : [];

      return {
        success: true,
        stepId: step.id,
        output,
        filesChanged,
        commitHash,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        stepId: step.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Build prompt for a single step
   */
  private buildStepPrompt(
    task: AgenticTask,
    plan: AgenticPlan,
    step: AgenticPlanStep,
    clarificationContext: string,
    documentContext: string
  ): string {
    return `# Implementation Step

You are implementing step ${step.order + 1} of the plan.

## Task Overview
**Title:** ${task.title}
**Description:** ${task.description || 'No description'}

## Plan Overview
${plan.planOverview}

## Current Step
**Title:** ${step.title}
**Description:** ${step.description}
${step.filePaths ? `**Target Files:** ${step.filePaths.join(', ')}` : ''}

${clarificationContext ? `## Context from Clarifications\n${clarificationContext}\n` : ''}
${documentContext ? `## Reference Documents\n${documentContext}\n` : ''}

## Instructions

1. Implement ONLY this specific step
2. Make minimal, focused changes
3. Follow existing code patterns in the codebase
4. Do not add unnecessary features or refactoring
5. Ensure the code compiles/runs without errors

When complete, summarize what was done and any issues encountered.`;
  }

  /**
   * Build MCP configuration
   */
  private buildMCPConfig(mcpConfig?: TaskMCPConfig[]): Record<string, any> | undefined {
    if (!mcpConfig || mcpConfig.length === 0) {
      return buildMCPServersConfig(true, true);
    }

    const servers: Record<string, any> = {};
    for (const config of mcpConfig) {
      if (config.enabled) {
        // TODO: Build from stored config
      }
    }

    if (Object.keys(servers).length === 0) {
      return buildMCPServersConfig(true, true);
    }

    return servers;
  }

  /**
   * Get document IDs attached to a task
   */
  private async getTaskDocuments(taskId: number): Promise<number[]> {
    const docs = await statements.getAgenticTaskDocuments.all(taskId) as any[];
    return docs
      .filter(d => d.document_type === 'global')
      .map(d => d.document_id);
  }
}

// Singleton instance
export const implementationExecutor = new ImplementationExecutor();
export default implementationExecutor;
