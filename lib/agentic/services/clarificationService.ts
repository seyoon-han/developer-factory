/**
 * Clarification Service
 * Handles clarification Q&A during brainstorming phase
 */

import { statements } from '@/lib/db/postgres';
import {
  AgenticClarification,
  AgenticClarificationRow,
  ParsedAgenticClarification,
  UserAnswer,
  ClarificationQuestionType,
  rowToAgenticClarification,
} from '@/types/agentic-task';
import { taskContextService } from './taskContextService';

export interface ClarificationQuestion {
  text: string;
  type: ClarificationQuestionType;
  suggestedOptions: string[];
  required: boolean;
}

export interface ClarificationStatus {
  taskId: number;
  total: number;
  answered: number;
  pending: number;
  requiredPending: number;
  allRequiredAnswered: boolean;
}

export class ClarificationService {
  /**
   * Create multiple clarification questions
   */
  async createClarifications(
    taskId: number,
    questions: ClarificationQuestion[]
  ): Promise<AgenticClarification[]> {
    console.log(`[ClarificationService] Creating ${questions.length} clarifications for task ${taskId}`);
    const clarifications: AgenticClarification[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`[ClarificationService] Creating clarification ${i + 1}:`, {
        text: question.text.substring(0, 50),
        type: question.type,
        optionCount: question.suggestedOptions?.length || 0,
        options: question.suggestedOptions
      });

      const result = await statements.createAgenticClarification.run(
        taskId,
        question.text,
        question.type,
        JSON.stringify(question.suggestedOptions),
        question.required ? 1 : 0,
        i
      );

      const row = await statements.getAgenticClarification.get(
        result.lastInsertRowid
      ) as AgenticClarificationRow;

      const clarification = rowToAgenticClarification(row);
      console.log(`[ClarificationService] Created clarification ID ${clarification.id}, stored options:`, clarification.suggestedOptions);
      clarifications.push(clarification);
    }

