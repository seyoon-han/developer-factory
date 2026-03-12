/**
 * Agentic Dev Workflow Task Types
 * Types for the Agentic Workflow Board with multi-repo orchestration
 */

// Task Status - maps to Kanban columns
export type AgenticStatus =
  | 'todo'
  | 'brainstorming'
  | 'clarifying'
  | 'planning'
  | 'plan-review'
  | 'in-progress'
  | 'verifying'
  | 'done';

// Internal workflow phase - must match database CHECK constraint
export type AgenticPhase =
  | 'idle'                    // Initial state (DB: idle)
  | 'todo'                    // Legacy/UI alias for idle
  | 'brainstorming'
  | 'clarifying'
  | 'awaiting_clarification'  // DB value
  | 'planning'
  | 'plan_review'
  | 'awaiting_plan_review'    // DB value
  | 'in_progress'
  | 'executing'               // DB value
  | 'reviewing'               // DB value
  | 'verifying'
  | 'creating_pr'
  | 'awaiting_pr_review'
  | 'merging'
  | 'done'
  | 'complete'                // DB value
  | 'failed'
  | 'paused';

// Error handling strategies
export type ErrorHandlingStrategy = 'stop_on_error' | 'continue_on_error' | 'smart_recovery';

// Execution strategies
export type ExecutionStrategy = 'single_agent' | 'subagent_per_step' | 'batched_checkpoint';

// Code review timing
// Code review timing - must match DB CHECK constraint
export type CodeReviewPoint = 'never' | 'after_step' | 'after_batch' | 'before_verification';

// Priority levels
export type AgenticPriority = 'low' | 'medium' | 'high' | 'urgent';

// Log types
export type AgenticLogType = 'info' | 'progress' | 'tool' | 'error' | 'success' | 'warning';

// Plan step status
export type PlanStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

// Review status
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_changes';

// Worktree status
export type WorktreeStatus = 'created' | 'active' | 'pr_created' | 'merged' | 'rolled_back' | 'deleted';

// PR status
export type PRStatus = 'draft' | 'open' | 'approved' | 'merged' | 'closed' | 'rolled_back';

// Verification status
export type VerificationStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

// Clarification question type
export type ClarificationQuestionType = 'text' | 'choice' | 'multi_choice' | 'boolean';

/**
 * MCP Server config for a task
 */
export interface TaskMCPConfig {
  serverId: number;
  serverName: string;
  enabled: boolean;
  customConfig?: Record<string, unknown>;
}

/**
 * Verification command configuration
 */
export interface VerificationCommand {
  id: string;
  name: string;
  command: string;
  projectId?: number;
  required: boolean;
  timeout?: number;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCost?: number;
}

/**
 * Main Agentic Task interface
 */
export interface AgenticTask {
  id: number;
  title: string;
  description?: string;
  status: AgenticStatus;
  currentPhase: AgenticPhase;
  priority: TaskPriority;

  projectGroupId?: number;

  // Brainstorming context - analysis, recommendations, reasoning from brainstorming phase
  brainstormingContext?: string;

  // Configuration
  autoAdvance: boolean;
  errorHandling: ErrorHandlingStrategy;
  executionStrategy: ExecutionStrategy;
  codeReviewPoint: CodeReviewPoint;

  // Parsed configurations
  mcpServersConfig?: TaskMCPConfig[];
  verificationCommands?: string[];
  referenceTaskIds?: number[];
  globalDocumentIds?: number[];

  // Progress tracking
  currentStepIndex?: number;
  totalSteps?: number;

  // Token tracking
  tokenUsage?: TokenUsage;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;

  createdAt: string;
  updatedAt: string;
}

/**
 * Task priority (alias for AgenticPriority)
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Data for creating a new task
 */
export interface TaskCreationData {
  title: string;
  description?: string;
  priority: TaskPriority;
  projectGroupId: number;
  autoAdvance?: boolean;
  errorHandling?: ErrorHandlingStrategy;
  executionStrategy?: ExecutionStrategy;
  codeReviewPoint?: CodeReviewPoint;
  mcpServersConfig?: { name: string; command: string; args: string[] }[];
  verificationCommands?: string[];
  referenceTaskIds?: number[];
  globalDocumentIds?: number[];
  referenceTaskDocIds?: number[];
  uploadedFiles?: File[];
}

/**
 * Database row format for AgenticTask
 */
