/**
 * Claude Agent SDK Executor
 * Executes Claude Code skills using the Agent SDK with session management
 * Provides persistent context across requests
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getTargetProjectPath } from '@/lib/config/workspace';
import { getPreferredModel } from '@/lib/utils/modelSelector';
import { buildMCPServersConfig, buildContext7Instruction, buildConfluenceInstruction } from '@/lib/utils/mcpConfig';
import { statements } from '@/lib/db/postgres';
import { logTokenUsage, getProviderFromModel, parseClaudeUsage } from '@/lib/utils/tokenUsage';
import type {
  SkillExecutionOptions,
  SkillExecutionResult,
} from '@/types/skill';

export class AgentSdkExecutor {
  private apiKey: string;
  private sessionMap: Map<number, string> = new Map(); // taskId -> sessionId
  private latestModel: string | null = null;

  constructor() {
    this.apiKey = SKILLS_CONFIG.anthropicApiKey;
  }

  /**
   * Get the latest Sonnet model, with caching
   */
  private async getModel(providedModel?: string): Promise<string> {
    // If a model is explicitly provided, use it
    if (providedModel) {
      return providedModel;
    }

    // If we have a cached latest model, use it
    if (this.latestModel) {
      return this.latestModel;
    }

    // Fetch and cache the latest preferred model
    this.latestModel = await getPreferredModel();
    return this.latestModel;
  }

  /**
   * Execute the prompt-enhancer skill using Claude Agent SDK
   */
  async executePromptEnhancer(
    taskId: number,
    taskTitle: string,
    taskDescription: string,
    options: SkillExecutionOptions = {}
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const retries = options.retries ?? SKILLS_CONFIG.maxRetries;
    let lastError: Error | null = null;

    // Resolve model
    const preferredModel = options.model || await this.getModel();
    const executionOptions = { ...options, model: preferredModel };

    console.log(`🎯 Executing prompt-enhancer via Agent SDK for task #${taskId}: "${taskTitle}"`);

    // Create a NEW session ID for each execution to avoid MCP tool conflicts
    // Prompt enhancement is a stateless operation, so we don't need to resume
    const sessionId = `task-${taskId}-${Date.now()}`;
    console.log(`📍 Using fresh session ID: ${sessionId}`);

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${retries}`);
      }

      try {
        const result = await this.executeWithSdk(
          sessionId,
          taskTitle,
          taskDescription,
          executionOptions
        );

        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt + 1} failed:`, error);

        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    // All retries failed
    const executionTime = Date.now() - startTime;
    console.error(`💥 All ${retries + 1} attempts failed`);

    return {
      success: false,
      error: lastError?.message || 'SDK execution failed after all retries',
      metadata: {
        executionTime,
        skillName: 'prompt-enhancer',
        model: preferredModel,
        retryCount: retries,
      },
    };
  }

  /**
   * Execute skill using Claude Agent SDK
   */
  private async executeWithSdk(
    sessionId: string,
    taskTitle: string,
    taskDescription: string,
    options: SkillExecutionOptions
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();

    // Get task ID from session ID to check MCP settings
    const taskIdMatch = sessionId.match(/^task-(\d+)-/);
    const taskId = taskIdMatch ? parseInt(taskIdMatch[1]) : null;
    
    // Check if MCP servers should be used for this task
    let useContext7 = false;
    let useConfluence = true; // Default to true
    if (taskId) {
      const task = await statements.getTask.get(taskId) as any;
      useContext7 = Boolean(task?.use_context7);
      useConfluence = task?.use_confluence !== 0; // Default to true if not explicitly set to 0
      console.log(`🔍 Task #${taskId} Context7 setting: ${useContext7 ? 'enabled' : 'disabled'}`);
      console.log(`🔍 Task #${taskId} Confluence setting: ${useConfluence ? 'enabled' : 'disabled'}`);
    }

    // Build the prompt for the prompt-enhancer skill
    let prompt = this.buildPromptEnhancerPrompt(taskTitle, taskDescription);
    
    // Add Confluence instruction if enabled
    prompt = buildConfluenceInstruction(prompt, useConfluence);
    
    // Add Context7 instruction if enabled
    prompt = buildContext7Instruction(prompt, useContext7);

    console.log(`📝 Prompt prepared (${prompt.length} chars)`);
    console.log(`🚀 Calling Claude Agent SDK...`);

    try {
      // Get target project path (external project or demo mode)
      const targetPath = getTargetProjectPath();
      console.log(`🎯 Executing in: ${targetPath}`);
      
      // Get the model to use (latest Sonnet or provided model)
      const modelToUse = await this.getModel(options.model);
      console.log(`🤖 Selected model: ${modelToUse}${options.model ? ' (explicitly provided)' : ' (latest Sonnet auto-selected)'}`);
      
      // Build MCP servers configuration
      const mcpServers = buildMCPServersConfig(useContext7, useConfluence);
      
      // Log SDK configuration
      console.log(`⚙️  SDK Configuration:`);
      console.log(`   - Model: ${modelToUse}`);
      console.log(`   - CWD: ${targetPath}`);
      console.log(`   - Skills Dir: ${SKILLS_CONFIG.skillsDirectory}`);
      console.log(`   - Session ID: ${sessionId}`);
      console.log(`   - Prompt length: ${prompt.length} chars`);
      console.log(`   - Context7 MCP: ${useContext7 ? 'enabled' : 'disabled'}`);
      console.log(`   - Confluence MCP: ${useConfluence ? 'enabled' : 'disabled'}`);
      if (mcpServers) {
        console.log(`   - MCP Servers: ${Object.keys(mcpServers).length} configured`);
      }

      // Call the query function with correct API structure
      const queryGenerator = query({
        prompt,
        options: {
          model: modelToUse,
          cwd: targetPath,  // ✅ Execute in target project, not dev-automation-board
          resume: sessionId !== `task-${sessionId.split('-')[1]}-${sessionId.split('-')[2]}` ? sessionId : undefined,
          // Don't specify pathToClaudeCodeExecutable - let SDK use its own runtime
          // The Agent SDK can work without the Claude Code desktop app
          additionalDirectories: [SKILLS_CONFIG.skillsDirectory],  // ✅ Add skills directory
          // The SDK will automatically maintain context from the session
          // and has access to local project files via the working directory
          env: {
            ...process.env,  // ✅ Preserve PATH and other env vars
            ANTHROPIC_API_KEY: this.apiKey,
          },
          executable: 'node',  // ✅ Explicitly set executable
          // CRITICAL: Allow MCP tools without prompting
          // This enables Confluence and Context7 MCP tools to work in automated workflows
          allowDangerouslySkipPermissions: true,
          permissionMode: 'bypassPermissions',
          // MCP servers configuration
          mcpServers: mcpServers as any,
        },
      });

      console.log(`🔄 Streaming responses from SDK...`);

      // Iterate through the async generator to collect messages
      let enhancedPrompt = '';
      let resultMessage = null;
      let messageCount = 0;
      let lastMessageTime = Date.now();

      for await (const messageAny of queryGenerator) {
        const message = messageAny as any;
        messageCount++;
        const timeSinceLastMessage = Date.now() - lastMessageTime;
        lastMessageTime = Date.now();
        
        console.log(`📨 [Message ${messageCount}] Type: ${message.type}${message.subtype ? ` (${message.subtype})` : ''} [+${timeSinceLastMessage}ms]`);
        
        if (message.type === 'assistant') {
          // Extract text from assistant message
          const textContent = message.message.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');
          
        // Check for tool use
        const toolUse = message.message.content.filter((block: any) => block.type === 'tool_use');
        if (toolUse.length > 0) {
          toolUse.forEach((tool: any) => {
            const isContext7 = tool.name.toLowerCase().includes('context7');
            const logIcon = isContext7 ? '🌟' : '🔧';
            const prefix = isContext7 ? 'CONTEXT7 MCP TOOL' : 'Tool';
            
            console.log(`${logIcon} ${prefix} called: ${tool.name}`);
            if (tool.input) {
              // Log input summary
              const inputStr = JSON.stringify(tool.input);
              console.log(`   Input: ${inputStr.length > 200 ? inputStr.substring(0, 200) + '...' : inputStr}`);
            }
          });
        }
        
        if (textContent) {
          enhancedPrompt += textContent + '\n';
          // Only log text chunks if they are substantial or user wants verbose logs
          // console.log(`📝 Received assistant message chunk (${textContent.length} chars)`);
        }
      } else if (message.type === 'tool_result') {
        const toolName = (message as any).tool_name;
        const isContext7 = toolName?.toLowerCase().includes('context7');
        const logIcon = isContext7 ? '🌟' : '🔨';
        
        console.log(`${logIcon} Tool result received${toolName ? ` for: ${toolName}` : ''}`);
        if ((message as any).content) {
          const contentStr = JSON.stringify((message as any).content);
          console.log(`   Result size: ${contentStr.length} bytes`);
          if (isContext7) {
             console.log(`   Preview: ${contentStr.substring(0, 200)}...`);
          }
        }
        } else if (message.type === 'result') {
          // Final result message with metadata
          resultMessage = message;
          console.log(`✅ Received result: ${message.subtype}`);
          
          // For successful results, use accumulated prompt
          // (result message doesn't always contain full text)
          if (message.subtype === 'success') {
            console.log(`✅ Task completed successfully (${messageCount} total messages)`);
          } else {
            // Handle error cases
            console.error(`❌ Task failed: ${message.subtype}`);
            console.error(`   Full message:`, JSON.stringify(message, null, 2));
            if (message.subtype === 'error_during_execution' && (message as any).errors) {
              const errors = (message as any).errors.join(', ');
              console.error(`   Errors: ${errors}`);
              throw new Error(`Claude Code execution error: ${errors}`);
            }
          }
        } else if (message.type === 'system') {
          console.log(`ℹ️  System message: ${message.subtype}`);
        } else if (message.type === 'error') {
          console.error(`❌ Error message received:`, JSON.stringify(message, null, 2));
        } else {
          // Log any unexpected message types
          console.log(`⚠️  Unexpected message type: ${message.type}`, JSON.stringify(message, null, 2).substring(0, 500));
        }
      }
      
      console.log(`✨ Stream completed: ${messageCount} total messages received`);
      const timeSinceStart = Date.now() - startTime;
      console.log(`⏱️  Total streaming time: ${timeSinceStart}ms`);

      const executionTime = Date.now() - startTime;
      console.log(`⏱️  SDK call completed in ${executionTime}ms`);

      enhancedPrompt = enhancedPrompt.trim();
      console.log(`📄 Enhanced prompt generated: ${enhancedPrompt.length} chars`);

      if (!enhancedPrompt || enhancedPrompt.length < 100) {
        console.error(`⚠️  Enhanced prompt is too short or empty`);
        throw new Error('SDK did not generate a proper enhanced prompt.');
      }

      console.log(`✅ SDK generated enhanced requirements document`);

      const modelUsed = await this.getModel(options.model);
      
      // Log token usage to database
      const taskIdMatch = sessionId.match(/^task-(\d+)-/);
      if (taskIdMatch) {
        const taskId = parseInt(taskIdMatch[1]);
        const usageData = parseClaudeUsage(resultMessage, executionTime);
        
        logTokenUsage({
          taskId,
          phase: 'prompt_enhancement',
          provider: getProviderFromModel(modelUsed),
          model: modelUsed,
          ...usageData,
        });
      }
      
      return {
        success: true,
        enhancedPrompt,
        rawOutput: enhancedPrompt,
        metadata: {
          executionTime,
          skillName: 'prompt-enhancer',
          model: modelUsed,
          retryCount: 0,
          totalCost: resultMessage?.total_cost_usd,
          numTurns: resultMessage?.num_turns,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Claude Agent SDK error after ${executionTime}ms`);
      console.error(`   Error type: ${error.constructor?.name}`);
      console.error(`   Error message: ${error.message}`);
      if (error.code) console.error(`   Error code: ${error.code}`);
      if (error.stack) {
        console.error(`   Error stack (first 5 lines):`);
        error.stack.split('\n').slice(0, 5).forEach((line: string) => console.error(`     ${line}`));
      }
      
      // Provide helpful error messages for common issues
      if (error.message?.includes('spawn node ENOENT')) {
        throw new Error(
          `Claude Agent SDK error: Node.js executable not found. ` +
          `Make sure Node.js is installed and in your PATH. ` +
          `Original error: ${error.message}`
        );
      } else if (error.message?.includes('spawn claude ENOENT')) {
        throw new Error(
          `Claude Agent SDK error: Claude Code CLI not found. ` +
          `The SDK requires Claude Code to be installed. ` +
          `Install it from: https://claude.ai/download ` +
          `Original error: ${error.message}`
        );
      }
      
      throw new Error(`Claude Agent SDK error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Build the prompt for the prompt-enhancer skill
   */
  private buildPromptEnhancerPrompt(title: string, description: string): string {
    // The prompt-enhancer skill expects a task description and generates
    // enhanced requirements with context from the project
    const prompt = `I need you to act as a requirements analyst and enhance this task description into a comprehensive requirements document.

Task Title: ${title}
${description ? `Task Description: ${description}` : ''}

Please analyze this task in the context of the current codebase and provide:
1. Detailed requirements and acceptance criteria
2. Technical implementation approach
3. Potential edge cases and considerations
4. Testing strategy
5. Integration points with existing code

Generate a well-structured requirements document that a developer can use to implement this feature.`;

    return prompt;
  }

  /**
   * Get or create a session ID for a task
   * Sessions are persistent per task to maintain context
   */
  private getSessionId(taskId: number): string {
    if (!this.sessionMap.has(taskId)) {
      // Create a new session ID for this task
      const sessionId = `task-${taskId}-${Date.now()}`;
      this.sessionMap.set(taskId, sessionId);
    }
    return this.sessionMap.get(taskId)!;
  }

  /**
   * Clear session for a task (useful when task is completed or deleted)
   */
  clearSession(taskId: number): void {
    this.sessionMap.delete(taskId);
    console.log(`🗑️  Cleared session for task #${taskId}`);
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessionMap.size;
  }
}

// Singleton instance
export const agentSdkExecutor = new AgentSdkExecutor();
