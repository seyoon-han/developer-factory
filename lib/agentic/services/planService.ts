/**
 * Plan Service
 * Manages implementation plans and step execution tracking
 */

import { statements } from '@/lib/db/postgres';
import {
  AgenticPlan,
  AgenticPlanRow,
  AgenticPlanStep,
  AgenticPlanStepRow,
  PlanStepStatus,
  PlanStatus,
  ReviewStatus,
} from '@/types/agentic-task';

export interface PlanStepInput {
  title: string;
  description: string;
  context?: string;  // Additional context for the coding agent (from brainstorming, clarifications)
  estimatedComplexity?: 'low' | 'medium' | 'high';
  filePaths?: string[];
  dependsOn?: number[];  // Step numbers this depends on
  order: number;
}

export interface ParsedPlanResponse {
  overview?: string;
  goal?: string;
  architecture?: string;
  techStack?: string;
  steps: PlanStepInput[];
  rawContent: string;
}

export class PlanService {
  /**
   * Create a new plan with steps
   */
  async createPlan(
    taskId: number,
    planOverview: string,
    steps: PlanStepInput[],
    options?: {
      goal?: string;
      architecture?: string;
      techStack?: string;
      rawContent?: string;  // Raw output from Claude for display
    }
  ): Promise<AgenticPlan> {
    // Store overview and steps in plan_content for persistence
    // Also include rawContent if provided for displaying the full plan
    const planContentObj = {
      overview: planOverview,
      steps: steps,
      rawContent: options?.rawContent || ''  // Store raw Claude output
    };
    const planContent = JSON.stringify(planContentObj);
    const planStepsJson = JSON.stringify(steps);

    // Note: Postgres createAgenticPlan expects:
    // taskId, goal, architecture, techStack, planContent, planSteps
    const result = await statements.createAgenticPlan.run(
      taskId,
      options?.goal || null,
      options?.architecture || null,
      options?.techStack || null,
      planContent,
      planStepsJson
    );

    const planId = Number(result.lastInsertRowid);

    // Create individual step records for tracking
    for (const step of steps) {
      await statements.createAgenticPlanStep.run(
        planId,
        step.order,
        step.title,
        step.description,
        step.estimatedComplexity || 'medium',
        step.filePaths ? JSON.stringify(step.filePaths) : null
      );
    }

    return this.getPlanById(planId) as Promise<AgenticPlan>;
  }

  /**
   * Update a plan
   */
  async updatePlan(
    taskId: number,
    data: {
      planOverview?: string;
      goal?: string;
      architecture?: string;
      techStack?: string;
      planSteps?: PlanStepInput[];
      rawContent?: string; // Added rawContent
    }
  ): Promise<AgenticPlan | null> {
    const existing = await this.getPlanForTask(taskId);
    if (!existing) return null;

    const overview = data.planOverview !== undefined ? data.planOverview : existing.planOverview;
    const steps = data.planSteps || existing.planSteps;
    
    // Parse existing plan content to preserve other fields if needed, or just overwrite
    let currentRawContent = '';
    try {
        const existingContent = JSON.parse(existing.planContent);
        currentRawContent = existingContent.rawContent || '';
    } catch (e) { /* ignore */ }

    const planContentObj = {
      overview,
      steps,
      rawContent: data.rawContent !== undefined ? data.rawContent : currentRawContent
    };
    const planContent = JSON.stringify(planContentObj);
    const planStepsJson = JSON.stringify(steps);

    await statements.updateAgenticPlan.run(
      data.goal || existing.goal || null,
      data.architecture || existing.architecture || null,
      data.techStack || existing.techStack || null,
      planContent,
      planStepsJson,
      taskId
    );

    // Update steps table if steps provided
    if (data.planSteps) {
      await statements.deleteAgenticPlanSteps.run(existing.id);
      
      for (const step of data.planSteps) {
        await statements.createAgenticPlanStep.run(
          existing.id,
          step.order,
          step.title,
          step.description,
          step.estimatedComplexity || 'medium',
          step.filePaths ? JSON.stringify(step.filePaths) : null
        );
      }
    }

    return this.getPlanForTask(taskId);
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: number): Promise<AgenticPlan | null> {
    const row = await statements.getAgenticPlanById?.get(planId) as AgenticPlanRow | undefined;
    if (!row) return null;

    return this.rowToPlan(row);
  }

