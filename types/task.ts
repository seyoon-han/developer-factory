/**
 * Task Type Definitions
 * Defines types for tasks, labels, comments, and test results
 */

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'verifying' | 'in-progress' | 'writing-tests' | 'finish';

/**
 * Represents a label that can be attached to tasks
 */
export interface Label {
  id: string;
  name: string;
  color: string;
}

/**
 * Represents a comment on a task
 */
export interface Comment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  createdAt: Date;
}

/**
 * Represents test results for a task
 */
export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

/**
 * Represents a task/card in the Kanban board
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: Label[];
  assignee?: string;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  boardId: string;
  order: number;
  linkedPR?: string;
  linkedIssue?: string;
  ciStatus?: 'pending' | 'running' | 'success' | 'failed';
  testResults?: TestResult[];
  workflowIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type guard to check if a string is a valid TaskPriority
 */
export const isValidTaskPriority = (value: string): value is TaskPriority => {
  const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  return validPriorities.includes(value as TaskPriority);
};

/**
 * Type guard to check if a string is a valid TaskStatus
 */
export const isValidTaskStatus = (value: string): value is TaskStatus => {
  const validStatuses: TaskStatus[] = ['todo', 'verifying', 'in-progress', 'writing-tests', 'finish'];
  return validStatuses.includes(value as TaskStatus);
};

/**
 * Priority levels for sorting tasks
 */
export const PRIORITY_LEVELS: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

/**
 * CI Status constants
 */
export const CI_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type CIStatus = typeof CI_STATUS[keyof typeof CI_STATUS];
