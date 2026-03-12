/**
 * Planning Phase Executor
 * Uses Claude Agent SDK with writing-plans skill to generate implementation plans
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getPreferredModel } from '@/lib/utils/modelSelector';
import { buildMCPServersConfig } from '@/lib/utils/mcpConfig';
import { agenticLogsStore } from '../logs/agenticLogsStore';
import { planService, PlanStep } from '../services/planService';
import { clarificationService } from '../services/clarificationService';
import { globalDocumentService } from '../services/globalDocumentService';
import { taskContextService } from '../services/taskContextService';
import { projectGroupService } from '../services/projectGroupService';
import { statements } from '@/lib/db/postgres';
import { AgenticTask, TaskMCPConfig } from '@/types/agentic-task';

export interface PlanningResult {
  success: boolean;
  planId?: number;
  steps: PlanStep[];
  rawOutput?: string;
  error?: string;
  metadata?: {
    executionTime: number;
    model: string;
    stepCount: number;
  };
}

export class PlanningExecutor {
  /**
   * Execute planning phase for a task
   */
  async execute(task: AgenticTask): Promise<PlanningResult> {
    const startTime = Date.now();
    const taskId = task.id;

    agenticLogsStore.info(taskId, 'planning', '📋 Starting planning phase...');

    try {
      // Get model
      const model = await getPreferredModel();
      agenticLogsStore.info(taskId, 'planning', `Using model: ${model}`);

      // Get project paths from project group
      const { workingDirectory, projectPaths } = await this.getProjectPaths(task);
      
      // Log workspace scope for debugging
      agenticLogsStore.info(taskId, 'planning', `📁 Working directory: ${workingDirectory}`);
      if (projectPaths.length > 0) {
        agenticLogsStore.info(taskId, 'planning', `📂 Project paths (${projectPaths.length}):`);
        projectPaths.forEach((p, i) => {
          agenticLogsStore.info(taskId, 'planning', `   ${i + 1}. ${p}`);
        });
      } else {
        agenticLogsStore.warning(taskId, 'planning', '⚠️ No project paths configured - using default workspace');
      }

      // Build context from clarifications
      const clarifications = await clarificationService.getClarificationsForTask(taskId);
      const answeredClarifications = clarifications.filter(c => c.userAnswer);

      agenticLogsStore.info(
        taskId,
        'planning',
        `Loading ${answeredClarifications.length} answered clarifications`
      );

      const clarificationContext = clarificationService.formatForPrompt(answeredClarifications);

      // Load global documents attached to task
      const taskDocs = await this.getTaskDocuments(taskId);
      let documentContext = '';
      if (taskDocs.length > 0) {
        agenticLogsStore.info(taskId, 'planning', `Loading ${taskDocs.length} attached documents`);
        documentContext = await globalDocumentService.formatForPrompt(taskDocs);
      }

      // Build MCP config
      const mcpServers = this.buildMCPConfig(task.mcpServersConfig);

      // Get accumulated task context from the context markdown file
      // This includes brainstorming analysis, clarifications, and any other accumulated info
      let brainstormingContext = '';
      if (taskContextService.hasContext(taskId)) {
        brainstormingContext = taskContextService.getContextForPrompt(taskId);
        agenticLogsStore.info(taskId, 'planning', `Loading task context from file (${brainstormingContext.length} chars)`);
      }

      // Build prompt with project paths
      const prompt = this.buildPrompt(
        task.title,
        task.description || '',
        clarificationContext,
        documentContext,
        brainstormingContext,
        projectPaths
      );

      agenticLogsStore.progress(taskId, 'planning', `Prompt prepared (${prompt.length} chars)`);
      
      // Verify API key is available
      const apiKey = SKILLS_CONFIG.anthropicApiKey;
      if (!apiKey) {
        agenticLogsStore.error(taskId, 'planning', '❌ No Anthropic API key configured');
        return {
          success: false,
          plan: null,
          error: 'No Anthropic API key configured. Please add your API key in Settings.',
        };
      }
      agenticLogsStore.info(taskId, 'planning', `API key loaded (ends with: ...${apiKey.slice(-4)})`);
      agenticLogsStore.info(taskId, 'planning', '🚀 Calling Claude Agent SDK...');

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
          permissionMode: 'plan', // Read-only for planning
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
            agenticLogsStore.progress(taskId, 'planning', preview);
          }

          // Track tool usage
          const toolUse = message.message?.content?.filter((block: any) => block.type === 'tool_use') || [];
          for (const tool of toolUse) {
            agenticLogsStore.tool(taskId, 'planning', `Tool: ${tool.name}`, undefined, { input: tool.input });
          }
        } else if (message.type === 'result') {
          if (message.subtype === 'success') {
            agenticLogsStore.success(taskId, 'planning', 'Claude SDK completed successfully');
          } else if (message.subtype === 'error_during_execution') {
            agenticLogsStore.error(taskId, 'planning', `Error: ${message.errors?.join(', ')}`);
          }
        }
      }

      // Parse plan from output
      const parsedPlan = planService.parsePlanFromResponse(rawOutput);

      if (parsedPlan.steps.length === 0) {
        agenticLogsStore.warning(taskId, 'planning', 'No structured plan found, attempting fallback parsing');
        // Fallback: extract numbered items
        const lines = rawOutput.split('\n');
        let stepOrder = 0;
        for (const line of lines) {
          const match = line.match(/^(\d+)\.\s+(.+)/);
          if (match) {
            parsedPlan.steps.push({
              title: match[2].trim().slice(0, 200),
              description: '',
              estimatedComplexity: 'medium',
              order: stepOrder++,
            });
          }
        }
      }

      const executionTime = Date.now() - startTime;

      // Save plan to database - include raw output for display
      let planId: number | undefined;
      if (parsedPlan.steps.length > 0 || rawOutput.length > 100) {
        // Use parsed overview if available, otherwise use raw output
        const overviewToUse = parsedPlan.overview || rawOutput.substring(0, 2000);
        
        // Combine full task context with the new plan for a complete "Master Plan" view
        let masterPlanContent = rawOutput;
        try {
          const fullContext = taskContextService.readContext(taskId);
          if (fullContext) {
            masterPlanContent = `${fullContext}\n\n---\n\n# 4. IMPLEMENTATION PLAN\n\n${rawOutput}`;
          }
        } catch (e) {
          console.warn('Failed to read task context for master plan:', e);
        }

        // Check if plan exists
        const existingPlan = await planService.getPlanForTask(taskId);
        let plan;

        if (existingPlan) {
          // Update existing plan
          plan = await planService.updatePlan(taskId, {
            planOverview: overviewToUse,
            planSteps: parsedPlan.steps,
            rawContent: masterPlanContent // We need to add rawContent to updatePlan options in service
          });
        } else {
          // Create new plan
          plan = await planService.createPlan(
            taskId,
            overviewToUse,
            parsedPlan.steps,
            { rawContent: masterPlanContent }
          );
        }
        
        planId = plan?.id;

        // Update the task context file with the plan
        try {
          taskContextService.updateImplementationPlan(
            taskId,
            parsedPlan.overview || `Implementation plan for: ${task.title}`,
            parsedPlan.steps.map(s => ({ title: s.title, description: s.description || '' }))
          );
        } catch (error) {
          agenticLogsStore.warning(taskId, 'planning', `Failed to update context file: ${error}`);
        }

        agenticLogsStore.success(
          taskId,
          'planning',
          `✅ Created plan with ${parsedPlan.steps.length} steps in ${executionTime}ms`
        );
      } else {
        agenticLogsStore.warning(taskId, 'planning', 'No plan steps generated');
      }

      return {
        success: true,
        planId,
        steps: parsedPlan.steps,
        rawOutput,
        metadata: {
          executionTime,
          model,
          stepCount: parsedPlan.steps.length,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      agenticLogsStore.error(taskId, 'planning', `❌ Failed: ${errorMessage}`);

      return {
        success: false,
        steps: [],
        error: errorMessage,
        metadata: {
          executionTime,
          model: 'unknown',
          stepCount: 0,
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
   * Build the prompt for planning
   */
  private buildPrompt(
    title: string,
    description: string,
    clarificationContext: string,
    documentContext: string,
    brainstormingContext: string,
    projectPaths: string[]
  ): string {
    const projectPathsSection = projectPaths.length > 0 
      ? `## Project Scope

**IMPORTANT:** Only create implementation steps for code within these project directories:
${projectPaths.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Do NOT reference or modify code outside these directories.

`
      : '';

    return `# Implementation Plan Generation - Output JSON

**IMPORTANT: This is a BATCH process. Output your plan directly in this response.**

**DO NOT:**
- Write plans to files (your file writes won't be captured)
- Output summaries instead of the full plan
- Use tools to save plans elsewhere
- Include narrative text like "I've created a plan..." or "Let me summarize..."

**DO:**
- Explore the codebase first to understand existing patterns
- Output the COMPLETE plan as JSON in this response
- Include ALL detailed steps with full descriptions
- Each step must be self-contained (coding agent has no context)

---

${projectPathsSection}## TASK INFORMATION

**Title:** ${title}

**Description:** ${description || 'No description provided.'}

${brainstormingContext ? `---

## BRAINSTORMING CONTEXT (USE THIS!)

EXTRACT relevant findings and include them in each step's context field:

${brainstormingContext}` : ''}

${clarificationContext ? `---

## USER CLARIFICATIONS (INCLUDE IN STEP CONTEXT!)

${clarificationContext}` : ''}

${documentContext ? `---

## REFERENCE DOCUMENTS

${documentContext}` : ''}

---

## YOUR TASK: Create a Self-Contained Implementation Plan

### Phase 1: Explore the Codebase
Before writing the plan, thoroughly explore:
- File structure and naming conventions
- Existing patterns, utilities, and abstractions to REUSE
- Similar implementations to reference
- Tech stack and dependencies

### Phase 2: Create the Plan

**PLAN OVERVIEW (Required)**
Write 2-3 paragraphs covering:
- Architecture decisions and WHY (referencing brainstorming findings)
- Tech stack choices based on existing codebase
- Integration points with existing code
- Key patterns to follow (DRY, YAGNI, TDD)

**IMPLEMENTATION STEPS (Required)**

Each step MUST have these fields:

1. **title** (15-40 words): Specific action with what will be created
   Example: "Create FastAPI inference endpoint with streaming SSE response, Pydantic request validation, and GPU memory error handling"

2. **description** (200-500 words): COMPLETE implementation guide including:
   - **Files to create/modify** with exact paths
   - **Classes/functions** to implement with their signatures
   - **Code patterns** to follow (copy from existing code where possible)
   - **Data structures** with field names and types
   - **Error handling** specific cases to handle
   - **Example code snippets** for complex logic
   - **Test approach** with specific test cases

3. **context** (100-200 words): EVERYTHING the coding agent needs to know that ISN'T in the description:
   - Relevant findings from brainstorming (copy specific details)
   - User requirements from clarifications (quote them)
   - Existing code patterns to follow (file paths to reference)
   - Dependencies and imports needed
   - Environment/config requirements

4. **estimatedComplexity**: "low" | "medium" | "high"

5. **filePaths**: Array of EXACT file paths to create or modify

6. **dependsOn**: Array of step numbers this depends on (for ordering only, agent won't see these)

---

## EXAMPLES

### ✅ EXCELLENT Step (FOLLOW THIS):
\`\`\`json
{
  "title": "Create ModelRegistry singleton service with lazy loading, LRU eviction, and thread-safe GPU memory management",
  "description": "Create backend/services/model_registry.py implementing a ModelRegistry class.\\n\\n**Class Structure:**\\n\`\`\`python\\nclass ModelRegistry:\\n    _instance = None\\n    _lock = threading.Lock()\\n    \\n    def __new__(cls):\\n        if cls._instance is None:\\n            with cls._lock:\\n                if cls._instance is None:\\n                    cls._instance = super().__new__(cls)\\n        return cls._instance\\n    \\n    def __init__(self):\\n        self._models: Dict[str, BaseModel] = {}\\n        self._access_times: Dict[str, float] = {}\\n        self._memory_threshold = 0.8\\n\`\`\`\\n\\n**Required Methods:**\\n- \`register_model(name: str, config: ModelConfig) -> None\` - Add model config without loading\\n- \`get_model(name: str) -> BaseModel\` - Lazy load and return model, update access time\\n- \`unload_model(name: str) -> None\` - Unload and free GPU memory\\n- \`_check_memory() -> None\` - Evict LRU models if memory > 80%\\n- \`get_memory_stats() -> MemoryStats\` - Return current GPU memory usage\\n\\n**Error Handling:** Raise ModelNotFoundError, GPUMemoryError, ModelLoadError with descriptive messages.\\n\\n**Testing:** Create tests/services/test_model_registry.py with tests for: singleton pattern, lazy loading, LRU eviction (load 3 models, access first, evict should remove second), thread safety with concurrent access.",
  "context": "From brainstorming: 'Existing ML infrastructure found in /ml-browser/models/registry.py uses singleton pattern - follow this'. User clarification: 'Must support at least 3 concurrent model loads'. The project uses PyTorch for GPU operations - use torch.cuda.memory_allocated() and torch.cuda.empty_cache(). Follow the existing service pattern in backend/services/base_service.py. Import BaseModel from ml_browser.models.base.",
  "estimatedComplexity": "high",
  "filePaths": ["backend/services/model_registry.py", "backend/services/__init__.py", "tests/services/test_model_registry.py", "backend/exceptions/model_exceptions.py"],
  "dependsOn": []
}
\`\`\`

### ❌ BAD Step (NEVER DO THIS):
\`\`\`json
{
  "title": "Model registry",
  "description": "Create the model registry service for managing models.",
  "context": "",
  "estimatedComplexity": "medium",
  "filePaths": [],
  "dependsOn": []
}
\`\`\`

---

## OUTPUT FORMAT

Output ONLY this JSON structure:

\`\`\`json
{
  "overview": "2-3 paragraphs: architecture decisions (reference brainstorming), tech choices, integration approach, patterns to follow...",
  "steps": [
    {
      "title": "15-40 word specific action title",
      "description": "200-500 words with files, classes, methods, signatures, code snippets, error handling, tests...",
      "context": "100-200 words of brainstorming findings, user requirements, existing patterns to follow, imports needed...",
      "estimatedComplexity": "medium",
      "filePaths": ["exact/path/file.py"],
      "dependsOn": []
    }
  ]
}
\`\`\`

**REQUIREMENTS:**
- Generate 8-20 detailed implementation steps
- Order: setup → core services → API/integration → frontend → testing → documentation
- Each step MUST have:
  - A descriptive title (what exactly will be implemented)
  - A detailed description (200-500 words) including:
    - Exact file paths to create/modify
    - Classes, functions, methods to implement with signatures
    - Code patterns to follow (reference existing code where applicable)
    - Error handling requirements
    - How to test/verify this step works
- Include relevant findings from brainstorming and user clarifications
- Include code snippets for non-trivial logic

---

## CRITICAL: Output the JSON below directly in your response

**DO NOT write to files - your file writes won't be captured!**
**Output ONLY the JSON structure - no other text before or after:**

\`\`\`json
{
  "overview": "2-3 paragraphs: architecture decisions, tech choices, integration approach...",
  "steps": [
    {
      "title": "Step 1: Descriptive title (15-40 words)",
      "description": "200-500 words with: files to create, classes/functions with signatures, code snippets, error handling, testing approach...",
      "context": "100-200 words: brainstorming findings, user requirements, existing patterns to reference...",
      "estimatedComplexity": "medium",
      "filePaths": ["path/to/file.py", "path/to/test.py"],
      "dependsOn": []
    },
    ...more steps (8-20 total)...
  ]
}
\`\`\`

Generate the complete implementation plan JSON now:`;
  }

  /**
   * Build MCP configuration from task settings
   */
  private buildMCPConfig(mcpConfig?: TaskMCPConfig[]): Record<string, any> | undefined {
    if (!mcpConfig || mcpConfig.length === 0) {
      return buildMCPServersConfig(true, true);
    }

    const servers: Record<string, any> = {};

    for (const config of mcpConfig) {
      if (config.enabled) {
        // TODO: Build server config from stored MCP server settings
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
export const planningExecutor = new PlanningExecutor();
export default planningExecutor;