  /**
   * Get plan for a task
   */
  async getPlanForTask(taskId: number): Promise<AgenticPlan | null> {
    const row = await statements.getAgenticPlan.get(taskId) as AgenticPlanRow | undefined;
    if (!row) return null;

    return this.rowToPlan(row);
  }

  /**
   * Alias for getPlanForTask
   */
  async getPlan(taskId: number): Promise<AgenticPlan | null> {
    return this.getPlanForTask(taskId);
  }

  /**
   * Convert row to plan
   */
  private async rowToPlan(row: AgenticPlanRow): Promise<AgenticPlan> {
    const steps = await this.getPlanSteps(row.id);
    
    let overview = '';
    // Try to extract overview from plan_content JSON
    try {
      if (row.plan_content) {
        const content = JSON.parse(row.plan_content);
        if (content.overview) overview = content.overview;
      }
    } catch (e) {
      // Ignore parse error
    }

    // Determine status
    let status: PlanStatus = 'draft';
    if (row.status) {
      status = row.status;
    } else if (row.approved === 1) {
      status = 'approved';
    } else if (row.plan_content) {
      status = 'pending_review';
    }

    return {
      id: row.id,
      taskId: row.task_id,
      planOverview: overview || row.plan_overview || '',
      goal: row.goal || undefined,
      architecture: row.architecture || undefined,
      techStack: row.tech_stack || undefined,
      planContent: row.plan_content,
      planSteps: steps,
      userModified: row.user_modified === 1,
      status: status,
      approvedAt: row.approved_at || undefined,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get plan steps
   */
  async getPlanSteps(planId: number): Promise<AgenticPlanStep[]> {
    const rows = await statements.getAgenticPlanSteps.all(planId) as AgenticPlanStepRow[];

    return rows.map(row => ({
      id: row.id,
      planId: row.plan_id,
      order: row.step_index || row.step_order, // Handle column naming variance if any
      title: row.step_title || '', // Map from step_title
      description: row.step_description || row.step_content || '', // Map content to description if needed
      estimatedComplexity: row.estimated_complexity as 'low' | 'medium' | 'high' | undefined,
      filePaths: row.file_paths ? JSON.parse(row.file_paths) : undefined,
      status: row.status,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      output: row.output || undefined,
      error: row.error || undefined,
      reviewStatus: row.review_status || undefined,
      reviewNotes: row.review_notes || undefined,
    }));
  }

  /**
   * Update plan status
   */
  async updatePlanStatus(taskId: number, status: PlanStatus): Promise<AgenticPlan | null> {
    await statements.updateAgenticPlanStatus?.run(status, taskId);
    return this.getPlanForTask(taskId);
  }

  /**
   * Approve a plan
   */
  async approvePlan(taskId: number): Promise<AgenticPlan | null> {
    await statements.approveAgenticPlan.run(taskId);
    return this.getPlanForTask(taskId);
  }

  /**
   * Reject a plan
   */
  async rejectPlan(taskId: number): Promise<AgenticPlan | null> {
    await statements.updateAgenticPlanStatus?.run('rejected', taskId);
    return this.getPlanForTask(taskId);
  }

  /**
   * Update step status
   */
  async updateStepStatus(stepId: number, status: PlanStepStatus, output?: string): Promise<void> {
    if (output !== undefined) {
      await statements.updateAgenticPlanStepOutput.run(output, null, stepId);
    }
    await statements.updateAgenticPlanStepStatus.run(status, status, status, stepId);
  }

  /**
   * Update step output
   */
  async updateStepOutput(stepId: number, output: string, error?: string): Promise<void> {
    await statements.updateAgenticPlanStepOutput.run(output, error || null, stepId);
  }

  /**
   * Update step review
   */
  async updateStepReview(stepId: number, reviewStatus: ReviewStatus, reviewNotes?: string): Promise<void> {
    await statements.updateAgenticPlanStepReview.run(reviewStatus, reviewNotes || null, stepId);
  }

  /**
   * Get next pending step
   */
  async getNextPendingStep(taskId: number): Promise<AgenticPlanStep | null> {
    const plan = await this.getPlanForTask(taskId);
    if (!plan) return null;

    return plan.planSteps.find(s => s.status === 'pending') || null;
  }

  /**
   * Get current in-progress step
   */
  async getCurrentStep(taskId: number): Promise<AgenticPlanStep | null> {
    const plan = await this.getPlanForTask(taskId);
    if (!plan) return null;

    return plan.planSteps.find(s => s.status === 'in_progress') || null;
  }

  /**
   * Get plan progress
   */
  async getProgress(taskId: number): Promise<{
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    pending: number;
    percentComplete: number;
  }> {
    const plan = await this.getPlanForTask(taskId);
    if (!plan) {
      return { total: 0, completed: 0, failed: 0, inProgress: 0, pending: 0, percentComplete: 0 };
    }

    const total = plan.planSteps.length;
    const completed = plan.planSteps.filter(s => s.status === 'completed').length;
    const failed = plan.planSteps.filter(s => s.status === 'failed').length;
    const inProgress = plan.planSteps.filter(s => s.status === 'in_progress').length;
    const pending = plan.planSteps.filter(s => s.status === 'pending').length;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, failed, inProgress, pending, percentComplete };
  }

  /**
   * Check if plan is complete
   */
  async isPlanComplete(taskId: number): Promise<boolean> {
    const progress = await this.getProgress(taskId);
    return progress.pending === 0 && progress.inProgress === 0;
  }

  /**
   * Delete plan for a task
   */
  async deletePlan(taskId: number): Promise<void> {
    const plan = await this.getPlanForTask(taskId);
    if (plan) {
      await statements.deleteAgenticPlanSteps.run(plan.id);
      await statements.deleteAgenticPlan.run(taskId);
    }
  }

  /**
   * Parse plan from AI response
   */
  parsePlanFromResponse(response: string): ParsedPlanResponse {
    let overview: string | undefined;
    let goal: string | undefined;
    let architecture: string | undefined;
    let techStack: string | undefined;
    const steps: PlanStepInput[] = [];

    // Try to parse JSON format
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        overview = parsed.overview;

        if (Array.isArray(parsed.steps)) {
          for (let i = 0; i < parsed.steps.length; i++) {
            const step = parsed.steps[i];
            
            // Combine description and context for a fully self-contained step
            let fullDescription = step.description || '';
            if (step.context) {
              fullDescription += '\n\n---\n**CONTEXT FOR IMPLEMENTATION:**\n' + step.context;
            }
            
            steps.push({
              title: step.title || `Step ${i + 1}`,
              description: fullDescription,
              context: step.context || '',
              estimatedComplexity: step.estimatedComplexity || 'medium',
              filePaths: step.filePaths || [],
              dependsOn: step.dependsOn || [],
              order: i,
            });
          }
        }

        return { overview, goal, architecture, techStack, steps, rawContent: response };
      } catch (e) {
        console.warn('Failed to parse JSON plan:', e);
      }
    }

