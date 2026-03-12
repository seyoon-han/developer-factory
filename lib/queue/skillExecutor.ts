/**
 * Claude API Skill Executor
 * Executes Claude Code skills using Anthropic API with Skills API
 */

import Anthropic from '@anthropic-ai/sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getPreferredModel } from '@/lib/utils/modelSelector';
import { projectScanner, ProjectScanner } from './projectScanner';
import { logTokenUsage, getProviderFromModel, parseClaudeUsage } from '@/lib/utils/tokenUsage';
import type {
  SkillExecutionOptions,
  SkillExecutionResult,
  ParsedSkillOutput,
} from '@/types/skill';

export class SkillExecutor {
  private apiKey: string;
  private client: Anthropic;
  private skillIdCache: Map<string, string> = new Map();

  constructor() {
    this.apiKey = SKILLS_CONFIG.anthropicApiKey;
    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  /**
   * Find skill ID by name from Claude account
   */
  private async findSkillId(skillName: string): Promise<string | null> {
    // Check cache first
    if (this.skillIdCache.has(skillName)) {
      return this.skillIdCache.get(skillName)!;
    }

    try {
      console.log(`🔍 Looking up skill: ${skillName}`);

      const skills = await this.client.beta.skills.list({
        source: 'custom',
        betas: ['skills-2025-10-02'],
      } as any);

      for (const skill of (skills as any).data) {
        console.log(`  - Found: ${skill.id}: ${skill.display_title}`);

        // Match by display_title or name
        if (
          skill.display_title?.toLowerCase() === skillName.toLowerCase() ||
          skill.name?.toLowerCase() === skillName.toLowerCase()
        ) {
          console.log(`✅ Matched skill: ${skill.id}`);
          this.skillIdCache.set(skillName, skill.id);
          return skill.id;
        }
      }

      console.log(`⚠️  Skill "${skillName}" not found in account`);
      return null;
    } catch (error: any) {
      console.error(`❌ Error listing skills:`, error.message);
      return null;
    }
  }

  /**
   * Execute the prompt-enhancer skill
   */
  async executePromptEnhancer(
    taskTitle: string,
    taskDescription: string,
    options: SkillExecutionOptions = {}
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const retries = options.retries ?? SKILLS_CONFIG.maxRetries;
    let lastError: Error | null = null;
    
    // Resolve model
    const preferredModel = options.model || await getPreferredModel();
    const executionOptions = { ...options, model: preferredModel };

    console.log(`🎯 Executing prompt-enhancer skill for: "${taskTitle}"`);

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${retries}`);
      }

      try {
        const result = await this.executeSkillWithAPI(
          'prompt-enhancer',
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
      error: lastError?.message || 'Skill execution failed after all retries',
      metadata: {
        executionTime,
        skillName: 'prompt-enhancer',
        model: preferredModel,
        retryCount: retries,
      },
    };
  }

  /**
   * Execute skill using Skills API from Claude account
   */
  private async executeSkillWithAPI(
    skillName: string,
    taskTitle: string,
    taskDescription: string,
    options: SkillExecutionOptions
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const model = options.model || await getPreferredModel();

    // Use the configured skill ID directly
    const skillId = SKILLS_CONFIG.promptEnhancer.skillId;

    console.log(`🎯 Using skill ID: ${skillId}`);

    // Prepare the user prompt with optional project context
    const includeContext = options.includeProjectContext ?? false;
    const userPrompt = await this.buildPromptEnhancerInput(taskTitle, taskDescription, includeContext);

    console.log(`📝 User prompt prepared (${userPrompt.length} chars)`);
    console.log(`🚀 Calling Skills API...`);

    try {
      const response = await this.client.beta.messages.create({
        model: model,
        max_tokens: 8192,
        betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
        container: {
          skills: [
            {
              type: 'custom',
              skill_id: skillId,
              version: 'latest',
            },
          ],
        },
        tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      } as any);

      const executionTime = Date.now() - startTime;
      console.log(`⏱️  API call completed in ${executionTime}ms`);

      // Extract text from response
      const enhancedPrompt = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      console.log(`📄 Enhanced prompt generated: ${enhancedPrompt.length} chars`);

      if (!enhancedPrompt || enhancedPrompt.length < 100) {
        console.error(`⚠️  Enhanced prompt is too short or empty`);
        throw new Error('Skill did not generate a proper enhanced prompt.');
      }

      console.log(`✅ Skill generated enhanced requirements document`);

      return {
        success: true,
        enhancedPrompt,
        rawOutput: enhancedPrompt,
        metadata: {
          executionTime,
          skillName,
          model: model,
          retryCount: 0,
        },
      };
    } catch (error: any) {
      console.error(`❌ Anthropic API error:`, error);
      throw new Error(`Anthropic API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Build input for prompt-enhancer skill with project context
   */
  private async buildPromptEnhancerInput(
    title: string,
    description: string,
    includeProjectContext: boolean = false
  ): Promise<string> {
    let prompt = `${title}${description ? `\n\n${description}` : ''}`;

    // Add project context if requested
    if (includeProjectContext) {
      console.log('📂 Including project context in skill input...');
      try {
        const context = await projectScanner.scanProject();
        const contextStr = ProjectScanner.formatForPrompt(context);

        prompt = `${prompt}\n\n${contextStr}`;
        console.log(`✅ Added ${context.files.length} files (${context.totalSize} bytes) to context`);
      } catch (error) {
        console.error('⚠️  Failed to scan project context:', error);
        // Continue without context
      }
    }

    return prompt;
  }

}

// Singleton instance
export const skillExecutor = new SkillExecutor();
