/**
 * Type definitions for Claude Agent SDK skill execution
 */

export interface SkillExecutionOptions {
  timeout?: number;
  retries?: number;
  model?: string;
  cwd?: string;
  includeProjectContext?: boolean;
}

export interface SkillExecutionResult {
  success: boolean;
  questions?: string[];
  enhancedPrompt?: string;
  rawOutput?: string;
  error?: string;
  metadata?: {
    executionTime: number;
    skillName: string;
    model: string;
    retryCount: number;
    totalCost?: number;
    numTurns?: number;
  };
}

export interface ParsedSkillOutput {
  questions: string[];
  enhancedRequirements?: string;
  confirmationItems?: string[];
  fullOutput: string;
}

export interface SkillMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
  type?: string;
}
