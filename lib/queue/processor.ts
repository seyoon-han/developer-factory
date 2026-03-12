import { statements } from '@/lib/db/postgres';
import { skillExecutor } from './skillExecutor';
import { claudeCodeExecutor } from './claudeCodeExecutor';
import { agentSdkExecutor } from './agentSdkExecutor';
import { referenceContextBuilder } from './referenceContext';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { logTokenUsage, getProviderFromModel } from '@/lib/utils/tokenUsage';

export interface QueueItem {
  id: number;
  task_id: number;
  status: string;
  retry_count: number;
}

export class TaskQueueProcessor {
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;

  async start(intervalMs: number = 10000) {
    console.log('🚀 Task queue processor started');

    // Process immediately
    this.processQueue();

    // Then process every intervalMs
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);
  }

  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('⏹️  Task queue processor stopped');
    }
  }

  async processQueue() {
    if (this.isProcessing) {
      console.log('⏳ Queue processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingItems = await statements.getPendingQueueItems.all() as QueueItem[];

      if (pendingItems.length === 0) {
        return;
      }

      console.log(`📋 Processing ${pendingItems.length} pending tasks`);

      for (const item of pendingItems) {
        await this.processTask(item);
      }
    } catch (error) {
      console.error('❌ Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processTask(item: QueueItem) {
    try {
      console.log(`🔨 Processing task #${item.task_id}`);

      // Get task details
      const task = await statements.getTask.get(item.task_id) as any;
      if (!task) {
        throw new Error(`Task ${item.task_id} not found`);
      }

      // Update queue status to processing
      await statements.updateQueueStatus.run('processing', null, item.id);

      // Move task to "verifying" status
      await statements.updateTaskStatus.run('verifying', item.task_id);

      // Call Claude Code prompt-enhancer skill via API
      await this.enhancePrompt(item.task_id, task.title, task.description);

      // Mark as completed
      await statements.updateQueueStatus.run('completed', null, item.id);

      console.log(`✅ Task #${item.task_id} processed successfully`);
    } catch (error: any) {
      console.error(`❌ Error processing task #${item.task_id}:`, error);

      // Update queue with error
      await statements.updateQueueStatus.run(
        'failed',
        error.message || 'Unknown error',
        item.id
      );

      // Increment retry count
      const retryCount = item.retry_count + 1;
      if (retryCount < 3) {
        // Re-queue for retry
        console.log(`🔄 Re-queuing task #${item.task_id} (retry ${retryCount}/3)`);
        await statements.enqueueTask.run(item.task_id);
      }
    }
  }

  private async enhancePrompt(taskId: number, title: string, description: string) {
    try {
      const executionMethod = SKILLS_CONFIG.executionMethod;
      console.log(`🎨 Executing prompt-enhancer skill for task #${taskId} (method: ${executionMethod})`);

      // Get task to check for referenced tasks
      const task = await statements.getTask.get(taskId) as any;
      
      // Build context from referenced tasks
      const referencedContext = referenceContextBuilder.getReferencedReports(task);
      const enhancedDescription = referencedContext 
        ? `${description || ''}\n\n${referencedContext}`
        : description || '';

      if (referencedContext) {
        console.log(`📚 Including context from ${JSON.parse(task.reference_task_ids || '[]').length} referenced task(s)`);
      }

      let skillResult;

      if (executionMethod === 'sdk') {
        // Use Claude Agent SDK (RECOMMENDED - best context retention)
        console.log(`🤖 Using Claude Agent SDK with persistent sessions`);
        skillResult = await agentSdkExecutor.executePromptEnhancer(
          taskId,
          title,
          enhancedDescription,
          { timeout: 90000, retries: 2 }
        );
      } else if (executionMethod === 'cli') {
        // Use Claude Code CLI (has project context)
        console.log(`🖥️  Using Claude Code CLI with project context`);
        skillResult = await claudeCodeExecutor.executePromptEnhancer(
          title,
          enhancedDescription,
          { timeout: 90000, retries: 2 }
        );
      } else {
        // Use Anthropic Skills API with project context
        console.log(`☁️  Using Anthropic Skills API with project context`);
        skillResult = await skillExecutor.executePromptEnhancer(
          title,
          enhancedDescription,
          { timeout: 90000, retries: 2, includeProjectContext: true }
        );
      }

      if (skillResult.success && skillResult.enhancedPrompt) {
        console.log(`✅ Skill generated enhanced requirements (${skillResult.enhancedPrompt.length} chars)`);

        // Log token usage if available (for CLI and API methods that don't log internally)
        if (executionMethod === 'cli' || executionMethod === 'api') {
          const metadata = skillResult.metadata;
          if (metadata) {
            logTokenUsage({
              taskId,
              phase: 'prompt_enhancement',
              provider: getProviderFromModel(metadata.model),
              model: metadata.model,
              totalTokens: 0, // CLI/API don't provide token counts in current implementation
              costUsd: metadata.totalCost || 0,
              numTurns: metadata.numTurns || 1,
              executionTimeMs: metadata.executionTime || 0,
            });
          }
        }

        // Store enhanced prompt in database
        await statements.updatePrompt.run(skillResult.enhancedPrompt, taskId);

        console.log(`💾 Enhanced prompt saved to database for task #${taskId}`);

        // Keep task in 'verifying' status - wait for user approval
        // Do NOT auto-move to 'in-progress' 
        console.log(`⏸️  Task #${taskId} awaiting user approval before implementation`);

        return {
          success: true,
          promptLength: skillResult.enhancedPrompt.length,
          executionTime: skillResult.metadata?.executionTime,
        };
      } else {
        // Skill execution failed
        const errorMsg = skillResult.error || 'Unknown error during skill execution';
        console.error(`❌ Skill execution failed: ${errorMsg}`);

        throw new Error(`Skill execution failed: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('💥 Error in enhancePrompt:', error);
      throw error;
    }
  }
}

export const queueProcessor = new TaskQueueProcessor();
