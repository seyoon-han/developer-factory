/**
 * Microsoft Amplifier Workflow Generator
 * Converts natural language to Amplifier-compatible workflows
 * Separate from BMAD to avoid confusion
 */

import Anthropic from '@anthropic-ai/sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';

export interface AmplifierWorkflowResult {
  name: string;
  description: string;
  steps: AmplifierStep[];
  agents: string[];
  tools: string[];
  workflowType: 'ddd' | 'agent-based' | 'parallel' | 'standard';
}

export interface AmplifierStep {
  id: string;
  name: string;
  description: string;
  agent: string;
  tool: string;
  command?: string;
  documentType?: string;  // For DDD workflows
}

export class AmplifierGenerator {
  private client: Anthropic | null = null;
  
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
   * Generate Amplifier workflow from natural language
   */
  async generate(description: string): Promise<AmplifierWorkflowResult> {
    const prompt = this.buildPrompt(description);
    
    try {
      const client = this.getClient();
      
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.3,
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
      console.error('Amplifier workflow generation error:', error);
      throw new Error(`Failed to generate Amplifier workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Build prompt for Amplifier workflow generation
   */
  private buildPrompt(description: string): string {
    return `You are a Microsoft Amplifier workflow architect. Convert this natural language description into an Amplifier-compatible workflow.

Microsoft Amplifier specializes in:
- Document-Driven Development (DDD)
- Specialized expert agents
- Parallel development workflows
- Clean documentation-first approach

USER DESCRIPTION:
${description}

AMPLIFIER AGENTS (Choose appropriate ones):
- zen-architect: System design and architecture
- bug-hunter: Finding and fixing bugs
- security-guardian: Security audits and vulnerability scanning
- doc-master: Documentation and technical writing
- test-engineer: Test creation and validation
- code-reviewer: Code quality and review
- performance-optimizer: Performance analysis and optimization
- deploy-specialist: Deployment and DevOps

AMPLIFIER TOOLS:
- bash: Execute shell commands
- read: Read files
- write: Create/edit files
- edit: Modify existing files
- grep: Search in files
- ask_user: Get user input or approval

WORKFLOW TYPES:
1. DDD (Document-Driven Development): 
   - Steps: plan → docs → code-plan → code → finish
   - Best for: Features needing design first
   
2. Agent-Based:
   - Assign specialized agents to specific tasks
   - Best for: Quality-focused tasks (security, bugs, optimization)
   
3. Parallel:
   - Multiple approaches simultaneously
   - Best for: Exploring different solutions
   
4. Standard:
   - Sequential task execution
   - Best for: Simple linear workflows

OUTPUT FORMAT (JSON ONLY):
{
  "name": "workflow-name-kebab-case",
  "description": "Brief workflow description",
  "workflowType": "ddd|agent-based|parallel|standard",
  "steps": [
    {
      "id": "step-1",
      "name": "Step Name",
      "description": "What this step does",
      "agent": "zen-architect",
      "tool": "write",
      "command": "Optional command to run",
      "documentType": "architecture|requirements|spec|code"
    }
  ],
  "agents": ["zen-architect", "doc-master"],
  "tools": ["write", "bash", "read"]
}

RULES:
1. Name must be kebab-case
2. Choose appropriate workflow type based on task
3. Use DDD for features requiring design
4. Use specialized agents for their expertise
5. Keep steps clear and actionable

EXAMPLES:

Example 1: "Design and implement authentication"
{
  "name": "auth-implementation-ddd",
  "description": "Document-driven authentication implementation",
  "workflowType": "ddd",
  "steps": [
    {
      "id": "plan",
      "name": "Plan Authentication",
      "description": "Design authentication strategy",
      "agent": "zen-architect",
      "tool": "write",
      "documentType": "architecture"
    },
    {
      "id": "docs",
      "name": "Document API",
      "description": "Create API documentation",
      "agent": "doc-master",
      "tool": "write",
      "documentType": "spec"
    },
    {
      "id": "implement",
      "name": "Implement Auth",
      "description": "Code the authentication system",
      "agent": "zen-architect",
      "tool": "write",
      "documentType": "code"
    }
  ],
  "agents": ["zen-architect", "doc-master"],
  "tools": ["write", "read"]
}

Example 2: "Find and fix security vulnerabilities"
{
  "name": "security-audit",
  "description": "Security vulnerability scan and remediation",
  "workflowType": "agent-based",
  "steps": [
    {
      "id": "scan",
      "name": "Security Scan",
      "description": "Scan codebase for vulnerabilities",
      "agent": "security-guardian",
      "tool": "grep"
    },
    {
      "id": "fix",
      "name": "Fix Issues",
      "description": "Remediate found vulnerabilities",
      "agent": "security-guardian",
      "tool": "edit"
    }
  ],
  "agents": ["security-guardian"],
  "tools": ["grep", "edit"]
}

Now generate an Amplifier workflow. Return ONLY valid JSON, no other text.`;
  }
  
  /**
   * Parse Claude's response
   */
  private parseResponse(text: string): AmplifierWorkflowResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const workflow = JSON.parse(jsonMatch[0]);
      
      // Validate
      if (!workflow.name || !workflow.steps || !Array.isArray(workflow.steps)) {
        throw new Error('Invalid Amplifier workflow structure');
      }
      
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(workflow.name)) {
        throw new Error('Workflow name must be kebab-case');
      }
      
      return workflow as AmplifierWorkflowResult;
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error(`Failed to parse Amplifier workflow: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }
  
  /**
   * Generate with retry logic
   */
  async generateWithRetry(description: string, maxRetries: number = 2): Promise<AmplifierWorkflowResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt}/${maxRetries}...`);
        }
        
        return await this.generate(description);
      } catch (error) {
        lastError = error as Error;
        console.error(`Amplifier generation attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError || new Error('Failed to generate Amplifier workflow after retries');
  }
}

// Export singleton
export const amplifierGenerator = new AmplifierGenerator();

