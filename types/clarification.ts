/**
 * Clarification Types
 * Types for the User Clarification Service (UCS)
 */

// Question types for clarifications
export type ClarificationQuestionType = 'text' | 'choice' | 'multi_choice' | 'boolean';

// TDD Clarification from database
export interface TddClarification {
  id: number;
  tdd_task_id: number;
  question_text: string;
  question_type: ClarificationQuestionType;
  suggested_options: string | null; // JSON array of options
  user_answer: string | null;
  answer_type: string | null;
  answered_at: string | null;
  agent_state_id: number | null;
  required: boolean;
  order_index: number;
  created_at: string;
}

// Parsed clarification with options
export interface ParsedClarification extends Omit<TddClarification, 'suggested_options'> {
  suggested_options: string[];
}

// Clarification question to be created
export interface ClarificationQuestion {
  text: string;
  type: ClarificationQuestionType;
  suggestedOptions?: string[];
  context?: string;
  required: boolean;
}

// User answer to clarification
export interface UserAnswer {
  value: string;
  selectedOptions?: string[];
  customText?: string;
}

// Create clarification input
export interface CreateClarificationInput {
  tdd_task_id: number;
  question_text: string;
  question_type: ClarificationQuestionType;
  suggested_options?: string[];
  required?: boolean;
  order_index?: number;
  agent_state_id?: number;
}

// Submit answer input
export interface SubmitAnswerInput {
  clarification_id: number;
  answer: UserAnswer;
}

// Batch submit answers
export interface BatchSubmitAnswersInput {
  tdd_task_id: number;
  answers: Record<number, UserAnswer>; // clarification_id -> answer
}

// AI-generated question context
export interface QuestionGenerationContext {
  taskId: number;
  title: string;
  description: string;
  existingSpecification?: string;
  previousAnswers?: Record<string, string>;
}

// AI-generated question result
export interface GeneratedQuestion {
  text: string;
  type: ClarificationQuestionType;
  suggestedOptions?: string[];
  context: string;
  required: boolean;
  category: 'edge_case' | 'input_output' | 'performance' | 'integration' | 'acceptance';
}

// Question generation result
export interface QuestionGenerationResult {
  success: boolean;
  questions: GeneratedQuestion[];
  error?: string;
}

// Clarification status summary
export interface ClarificationStatus {
  tdd_task_id: number;
  total: number;
  answered: number;
  pending: number;
  required_pending: number;
  all_required_answered: boolean;
}
