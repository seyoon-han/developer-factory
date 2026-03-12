/**
 * Token Usage Tracking Utility
 * Logs token usage to database for analytics
 */

import { statements } from '@/lib/db/postgres';

export type TokenUsagePhase = 'prompt_enhancement' | 'implementation' | 'refinement' | 'presubmit' | 'other';
export type TokenUsageProvider = 'claude' | 'openai' | 'other';

export interface TokenUsageData {
  taskId: number;
  phase: TokenUsagePhase;
  provider: TokenUsageProvider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  numTurns?: number;
  executionTimeMs?: number;
  refinementRound?: number;
}

/**
 * Log token usage to database
 */
export async function logTokenUsage(data: TokenUsageData): Promise<void> {
  try {
    const {
      taskId,
      phase,
      provider,
      model,
      inputTokens = 0,
      outputTokens = 0,
      totalTokens = 0,
      costUsd = 0,
      numTurns = 0,
      executionTimeMs = 0,
      refinementRound = 1,
    } = data;

    await statements.createTokenUsage.run(
      taskId,
      phase,
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
      numTurns,
      executionTimeMs,
      refinementRound
    );

    console.log(`📊 Token usage logged: Task #${taskId} | ${phase} | ${provider} | ${totalTokens} tokens | $${costUsd?.toFixed(4)}`);
  } catch (error: any) {
    console.error(`❌ Failed to log token usage:`, error.message);
  }
}

/**
 * Extract provider from model name
 */
export function getProviderFromModel(model: string): TokenUsageProvider {
  const modelLower = model.toLowerCase();
  
  if (modelLower.includes('claude') || modelLower.includes('anthropic')) {
    return 'claude';
  } else if (modelLower.includes('gpt') || modelLower.includes('openai')) {
    return 'openai';
  } else {
    return 'other';
  }
}

/**
 * Parse token usage from Claude SDK result message
 * Claude SDK returns usage in the result message with total_cost_usd and num_turns
 */
export function parseClaudeUsage(resultMessage: any, executionTimeMs: number): Partial<TokenUsageData> {
  if (!resultMessage) {
    return {
      executionTimeMs,
    };
  }

  // Claude SDK may return token usage in various formats
  // Check for usage object (from direct API calls)
  const usage = resultMessage.usage || resultMessage.message?.usage;
  
  return {
    inputTokens: usage?.input_tokens || 0,
    outputTokens: usage?.output_tokens || 0,
    totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
    costUsd: resultMessage.total_cost_usd || 0,
    numTurns: resultMessage.num_turns || 1,
    executionTimeMs,
  };
}

/**
 * Parse token usage from OpenAI API response
 */
export function parseOpenAIUsage(response: any, executionTimeMs: number): Partial<TokenUsageData> {
  const usage = response?.usage;
  
  if (!usage) {
    return {
      executionTimeMs,
    };
  }

  // OpenAI pricing (as of 2024)
  // GPT-4 Turbo: $0.01 per 1K input tokens, $0.03 per 1K output tokens
  // GPT-3.5 Turbo: $0.0005 per 1K input tokens, $0.0015 per 1K output tokens
  const model = response?.model || '';
  let inputCostPer1k = 0.01;
  let outputCostPer1k = 0.03;
  
  if (model.includes('gpt-3.5')) {
    inputCostPer1k = 0.0005;
    outputCostPer1k = 0.0015;
  }
  
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || inputTokens + outputTokens;
  
  const costUsd = (inputTokens / 1000 * inputCostPer1k) + (outputTokens / 1000 * outputCostPer1k);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd,
    numTurns: 1,
    executionTimeMs,
  };
}

/**
 * Get token usage summary for a task
 */
export async function getTaskTokenUsageSummary(taskId: number) {
  try {
    const usage = await statements.getTokenUsageSummaryByTask.all(taskId) as any[];
    
    // Calculate totals
    const totals = {
      totalTokens: 0,
      totalCost: 0,
      totalTurns: 0,
      totalCalls: 0,
      byPhase: {} as Record<string, any>,
      byProvider: {} as Record<string, any>,
    };

    usage.forEach((row) => {
      totals.totalTokens += row.total_tokens || 0;
      totals.totalCost += row.total_cost || 0;
      totals.totalTurns += row.total_turns || 0;
      totals.totalCalls += row.call_count || 0;

      // Group by phase
      if (!totals.byPhase[row.phase]) {
        totals.byPhase[row.phase] = {
          tokens: 0,
          cost: 0,
          turns: 0,
          calls: 0,
        };
      }
      totals.byPhase[row.phase].tokens += row.total_tokens || 0;
      totals.byPhase[row.phase].cost += row.total_cost || 0;
      totals.byPhase[row.phase].turns += row.total_turns || 0;
      totals.byPhase[row.phase].calls += row.call_count || 0;

      // Group by provider
      if (!totals.byProvider[row.provider]) {
        totals.byProvider[row.provider] = {
          tokens: 0,
          cost: 0,
          turns: 0,
          calls: 0,
        };
      }
      totals.byProvider[row.provider].tokens += row.total_tokens || 0;
      totals.byProvider[row.provider].cost += row.total_cost || 0;
      totals.byProvider[row.provider].turns += row.total_turns || 0;
      totals.byProvider[row.provider].calls += row.call_count || 0;
    });

    return {
      details: usage,
      totals,
    };
  } catch (error: any) {
    console.error(`❌ Failed to get token usage summary:`, error.message);
    return null;
  }
}
















