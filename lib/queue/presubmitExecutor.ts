/**
 * Presubmit Executor
 * Runs expert skill evaluations in read-only mode
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getTargetProjectPath } from '@/lib/config/workspace';
import type { ExpertSkill } from '@/lib/config/expertSkills';

export interface PresubmitResult {
  success: boolean;
  evaluationReport?: string;
  actionPoints?: string[];
  overallOpinion?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  error?: string;
  executionTime?: number;
}

export class PresubmitExecutor {
  private apiKey: string;

  constructor() {
    this.apiKey = SKILLS_CONFIG.anthropicApiKey;
  }

  /**
   * Execute expert skill evaluation in read-only mode
   */
  async executeExpertEvaluation(
    taskId: number,
    expert: ExpertSkill,
    implementationReport: string
  ): Promise<PresubmitResult> {
    const startTime = Date.now();

    console.log(`🔍 Running ${expert.displayName} evaluation for task #${taskId}...`);

    try {
      // Build evaluation prompt
      const prompt = this.buildEvaluationPrompt(expert, implementationReport);

      console.log(`📝 Evaluation prompt prepared for ${expert.displayName}`);
      console.log(`🤖 Calling /${expert.skillName} skill...`);

      // Call Claude SDK with expert skill in READ-ONLY mode
      const queryGenerator = query({
        prompt,
        options: {
          model: 'claude-sonnet-4-20250514',
          cwd: getTargetProjectPath(),  // ✅ Execute in target project
          // Don't specify pathToClaudeCodeExecutable - let SDK use its own runtime
          additionalDirectories: [SKILLS_CONFIG.skillsDirectory],
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: this.apiKey,
          },
          executable: 'node',
          // READ-ONLY MODE - No file modifications allowed
          permissionMode: 'plan',  // Plan mode prevents actual execution
          allowedTools: ['read_file', 'list_dir', 'grep', 'codebase_search'],  // Only read tools
          systemPrompt: {
            type: 'preset',
            preset: 'claude_code',
            append: `You are acting as a ${expert.displayName}. Review the implementation in READ-ONLY mode. Do NOT make any changes to files. Provide evaluation only.`,
          },
        },
      });

      let evaluationText = '';
      let resultMessage = null;

      // Stream and collect evaluation
      for await (const message of queryGenerator) {
        if (message.type === 'assistant') {
          const textContent = message.message.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');
          
          if (textContent) {
            evaluationText += textContent + '\n';
          }
        } else if (message.type === 'result') {
          resultMessage = message;
          
          if (message.subtype !== 'success') {
            console.error(`❌ Evaluation failed: ${message.subtype}`);
            if (message.subtype === 'error_during_execution' && (message as any).errors) {
              const errors = (message as any).errors.join(', ');
              throw new Error(`Evaluation error: ${errors}`);
            }
          }
        }
      }

      const executionTime = Date.now() - startTime;
      evaluationText = evaluationText.trim();

      // Parse evaluation for structured data
      const parsed = this.parseEvaluation(evaluationText);

      console.log(`✅ ${expert.displayName} evaluation completed in ${executionTime}ms`);

      return {
        success: true,
        evaluationReport: evaluationText,
        actionPoints: parsed.actionPoints,
        overallOpinion: parsed.overallOpinion,
        severity: parsed.severity,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ ${expert.displayName} evaluation failed:`, error);

      return {
        success: false,
        error: error.message || 'Evaluation failed',
        executionTime,
      };
    }
  }

  /**
   * Build evaluation prompt for expert
   */
  private buildEvaluationPrompt(expert: ExpertSkill, implementationReport: string): string {
    return `/${expert.skillName}

You are a ${expert.displayName} conducting a presubmit code review.

**IMPORTANT:** 
- This is a READ-ONLY evaluation
- Do NOT make any changes to files
- Provide your expert opinion and recommendations only

## Implementation to Review

${implementationReport}

## Your Task

As a ${expert.displayName}, please evaluate this implementation and provide:

1. **Overall Opinion** (1-2 sentences)
   - Is this implementation sound from your perspective?
   - Any major concerns or praise?

2. **Action Points** (bullet list)
   - Critical issues that must be addressed
   - Important improvements recommended
   - Best practices to consider
   - Limit to top 5-10 most important points

3. **Severity Assessment**
   - LOW: Minor suggestions, mostly good
   - MEDIUM: Some improvements needed
   - HIGH: Significant issues found
   - CRITICAL: Must be fixed before proceeding

Format your response in this structure:

## Overall Opinion
[Your assessment]

## Action Points
- [Point 1]
- [Point 2]
...

## Severity
[LOW/MEDIUM/HIGH/CRITICAL]

Keep your evaluation concise and actionable. Focus on the most important aspects from your expert perspective.`;
  }

  /**
   * Parse evaluation text to extract structured data
   */
  private parseEvaluation(evaluation: string): {
    actionPoints: string[];
    overallOpinion: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    const actionPoints: string[] = [];
    let overallOpinion = '';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Extract overall opinion
    const opinionMatch = evaluation.match(/##\s*Overall Opinion\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (opinionMatch) {
      overallOpinion = opinionMatch[1].trim();
    }

    // Extract action points
    const actionMatch = evaluation.match(/##\s*Action Points\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (actionMatch) {
      const points = actionMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.trim().replace(/^[-*]\s*/, ''));
      actionPoints.push(...points);
    }

    // Extract severity
    const severityMatch = evaluation.match(/##\s*Severity\s*\n\s*(LOW|MEDIUM|HIGH|CRITICAL)/i);
    if (severityMatch) {
      severity = severityMatch[1].toLowerCase() as any;
    }

    return { actionPoints, overallOpinion, severity };
  }
}

// Singleton instance
export const presubmitExecutor = new PresubmitExecutor();

