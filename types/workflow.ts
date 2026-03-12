/**
 * BMAD v6 Alpha Workflow Type Definitions
 * 
 * Type definitions for custom workflow builder that integrates with
 * BMAD (Breakthrough Method for Agile AI-Driven Development) v6.0.0-alpha
 */

// ============================================
// Framework Types
// ============================================

export type WorkflowFramework = 'bmad' | 'amplifier';

export const WORKFLOW_FRAMEWORKS: { value: WorkflowFramework; label: string; description: string }[] = [
  {
    value: 'bmad',
    label: 'BMAD v6',
    description: 'Multi-agent Agile development with 50+ workflows (Planning + Build phases)',
  },
  {
    value: 'amplifier',
    label: 'MS Amplifier',
    description: 'Document-driven development with specialized agents (Microsoft)',
  },
];

// ============================================
// Core Workflow Types
// ============================================

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nlInput: string;                    // Original natural language description
  framework: WorkflowFramework;       // NEW: BMAD or Amplifier
  yamlDefinition: string;             // BMAD v6 YAML or Amplifier config
  commandFile: string;                // Claude command markdown
  category: WorkflowCategory;
  status: WorkflowStatus;
  version: number;
  tags?: string[];
  icon?: string;                      // Lucide icon name
  metadata?: WorkflowMetadata;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export type WorkflowCategory = 
  | 'development'
  | 'testing'
  | 'deployment'
  | 'documentation'
  | 'code-review'
  | 'custom';

export type WorkflowStatus = 
  | 'draft'
  | 'active'
  | 'archived';

export interface WorkflowMetadata {
  executionCount?: number;
  lastExecutionAt?: number;
  successRate?: number;
  averageDuration?: number;
  estimatedDuration?: number;
  complexity?: 'simple' | 'medium' | 'complex';
  
  // Framework-specific metadata
  bmadVersion?: string;               // e.g., "6.0.0-alpha"
  amplifierVersion?: string;          // e.g., "1.0.0"
  frameworkFeatures?: string[];       // Framework-specific features used
}

// ============================================
// Workflow Execution Types (v6 compatible)
// ============================================

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  result?: string;
  logs?: ExecutionLog[];
  error?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  manifestId?: string;                // Link to execution manifest (v6)
}

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled';

export interface ExecutionLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  phase?: 'planning' | 'build';       // v6 two-phase
  agent?: string;
  metadata?: Record<string, any>;
}

// ============================================
// v6 Alpha: Execution Manifest Types
// ============================================

export interface ExecutionManifest {
  id: string;
  workflowId: string;
  workflowVersion: number;
  executionId: string;
  timestamp: number;
  
  // Inputs
  inputs: Record<string, any>;
  
  // Phases (v6 two-phase structure)
  phases: {
    planning?: PhaseExecution;
    build?: PhaseExecution;
  };
  
  // Execution configuration
  execution: {
    modelVersion: string;
    seed?: number;
    profile: 'fast-draft' | 'high-quality' | 'offline';
    deterministic: boolean;
  };
  
  // Metrics
  metrics: ExecutionMetrics;
  
  // Outputs
  outputs: Record<string, any>;
  
  // Reproducibility
  reproducible: boolean;
}

export interface PhaseExecution {
  agents: string[];
  outputs: Record<string, string>;    // output_name -> file_path
  duration: number;                   // milliseconds
  tokenUsage: number;
  toolCalls: number;
  status: ExecutionStatus;
}

export interface ExecutionMetrics {
  totalDuration: number;              // milliseconds
  totalTokens: number;
  totalCost?: number;                 // USD
  totalToolCalls: number;
  
  // Per-phase breakdown
  planning?: PhaseMetrics;
  build?: PhaseMetrics;
  
  // Budget tracking
  budgets?: {
    tokens: { used: number; total: number; };
    time: { used: number; total: number; };
    cost: { used: number; total: number; };
  };
}

