/**
 * Board Type Definitions
 * Defines types for Kanban board structure and columns
 */

export type ColumnId = 'todo' | 'verifying' | 'in-progress' | 'writing-tests' | 'finish';

/**
 * Represents a single column in the Kanban board
 */
export interface Column {
  id: ColumnId;
  title: string;
  order: number;
  wipLimit?: number;
}

/**
 * Represents the entire Kanban board
 */
export interface Board {
  id: string;
  name: string;
  description?: string;
  columns: Column[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type guard to check if a string is a valid ColumnId
 */
export const isValidColumnId = (value: string): value is ColumnId => {
  const validColumns: ColumnId[] = ['todo', 'verifying', 'in-progress', 'writing-tests', 'finish'];
  return validColumns.includes(value as ColumnId);
};
