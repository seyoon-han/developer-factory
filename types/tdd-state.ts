/**
 * TDD State Types
 * Types for TDD Agent state serialization and pause/resume functionality
 */

import { TddPhase } from './tdd-task';
import { ClarificationQuestion } from './clarification';

// TDD Agent State from database
export interface TddAgentStateRecord {
  id: number;
  tdd_task_id: number;
  state_file_path: string;
  checkpoint_name: string;
  agent_context: string | null; // JSON serialized context
  paused_at: string;
  resumed_at: string | null;
  is_active: boolean;
}

// Message in conversation history
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// Tool call record
export interface ToolCallRecord {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

// Full agent state for serialization
export interface TddAgentState {
  version: '1.0';
  taskId: number;
  tddTaskId: number;
  currentPhase: TddPhase;
  checkpoint: string;

  // Context preserved across pause/resume
  context: {
    specification: string;
    acceptanceCriteria: string[];
    clarificationAnswers: Record<string, string>;
    testCode: string;
    implementationCode: string;
    refactoredCode?: string;
  };

  // Agent conversation state
  agentState: {
    conversationHistory: ConversationMessage[];
    toolCallHistory: ToolCallRecord[];
    lastModelResponse: string;
    sessionId?: string;
  };

  // Timing information
  pausedAt: string;
  pauseReason: string;
  pendingQuestions: ClarificationQuestion[];

  // TDD cycle information
  cycleCount: number;
  testResults?: {
    passed: number;
    failed: number;
    skipped: number;
    output: string;
  };
}

// State checkpoint types
export type StateCheckpoint =
  | 'spec_elicitation_start'
  | 'spec_elicitation_questions'
  | 'awaiting_clarification'
  | 'red_phase_start'
  | 'red_phase_test_written'
  | 'red_phase_verified_failing'
  | 'green_phase_start'
  | 'green_phase_impl_written'
  | 'green_phase_verified_passing'
  | 'refactor_phase_start'
  | 'refactor_phase_complete'
  | 'verification_start'
  | 'verification_complete';

// State file metadata
export interface StateFileMetadata {
  taskId: number;
  tddTaskId: number;
  checkpoint: StateCheckpoint;
  createdAt: string;
  filePath: string;
  fileSize: number;
}

// Save state input
export interface SaveStateInput {
  tddTaskId: number;
  checkpoint: StateCheckpoint;
  state: TddAgentState;
}

// Load state result
export interface LoadStateResult {
  success: boolean;
  state?: TddAgentState;
  metadata?: StateFileMetadata;
  error?: string;
}

// Pause execution request
export interface PauseExecutionRequest {
  tddTaskId: number;
  reason: string;
  questions: ClarificationQuestion[];
  currentState: Partial<TddAgentState>;
}

// Resume execution request
export interface ResumeExecutionRequest {
  tddTaskId: number;
  stateId: number;
  answers: Record<string, string>;
}

// State management configuration
export interface StateManagerConfig {
  stateDirectory: string;
  maxStatesPerTask: number;
  cleanupOldStates: boolean;
}

// Default state manager configuration
export const DEFAULT_STATE_CONFIG: StateManagerConfig = {
  stateDirectory: '/app/data/tdd-state',
  maxStatesPerTask: 10,
  cleanupOldStates: true
};
