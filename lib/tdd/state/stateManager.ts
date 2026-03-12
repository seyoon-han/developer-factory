/**
 * TDD State Manager
 * Handles state serialization and pause/resume functionality for TDD Agent
 */

import fs from 'fs';
import path from 'path';
import { statements } from '@/lib/db/postgres';
import {
  TddAgentState,
  TddAgentStateRecord,
  StateCheckpoint,
  StateFileMetadata,
  SaveStateInput,
  LoadStateResult,
  StateManagerConfig,
  DEFAULT_STATE_CONFIG
} from '@/types/tdd-state';
import { ClarificationQuestion } from '@/types/clarification';

/**
 * TDD State Manager Service
 */
export class TddStateManager {
  private config: StateManagerConfig;
  private directoryInitialized = false;

  constructor(config: Partial<StateManagerConfig> = {}) {
    this.config = { ...DEFAULT_STATE_CONFIG, ...config };
    // Don't create directories at construction time - do it lazily
  }

  /**
   * Ensure state directory exists (called lazily on first use)
   */
  private ensureStateDirectory(): void {
    if (this.directoryInitialized) return;
    try {
      if (!fs.existsSync(this.config.stateDirectory)) {
        fs.mkdirSync(this.config.stateDirectory, { recursive: true });
      }
      this.directoryInitialized = true;
    } catch (error) {
      // In build environment, directory may not be creatable - that's okay
      console.warn(`TddStateManager: Could not create state directory: ${this.config.stateDirectory}`);
    }
  }

