/**
 * Workflow Generator
 * Converts natural language descriptions into BMAD v6 Alpha workflows
 * Uses Claude SDK for intelligent parsing
 */

import Anthropic from '@anthropic-ai/sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import type { WorkflowDefinition, WorkflowStep, PhaseDefinition } from '@/types/workflow';

export interface WorkflowGenerationResult {
  name: string;
  description: string;
  steps: WorkflowStep[];
  agents: string[];
  tools: string[];
  phases: {
    planning: PhaseDefinition;
    build: PhaseDefinition;
  };
}

export class WorkflowGenerator {
  private client: Anthropic | null = null;
  
  constructor() {
    // Initialize client only when needed (lazy initialization)
  }
  
  /**
   * Get or create Anthropic client
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = SKILLS_CONFIG.anthropicApiKey;
      
      if (!apiKey) {
        throw new Error(
          'Anthropic API key not configured. Please add it in Settings → API Configuration'
        );
      }
      
      this.client = new Anthropic({ apiKey });
    }
    
    return this.client;
  }
  
  /**
   * Generate workflow from natural language description
   * Returns v6-compatible two-phase workflow structure
   */
  async generate(description: string): Promise<WorkflowGenerationResult> {
    const prompt = this.buildPrompt(description);
    
    try {
      const client = this.getClient(); // Lazy initialization with validation
      
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.3, // Low temperature for consistency
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }
      
      return this.parseResponse(content.text);
    } catch (error) {
      console.error('Workflow generation error:', error);
      throw new Error(`Failed to generate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Build prompt for Claude to generate workflow structure
   */
  private buildPrompt(description: string): string {
    return `You are a workflow architect specializing in BMAD v6 Alpha workflows. Convert the user's natural language description into a structured workflow using BMAD's two-phase system (planning + build).

USER DESCRIPTION:
${description}

BMAD v6 WORKFLOW STRUCTURE:
A v6 workflow has two phases:
1. PLANNING PHASE: Creates deterministic blueprint (requirements, design, task list)
   - Agents: business-analyst, product-manager, architect
   - Outputs: taskList, fileManifest, acceptanceTests
   
2. BUILD PHASE: Implements based on blueprint
   - Agents: developer, qa-engineer, devops
   - Uses planning phase outputs
   - Validates against acceptance tests

AVAILABLE BMAD AGENTS:
- business-analyst: Requirements gathering, user stories
- product-manager: Product specifications, PRD
- architect: System design, architecture
- developer: Implementation, coding
- qa-engineer: Testing, quality assurance
- devops: Deployment, infrastructure
- security-engineer: Security audits
- tech-writer: Documentation
- scrum-master: Process management

AVAILABLE CLAUDE TOOLS:
- bash: Execute shell commands (tests, builds, deployments)
- read: Read file contents
- write: Create/overwrite files
- edit: Modify existing files
- ask_user: Interactive Q&A (for clarifications, approvals)
- grep: Search in files
- task: Create subtasks (for parallelization)

OUTPUT FORMAT (JSON ONLY):
{
  "name": "workflow-name-in-kebab-case",
  "description": "Brief 1-sentence workflow description",
  "steps": [
    {
      "id": "step-1",
      "name": "Step Name",
      "description": "What this step does",
      "type": "action",
      "agent": "business-analyst",
      "tool": "ask_user",
      "command": "Optional command to execute",
      "phase": "planning"
    }
  ],
  "agents": ["business-analyst", "architect", "developer"],
  "tools": ["ask_user", "write", "bash"],
  "phases": {
    "planning": {
      "required": true,
      "description": "Create project blueprint",
      "agents": [
        {
          "name": "business-analyst",
          "role": "requirements-gathering",
          "tools": ["ask_user", "write"],
          "outputContract": {
            "type": "requirements-doc",
            "format": "markdown"
          }
        }
      ],
      "outputs": {
        "taskList": "blueprints/task-list.yaml",
        "fileManifest": "blueprints/file-manifest.yaml"
      }
    },
    "build": {
      "required": true,
      "description": "Implement based on blueprint",
      "agents": [
        {
          "name": "developer",
          "role": "implementation",
          "tools": ["write", "bash"],
          "budget": {
            "tokens": 100000,
            "time": 3600000
          }
        }
      ]
    }
  }
}

RULES:
1. Name must be kebab-case (e.g., test-deploy-workflow)
2. Every workflow needs both planning and build phases
3. Planning phase creates blueprint, build phase uses it
4. Assign appropriate agents based on task type
5. Choose tools that match the action (bash for commands, write for files, etc.)
6. Keep descriptions concise and action-oriented
7. For complex workflows, break into multiple steps
8. Use "ask_user" tool when user input/approval is needed

EXAMPLES:

Example 1: "Run tests then deploy"
{
  "name": "test-deploy-workflow",
  "description": "Run tests and deploy to production if passing",
  "steps": [
    {
      "id": "plan-deployment",
      "name": "Plan Deployment",
      "description": "Define deployment strategy and requirements",
      "type": "action",
      "agent": "architect",
      "tool": "write",
      "phase": "planning"
    },
    {
      "id": "run-tests",
      "name": "Run Tests",
      "description": "Execute test suite",
      "type": "action",
      "agent": "qa-engineer",
      "tool": "bash",
      "command": "npm test",
      "phase": "build"
    },
    {
      "id": "deploy",
      "name": "Deploy",
      "description": "Deploy to production",
      "type": "action",
      "agent": "devops",
      "tool": "bash",
      "command": "./deploy.sh production",
      "dependsOn": "run-tests",
      "phase": "build"
    }
  ],
  "agents": ["architect", "qa-engineer", "devops"],
  "tools": ["write", "bash"]
}

Example 2: "Code review with tests"
{
  "name": "code-review-workflow",
  "description": "Automated code review with testing and approval",
  "steps": [
    {
      "id": "define-standards",
      "name": "Define Review Standards",
      "description": "Set code review criteria and acceptance tests",
      "type": "action",
      "agent": "architect",
      "tool": "write",
      "phase": "planning"
    },
    {
      "id": "run-linter",
      "name": "Run Linter",
      "description": "Check code style and quality",
      "type": "action",
      "agent": "qa-engineer",
      "tool": "bash",
      "command": "npm run lint",
      "phase": "build"
    },
    {
      "id": "run-tests",
      "name": "Run Tests",
      "description": "Execute test suite",
      "type": "action",
      "agent": "qa-engineer",
      "tool": "bash",
      "command": "npm test",
      "phase": "build"
    },
    {
      "id": "request-approval",
      "name": "Request Approval",
      "description": "Ask human reviewer for approval",
      "type": "action",
      "agent": "product-manager",
      "tool": "ask_user",
      "dependsOn": ["run-linter", "run-tests"],
      "phase": "build"
    }
  ],
  "agents": ["architect", "qa-engineer", "product-manager"],
  "tools": ["write", "bash", "ask_user"]
}

Now generate a workflow for the user's description. Return ONLY valid JSON, no other text or explanation.`;
  }
  
  /**
   * Parse Claude's JSON response into workflow structure
   */
  private parseResponse(text: string): WorkflowGenerationResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const workflow = JSON.parse(jsonMatch[0]);
      
      // Validate structure
      this.validateWorkflow(workflow);
      
      return workflow as WorkflowGenerationResult;
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error(`Failed to parse workflow: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }
  
  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: any): void {
    // Check required fields
    if (!workflow.name) {
      throw new Error('Workflow must have a name');
    }
    
    if (!workflow.steps || !Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }
    
    if (!workflow.phases || !workflow.phases.planning || !workflow.phases.build) {
      throw new Error('Workflow must have both planning and build phases (v6 requirement)');
    }
    
    // Validate name format (kebab-case)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(workflow.name)) {
      throw new Error('Workflow name must be kebab-case (e.g., my-workflow-name)');
    }
    
    // Validate steps
    for (const step of workflow.steps) {
      if (!step.id || !step.name || !step.agent || !step.tool) {
        throw new Error(`Invalid step: ${JSON.stringify(step)}`);
      }
      
      if (!step.phase || !['planning', 'build'].includes(step.phase)) {
        throw new Error(`Step "${step.id}" must have phase: "planning" or "build"`);
      }
    }
    
    // Validate agents and tools exist
    if (!workflow.agents || workflow.agents.length === 0) {
      throw new Error('Workflow must specify required agents');
    }
    
    if (!workflow.tools || workflow.tools.length === 0) {
      throw new Error('Workflow must specify required tools');
    }
  }
  
  /**
   * Generate workflow with retries for robustness
   */
  async generateWithRetry(
    description: string,
    maxRetries: number = 2
  ): Promise<WorkflowGenerationResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt}/${maxRetries}...`);
        }
        
        const result = await this.generate(description);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`Generation attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError || new Error('Failed to generate workflow after retries');
  }
}

// Export singleton instance
export const workflowGenerator = new WorkflowGenerator();

