/**
 * TDD Task Types
 * Types for the TDD Agentic Development Board
 */

// TDD Status - maps to Kanban columns
export type TddStatus =
  | 'backlog'
  | 'spec_elicitation'
  | 'awaiting_clarification'
  | 'test_generation'
  | 'implementation_draft'
  | 'code_refinement'
  | 'done';

// TDD Phase - internal workflow phase
export type TddPhase =
  | 'spec_elicitation'
  | 'awaiting_clarification'
  | 'red_phase'
  | 'green_phase'
  | 'refactor_phase'
  | 'verification'
  | 'complete';

// Test result phase (RED/GREEN/REFACTOR)
export type TddTestPhase = 'red' | 'green' | 'refactor';

// TDD Task interface
export interface TddTask {
  id: number;
  task_id: number;
  tdd_status: TddStatus;
  specification: string | null;
  acceptance_criteria: string | null;
  test_code: string | null;
  implementation_code: string | null;
  test_results: string | null;
  tdd_cycle_count: number;
  current_phase: TddPhase;
  created_at: string;
  updated_at: string;
}

// TDD Task with joined main task info
export interface TddTaskWithDetails extends TddTask {
  title: string;
  description: string | null;
  priority: string;
  board_id: string;
  assignee: string | null;
}

// TDD Task creation input
export interface CreateTddTaskInput {
  task_id: number;
  tdd_status?: TddStatus;
  current_phase?: TddPhase;
}

// TDD Task update input
export interface UpdateTddTaskInput {
  tdd_status?: TddStatus;
  current_phase?: TddPhase;
  specification?: string;
  acceptance_criteria?: string;
  test_code?: string;
  implementation_code?: string;
  test_results?: string;
}

// TDD Column definition for Kanban
export interface TddColumn {
  id: TddStatus;
  title: string;
  order: number;
  color: string;
  description?: string;
}

// Default TDD columns configuration
export const TDD_COLUMNS: TddColumn[] = [
  {
    id: 'backlog',
    title: 'TDD Backlog',
    order: 0,
    color: 'gray',
    description: 'Tasks waiting to start TDD process'
  },
  {
    id: 'spec_elicitation',
    title: 'Specification Elicitation',
    order: 1,
    color: 'blue',
    description: 'AI generating clarifying questions'
  },
  {
    id: 'awaiting_clarification',
    title: 'Awaiting User Clarification',
    order: 2,
    color: 'yellow',
    description: 'Paused - waiting for user answers'
  },
  {
    id: 'test_generation',
    title: 'Test Generation (RED)',
    order: 3,
    color: 'red',
    description: 'Writing failing tests first'
  },
  {
    id: 'implementation_draft',
    title: 'Implementation Draft (GREEN)',
    order: 4,
    color: 'green',
    description: 'Writing minimal code to pass tests'
  },
  {
    id: 'code_refinement',
    title: 'Code Refinement/Review',
    order: 5,
    color: 'purple',
    description: 'Refactoring and code review'
  },
  {
    id: 'done',
    title: 'Done (Tests Passing)',
    order: 6,
    color: 'emerald',
    description: 'All tests passing, verified complete'
  }
];

// TDD Board definition
export interface TddBoard {
  id: string;
  name: string;
  description: string;
  columns: TddColumn[];
  created_at: string;
  updated_at: string;
}

// Default TDD Board
export const DEFAULT_TDD_BOARD: Omit<TddBoard, 'created_at' | 'updated_at'> = {
  id: 'tdd-board-default',
  name: 'TDD Development Board',
  description: 'Test-Driven Development workflow with strict RED-GREEN-REFACTOR cycle',
  columns: TDD_COLUMNS
};
