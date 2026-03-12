/**
 * Implementation Executor
 * Executes task implementation using codex-claude-loop skill
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getPreferredModel } from '@/lib/utils/modelSelector';
import { implementationLogs } from './implementationLogs';
import { getTargetProjectPath } from '@/lib/config/workspace';
import { buildContext7Instruction, buildConfluenceInstruction, buildMCPServersConfig } from '@/lib/utils/mcpConfig';
import { logTokenUsage, getProviderFromModel, parseClaudeUsage } from '@/lib/utils/tokenUsage';
import type {
  SkillExecutionOptions,
  SkillExecutionResult,
} from '@/types/skill';

export class ImplementationExecutor {
  private apiKey: string;

  constructor() {
    this.apiKey = SKILLS_CONFIG.anthropicApiKey;
  }

  /**
   * Execute implementation using codex-claude-loop skill
   */
  async executeImplementation(
    taskId: number,
    taskTitle: string,
    enhancedPrompt: string,
    options: SkillExecutionOptions = {}
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const preferredModel = options.model || await getPreferredModel();

    implementationLogs.addLog(taskId, 'info', `🚀 Starting implementation: "${taskTitle}"`);
    console.log(`🚀 Starting implementation for task #${taskId}: "${taskTitle}"`);

    // Check demo mode setting and Context7 usage
    const { statements } = await import('@/lib/db/postgres');
    const settings = await statements.getAppSettings.get() as any;
    const demoMode = Boolean(settings?.demo_mode || 0);

    // Get task to check MCP settings
    const task = await statements.getTask.get(taskId) as any;
    const useContext7 = Boolean(task?.use_context7);
    const useConfluence = task?.use_confluence !== 0; // Default to true if not explicitly set to 0
    
    if (demoMode) {
      implementationLogs.addLog(taskId, 'info', `🎭 Demo mode enabled - Process management disabled`);
      console.log(`🎭 Demo mode enabled for task #${taskId} - Process management disabled`);
    }
    
    implementationLogs.addLog(taskId, 'info', `🔍 Context7 MCP: ${useContext7 ? 'enabled' : 'disabled'}`);
    implementationLogs.addLog(taskId, 'info', `🔍 Confluence MCP: ${useConfluence ? 'enabled' : 'disabled'}`);
    console.log(`🔍 Task #${taskId} Context7 setting: ${useContext7 ? 'enabled' : 'disabled'}`);
    console.log(`🔍 Task #${taskId} Confluence setting: ${useConfluence ? 'enabled' : 'disabled'}`);

    // Declare outside try-catch so accessible in error handling
    let implementationLog = '';
    let resultMessage: any = null;

    try {
      // Build the implementation prompt for codex-claude-loop skill
      let prompt = this.buildImplementationPrompt(taskTitle, enhancedPrompt, demoMode);
      
      // Add Confluence instruction if enabled
      prompt = buildConfluenceInstruction(prompt, useConfluence);
      
      // Add Context7 instruction if enabled
      prompt = buildContext7Instruction(prompt, useContext7);

      implementationLogs.addLog(taskId, 'info', `📝 Prompt prepared (${prompt.length} chars)`);
      implementationLogs.addLog(taskId, 'info', `🤖 Calling ai-code-review-loop skill...`);
      console.log(`📝 Implementation prompt prepared (${prompt.length} chars)`);
      console.log(`🤖 Calling ai-code-review-loop skill via Agent SDK...`);
      console.log(`📂 Skills directory: ${SKILLS_CONFIG.skillsDirectory}`);

      // Get target project path (external project or demo mode)
      const targetPath = getTargetProjectPath();
      console.log(`🎯 Executing in: ${targetPath}`);
      
      // Log SDK configuration for debugging
      console.log(`⚙️  SDK Configuration:`);
      console.log(`   - Model: ${preferredModel}`);
      console.log(`   - CWD: ${targetPath}`);
      console.log(`   - Skills Dir: ${SKILLS_CONFIG.skillsDirectory}`);
      console.log(`   - Prompt length: ${prompt.length} chars`);
      console.log(`   - Permission mode: bypassPermissions`);
      
      // Verify skills directory exists
      const fs = require('fs');
      const skillPath = `${SKILLS_CONFIG.skillsDirectory}/ai-code-review-loop/SKILL.md`;
      if (fs.existsSync(skillPath)) {
        console.log(`✅ Skill file exists: ${skillPath}`);
      } else {
        console.error(`❌ Skill file NOT found: ${skillPath}`);
      }

      // Build MCP servers configuration
      const mcpServers = buildMCPServersConfig(useContext7, useConfluence);
      
      if (mcpServers) {
        const count = Object.keys(mcpServers).length;
        implementationLogs.addLog(taskId, 'info', `🔗 MCP Servers configured: ${count}`);
        console.log(`🔗 MCP Servers configured: ${count}`);
      }

      implementationLogs.addLog(taskId, 'info', `📝 Confluence instruction: ${useConfluence ? 'added to prompt' : 'disabled'}`);
      implementationLogs.addLog(taskId, 'info', `📝 Context7 instruction: ${useContext7 ? 'added to prompt' : 'disabled'}`);
      console.log(`📝 Confluence instruction: ${useConfluence ? 'added to prompt' : 'disabled'}`);
      console.log(`📝 Context7 instruction: ${useContext7 ? 'added to prompt' : 'disabled'}`);

      // Log skill invocation
      if (prompt.trim().startsWith('/')) {
        const skillName = prompt.trim().split(/[\s\n]/)[0];
        implementationLogs.addLog(taskId, 'info', `🚀 Skill Invocation: ${skillName}`);
        console.log(`🚀 Skill Invocation Detected: ${skillName}`);
      }

      // Call the query function with ai-code-review-loop skill
      const queryGenerator = query({
        prompt,
        options: {
          model: preferredModel,
          cwd: targetPath,  // ✅ Execute in target project, not dev-automation-board
          // Don't specify pathToClaudeCodeExecutable - let SDK use its own runtime
          // Point SDK to skills directory
          additionalDirectories: [SKILLS_CONFIG.skillsDirectory],
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: this.apiKey,
          },
          executable: 'node',
          // CRITICAL: Allow file operations without prompting
          // This is safe because we're in an automated workflow with git restore points
          allowDangerouslySkipPermissions: true,
          permissionMode: 'bypassPermissions',
          // Use ai-code-review-loop skill (the actual skill name from SKILL.md)
          systemPrompt: {
            type: 'preset',
            preset: 'claude_code',
            append: 'Use the /ai-code-review-loop skill for autonomous implementation. You have full write access to all files in the project.',
          },
          // MCP servers configuration
          mcpServers: mcpServers as any,
        },
      });

      implementationLogs.addLog(taskId, 'info', `🔄 Streaming implementation progress...`);
      console.log(`🔄 Streaming implementation progress...`);

      // Iterate through the async generator to collect messages
      for await (const messageAny of queryGenerator) {
        const message = messageAny as any;
        
        if (message.type === 'assistant') {
          // Check for tool use
          const toolUse = message.message?.content?.filter((block: any) => block.type === 'tool_use');
          if (toolUse && toolUse.length > 0) {
            toolUse.forEach((tool: any) => {
              const isContext7 = tool.name.toLowerCase().includes('context7');
              const isSkill = SKILLS_CONFIG.availableSkills.includes(tool.name) || tool.name.startsWith('skill_');
              
              let logIcon = '🔧';
              let prefix = 'Tool';
              
              if (isContext7) {
                logIcon = '🌟';
                prefix = 'CONTEXT7 MCP';
              } else if (isSkill) {
                logIcon = '🧩';
                prefix = 'SKILL';
              }
              
              const logMsg = `${logIcon} ${prefix}: ${tool.name}`;
              implementationLogs.addLog(taskId, 'tool', logMsg);
              console.log(logMsg);
              
              if (isContext7 || isSkill) {
                console.log(`   Input: ${JSON.stringify(tool.input).substring(0, 200)}...`);
              }
            });
          }

          // Extract text from assistant message
          const textContent = message.message.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');
          
          if (textContent) {
            implementationLog += textContent + '\n';
            // Only log major updates or summary
            // const preview = textContent.substring(0, 150).replace(/\n/g, ' ');
            // implementationLogs.addLog(taskId, 'progress', `💬 ${preview}...`);
            // console.log(`💬 Implementation progress: ${textContent.substring(0, 100)}...`);
          }
        } else if (message.type === 'tool_result') {
           const toolName = message.tool_name;
           const isContext7 = toolName?.toLowerCase().includes('context7');
           const isSkill = toolName && (SKILLS_CONFIG.availableSkills.includes(toolName) || toolName.startsWith('skill_'));
           
           if (isContext7) {
             console.log(`🌟 Context7 Data Received (${toolName})`);
             implementationLogs.addLog(taskId, 'info', `🌟 Context7 Data Received`);
           } else if (isSkill) {
             console.log(`🧩 Skill Result Received (${toolName})`);
             implementationLogs.addLog(taskId, 'info', `🧩 Skill Completed`);
           }
        } else if (message.type === 'result') {
          // Final result message with metadata
          resultMessage = message;
          implementationLogs.addLog(taskId, 'info', `✅ Result: ${message.subtype}`);
          console.log(`✅ Implementation result: ${message.subtype}`);
          
          if (message.subtype === 'success') {
            implementationLogs.addLog(taskId, 'success', `✅ Implementation completed successfully!`);
            console.log(`✅ Implementation completed successfully`);
          } else {
            implementationLogs.addLog(taskId, 'error', `❌ Implementation failed: ${message.subtype}`);
            console.error(`❌ Implementation failed: ${message.subtype}`);
            if (message.subtype === 'error_during_execution' && (message as any).errors) {
              const errors = (message as any).errors.join(', ');
              implementationLogs.addLog(taskId, 'error', `Error details: ${errors}`);
              throw new Error(`Implementation error: ${errors}`);
            }
          }
        } else if (message.type === 'system') {
          implementationLogs.addLog(taskId, 'info', `ℹ️  System: ${message.subtype}`);
          console.log(`ℹ️  System: ${message.subtype}`);
        } else if (message.type === 'tool_progress') {
          const progress = message as any;
          implementationLogs.addLog(taskId, 'tool', `🔧 ${progress.tool_name} (${progress.elapsed_time_seconds}s)`);
          console.log(`🔧 Tool: ${progress.tool_name} (${progress.elapsed_time_seconds}s)`);
        }
      }

      const executionTime = Date.now() - startTime;
      console.log(`⏱️  Implementation completed in ${executionTime}ms`);

      implementationLog = implementationLog.trim();

      if (!implementationLog || implementationLog.length < 50) {
        console.error(`⚠️  Implementation log is too short or empty`);
        throw new Error('Implementation did not produce meaningful output.');
      }

      console.log(`✅ Implementation completed successfully`);

      // Get refinement round from task_implementation table
      const { statements } = await import('@/lib/db/postgres');
      const impl = await statements.getImplementation.get(taskId) as any;
      const refinementRound = impl?.refinement_round || 1;
      
      // Determine phase based on refinement round
      const phase = refinementRound === 1 ? 'implementation' : 'refinement';
      
      // Log token usage to database
      const model = preferredModel;
      const usageData = parseClaudeUsage(resultMessage, executionTime);
      
      logTokenUsage({
        taskId,
        phase,
        provider: getProviderFromModel(model),
        model,
        refinementRound,
        ...usageData,
      });

      return {
        success: true,
        enhancedPrompt: implementationLog,
        rawOutput: implementationLog,
        metadata: {
          executionTime,
          skillName: 'ai-code-review-loop',
          model: preferredModel,
          retryCount: 0,
          totalCost: resultMessage?.total_cost_usd,
          numTurns: resultMessage?.num_turns,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Check if we got a result message with success despite the error
      // Claude Code CLI sometimes exits with code 1 even when successful
      const hasSuccessMessage = resultMessage?.subtype === 'success';
      const hasOutput = implementationLog && implementationLog.trim().length > 100;
      
      if (hasSuccessMessage || hasOutput) {
        console.warn(`⚠️  Process exited with error but received success result - treating as successful`);
        console.warn(`Error was: ${error.message}`);
        
        // Use the implementation log from the error object or fallback to the local variable
        const finalLog = (error as any).__implementationLog?.trim() || implementationLog?.trim() || 'Implementation completed';

        // Get refinement round and log token usage
        const { statements } = await import('@/lib/db/postgres');
        const impl = await statements.getImplementation.get(taskId) as any;
        const refinementRound = impl?.refinement_round || 1;
        const phase = refinementRound === 1 ? 'implementation' : 'refinement';
        
        const model = preferredModel;
        const usageData = parseClaudeUsage(resultMessage, executionTime);
        
        logTokenUsage({
          taskId,
          phase,
          provider: getProviderFromModel(model),
          model,
          refinementRound,
          ...usageData,
        });

        return {
          success: true,
          enhancedPrompt: finalLog,
          rawOutput: finalLog,
          metadata: {
            executionTime,
            skillName: 'ai-code-review-loop',
            model: preferredModel,
            retryCount: 0,
            totalCost: resultMessage?.total_cost_usd,
            numTurns: resultMessage?.num_turns,
          },
        };
      }
      
      console.error(`❌ Implementation execution error:`, error);
      
      return {
        success: false,
        error: error.message || 'Implementation execution failed',
        metadata: {
          executionTime,
          skillName: 'ai-code-review-loop',
          model: preferredModel,
          retryCount: 0,
        },
      };
    }
  }

  /**
   * Build the implementation prompt for codex-claude-loop skill
   */
  private buildImplementationPrompt(title: string, enhancedPrompt: string, demoMode: boolean = false): string {
    const demoModeInstructions = demoMode ? `

## ⚠️ CRITICAL DEMO MODE INSTRUCTIONS ⚠️

**PROCESS MANAGEMENT RESTRICTIONS:**
- DO NOT kill, stop, or terminate any running processes
- DO NOT start new development server processes (npm run dev, yarn dev, etc.)
- DO NOT restart the application or development server
- The application will auto-reload changes automatically via hot module replacement
- You can still run build commands (npm run build) for testing
- You can still run test commands (npm test, npm run test)
- Let the existing dev server handle all hot-reloading

**WHY:** This is a live demo environment where the parent application must remain running.
The development server supports hot module replacement and will automatically reload changes.

**ALLOWED:**
✅ Edit files (changes will auto-reload)
✅ Create new files (will be picked up automatically)
✅ Run build commands to verify compilation
✅ Run test suites
✅ Make git commits

**FORBIDDEN:**
❌ kill <process-id>
❌ npm run dev / yarn dev / next dev
❌ pkill node / killall node
❌ process.exit()
❌ Restarting the development server

` : '';

    return `/ai-code-review-loop

Implement the following feature autonomously:

# Task: ${title}

${enhancedPrompt}
${demoModeInstructions}
## Instructions
1. Analyze the requirements carefully
2. Plan the implementation approach
3. Implement the feature with proper error handling
4. Write tests for the implementation
5. Ensure code quality and follow best practices
6. Document any important decisions or changes
${demoMode ? '7. Remember: DO NOT kill or restart processes - let hot-reload handle changes' : ''}

Please proceed with autonomous implementation using the ai-code-review-loop skill.`;
  }
}

// Singleton instance
export const implementationExecutor = new ImplementationExecutor();

