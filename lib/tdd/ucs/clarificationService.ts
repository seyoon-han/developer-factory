/**
 * User Clarification Service (UCS)
 * Handles agent-user communication during specification refinement
 */

import { statements } from '@/lib/db/postgres';
import {
  TddClarification,
  ParsedClarification,
  ClarificationQuestion,
  UserAnswer,
  CreateClarificationInput,
  BatchSubmitAnswersInput,
  ClarificationStatus
} from '@/types/clarification';

/**
 * User Clarification Service
 */
export class UCSService {
  /**
   * Create multiple clarification questions
   */
  async createClarifications(
    tddTaskId: number,
    questions: ClarificationQuestion[],
    agentStateId?: number
  ): Promise<TddClarification[]> {
    const clarifications: TddClarification[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      const result = await statements.createTddClarification.run(
        tddTaskId,
        question.text,
        question.type,
        question.suggestedOptions ? JSON.stringify(question.suggestedOptions) : null,
        question.required ? 1 : 0,
        i,
        agentStateId || null
      );

      const clarification = await statements.getTddClarification.get(
        result.lastInsertRowid
      ) as TddClarification;

      clarifications.push(clarification);
    }

    return clarifications;
  }

  /**
   * Get all clarifications for a task
   */
  async getClarifications(tddTaskId: number): Promise<ParsedClarification[]> {
    const clarifications = await statements.getTddClarifications.all(tddTaskId) as TddClarification[];

    return clarifications.map((c) => ({
      ...c,
      suggested_options: c.suggested_options ? JSON.parse(c.suggested_options) : []
    }));
  }

  /**
   * Get unanswered clarifications for a task
   */
  async getUnansweredClarifications(tddTaskId: number): Promise<ParsedClarification[]> {
    const clarifications = await statements.getUnansweredTddClarifications.all(
      tddTaskId
    ) as TddClarification[];

    return clarifications.map((c) => ({
      ...c,
      suggested_options: c.suggested_options ? JSON.parse(c.suggested_options) : []
    }));
  }

  /**
   * Submit answer for a single clarification
   */
  async submitAnswer(clarificationId: number, answer: UserAnswer): Promise<TddClarification> {
    const answerValue = answer.customText || answer.value;
    const answerType = answer.selectedOptions?.length
      ? 'selected'
      : answer.customText
      ? 'custom'
      : 'text';

    await statements.answerTddClarification.run(answerValue, answerType, clarificationId);

    return await statements.getTddClarification.get(clarificationId) as TddClarification;
  }

  /**
   * Submit answers for multiple clarifications
   */
  async submitBatchAnswers(input: BatchSubmitAnswersInput): Promise<TddClarification[]> {
    const results: TddClarification[] = [];

    for (const [clarificationId, answer] of Object.entries(input.answers)) {
      const result = await this.submitAnswer(parseInt(clarificationId), answer);
      results.push(result);
    }

    return results;
  }

  /**
   * Get clarification status summary for a task
   */
  async getClarificationStatus(tddTaskId: number): Promise<ClarificationStatus> {
    const clarifications = await statements.getTddClarifications.all(tddTaskId) as TddClarification[];

    const total = clarifications.length;
    const answered = clarifications.filter((c) => c.answered_at !== null).length;
    const pending = total - answered;
    const requiredPending = clarifications.filter(
      (c) => c.required && c.answered_at === null
    ).length;

    return {
      tdd_task_id: tddTaskId,
      total,
      answered,
      pending,
      required_pending: requiredPending,
      all_required_answered: requiredPending === 0
    };
  }

  /**
   * Check if all required clarifications have been answered
   */
  async areAllRequiredAnswered(tddTaskId: number): Promise<boolean> {
    const status = await this.getClarificationStatus(tddTaskId);
    return status.all_required_answered;
  }

  /**
   * Get answers as a record for state update
   */
  async getAnswersRecord(tddTaskId: number): Promise<Record<string, string>> {
    const clarifications = await this.getClarifications(tddTaskId);
    const answers: Record<string, string> = {};

    for (const c of clarifications) {
      if (c.user_answer) {
        answers[c.question_text] = c.user_answer;
      }
    }

    return answers;
  }

  /**
   * Delete all clarifications for a task
   */
  async deleteClarifications(tddTaskId: number): Promise<void> {
    await statements.deleteTddClarifications.run(tddTaskId);
  }

  /**
   * Format clarifications for prompt context
   */
  formatForPrompt(clarifications: ParsedClarification[]): string {
    if (clarifications.length === 0) return '';

    const lines: string[] = ['## Clarification Q&A\n'];

    for (const c of clarifications) {
      lines.push(`**Q: ${c.question_text}**`);
      if (c.user_answer) {
        lines.push(`A: ${c.user_answer}\n`);
      } else {
        lines.push('A: (pending)\n');
      }
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const ucsService = new UCSService();

export default ucsService;