    // Strategy 2: Try to find JSON object anywhere in response (not just code blocks)
    const jsonObjectMatch = response.match(/\{[\s\S]*"overview"[\s\S]*"steps"[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        const parsed = JSON.parse(jsonObjectMatch[0]);
        overview = parsed.overview;
        if (Array.isArray(parsed.steps)) {
          for (let i = 0; i < parsed.steps.length; i++) {
            const step = parsed.steps[i];
            let fullDescription = step.description || '';
            if (step.context) {
              fullDescription += '\n\n---\n**CONTEXT FOR IMPLEMENTATION:**\n' + step.context;
            }
            steps.push({
              title: step.title || `Step ${i + 1}`,
              description: fullDescription,
              context: step.context || '',
              estimatedComplexity: step.estimatedComplexity || 'medium',
              filePaths: step.filePaths || [],
              dependsOn: step.dependsOn || [],
              order: i,
            });
          }
        }
        if (steps.length > 0) {
          console.log('[PlanService] Parsed JSON from response body (not code block)');
          return { overview, goal, architecture, techStack, steps, rawContent: response };
        }
      } catch (e) {
        console.warn('[PlanService] Failed to parse JSON object from response:', e);
      }
    }

    // Fallback: extract from markdown - comprehensive parsing
    console.log('[PlanService] Using markdown fallback parsing');
    
    // Extract overview from various formats
    const overviewPatterns = [
      /##?\s*(?:Overview|Summary|Plan Overview)\s*\n([\s\S]*?)(?=##|\n---|\n\*\*Step|\n\d+\.\s)/i,
      /\*\*(?:Overview|Summary):\*\*\s*([\s\S]*?)(?=##|\n---|\n\*\*Step|\n\d+\.\s)/i,
    ];
    for (const pattern of overviewPatterns) {
      const match = response.match(pattern);
      if (match && match[1].trim().length > 50) {
        overview = match[1].trim();
        break;
      }
    }

    // Extract architecture/goal if present
    const goalMatch = response.match(/##?\s*(?:Goal|Architecture|Approach)\s*\n([\s\S]*?)(?=##|\n\n\n|$)/i);
    if (goalMatch) {
      goal = goalMatch[1].trim();
    }

    // Strategy A: Look for markdown header steps (### Step 1, ### Task 1, etc.)
    const headerStepPattern = /###\s*(?:Step|Task)\s*(\d+)[:\s]*([^\n]*)\n([\s\S]*?)(?=###\s*(?:Step|Task)\s*\d+|##[^#]|$)/gi;
    let headerMatch;
    while ((headerMatch = headerStepPattern.exec(response)) !== null) {
      const stepNum = parseInt(headerMatch[1]);
      const title = headerMatch[2].trim() || `Step ${stepNum}`;
      const content = headerMatch[3].trim();
      
      // Extract file paths from content
      const filePaths: string[] = [];
      const fileMatches = content.match(/`([^`]+\.[a-z]+)`/g);
      if (fileMatches) {
        fileMatches.forEach(f => {
          const path = f.replace(/`/g, '');
          if (path.includes('/') || path.includes('.')) {
            filePaths.push(path);
          }
        });
      }
      
      steps.push({
        title: title,
        description: content.substring(0, 2000),
        filePaths: [...new Set(filePaths)].slice(0, 10),
        order: steps.length,
      });
    }

    // Strategy B: Look for **Step N:** or **Task N:** format
    if (steps.length === 0) {
      const boldStepPattern = /\*\*(?:Step|Task)\s*(\d+)[:\s]*([^*]*)\*\*\s*([\s\S]*?)(?=\*\*(?:Step|Task)\s*\d+|##|$)/gi;
      while ((headerMatch = boldStepPattern.exec(response)) !== null) {
        const title = headerMatch[2].trim() || `Step ${headerMatch[1]}`;
        const content = headerMatch[3].trim();
        
        steps.push({
          title: title,
          description: content.substring(0, 2000),
          order: steps.length,
        });
      }
    }

    // Strategy C: Numbered list with descriptions (1. Title\nDescription...)
    if (steps.length === 0) {
      // Split by numbered items, keeping the number
      const sections = response.split(/(?=\n\d+\.\s)/);
      for (const section of sections) {
        const match = section.match(/^\n?(\d+)\.\s+(?:\*\*)?([^*\n]+?)(?:\*\*)?[\n:]([\s\S]*?)(?=\n\d+\.\s|$)/);
        if (match) {
          const title = match[2].trim();
          let description = match[3]?.trim() || '';
          
          // If description is very short, it might just be a title - look for more content
          if (description.length < 50) {
            // Get all content until next numbered item
            const fullContent = section.slice(match[0].indexOf('\n') + 1).trim();
            if (fullContent.length > description.length) {
              description = fullContent;
            }
          }
          
          // Extract file paths
          const filePaths: string[] = [];
          const fileMatches = description.match(/`([^`]+\.[a-z]+)`/g);
          if (fileMatches) {
            fileMatches.forEach(f => {
              const path = f.replace(/`/g, '');
              if (path.includes('/') || path.includes('.')) {
                filePaths.push(path);
              }
            });
          }
          
          steps.push({
            title: title,
            description: description.substring(0, 2000) || `Implementation step: ${title}`,
            filePaths: [...new Set(filePaths)].slice(0, 10),
            order: steps.length,
          });
        }
      }
    }

    // Strategy D: Simple numbered list (1. Title only)
    // BUT: Only use if we're in an "Implementation Steps" section, not "Architecture Decisions" etc.
    if (steps.length === 0) {
      // First, try to find an "Implementation Steps" section
      const implSection = response.match(/(?:##?\s*)?(?:Implementation\s*Steps|Steps\s*to\s*Implement|Plan\s*Steps)[\s\S]*?(?=##[^#]|$)/i);
      const textToSearch = implSection ? implSection[0] : response;
      
      // Check if we're NOT in a summary section
      const summaryHeaders = ['Architecture Decisions', 'Key Decisions', 'Summary', 'Plan Summary', 'Key Architecture'];
      const isSummarySection = summaryHeaders.some(header => 
        textToSearch.toLowerCase().includes(header.toLowerCase())
      );
      
      if (!isSummarySection) {
        const simplePattern = /(?:^|\n)(\d+)\.\s+(?:\*\*)?([^*\n]+)(?:\*\*)?/g;
        let match;
        while ((match = simplePattern.exec(textToSearch)) !== null) {
          const title = match[2].trim();
          // Skip if it looks like a summary/architecture item (contains "for" without action verbs)
          if (title.toLowerCase().includes(' for ') && 
              !title.toLowerCase().match(/^(create|implement|add|build|set up|configure)/)) {
            continue;
          }
          steps.push({
            title: title,
            description: `Implementation step: ${title}`,
            order: steps.length,
          });
        }
      } else {
        console.log('[PlanService] Skipping Strategy D - appears to be in summary/architecture section');
      }
    }

    // If no overview was found but we have steps, try to extract from beginning of response
    if (!overview && steps.length > 0) {
      const firstStep = response.indexOf(steps[0].title);
      if (firstStep > 100) {
        overview = response.substring(0, firstStep).trim()
          .replace(/^#.*\n/gm, '')  // Remove headers
          .replace(/\*\*/g, '')     // Remove bold markers
          .trim()
          .substring(0, 1000);
      }
    }

    console.log(`[PlanService] Markdown parsing found ${steps.length} steps, overview: ${overview ? 'yes' : 'no'}`);
    
    // Warning if we found very few steps - might indicate AI wrote to file instead
    if (steps.length > 0 && steps.length < 5) {
      console.warn(`[PlanService] ⚠️ Only ${steps.length} steps found - AI may have written detailed plan to a file instead of response`);
      
      // Check if response mentions writing to a file
      if (response.includes('saved at') || response.includes('written to') || response.includes('.claude/plans')) {
        console.warn('[PlanService] ⚠️ Response mentions file writing - plan may be incomplete');
      }
    }
    
    // Log step titles for debugging
    if (steps.length > 0) {
      console.log('[PlanService] Parsed step titles:', steps.map(s => s.title.substring(0, 50)).join(' | '));
    }
    
    return { overview, goal, architecture, techStack, steps, rawContent: response };
  }

  /**
   * Format plan for display
   */
  formatForDisplay(plan: AgenticPlan): string {
    const lines: string[] = [];

    if (plan.planOverview) {
      lines.push(`## Overview\n${plan.planOverview}\n`);
    }

    if (plan.goal) {
      lines.push(`## Goal\n${plan.goal}\n`);
    }

    if (plan.architecture) {
      lines.push(`## Architecture\n${plan.architecture}\n`);
    }

    if (plan.techStack) {
      lines.push(`## Tech Stack\n${plan.techStack}\n`);
    }

    lines.push('## Implementation Steps\n');
    for (const step of plan.planSteps) {
      const statusIcon = {
        pending: '⬜',
        in_progress: '🔄',
        completed: '✅',
        failed: '❌',
        skipped: '⏭️',
      }[step.status];

      lines.push(`${statusIcon} **Step ${step.order + 1}:** ${step.title}`);
      if (step.description) {
        lines.push(`   ${step.description}`);
      }
    }

    return lines.join('\n');
  }
}

// Export PlanStepInput as PlanStep for compatibility
export type PlanStep = PlanStepInput;

// Singleton instance
export const planService = new PlanService();
export default planService;
