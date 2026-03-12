/**
 * Brainstorming Phase Executor
 * Uses Claude Agent SDK with brainstorming skill to generate clarification questions
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getPreferredModel } from '@/lib/utils/modelSelector';
import { buildMCPServersConfig } from '@/lib/utils/mcpConfig';
import { agenticLogsStore } from '../logs/agenticLogsStore';
import { clarificationService, ClarificationQuestion } from '../services/clarificationService';
import { globalDocumentService } from '../services/globalDocumentService';
import { taskContextService } from '../services/taskContextService';
import { projectGroupService } from '../services/projectGroupService';
import { statements } from '@/lib/db/postgres';
import { AgenticTask, TaskMCPConfig } from '@/types/agentic-task';

export interface BrainstormingResult {
  success: boolean;
  questions: ClarificationQuestion[];
  rawOutput?: string;
  error?: string;
  metadata?: {
    executionTime: number;
    model: string;
    questionCount: number;
  };
}

export class BrainstormingExecutor {
  /**
   * Execute brainstorming phase for a task
   */
  async execute(task: AgenticTask): Promise<BrainstormingResult> {
    const startTime = Date.now();
    const taskId = task.id;

    agenticLogsStore.info(taskId, 'brainstorming', '🧠 Starting brainstorming phase...');

    try {
      // Get model
      const model = await getPreferredModel();
      agenticLogsStore.info(taskId, 'brainstorming', `Using model: ${model}`);

      // Get project paths from project group
      const { workingDirectory, projectPaths } = await this.getProjectPaths(task);
      
      // Log workspace scope for debugging
      agenticLogsStore.info(taskId, 'brainstorming', `📁 Working directory: ${workingDirectory}`);
      if (projectPaths.length > 0) {
        agenticLogsStore.info(taskId, 'brainstorming', `📂 Project paths (${projectPaths.length}):`);
        projectPaths.forEach((p, i) => {
          agenticLogsStore.info(taskId, 'brainstorming', `   ${i + 1}. ${p}`);
        });
      } else {
        agenticLogsStore.warning(taskId, 'brainstorming', '⚠️ No project paths configured - using default workspace');
      }

      // Build context from documents
      let documentContext = '';
      if (task.referenceTaskIds && task.referenceTaskIds.length > 0) {
        agenticLogsStore.info(taskId, 'brainstorming', `Loading context from ${task.referenceTaskIds.length} reference tasks`);
        // TODO: Load reference task context
      }

      // Load global documents attached to task
      const taskDocs = await this.getTaskDocuments(taskId);
      if (taskDocs.length > 0) {
        agenticLogsStore.info(taskId, 'brainstorming', `Loading ${taskDocs.length} attached documents`);
        documentContext = await globalDocumentService.formatForPrompt(taskDocs);
      }

      // Build MCP config
      const mcpServers = this.buildMCPConfig(task.mcpServersConfig);

      // Build prompt with project path context
      const prompt = this.buildPrompt(task.title, task.description || '', documentContext, projectPaths);

      agenticLogsStore.progress(taskId, 'brainstorming', `Prompt prepared (${prompt.length} chars)`);
      agenticLogsStore.info(taskId, 'brainstorming', '🚀 Calling Claude Agent SDK...');

      // Verify API key is available
      const apiKey = SKILLS_CONFIG.anthropicApiKey;
      if (!apiKey) {
        agenticLogsStore.error(taskId, 'brainstorming', '❌ No Anthropic API key configured');
        return {
          success: false,
          questions: [],
          error: 'No Anthropic API key configured. Please add your API key in Settings.',
        };
      }
      agenticLogsStore.info(taskId, 'brainstorming', `API key loaded (ends with: ...${apiKey.slice(-4)})`);

      // Build additional directories: skills + project paths
      const additionalDirectories = [SKILLS_CONFIG.skillsDirectory, ...projectPaths];

      // Execute with Agent SDK - scoped to project paths
      const queryGenerator = query({
        prompt,
        options: {
          model,
          cwd: workingDirectory,
          additionalDirectories,
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: apiKey,
          },
          executable: 'node',
          pathToClaudeCodeExecutable: '/usr/local/bin/claude',
          allowDangerouslySkipPermissions: true,
          permissionMode: 'plan', // Read-only for brainstorming
          mcpServers: mcpServers as any,
        },
      });

      // Collect output
      let rawOutput = '';
      for await (const message of queryGenerator as AsyncIterable<any>) {
        if (message.type === 'assistant') {
          const textContent = message.message?.content
            ?.filter((block: any) => block.type === 'text')
            ?.map((block: any) => block.text)
            ?.join('\n') || '';

          if (textContent) {
            rawOutput += textContent + '\n';
            // Log progress with truncated preview
            const preview = textContent.slice(0, 100).replace(/\n/g, ' ');
            agenticLogsStore.progress(taskId, 'brainstorming', preview);
          }

          // Track tool usage
          const toolUse = message.message?.content?.filter((block: any) => block.type === 'tool_use') || [];
          for (const tool of toolUse) {
            agenticLogsStore.tool(taskId, 'brainstorming', `Tool: ${tool.name}`, undefined, { input: tool.input });
          }
        } else if (message.type === 'result') {
          if (message.subtype === 'success') {
            agenticLogsStore.success(taskId, 'brainstorming', 'Claude SDK completed successfully');
          } else if (message.subtype === 'error_during_execution') {
            agenticLogsStore.error(taskId, 'brainstorming', `Error: ${message.errors?.join(', ')}`);
          }
        }
      }

      // Log the raw output for debugging
      console.log('[BrainstormingExecutor] Raw output length:', rawOutput.length);
      console.log('[BrainstormingExecutor] Raw output preview:', rawOutput.substring(0, 1000));
      console.log('[BrainstormingExecutor] Full raw output:\n', rawOutput);
      
      // Parse questions from output
      console.log('[BrainstormingExecutor] Parsing questions from response...');
      const questions = clarificationService.parseQuestionsFromResponse(rawOutput);
      
      console.log('[BrainstormingExecutor] Parsed questions:', questions.length);
      console.log('[BrainstormingExecutor] Questions detail:', JSON.stringify(questions.map(q => ({
        text: q.text.substring(0, 80),
        type: q.type,
        optionCount: q.suggestedOptions?.length || 0,
        options: q.suggestedOptions?.slice(0, 2) || []
      })), null, 2));

      if (questions.length === 0) {
        // Try to extract questions more aggressively
        console.log('[BrainstormingExecutor] No structured questions found, attempting fallback parsing');
        agenticLogsStore.warning(taskId, 'brainstorming', 'No structured questions found, attempting fallback parsing');
        
        // Strategy 1: Look for numbered bold items like "1. **Topic** - Description"
        const numberedBoldPattern = /(?:^|\n)\s*\d+\.\s*\*\*([^*]+)\*\*\s*[-–:]\s*(.+?)(?=\n\d+\.|\n\n|$)/gi;
        for (const match of rawOutput.matchAll(numberedBoldPattern)) {
          const title = match[1].trim();
          const description = match[2].trim();
          // Skip if it looks like meta content
          if (title.toLowerCase().includes('answer') || title.toLowerCase().includes('question')) continue;
          const questionText = `${title}: ${description}`;
          if (questionText.length > 15 && questionText.length < 500) {
            questions.push({
              text: questionText,
              type: 'text',
              suggestedOptions: [],
              required: true,
            });
          }
        }
        
        // Strategy 2: Look for lines with question marks (but skip meta-questions)
        if (questions.length === 0) {
          const lines = rawOutput.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('?') && trimmed.length > 20 && trimmed.length < 500) {
              // Skip meta-questions about the process itself
              const lowerLine = trimmed.toLowerCase();
              if (lowerLine.includes('would you like to answer') ||
                  lowerLine.includes('shall i proceed') ||
                  lowerLine.includes('do you want me to') ||
                  lowerLine.includes('ready to continue') ||
                  lowerLine.includes('can i proceed')) {
                continue;
              }
              const cleaned = trimmed.replace(/^[\d\.\-\*\s]+/, '').replace(/\*\*/g, '').trim();
              if (cleaned.length > 15) {
                questions.push({
                  text: cleaned,
                  type: 'text',
                  suggestedOptions: [],
                  required: true,
                });
              }
            }
          }
        }
        
        // Strategy 3: Look for any numbered list items as last resort
        if (questions.length === 0) {
          const numberedPattern = /(?:^|\n)\s*(\d+)\.\s+([^\n]{20,300})/g;
          for (const match of rawOutput.matchAll(numberedPattern)) {
            const text = match[2].trim();
            // Skip narrative text
            const lowerText = text.toLowerCase();
            if (lowerText.startsWith('the ') || 
                lowerText.startsWith('this ') ||
                lowerText.startsWith('i ') ||
                lowerText.startsWith('these ') ||
                lowerText.includes('will significantly') ||
                lowerText.includes('implementation plan')) {
              continue;
            }
            questions.push({
              text: text.replace(/\*\*/g, '').trim(),
              type: 'text',
              suggestedOptions: [],
              required: true,
            });
          }
        }
        
        console.log('[BrainstormingExecutor] Fallback found:', questions.length, 'questions');
      }

      const executionTime = Date.now() - startTime;

      agenticLogsStore.success(
        taskId,
        'brainstorming',
        `✅ Generated ${questions.length} clarification questions in ${executionTime}ms`
      );
      
      // Log final question summary
      console.log(`[BrainstormingExecutor] ✅ Final: ${questions.length} questions generated`);

      // Save questions to database
      if (questions.length > 0) {
        await clarificationService.createClarifications(taskId, questions);
      }

      // Save brainstorming context to markdown file (living document for task)
      if (rawOutput) {
        try {
          taskContextService.updateBrainstormingAnalysis(taskId, rawOutput);
          agenticLogsStore.info(taskId, 'brainstorming', `💾 Saved brainstorming context to file (${rawOutput.length} chars)`);
        } catch (error) {
          agenticLogsStore.warning(taskId, 'brainstorming', `Failed to update context file: ${error}`);
        }
      }

      return {
        success: true,
        questions,
        rawOutput,
        metadata: {
          executionTime,
          model,
          questionCount: questions.length,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      agenticLogsStore.error(taskId, 'brainstorming', `❌ Failed: ${errorMessage}`);

      return {
        success: false,
        questions: [],
        error: errorMessage,
        metadata: {
          executionTime,
          model: 'unknown',
          questionCount: 0,
        },
      };
    }
  }

  /**
   * Get project paths from project group
   */
  private async getProjectPaths(task: AgenticTask): Promise<{ workingDirectory: string; projectPaths: string[] }> {
    let workingDirectory = process.cwd();
    let projectPaths: string[] = [];

    if (task.projectGroupId) {
      const projects = await projectGroupService.getProjectsInGroup(task.projectGroupId);
      
      if (projects.length > 0) {
        // Use the first (primary) project as working directory
        workingDirectory = projects[0].localPath;
        // Collect all project paths
        projectPaths = projects.map(p => p.localPath);
      }
    }

    return { workingDirectory, projectPaths };
  }

  /**
   * Build the prompt for brainstorming
   * 
   * Based on obra/superpowers brainstorming skill principles:
   * - Focus on understanding: purpose, constraints, success criteria
   * - Prefer multiple choice questions when possible
   * - Cover: architecture, components, data flow, error handling, testing
   * - YAGNI ruthlessly - focus on what's actually needed
   */
  private buildPrompt(title: string, description: string, documentContext: string, projectPaths: string[]): string {
    const projectPathsSection = projectPaths.length > 0 
      ? `## Project Scope

**IMPORTANT:** Only analyze code within these project directories:
${projectPaths.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Do NOT explore or reference code outside these directories.

`
      : '';

    return `# Requirements Clarification - Generate Questions JSON

**IMPORTANT: This is a BATCH process, not an interactive session.**

Your output will be parsed by a system to display questions in a UI form. The user will answer all questions at once, then you'll receive all answers together.

**DO NOT:**
- Try to ask questions conversationally or wait for responses
- Use tools to ask questions interactively  
- Include narrative text like "I'll ask these questions..." or "Let me know..."
- Output anything other than the JSON structure below

**DO:**
- Analyze the task thoroughly first (explore codebase if project paths are provided)
- Generate all clarification questions upfront as structured JSON
- Include suggested options for each question

${projectPathsSection}---

## Task to Analyze

**Title:** ${title}

**Description:** ${description || 'No description provided.'}

${documentContext ? `## Reference Context\n${documentContext}\n` : ''}

---

## Question Design Guidelines

Think like a senior engineer. For each gap in understanding, create a question:

- **Prefer multiple choice** - Give 3-6 concrete options representing realistic choices
- **Lead with recommended option** - Put the most sensible default first  
- **Be specific to task context** - Options should reference actual technologies/patterns relevant to this task
- **One concept per question** - Don't combine multiple decisions
- **Include "Other/Custom" option** when the list isn't exhaustive

Cover these areas as needed:
1. Purpose & Goals - What problem does this solve?
2. Technical Constraints - Tech stack, performance requirements
3. User Experience - Who uses this and how?
4. Integration Points - What existing systems does this touch?
5. Scope Boundaries - What's NOT in scope? (YAGNI)

---

## REQUIRED OUTPUT FORMAT

Output ONLY this JSON structure (no other text before or after):

\`\`\`json
{
  "questions": [
    {
      "text": "What database should store the user preferences?",
      "type": "choice",
      "suggestedOptions": [
        "SQLite (simple, file-based, good for local storage)",
        "PostgreSQL (robust, good for production)",
        "Redis (fast, good for session/cache data)",
        "Use existing application database",
        "Other (specify in answer)"
      ],
      "required": true
    },
    {
      "text": "Should the feature support multiple languages?",
      "type": "boolean",
      "suggestedOptions": ["Yes - i18n required from start", "No - English only for now"],
      "required": true
    },
    {
      "text": "What authentication method should be used?",
      "type": "choice",
      "suggestedOptions": [
        "OAuth 2.0 with existing provider",
        "JWT tokens with custom auth",
        "Session-based authentication", 
        "No authentication needed"
      ],
      "required": true
    }
  ]
}
\`\`\`

## Question Types

- **choice**: Single selection from options (MOST COMMON - use this)
- **multi_choice**: Multiple selections allowed
- **boolean**: Yes/No decision  
- **text**: Free-form response (use sparingly)

---

## Your Task

1. First, explore the codebase to understand existing patterns (if project paths provided)
2. Identify 5-12 questions that would affect implementation decisions
3. Output ONLY the JSON structure above - no other text

Generate the questions JSON now:`;
  }

  /**
   * Build MCP configuration from task settings
   */
  private buildMCPConfig(mcpConfig?: TaskMCPConfig[]): Record<string, any> | undefined {
    if (!mcpConfig || mcpConfig.length === 0) {
      // Default to standard config
      return buildMCPServersConfig(true, true);
    }

    // Build custom MCP config based on task settings
    const servers: Record<string, any> = {};

    for (const config of mcpConfig) {
      if (config.enabled) {
        // TODO: Build server config from stored MCP server settings
        // For now, use default behavior
      }
    }

    // If no custom servers, use default
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
export const brainstormingExecutor = new BrainstormingExecutor();
export default brainstormingExecutor;