export interface PhaseMetrics {
  duration: number;
  tokens: number;
  toolCalls: number;
  cost?: number;
}

// ============================================
// Workflow Definition Types (Internal)
// ============================================

export interface WorkflowDefinition {
  name: string;
  description: string;
  steps: WorkflowStep[];
  agents: string[];
  tools: string[];
  
  // v6: Two-phase structure
  phases?: {
    planning?: PhaseDefinition;
    build?: PhaseDefinition;
  };
  
  // v6: Execution configuration
  execution?: ExecutionConfig;
  
  // v6: Policies
  policies?: PolicyConfig;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: StepType;
  agent: string;                      // BMAD agent role
  tool: string;                       // Claude tool
  command?: string;                   // Optional command to run
  input?: string;                     // Input variable reference
  output?: string;                    // Output variable name
  next?: string | string[];           // Next step(s)
  condition?: string;                 // For decision steps
  parallel?: string;                  // Parallel group ID
  dependsOn?: string | string[];      // Dependencies
}

export type StepType = 
  | 'action'
  | 'decision'
  | 'parallel'
  | 'loop';

// ============================================
// v6 Alpha: Phase Definition Types
// ============================================

export interface PhaseDefinition {
  required: boolean;
  description?: string;
  agents: AgentDefinition[];
  outputs?: Record<string, string>;   // output_name -> file_path
  validation?: string[];              // Success criteria
  dependsOn?: string;                 // Previous phase
  inputs?: Record<string, string>;    // Input references
}

export interface AgentDefinition {
  name: string;
  role: string;
  tools: string[];
  inputContract?: ContractDefinition;
  outputContract?: ContractDefinition;
  constraints?: Record<string, any>;
  budget?: AgentBudget;
  dependsOn?: string;                 // Previous agent in phase
}

export interface ContractDefinition {
  type: string;
  format?: string;
  schema?: string;
  validation?: 'required' | 'optional';
}

export interface AgentBudget {
  tokens?: number;
  time?: number;                      // milliseconds
  toolCalls?: number;
}

// ============================================
// v6 Alpha: Execution Configuration
// ============================================

export interface ExecutionConfig {
  deterministic: boolean;
  reproducible: boolean;
  captureManifest: boolean;
  manifestPath?: string;
  
  modelAdapter: ModelAdapter;
  toolAdapters?: ToolAdapter[];
  
  observability?: ObservabilityConfig;
  budgets?: BudgetConfig;
}

export interface ModelAdapter {
  provider: 'anthropic' | 'openai' | 'local' | 'deepseek';
  model: string;
  profile: 'fast-draft' | 'high-quality' | 'offline';
  temperature?: number;
  seed?: number;
  apiKey?: string;
}

export interface ToolAdapter {
  name: string;
  type: 'search' | 'code' | 'browser' | 'vector-db';
  config: Record<string, any>;
}

export interface ObservabilityConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  structuredLogs: boolean;
  traceTools: boolean;
  trackTokens: boolean;
  trackTime: boolean;
  exportFormat: 'json' | 'yaml';
  exportPath?: string;
}

export interface BudgetConfig {
  global?: Budget;
  perAgent?: Record<string, Budget>;
}

export interface Budget {
  tokens: number;
  time: number;                       // milliseconds
  cost?: number;                      // USD
}

// ============================================
// v6 Alpha: Policy Configuration
// ============================================

export interface PolicyConfig {
  fileWrite?: FileWritePolicy;
  network?: NetworkPolicy;
  dataBoundaries?: DataBoundariesPolicy;
  tools?: ToolsPolicy;
  directories?: DirectoriesPolicy;
  licenses?: LicensesPolicy;
}

export interface FileWritePolicy {
  mode: 'allowlist' | 'denylist';
  allowed?: string[];                 // Glob patterns
  denied?: string[];                  // Glob patterns
}

