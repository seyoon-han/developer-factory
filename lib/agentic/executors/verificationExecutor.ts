/**
 * Verification Phase Executor
 * Runs verification commands and validates implementation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { agenticLogsStore } from '../logs/agenticLogsStore';
import { worktreeManager } from '../git/worktreeManager';
import { planService } from '../services/planService';
import { taskContextService } from '../services/taskContextService';
import { statements } from '@/lib/db/postgres';
import { AgenticTask, AgenticPlan } from '@/types/agentic-task';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getPreferredModel } from '@/lib/utils/modelSelector';

const execAsync = promisify(exec);

export interface VerificationCommand {
  name: string;
  command: string;
  required: boolean;
  timeout?: number; // in milliseconds
}

export interface VerificationResult {
  success: boolean;
  commandResults: CommandResult[];
  allPassed: boolean;
  requiredPassed: boolean;
  metadata?: {
    executionTime: number;
    passedCount: number;
    failedCount: number;
  };
}

export interface CommandResult {
  id?: number;
  name: string;
  command: string;
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  required: boolean;
}

export class VerificationExecutor {
  /**
   * Execute verification phase for a task
   */
  async execute(task: AgenticTask): Promise<VerificationResult> {
    const startTime = Date.now();
    const taskId = task.id;

    agenticLogsStore.info(taskId, 'verification', '🔍 Starting verification phase...');

    const commandResults: CommandResult[] = [];
    let passedCount = 0;
    let failedCount = 0;

    try {
      // Get worktrees for the task
      const worktrees = await worktreeManager.getWorktreesForTask(taskId);
      if (worktrees.length === 0) {
        throw new Error('No worktree found for task');
      }

      // Get plan for context
      const plan = await planService.getPlanForTask(taskId);
      if (!plan) {
        throw new Error('No plan found for task');
      }

      // Get verification commands from task config
      const commands = this.getVerificationCommands(task);
      
      // Add AI Verification (Always required)
      commands.push({
        name: 'AI Re-inspection',
        command: 'ai_verify',
        required: true,
        timeout: 120000
      });

      agenticLogsStore.info(taskId, 'verification', `Running ${commands.length} verification checks`);

      // Run each command
      for (const cmd of commands) {
        agenticLogsStore.progress(taskId, 'verification', `Running: ${cmd.name}`);

        // Create verification record for this command
        const verificationRecord = await statements.createAgenticVerification.run(
          taskId,
          cmd.name,
          cmd.command,
          worktrees[0].projectId || null
        );
        const verificationId = Number(verificationRecord.lastInsertRowid);

        let result: CommandResult;

        if (cmd.command === 'ai_verify') {
          result = await this.runAIVerification(task, plan, worktrees[0].worktreePath);
        } else {
          result = await this.runCommand(
            cmd,
            worktrees[0].worktreePath,
            taskId,
            verificationId
          );
        }

        result.id = verificationId;
        commandResults.push(result);

        // Update verification record with results
        await statements.updateAgenticVerificationStatus.run(
          result.success ? 'passed' : 'failed',
          result.success ? 0 : 1,
          result.output,
          result.error || null,
          result.executionTime,
          verificationId
        );

        if (result.success) {
          passedCount++;
          agenticLogsStore.success(taskId, 'verification', `✅ ${cmd.name}: Passed`);
        } else {
          failedCount++;
          agenticLogsStore.error(taskId, 'verification', `❌ ${cmd.name}: Failed`);
          if (result.error) {
            agenticLogsStore.error(taskId, 'verification', result.error.slice(0, 200));
          }
        }
      }

      // Check if all required commands passed
      const requiredPassed = commandResults
        .filter(r => r.required)
        .every(r => r.success);

      const allPassed = commandResults.every(r => r.success);

      const executionTime = Date.now() - startTime;

      if (allPassed) {
        agenticLogsStore.success(
          taskId,
          'verification',
          `🎉 All ${commands.length} verifications passed in ${executionTime}ms`
        );
      } else if (requiredPassed) {
        agenticLogsStore.warning(
          taskId,
          'verification',
          `⚠️ Required verifications passed, ${failedCount} optional failed`
        );
      } else {
        agenticLogsStore.error(
          taskId,
          'verification',
          `❌ ${failedCount} verification(s) failed`
        );
      }

      return {
        success: requiredPassed,
        commandResults,
        allPassed,
        requiredPassed,
        metadata: {
          executionTime,
          passedCount,
          failedCount,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      agenticLogsStore.error(taskId, 'verification', `❌ Failed: ${errorMessage}`);

      return {
        success: false,
        commandResults: [],
        allPassed: false,
        requiredPassed: false,
        metadata: {
          executionTime: Date.now() - startTime,
          passedCount: 0,
          failedCount: 0,
        },
      };
    }
  }

  /**
   * Run AI Verification using Claude
   */
  private async runAIVerification(task: AgenticTask, plan: AgenticPlan, cwd: string): Promise<CommandResult> {
    const startTime = Date.now();
    try {
      // Build prompt for AI verification
      const prompt = `# Verification Request
      
Task: ${task.title}
Description: ${task.description}

I have just implemented the following plan:
${plan.planOverview}

## Your Job
Inspect the current codebase in the working directory and verify if the implementation meets the requirements and matches the plan.

1. Check if key files exist
2. Check if the code looks correct and complete
3. Identify any missing requirements or obvious bugs

Reply with a summary of your findings. If everything looks good, start your response with "PASS". If there are issues, start with "FAIL" and explain why.
`;

      // Get preferred model
      const model = await getPreferredModel();
      
      // Call Claude
      const queryGenerator = query({
        prompt,
        options: {
          model,
          cwd,
          additionalDirectories: [SKILLS_CONFIG.skillsDirectory],
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: SKILLS_CONFIG.anthropicApiKey,
          },
          executable: 'node',
          pathToClaudeCodeExecutable: '/usr/local/bin/claude',
          allowDangerouslySkipPermissions: true,
          permissionMode: 'read', // Read-only for verification
        },
      });

      let output = '';
      for await (const message of queryGenerator as AsyncIterable<any>) {
        if (message.type === 'assistant') {
          const text = message.message?.content
            ?.filter((b: any) => b.type === 'text')
            ?.map((b: any) => b.text)
            ?.join('\n') || '';
          output += text;
        }
      }

      const success = output.trim().toUpperCase().startsWith('PASS');

      return {
        name: 'AI Re-inspection',
        command: 'ai_verify',
        success,
        output,
        executionTime: Date.now() - startTime,
        required: true
      };
    } catch (error: any) {
      return {
        name: 'AI Re-inspection',
        command: 'ai_verify',
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        required: true
      };
    }
  }

  /**
   * Run a single verification command
   */
  private async runCommand(
    cmd: VerificationCommand,
    cwd: string,
    taskId: number,
    verificationId: number
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const timeout = cmd.timeout || 120000; // Default 2 minutes

    try {
      const { stdout, stderr } = await execAsync(cmd.command, {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: {
          ...process.env,
          CI: 'true', // Ensure non-interactive mode
        },
      });

      return {
        name: cmd.name,
        command: cmd.command,
        success: true,
        output: stdout + (stderr ? `\nSTDERR:\n${stderr}` : ''),
        executionTime: Date.now() - startTime,
        required: cmd.required,
      };
    } catch (error: any) {
      return {
        name: cmd.name,
        command: cmd.command,
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message || 'Command failed',
        executionTime: Date.now() - startTime,
        required: cmd.required,
      };
    }
  }

  /**
   * Get verification commands from task config or defaults
   */
  private getVerificationCommands(task: AgenticTask): VerificationCommand[] {
    // If task has custom verification commands, use those
    if (task.verificationCommands && task.verificationCommands.length > 0) {
      return task.verificationCommands.map((cmd, i) => ({
        name: `Command ${i + 1}`,
        command: cmd,
        required: true,
        timeout: 60000,
      }));
    }

    // Default verification commands based on common project types
    return this.getDefaultCommands();
  }

  /**
   * Get default verification commands
   */
  private getDefaultCommands(): VerificationCommand[] {
    // Return empty list by default - only run AI verification unless user configured specific commands
    return [];
  }

  /**
   * Get verifications for a task
   */
  async getVerifications(taskId: number): Promise<CommandResult[]> {
    const rows = await statements.getAgenticVerifications.all(taskId) as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.check_name,
      command: row.check_command,
      success: row.status === 'passed',
      output: row.stdout || '',
      error: row.stderr || undefined,
      executionTime: row.duration_ms || 0,
      required: true,
    }));
  }

  /**
   * Re-run failed verifications
   */
  async retryFailedVerifications(task: AgenticTask): Promise<VerificationResult> {
    await agenticLogsStore.info(task.id, 'verification', '🔄 Retrying failed verifications...');
    // Delete old verifications for this task
    await statements.deleteAgenticVerifications.run(task.id);
    return this.execute(task);
  }
}

// Singleton instance
export const verificationExecutor = new VerificationExecutor();
export default verificationExecutor;