  /**
   * Generate state file path
   */
  private generateStatePath(taskId: number, checkpoint: string): string {
    // Ensure base directory exists first
    this.ensureStateDirectory();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${taskId}-${timestamp}-${checkpoint}.json`;
    const taskDir = path.join(this.config.stateDirectory, String(taskId));

    // Ensure task directory exists
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }

    return path.join(taskDir, filename);
  }

  /**
   * Save agent state to file and database
   */
  async saveState(input: SaveStateInput): Promise<{ stateId: number; filePath: string }> {
    const { tddTaskId, checkpoint, state } = input;

    // Generate file path
    const filePath = this.generateStatePath(state.taskId, checkpoint);

    // Add timestamp if not present
    if (!state.pausedAt) {
      state.pausedAt = new Date().toISOString();
    }

    // Write state to file
    const stateJson = JSON.stringify(state, null, 2);
    fs.writeFileSync(filePath, stateJson, 'utf8');

    // Deactivate any existing active states for this task
    await statements.deactivateAllTddAgentStates.run(tddTaskId);

    // Create database record
    const result = await statements.createTddAgentState.run(
      tddTaskId,
      filePath,
      checkpoint,
      JSON.stringify({
        phase: state.currentPhase,
        cycleCount: state.cycleCount,
        pauseReason: state.pauseReason
      })
    );

    // Cleanup old states if needed
    if (this.config.cleanupOldStates) {
      await this.cleanupOldStates(tddTaskId);
    }

    return {
      stateId: result.lastInsertRowid as number,
      filePath
    };
  }

  /**
   * Load state from file
   */
  async loadState(tddTaskId: number): Promise<LoadStateResult> {
    try {
      // Get active state record from database
      const stateRecord = await statements.getActiveTddAgentState.get(tddTaskId) as TddAgentStateRecord | undefined;

      if (!stateRecord) {
        return {
          success: false,
          error: 'No active state found for task'
        };
      }

      // Read state file
      if (!fs.existsSync(stateRecord.state_file_path)) {
        return {
          success: false,
          error: `State file not found: ${stateRecord.state_file_path}`
        };
      }

      const stateJson = fs.readFileSync(stateRecord.state_file_path, 'utf8');
      const state: TddAgentState = JSON.parse(stateJson);

      const stats = fs.statSync(stateRecord.state_file_path);
      const metadata: StateFileMetadata = {
        taskId: state.taskId,
        tddTaskId: state.tddTaskId,
        checkpoint: stateRecord.checkpoint_name as StateCheckpoint,
        createdAt: stateRecord.paused_at,
        filePath: stateRecord.state_file_path,
        fileSize: stats.size
      };

      return {
        success: true,
        state,
        metadata
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to load state: ${error.message}`
      };
    }
  }

  /**
   * Load state by state ID
   */
  async loadStateById(stateId: number): Promise<LoadStateResult> {
    try {
      const stateRecord = await statements.getTddAgentState.get(stateId) as TddAgentStateRecord | undefined;

      if (!stateRecord) {
        return {
          success: false,
          error: `State not found: ${stateId}`
        };
      }

      if (!fs.existsSync(stateRecord.state_file_path)) {
        return {
          success: false,
          error: `State file not found: ${stateRecord.state_file_path}`
        };
      }

      const stateJson = fs.readFileSync(stateRecord.state_file_path, 'utf8');
      const state: TddAgentState = JSON.parse(stateJson);

      const stats = fs.statSync(stateRecord.state_file_path);
      const metadata: StateFileMetadata = {
        taskId: state.taskId,
        tddTaskId: state.tddTaskId,
        checkpoint: stateRecord.checkpoint_name as StateCheckpoint,
        createdAt: stateRecord.paused_at,
        filePath: stateRecord.state_file_path,
        fileSize: stats.size
      };

      return {
        success: true,
        state,
        metadata
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to load state: ${error.message}`
      };
    }
  }

  /**
   * Mark state as resumed
   */
  async markStateResumed(stateId: number): Promise<void> {
    await statements.updateTddAgentStateResumed.run(stateId);
  }

  /**
   * Get state history for a task
   */
  async getStateHistory(tddTaskId: number): Promise<TddAgentStateRecord[]> {
    return await statements.getTddAgentStateHistory.all(tddTaskId) as TddAgentStateRecord[];
  }

  /**
   * Cleanup old states for a task
   */
  private async cleanupOldStates(tddTaskId: number): Promise<void> {
    const history = await this.getStateHistory(tddTaskId);

    // Keep only the most recent states
    if (history.length > this.config.maxStatesPerTask) {
      const toDelete = history.slice(this.config.maxStatesPerTask);

      for (const state of toDelete) {
        // Delete file
        if (fs.existsSync(state.state_file_path)) {
          fs.unlinkSync(state.state_file_path);
        }
      }
    }
  }

  /**
   * Create initial state for a new TDD task
   */
  createInitialState(taskId: number, tddTaskId: number, title: string, description: string): TddAgentState {
    return {
      version: '1.0',
      taskId,
      tddTaskId,
      currentPhase: 'spec_elicitation',
      checkpoint: 'spec_elicitation_start',

      context: {
        specification: description || '',
        acceptanceCriteria: [],
        clarificationAnswers: {},
        testCode: '',
        implementationCode: ''
      },

      agentState: {
        conversationHistory: [],
        toolCallHistory: [],
        lastModelResponse: ''
      },

      pausedAt: new Date().toISOString(),
      pauseReason: 'Initial state',
      pendingQuestions: [],
      cycleCount: 0
    };
  }

  /**
   * Update state with clarification answers
   */
  updateStateWithAnswers(
    state: TddAgentState,
    answers: Record<string, string>
  ): TddAgentState {
    return {
      ...state,
      context: {
        ...state.context,
        clarificationAnswers: {
          ...state.context.clarificationAnswers,
          ...answers
        }
      },
      pendingQuestions: [],
      pauseReason: ''
    };
  }

  /**
   * Update state with test code
   */
  updateStateWithTestCode(state: TddAgentState, testCode: string): TddAgentState {
    return {
      ...state,
      context: {
        ...state.context,
        testCode
      },
      currentPhase: 'red_phase',
      checkpoint: 'red_phase_test_written'
    };
  }

  /**
   * Update state with implementation code
   */
  updateStateWithImplementation(
    state: TddAgentState,
    implementationCode: string
  ): TddAgentState {
    return {
      ...state,
      context: {
        ...state.context,
        implementationCode
      },
      currentPhase: 'green_phase',
      checkpoint: 'green_phase_impl_written'
    };
  }

  /**
   * Update state with test results
   */
  updateStateWithTestResults(
    state: TddAgentState,
    testResults: { passed: number; failed: number; skipped: number; output: string }
  ): TddAgentState {
    return {
      ...state,
      testResults
    };
  }

  /**
   * Prepare state for pause with clarification questions
   */
  prepareStateForPause(
    state: TddAgentState,
    reason: string,
    questions: ClarificationQuestion[]
  ): TddAgentState {
    return {
      ...state,
      pausedAt: new Date().toISOString(),
      pauseReason: reason,
      pendingQuestions: questions,
      currentPhase: 'awaiting_clarification',
      checkpoint: 'awaiting_clarification'
    };
  }
}

// Singleton instance
export const stateManager = new TddStateManager();

export default stateManager;
