/**
 * Agentic Dev Workflow - Main Exports
 */

// Services
export { agenticTaskService } from './services/taskService';
export { projectGroupService } from './services/projectGroupService';
export { globalDocumentService } from './services/globalDocumentService';
export { clarificationService } from './services/clarificationService';
export { planService } from './services/planService';

// Git
export { worktreeManager } from './git/worktreeManager';
export { prCoordinator } from './git/prCoordinator';

// Executors
export { brainstormingExecutor } from './executors/brainstormingExecutor';
export { planningExecutor } from './executors/planningExecutor';
export { implementationExecutor } from './executors/implementationExecutor';
export { verificationExecutor } from './executors/verificationExecutor';

// Logs
export { agenticLogsStore } from './logs/agenticLogsStore';

// Notifications
export { slackNotifier } from './notifications/slackNotifier';

// Pipeline
export { pipelineOrchestrator } from './pipeline/pipelineOrchestrator';

// Queue
export { taskQueueProcessor } from './queue/processor';

// Types
export type {
  BrainstormingResult,
} from './executors/brainstormingExecutor';

export type {
  PlanningResult,
} from './executors/planningExecutor';

export type {
  ImplementationResult,
  StepExecutionResult,
} from './executors/implementationExecutor';

export type {
  VerificationResult,
  VerificationCommand,
  CommandResult,
} from './executors/verificationExecutor';

export type {
  PipelineState,
  PhaseResult,
} from './pipeline/pipelineOrchestrator';

export type {
  QueueConfig,
  QueueStats,
} from './queue/processor';