export interface AgenticTaskRow {
  id: number;
  title: string;
  description: string | null;
  status: AgenticStatus;
  phase: AgenticPhase;
  priority: AgenticPriority;
  project_group_id: number | null;
  brainstorming_context: string | null;
  auto_advance: number;
  error_handling: ErrorHandlingStrategy;
  execution_strategy: ExecutionStrategy;
  code_review_point: CodeReviewPoint;
  mcp_servers_config: string | null;
  verification_commands: string | null;
  reference_task_ids: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  created_at: string;
  updated_at: string;
}

/**
 * Clarification question
 */
export interface AgenticClarification {
  id: number;
  taskId: number;
  question: string; // Alias for questionText for UI convenience
  questionText: string;
  questionType: ClarificationQuestionType;
  suggestedOptions: string[];
  userAnswer?: string;
  answerType?: string;
  answeredAt?: string;
  required: boolean;
  orderIndex: number;
  createdAt: string;
}

/**
 * Database row format for AgenticClarification
 */
export interface AgenticClarificationRow {
  id: number;
  task_id: number;
  question_text: string;
  question_type: ClarificationQuestionType;
  suggested_options: string | null;
  user_answer: string | null;
  answer_type: string | null;
  answered_at: string | null;
  required: number;
  order_index: number;
  created_at: string;
}

/**
 * Parsed clarification with options array
 */
export interface ParsedAgenticClarification extends Omit<AgenticClarificationRow, 'suggested_options'> {
  suggested_options: string[];
}

/**
 * User answer for clarification
 */
export interface UserAnswer {
  value: string;
  selectedOptions?: string[];
  customText?: string;
}

// Plan status
export type PlanStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

/**
 * Implementation plan
 */