    console.log(`[ClarificationService] ✅ Created ${clarifications.length} clarifications`);
    return clarifications;
  }

  /**
   * Get all clarifications for a task
   */
  async getClarifications(taskId: number): Promise<AgenticClarification[]> {
    const rows = await statements.getAgenticClarifications.all(taskId) as AgenticClarificationRow[];
    return rows.map(rowToAgenticClarification);
  }

  /**
   * Alias for getClarifications
   */
  async getClarificationsForTask(taskId: number): Promise<AgenticClarification[]> {
    return this.getClarifications(taskId);
  }

  /**
   * Get unanswered clarifications for a task
   */
  async getUnansweredClarifications(taskId: number): Promise<AgenticClarification[]> {
    const rows = await statements.getUnansweredAgenticClarifications.all(taskId) as AgenticClarificationRow[];
    return rows.map(rowToAgenticClarification);
  }

  /**
   * Submit answer for a single clarification
   */
  async submitAnswer(clarificationId: number, answer: UserAnswer): Promise<AgenticClarification> {
    console.log(`[ClarificationService] Submitting answer for clarification ${clarificationId}`);
    console.log(`[ClarificationService] Answer:`, JSON.stringify(answer));
    
    const answerValue = answer.customText || answer.value;
    const answerType = answer.selectedOptions?.length
      ? 'selected'
      : answer.customText
      ? 'custom'
      : 'text';

    console.log(`[ClarificationService] Answer value: "${answerValue?.substring(0, 100)}...", type: ${answerType}`);
    
    try {
      await statements.answerAgenticClarification.run(answerValue, answerType, clarificationId);
      console.log(`[ClarificationService] ✅ Answer saved to database`);
    } catch (error) {
      console.error(`[ClarificationService] ❌ Failed to save answer:`, error);
      throw error;
    }

    const row = await statements.getAgenticClarification.get(clarificationId) as AgenticClarificationRow;
    if (!row) {
      console.error(`[ClarificationService] ❌ Could not find clarification ${clarificationId} after update`);
      throw new Error(`Clarification ${clarificationId} not found`);
    }
    
    const clarification = rowToAgenticClarification(row);
    console.log(`[ClarificationService] ✅ Answer submitted, clarification updated:`, {
      id: clarification.id,
      answered: !!clarification.userAnswer
    });
    
    return clarification;
  }

  /**
   * Submit answers for multiple clarifications
   */
  async submitBatchAnswers(
    answers: Record<number, UserAnswer>
  ): Promise<AgenticClarification[]> {
    const results: AgenticClarification[] = [];

    for (const [clarificationIdStr, answer] of Object.entries(answers)) {
      const clarificationId = parseInt(clarificationIdStr, 10);
      const result = await this.submitAnswer(clarificationId, answer);
      results.push(result);
    }

    // Update the task context file with all clarifications
    if (results.length > 0) {
      const taskId = results[0].taskId;
      try {
        const allClarifications = await this.getClarifications(taskId);
        taskContextService.updateClarifications(
          taskId,
          allClarifications.map(c => ({
            question: c.questionText,
            answer: c.userAnswer,
            answered: !!c.userAnswer
          }))
        );
      } catch (error) {
        console.warn('[ClarificationService] Failed to update context file:', error);
      }
    }

    return results;
  }

  /**
   * Get clarification status summary for a task
   */
  async getClarificationStatus(taskId: number): Promise<ClarificationStatus> {
    const clarifications = await this.getClarifications(taskId);

    const total = clarifications.length;
    const answered = clarifications.filter(c => c.answeredAt !== undefined).length;
    const pending = total - answered;
    const requiredPending = clarifications.filter(
      c => c.required && c.answeredAt === undefined
    ).length;

    return {
      taskId,
      total,
      answered,
      pending,
      requiredPending,
      allRequiredAnswered: requiredPending === 0,
    };
  }

  /**
   * Check if all required clarifications have been answered
   */
  async areAllRequiredAnswered(taskId: number): Promise<boolean> {
    const status = await this.getClarificationStatus(taskId);
    return status.allRequiredAnswered;
  }

  /**
   * Get answers as a record for context building
   */
  async getAnswersRecord(taskId: number): Promise<Record<string, string>> {
    const clarifications = await this.getClarifications(taskId);
    const answers: Record<string, string> = {};

    for (const c of clarifications) {
      if (c.userAnswer) {
        answers[c.questionText] = c.userAnswer;
      }
    }

    return answers;
  }

  /**
   * Delete all clarifications for a task
   */
  async deleteClarifications(taskId: number): Promise<void> {
    await statements.deleteAgenticClarifications.run(taskId);
  }

  /**
   * Format clarifications for prompt context
   */
  formatForPrompt(clarifications: AgenticClarification[]): string {
    if (clarifications.length === 0) return '';

    const lines: string[] = ['## Clarification Q&A\n'];

    for (const c of clarifications) {
      lines.push(`**Q: ${c.questionText}**`);
      if (c.userAnswer) {
        lines.push(`A: ${c.userAnswer}\n`);
      } else {
        lines.push('A: (pending)\n');
      }
    }

    return lines.join('\n');
  }

  /**
   * Parse questions from AI response
   */
  parseQuestionsFromResponse(response: string): ClarificationQuestion[] {
    console.log('[ClarificationService] Parsing questions from response...');
    console.log('[ClarificationService] Response length:', response.length);
    console.log('[ClarificationService] Response preview:', response.substring(0, 500));
    
    // Strategy 1: Try to find JSON code block first (```json ... ```)
    console.log('[ClarificationService] Strategy 1: Looking for JSON code block...');
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?"questions"[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      console.log('[ClarificationService] Found code block, attempting to parse...');
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        if (Array.isArray(parsed.questions)) {
          console.log(`[ClarificationService] ✅ Parsed ${parsed.questions.length} questions from code block`);
          const questions = this.mapParsedQuestions(parsed.questions);
          console.log('[ClarificationService] Questions with options:', questions.map(q => ({
            text: q.text.substring(0, 50),
            optionCount: q.suggestedOptions.length
          })));
          return questions;
        }
      } catch (e) {
        console.error('[ClarificationService] ❌ Failed to parse JSON from code block:', e);
        console.error('[ClarificationService] Code block content:', codeBlockMatch[1].substring(0, 300));
      }
    }

    // Strategy 2: Find balanced JSON object containing "questions"
    console.log('[ClarificationService] Strategy 2: Looking for balanced JSON object...');
    const jsonObject = this.extractBalancedJson(response);
    if (jsonObject) {
      console.log('[ClarificationService] Found balanced JSON, length:', jsonObject.length);
      console.log('[ClarificationService] JSON preview:', jsonObject.substring(0, 300));
      try {
        const parsed = JSON.parse(jsonObject);
        if (Array.isArray(parsed.questions)) {
          console.log(`[ClarificationService] ✅ Parsed ${parsed.questions.length} questions from balanced JSON`);
          const questions = this.mapParsedQuestions(parsed.questions);
          console.log('[ClarificationService] Questions with options:', questions.map(q => ({
            text: q.text.substring(0, 50),
            optionCount: q.suggestedOptions.length
          })));
          return questions;
        }
      } catch (e) {
        console.error('[ClarificationService] ❌ Failed to parse extracted JSON:', e);
        console.error('[ClarificationService] JSON that failed:', jsonObject.substring(0, 500));
      }
    } else {
      console.log('[ClarificationService] No balanced JSON found');
    }

    // Strategy 3: Try to find just the questions array
    console.log('[ClarificationService] Strategy 3: Looking for questions array...');
    const arrayMatch = response.match(/\[\s*\{[\s\S]*?"text"[\s\S]*?\}\s*\]/);
    if (arrayMatch) {
      console.log('[ClarificationService] Found array, attempting to parse...');
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          console.log(`[ClarificationService] ✅ Parsed ${parsed.length} questions from array`);
          return this.mapParsedQuestions(parsed);
        }
      } catch (e) {
        console.error('[ClarificationService] ❌ Failed to parse questions array:', e);
      }
    }

    // Fallback: try to parse markdown-style questions
    console.log('[ClarificationService] Strategy 4: Fallback to markdown parsing...');
    const questions: ClarificationQuestion[] = [];
    
    // Pattern 1: Classic "Q:" or "Question:" format
    const classicPattern = /(?:^|\n)(?:\d+\.\s*)?(?:\*\*)?Q(?:uestion)?(?:\s*\d+)?[:\.]?\s*(.+?)(?:\*\*)?(?:\n|$)/gi;
    for (const match of response.matchAll(classicPattern)) {
      const text = match[1].trim();
      if (text.length > 10 && text.length < 500) {
        questions.push({ text, type: 'text', suggestedOptions: [], required: true });
      }
    }
    
    // Pattern 2: Numbered lists with **Title** - Description format
    // e.g., "1. **Tech Stack** - Frontend/backend framework choices"
    if (questions.length === 0) {
      console.log('[ClarificationService] Strategy 4b: Looking for numbered bold items...');
      const numberedBoldPattern = /(?:^|\n)\s*\d+\.\s*\*\*([^*]+)\*\*\s*[-–:]\s*(.+?)(?=\n\d+\.|\n\n|$)/gi;
      for (const match of response.matchAll(numberedBoldPattern)) {
        const title = match[1].trim();
        const description = match[2].trim();
        // Convert to question format
        const questionText = `${title}: ${description}`;
        if (questionText.length > 10 && questionText.length < 500) {
          questions.push({ text: questionText, type: 'text', suggestedOptions: [], required: true });
        }
      }
    }
    
    // Pattern 3: Lines containing question marks (explicit questions)
    if (questions.length === 0) {
      console.log('[ClarificationService] Strategy 4c: Looking for lines with question marks...');
      const lines = response.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Must have a question mark and be reasonable length
        if (trimmed.includes('?') && trimmed.length > 20 && trimmed.length < 500) {
          // Skip meta-questions about the process
          if (trimmed.toLowerCase().includes('would you like to answer') ||
              trimmed.toLowerCase().includes('shall i proceed') ||
              trimmed.toLowerCase().includes('do you want me to')) {
            continue;
          }
          // Clean up: remove leading numbers, bullets, asterisks
          const cleaned = trimmed.replace(/^[\d\.\-\*\s]+/, '').replace(/\*\*/g, '').trim();
          if (cleaned.length > 15) {
            questions.push({ text: cleaned, type: 'text', suggestedOptions: [], required: true });
          }
        }
      }
    }
    
    // Pattern 4: Numbered list items (even without bold or question marks)
    // e.g., "1. What database should be used?"
    if (questions.length === 0) {
      console.log('[ClarificationService] Strategy 4d: Looking for any numbered list items...');
      const numberedPattern = /(?:^|\n)\s*(\d+)\.\s+([^\n]{20,300})/g;
      for (const match of response.matchAll(numberedPattern)) {
        const text = match[2].trim();
        // Skip if it looks like it's describing a topic rather than asking
        if (text.toLowerCase().startsWith('the ') || 
            text.toLowerCase().startsWith('this ') ||
            text.toLowerCase().startsWith('i ')) {
          continue;
        }
        questions.push({ text, type: 'text', suggestedOptions: [], required: true });
      }
    }

    console.log(`[ClarificationService] Markdown fallback found ${questions.length} questions`);
    if (questions.length === 0) {
      console.warn('[ClarificationService] ⚠️ No questions parsed from response!');
      console.warn('[ClarificationService] Full response:', response);
    }

    return questions;
  }

  /**
   * Extract a balanced JSON object from text
   */
  private extractBalancedJson(text: string): string | null {
    // Find the start of JSON object containing "questions"
    const questionsIdx = text.indexOf('"questions"');
    if (questionsIdx === -1) return null;

    // Find the opening brace before "questions"
    let startIdx = questionsIdx;
    while (startIdx > 0 && text[startIdx] !== '{') {
      startIdx--;
    }
    if (text[startIdx] !== '{') return null;

    // Count braces to find the matching closing brace
    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }

    if (depth !== 0) return null;
    return text.slice(startIdx, endIdx + 1);
  }

  /**
   * Map parsed question objects to ClarificationQuestion format
   */
  private mapParsedQuestions(questions: any[]): ClarificationQuestion[] {
    return questions.map((q: any) => ({
      text: q.text || q.question || '',
      type: q.type || 'choice',
      suggestedOptions: q.suggestedOptions || q.options || [],
      required: q.required !== false, // default to true
    }));
  }
}

// Singleton instance
export const clarificationService = new ClarificationService();
export default clarificationService;