export interface NetworkPolicy {
  mode: 'allowlist' | 'denylist';
  allowedDomains?: string[];
  deniedDomains?: string[];
}

export interface DataBoundariesPolicy {
  canAccessPII: boolean;
  canAccessSecrets: boolean;
  canAccessCredentials: boolean;
}

export interface ToolsPolicy {
  allowed?: string[];
  denied?: string[];
  perTool?: Record<string, ToolConfig>;
}

export interface ToolConfig {
  allowedCommands?: string[];         // For bash tool
  deniedCommands?: string[];
  timeout?: number;
}

export interface DirectoriesPolicy {
  readOnly?: string[];
  noAccess?: string[];
}

export interface LicensesPolicy {
  check: boolean;
  allowedLicenses?: string[];
  deniedLicenses?: string[];
}

// ============================================
// Skill Execution Types (from existing system)
// ============================================

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

// ============================================
// API Request/Response Types
// ============================================

export interface GenerateWorkflowRequest {
  description: string;
  category?: WorkflowCategory;
  tags?: string[];
}

export interface GenerateWorkflowResponse {
  success: boolean;
  workflow?: WorkflowDefinition & {
    yamlDefinition: string;
    commandFile: string;
  };
  error?: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description: string;
  nlInput: string;
  framework?: WorkflowFramework;
  yamlDefinition: string;
  commandFile: string;
  category: WorkflowCategory;
  tags?: string[];
  icon?: string;
}

export interface CreateWorkflowResponse {
  success: boolean;
  workflowId?: string;
  claudeCommand?: string;             // e.g., "/my-workflow"
  files?: {
    command: string;                  // Path to .claude/commands/custom/workflow.md
    workflow: string;                 // Path to bmad/custom/workflows/workflow.yaml
    blueprints?: string[];            // v6: Blueprint files
  };
  error?: string;
}

export interface ListWorkflowsResponse {
  success: boolean;
  workflows?: Workflow[];
  error?: string;
}

export interface TestWorkflowRequest {
  args?: Record<string, any>;
}

export interface TestWorkflowResponse {
  success: boolean;
  executionId?: string;
  status?: ExecutionStatus;
  error?: string;
}

// ============================================
// UI Component Props Types
// ============================================

export interface WorkflowBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowCreated: () => void;
}

export interface WorkflowCardProps {
  workflow: Workflow;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTest?: (id: string) => void;
}

export interface WorkflowListProps {
  workflows: Workflow[];
  loading?: boolean;
  onCreateNew?: () => void;
}

export interface ExecutionLogViewerProps {
  logs: ExecutionLog[];
  execution: WorkflowExecution;
}

// ============================================
// Utility Types
// ============================================

export type WorkflowTemplate = 
  | 'sequential'
  | 'parallel'
  | 'conditional'
  | 'code-review'
  | 'test-deploy'
  | 'feature-pipeline';

export interface TemplateConfig {
  name: string;
  description: string;
  type: WorkflowTemplate;
  defaultSteps: WorkflowStep[];
  suggestedAgents: string[];
  suggestedTools: string[];
}

// ============================================
// Constants
// ============================================

export const BMAD_AGENTS = [
  'business-analyst',
  'product-manager',
  'architect',
  'developer',
  'qa-engineer',
  'devops',
  'security-engineer',
  'tech-writer',
  'scrum-master',
] as const;

export type BMadAgent = typeof BMAD_AGENTS[number];

export const CLAUDE_TOOLS = [
  'bash',
  'read',
  'write',
  'edit',
  'ask_user',
  'grep',
  'task',
] as const;

export type ClaudeTool = typeof CLAUDE_TOOLS[number];

export const WORKFLOW_CATEGORIES: WorkflowCategory[] = [
  'development',
  'testing',
  'deployment',
  'documentation',
  'code-review',
  'custom',
];

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  'draft',
  'active',
  'archived',
];

