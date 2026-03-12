/**
 * Claude Code CLI Executor
 * Executes skills using local Claude Code CLI with full project context
 */

import { spawn, ChildProcess } from 'child_process';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getTargetProjectPath } from '@/lib/config/workspace';
import { getPreferredModel } from '@/lib/utils/modelSelector';
import type { SkillExecutionOptions, SkillExecutionResult } from '@/types/skill';

export interface ClaudeCodeStreamCallback {
  onOutput: (output: string) => void;
  onError: (error: string) => void;
  onComplete: (result: string) => void;
}

export class ClaudeCodeExecutor {
  private projectPath: string | null = null;

  constructor(projectPath?: string) {
    if (projectPath) {
      this.projectPath = projectPath;
      console.log(`🎯 ClaudeCodeExecutor initialized for: ${this.projectPath}`);
    } else {
      // Path will be resolved lazily when needed
      console.log(`🎯 ClaudeCodeExecutor initialized (path will be resolved lazily)`);
    }
  }
  
  /**
   * Get the project path, resolving it lazily if not set
   */
  private async getProjectPath(): Promise<string> {
    if (!this.projectPath) {
      this.projectPath = await getTargetProjectPath();
      console.log(`🎯 ClaudeCodeExecutor resolved project path: ${this.projectPath}`);
    }
    return this.projectPath;
  }

  /**
   * Execute prompt-enhancer skill using Claude Code CLI
   */
  async executePromptEnhancer(
    taskTitle: string,
    taskDescription: string,
    options: SkillExecutionOptions & { callback?: ClaudeCodeStreamCallback } = {}
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const model = options.model || await getPreferredModel();

    console.log(`🎯 Executing prompt-enhancer via Claude Code CLI for: "${taskTitle}"`);

    try {
      // Build the prompt
      const prompt = `${taskTitle}${taskDescription ? `\n\n${taskDescription}` : ''}`;

      // Execute Claude Code with skill
      const result = await this.executeClaudeCode(
        `/prompt-enhancer ${prompt}`,
        options.callback
      );

      const executionTime = Date.now() - startTime;

      console.log(`✅ Claude Code skill execution completed in ${executionTime}ms`);
      console.log(`📄 Enhanced prompt generated: ${result.length} chars`);

      return {
        success: true,
        enhancedPrompt: result,
        rawOutput: result,
        metadata: {
          executionTime,
          skillName: 'prompt-enhancer',
          model: model,
          retryCount: 0,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Claude Code execution failed:`, error);

      return {
        success: false,
        error: error.message || 'Claude Code execution failed',
        metadata: {
          executionTime,
          skillName: 'prompt-enhancer',
          model: model,
          retryCount: 0,
        },
      };
    }
  }

  /**
   * Execute Claude Code CLI command
   */
  private async executeClaudeCode(
    command: string,
    callback?: ClaudeCodeStreamCallback
  ): Promise<string> {
    const projectPath = await this.getProjectPath();
    
    return new Promise((resolve, reject) => {
      const args = [
        '--print',
        '--output-format', 'text',
        command,
      ];

      console.log(`🚀 Spawning Claude Code process: claude ${args.join(' ')}`);

      const claudeProcess: ChildProcess = spawn('claude', args, {
        cwd: projectPath,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: SKILLS_CONFIG.anthropicApiKey,
        },
      });

      let stdout = '';
      let stderr = '';

      claudeProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;

        if (callback?.onOutput) {
          callback.onOutput(output);
        }

        // Log in real-time for debugging
        process.stdout.write(output);
      });

      claudeProcess.stderr?.on('data', (data: Buffer) => {
        const error = data.toString();
        stderr += error;

        if (callback?.onError) {
          callback.onError(error);
        }

        // Log errors
        process.stderr.write(error);
      });

      claudeProcess.on('error', (error) => {
        console.error('❌ Failed to spawn Claude Code process:', error);
        reject(new Error(`Failed to spawn Claude Code: ${error.message}`));
      });

      claudeProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Claude Code process exited successfully`);

          if (callback?.onComplete) {
            callback.onComplete(stdout);
          }

          resolve(stdout.trim());
        } else {
          console.error(`❌ Claude Code process exited with code ${code}`);
          console.error(`stderr: ${stderr}`);

          reject(new Error(`Claude Code exited with code ${code}: ${stderr}`));
        }
      });
    });
  }

  /**
   * Check if Claude Code CLI is available
   */
  static async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkProcess = spawn('which', ['claude']);

      checkProcess.on('close', (code) => {
        resolve(code === 0);
      });

      checkProcess.on('error', () => {
        resolve(false);
      });
    });
  }
}

// Singleton instance
export const claudeCodeExecutor = new ClaudeCodeExecutor();