export interface AgenticPlan {
  id: number;
  taskId: number;
  planOverview: string;
  goal?: string;
  architecture?: string;
  techStack?: string;
  planContent: string;
  planSteps: AgenticPlanStep[];
  steps?: AgenticPlanStep[]; // Alias for planSteps for UI convenience
  userModified: boolean;
  status: PlanStatus;
  approvedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for AgenticPlan
 */
export interface AgenticPlanRow {
  id: number;
  task_id: number;
  plan_overview: string;
  goal: string | null;
  architecture: string | null;
  tech_stack: string | null;
  plan_content: string;
  plan_steps: string;
  user_modified: number;
  status?: PlanStatus; // Optional as it might not exist in DB
  approved?: number;   // SQLite/Postgres often use 0/1 for boolean
  approved_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Plan step
 */
export interface AgenticPlanStep {
  id: number;
  planId: number;
  order: number;
  title: string;
  description: string;
  estimatedComplexity?: 'low' | 'medium' | 'high';
  filePaths?: string[];
  status: PlanStepStatus;
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
  reviewStatus?: ReviewStatus;
  reviewNotes?: string;
}

/**
 * Database row format for AgenticPlanStep
 */
export interface AgenticPlanStepRow {
  id: number;
  plan_id: number;
  step_order: number;
  step_title: string;
  step_description: string;
  estimated_complexity: string | null;
  file_paths: string | null;
  status: PlanStepStatus;
  started_at: string | null;
  completed_at: string | null;
  output: string | null;
  error: string | null;
  review_status: ReviewStatus | null;
  review_notes: string | null;
}

/**
 * Git worktree
 */
export interface AgenticWorktree {
  id: number;
  taskId: number;
  projectId: number;
  worktreePath: string;
  branchName: string;
  baseBranch: string;
  status: WorktreeStatus;
  createdAt: string;
  mergedAt?: string;
  deletedAt?: string;
}

/**
 * Database row format for AgenticWorktree
 */
export interface AgenticWorktreeRow {
  id: number;
  task_id: number;
  project_id: number;
  worktree_path: string;
  branch_name: string;
  base_branch: string;
  status: WorktreeStatus;
  created_at: string;
  merged_at: string | null;
  deleted_at: string | null;
}

/**
 * Pull request
 */
export interface AgenticPullRequest {
  id: number;
  taskId: number;
  prGroupId: string;
  projectId: number;
  worktreeId: number;
  prNumber?: number;
  prUrl?: string;
  prTitle?: string;
  prBody?: string;
  prStatus: PRStatus;
  mergedAt?: string;
  rollbackBranch?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for AgenticPullRequest
 */
export interface AgenticPullRequestRow {
  id: number;
  task_id: number;
  pr_group_id: string;
  project_id: number;
  worktree_id: number;
  pr_number: number | null;
  pr_url: string | null;
  pr_title: string | null;
  pr_body: string | null;
  pr_status: PRStatus;
  merged_at: string | null;
  rollback_branch: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Verification result
 */
export interface AgenticVerification {
  id: number;
  taskId: number;
  checkName: string;
  checkCommand: string;
  projectId?: number;
  status: VerificationStatus;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
  executedAt?: string;
}

/**
 * Database row format for AgenticVerification
 */
export interface AgenticVerificationRow {
  id: number;
  task_id: number;
  check_name: string;
  check_command: string;
  project_id: number | null;
  status: VerificationStatus;
  exit_code: number | null;
  stdout: string | null;
  stderr: string | null;
  duration_ms: number | null;
  executed_at: string | null;
}

/**
 * Execution log entry
 */
export interface AgenticLogEntry {
  id: number;
  taskId: number;
  phase: string;
  stepId?: number;
  logType: AgenticLogType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Log level for UI display
 */
export type AgenticLogLevel = 'info' | 'warning' | 'error' | 'debug' | 'success';

/**
 * Simplified log for UI display
 */
export interface AgenticLog {
  id?: number;
  taskId: number;
  phase?: AgenticPhase;
  level: AgenticLogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Database row format for AgenticLogEntry
 */
export interface AgenticLogEntryRow {
  id: number;
  task_id: number;
  phase: string;
  step_id: number | null;
  log_type: AgenticLogType;
  message: string;
  metadata: string | null;
  created_at: string;
}

/**
 * Project Group
 */
export interface ProjectGroup {
  id: number;
  name: string;
  description?: string;
  baseBranch?: string;
  isDefault: boolean;
  projectCount?: number;
  projects?: ProjectGroupMember[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for ProjectGroup
 */
export interface ProjectGroupRow {
  id: number;
  name: string;
  description: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

/**
 * Project Group Member
 */
export interface ProjectGroupMember {
  id: number;
  groupId: number;
  projectId: number;
  isPrimary: boolean;
  project?: {
    id: number;
    name: string;
    localPath: string;
    gitRemoteUrl: string;
    gitBranch: string;
  };
  createdAt: string;
}

/**
 * Database row format for ProjectGroupMember with joined project
 */
export interface ProjectGroupMemberRow {
  id: number;
  group_id: number;
  project_id: number;
  is_primary: number;
  project_name?: string;
  local_path?: string;
  git_remote_url?: string;
  git_branch?: string;
  created_at: string;
}

/**
 * Global Document
 */
export interface GlobalDocument {
  id: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  category: string;
  tags?: string[];
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for GlobalDocument
 */
export interface GlobalDocumentRow {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  description: string | null;
  category: string;
  tags: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Task History Archive
 */
export interface AgenticTaskHistory {
  id: number;
  taskId: number;
  archivedData: Record<string, unknown>;
  contextSummary?: string;
  finalStatus: AgenticStatus;
  prGroupInfo?: Record<string, unknown>;
  rollbackInfo?: Record<string, unknown>;
  archivedAt: string;
}

/**
 * Database row format for AgenticTaskHistory
 */
export interface AgenticTaskHistoryRow {
  id: number;
  task_id: number;
  archived_data: string;
  context_summary: string | null;
  final_status: AgenticStatus;
  pr_group_info: string | null;
  rollback_info: string | null;
  archived_at: string;
}

/**
 * Slack Notification Config
 */
export interface SlackNotificationConfig {
  id: number;
  projectGroupId?: number;
  webhookUrl: string;
  notifyPhaseChanges: boolean;
  notifyUserAction: boolean;
  notifyCompletion: boolean;
  notifyErrors: boolean;
  includeTokenUsage: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for SlackNotificationConfig
 */
export interface SlackNotificationConfigRow {
  id: number;
  project_group_id: number | null;
  webhook_url: string;
  notify_phase_changes: number;
  notify_user_action: number;
  notify_completion: number;
  notify_errors: number;
  include_token_usage: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Board Visibility
 */
export interface BoardVisibility {
  id: number;
  boardName: string;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for BoardVisibility
 */
export interface BoardVisibilityRow {
  id: number;
  board_name: string;
  is_visible: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Kanban Column definition
 */
export interface AgenticColumn {
  id: AgenticStatus;
  title: string;
  order: number;
  color: string;
  description?: string;
}

/**
 * Default columns configuration
 */
export const AGENTIC_COLUMNS: AgenticColumn[] = [
  { id: 'todo', title: 'Backlog', order: 0, color: 'zinc', description: 'Tasks ready to start' },
  { id: 'brainstorming', title: 'Brainstorming', order: 1, color: 'amber', description: 'AI analyzing requirements' },
  { id: 'clarifying', title: 'Clarifying', order: 2, color: 'yellow', description: 'Awaiting user answers' },
  { id: 'planning', title: 'Planning', order: 3, color: 'blue', description: 'Generating implementation plan' },
  { id: 'plan-review', title: 'Plan Review', order: 4, color: 'indigo', description: 'Review and edit plan' },
  { id: 'in-progress', title: 'Implementing', order: 5, color: 'green', description: 'Executing plan steps' },
  { id: 'verifying', title: 'Verifying', order: 6, color: 'purple', description: 'Running verification checks' },
  { id: 'done', title: 'Done', order: 7, color: 'emerald', description: 'Completed and verified' },
];

/**
 * Task creation wizard step data
 */
export interface TaskCreationData {
  // Step 1: Basic Info
  title: string;
  description: string;
  priority: AgenticPriority;

  // Step 2: Project Group
  projectGroupId?: number;

  // Step 3: Documents
  globalDocumentIds: number[];
  uploadedFiles: File[];
  referenceTaskDocIds: number[];

  // Step 4: Reference Past Tasks
  referenceTaskIds: number[];

  // Step 5: MCP Server Configuration
  mcpServersConfig: TaskMCPConfig[];

  // Step 6: Verification Commands
  verificationCommands: VerificationCommand[];

  // Step 7: Workflow Options
  autoAdvance: boolean;
  errorHandling: ErrorHandlingStrategy;
  executionStrategy: ExecutionStrategy;
  codeReviewPoint: CodeReviewPoint;
}

/**
 * Default task creation data
 */
export const DEFAULT_TASK_CREATION_DATA: TaskCreationData = {
  title: '',
  description: '',
  priority: 'medium',
  projectGroupId: undefined,
  globalDocumentIds: [],
  uploadedFiles: [],
  referenceTaskDocIds: [],
  referenceTaskIds: [],
  mcpServersConfig: [],
  verificationCommands: [],
  autoAdvance: true,
  errorHandling: 'smart_recovery',
  executionStrategy: 'subagent_per_step',
  codeReviewPoint: 'before_verification',
};

/**
 * Helper to convert DB row to AgenticTask
 */
export function rowToAgenticTask(row: AgenticTaskRow): AgenticTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    currentPhase: row.phase,
    priority: row.priority,
    projectGroupId: row.project_group_id || undefined,
    brainstormingContext: row.brainstorming_context || undefined,
    autoAdvance: row.auto_advance === 1,
    errorHandling: row.error_handling,
    executionStrategy: row.execution_strategy,
    codeReviewPoint: row.code_review_point,
    mcpServersConfig: row.mcp_servers_config ? JSON.parse(row.mcp_servers_config) : undefined,
    verificationCommands: row.verification_commands ? JSON.parse(row.verification_commands) : undefined,
    referenceTaskIds: row.reference_task_ids ? JSON.parse(row.reference_task_ids) : undefined,
    totalInputTokens: row.total_input_tokens,
    totalOutputTokens: row.total_output_tokens,
    totalCostUsd: row.total_cost_usd,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Helper to convert DB row to AgenticClarification
 */
export function rowToAgenticClarification(row: AgenticClarificationRow): AgenticClarification {
  return {
    id: row.id,
    taskId: row.task_id,
    questionText: row.question_text,
    questionType: row.question_type,
    suggestedOptions: row.suggested_options ? JSON.parse(row.suggested_options) : [],
    userAnswer: row.user_answer || undefined,
    answerType: row.answer_type || undefined,
    answeredAt: row.answered_at || undefined,
    required: row.required === 1,
    orderIndex: row.order_index,
    createdAt: row.created_at,
  };
}

/**
 * Helper to convert DB row to ProjectGroup
 */
export function rowToProjectGroup(row: ProjectGroupRow): ProjectGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Helper to convert DB row to GlobalDocument
 */
export function rowToGlobalDocument(row: GlobalDocumentRow): GlobalDocument {
  return {
    id: row.id,
    filename: row.filename,
    originalFilename: row.original_filename,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    description: row.description || undefined,
    category: row.category,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    uploadedBy: row.uploaded_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
