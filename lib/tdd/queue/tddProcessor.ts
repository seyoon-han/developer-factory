/**
 * TDD Queue Processor
 * Separate queue processor for TDD board tasks
 */

import { statements } from '@/lib/db/postgres';
import { tddPipeline, PhaseResult } from '@/lib/tdd/pipeline/tddPipeline';
import { stateManager } from '@/lib/tdd/state/stateManager';
import { ucsService } from '@/lib/tdd/ucs/clarificationService';
import { esmlService } from '@/lib/tdd/esml/skillsManager';
import { TddTask, TddPhase } from '@/types/tdd-task';

/**
 * TDD Queue Processor
 */
export class TddQueueProcessor {
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;
  private running = false;

  /**
   * Start the queue processor
   */
  async start(intervalMs: number = 10000) {
    if (this.running) {
      console.log('TDD Queue processor already running');
      return;
    }

    console.log('TDD Queue processor starting...');
    this.running = true;

    // Initialize ESML (skills should already be synced at build/startup time)
    await esmlService.initialize();

    // Verify TDD skill is available
    const tddSkill = await esmlService.getSkill('test-driven-development');
    if (tddSkill) {
      const status = await esmlService.getSyncStatus();
      console.log(`TDD Queue processor started (${status.skillsInDatabase} skills loaded, ${status.coreSkillsInDatabase} core)`);
    } else {
      console.warn('WARNING: TDD skill not found in database. Skills should be synced at container startup.');
    }

    // Process immediately
    await this.processQueue();

    // Then process on interval
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);
  }

  /**
   * Stop the queue processor
   */
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.running = false;
    console.log('TDD Queue processor stopped');
  }

  /**
   * Check if processor is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Process the queue
   */
  async processQueue() {
    if (this.isProcessing) {
      console.log('TDD Queue processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      // 1. Check for tasks with answered clarifications that can resume
      await this.resumePausedTasks();

      // 2. Process tasks in backlog (start spec elicitation)
      await this.processBacklogTasks();

      // 3. Continue tasks in progress
      await this.continueInProgressTasks();
    } catch (error) {
      console.error('Error in TDD queue processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Resume tasks that have all clarifications answered
   */
  private async resumePausedTasks() {
    const tasksToResume = await statements.getTddTasksWithAnsweredClarifications.all() as TddTask[];

    for (const tddTask of tasksToResume) {
      try {
        console.log(`Resuming TDD task #${tddTask.id} from clarification pause`);

        // Load saved state
        const stateResult = await stateManager.loadState(tddTask.id);
        if (!stateResult.success || !stateResult.state) {
          console.error(`Failed to load state for TDD task #${tddTask.id}`);
          continue;
        }

        // Get clarification answers
        const answers = await ucsService.getAnswersRecord(tddTask.id);

        // Update state with answers
        const updatedState = stateManager.updateStateWithAnswers(stateResult.state, answers);

        // Mark state as resumed
        const stateRecord = await statements.getActiveTddAgentState.get(tddTask.id) as any;
        if (stateRecord) {
          await stateManager.markStateResumed(stateRecord.id);
        }

        // Update specification with clarifications
        const clarifications = await ucsService.getClarifications(tddTask.id);
        const formattedClarifications = ucsService.formatForPrompt(clarifications);
        const enhancedSpec = `${updatedState.context.specification}\n\n${formattedClarifications}`;

        await statements.updateTddTaskSpecification.run(
          enhancedSpec,
          JSON.stringify(Object.values(answers)),
          tddTask.id
        );

        // Move to test generation (RED phase)
        await statements.updateTddTaskStatus.run('test_generation', 'red_phase', tddTask.id);

        console.log(`TDD task #${tddTask.id} resumed, moving to RED phase`);

        // Execute RED phase
        const redResult = await tddPipeline.executeRedPhase(
          { ...tddTask, tdd_status: 'test_generation', current_phase: 'red_phase' },
          { ...updatedState, context: { ...updatedState.context, specification: enhancedSpec } }
        );

        if (redResult.success) {
          console.log(`TDD task #${tddTask.id} RED phase complete, tests failing as expected`);
        } else {
          console.error(`TDD task #${tddTask.id} RED phase failed:`, redResult.error);
        }
      } catch (error) {
        console.error(`Error resuming TDD task #${tddTask.id}:`, error);
      }
    }
  }

  /**
   * Process new tasks in backlog
   */
  private async processBacklogTasks() {
    const backlogTasks = await statements.getTddTasksByStatus.all('backlog') as TddTask[];

    for (const tddTask of backlogTasks) {
      try {
        console.log(`Processing TDD backlog task #${tddTask.id}`);

        // Get main task details
        const mainTask = await statements.getTask.get(tddTask.task_id) as any;
        if (!mainTask) {
          console.error(`Main task not found for TDD task #${tddTask.id}`);
          continue;
        }

        // Move to spec elicitation
        await statements.updateTddTaskStatus.run('spec_elicitation', 'spec_elicitation', tddTask.id);

        // Execute spec elicitation
        const result = await tddPipeline.executeSpecElicitation(tddTask, mainTask);

        if (result.success) {
          console.log(`TDD task #${tddTask.id} spec elicitation complete, awaiting clarification`);
        } else {
          console.error(`TDD task #${tddTask.id} spec elicitation failed:`, result.error);
        }
      } catch (error) {
        console.error(`Error processing TDD backlog task #${tddTask.id}:`, error);
      }
    }
  }

  /**
   * Continue tasks that are in progress (test_generation -> implementation_draft -> code_refinement)
   */
  private async continueInProgressTasks() {
    // Tasks in test_generation that have completed RED phase need to move to GREEN
    const testGenTasks = await statements.getTddTasksByStatus.all('test_generation') as TddTask[];

    for (const tddTask of testGenTasks) {
      // Skip if no test code yet (still in RED phase)
      if (!tddTask.test_code) continue;

      try {
        console.log(`Continuing TDD task #${tddTask.id} to GREEN phase`);

        // Load state
        const stateResult = await stateManager.loadState(tddTask.id);
        if (!stateResult.success || !stateResult.state) {
          console.warn(`No state found for TDD task #${tddTask.id}, creating new state`);
          continue;
        }

        // Execute GREEN phase
        const greenResult = await tddPipeline.executeGreenPhase(tddTask, stateResult.state);

        if (greenResult.success) {
          console.log(`TDD task #${tddTask.id} GREEN phase complete, tests passing`);
        } else {
          console.error(`TDD task #${tddTask.id} GREEN phase failed:`, greenResult.error);
        }
      } catch (error) {
        console.error(`Error in GREEN phase for TDD task #${tddTask.id}:`, error);
      }
    }

    // Tasks in implementation_draft that have completed GREEN need REFACTOR
    const implTasks = await statements.getTddTasksByStatus.all('implementation_draft') as TddTask[];

    for (const tddTask of implTasks) {
      if (!tddTask.implementation_code) continue;

      try {
        console.log(`Continuing TDD task #${tddTask.id} to REFACTOR phase`);

        const stateResult = await stateManager.loadState(tddTask.id);
        if (!stateResult.success || !stateResult.state) continue;

        const refactorResult = await tddPipeline.executeRefactorPhase(tddTask, stateResult.state);

        if (refactorResult.success) {
          console.log(`TDD task #${tddTask.id} REFACTOR phase complete`);
        } else {
          console.error(`TDD task #${tddTask.id} REFACTOR failed:`, refactorResult.error);
        }
      } catch (error) {
        console.error(`Error in REFACTOR phase for TDD task #${tddTask.id}:`, error);
      }
    }

    // Tasks in code_refinement need verification
    const refinementTasks = await statements.getTddTasksByStatus.all('code_refinement') as TddTask[];

    for (const tddTask of refinementTasks) {
      try {
        console.log(`Verifying TDD task #${tddTask.id}`);

        const stateResult = await stateManager.loadState(tddTask.id);
        if (!stateResult.success || !stateResult.state) continue;

        const verifyResult = await tddPipeline.executeVerification(tddTask, stateResult.state);

        if (verifyResult.success) {
          console.log(`TDD task #${tddTask.id} verified and complete!`);
        } else {
          console.error(`TDD task #${tddTask.id} verification failed:`, verifyResult.error);
        }
      } catch (error) {
        console.error(`Error verifying TDD task #${tddTask.id}:`, error);
      }
    }
  }

  /**
   * Manually trigger processing of a specific task
   */
  async processTask(tddTaskId: number): Promise<PhaseResult> {
    const tddTask = await statements.getTddTask.get(tddTaskId) as TddTask | undefined;
    if (!tddTask) {
      return {
        success: false,
        phase: 'spec_elicitation',
        error: `TDD task #${tddTaskId} not found`
      };
    }

    const mainTask = await statements.getTask.get(tddTask.task_id) as any;

    switch (tddTask.tdd_status) {
      case 'backlog':
        return tddPipeline.executeSpecElicitation(tddTask, mainTask);

      case 'awaiting_clarification':
        const answered = await ucsService.areAllRequiredAnswered(tddTask.id);
        if (!answered) {
          return {
            success: false,
            phase: 'awaiting_clarification',
            paused: true,
            error: 'Still waiting for clarification answers'
          };
        }
        // Resume will happen in next queue cycle
        return {
          success: true,
          phase: 'awaiting_clarification',
          output: 'Clarifications received, will resume in next cycle'
        };

      case 'test_generation':
      case 'implementation_draft':
      case 'code_refinement':
        const stateResult = await stateManager.loadState(tddTask.id);
        if (!stateResult.success || !stateResult.state) {
          return {
            success: false,
            phase: tddTask.current_phase,
            error: 'Failed to load state'
          };
        }

        if (tddTask.tdd_status === 'test_generation') {
          return tddPipeline.executeRedPhase(tddTask, stateResult.state);
        } else if (tddTask.tdd_status === 'implementation_draft') {
          return tddPipeline.executeGreenPhase(tddTask, stateResult.state);
        } else {
          return tddPipeline.executeRefactorPhase(tddTask, stateResult.state);
        }

      case 'done':
        return {
          success: true,
          phase: 'complete',
          output: 'Task already complete'
        };

      default:
        return {
          success: false,
          phase: tddTask.current_phase,
          error: `Unknown status: ${tddTask.tdd_status}`
        };
    }
  }

  /**
   * Get processor status
   */
  getStatus(): {
    running: boolean;
    isProcessing: boolean;
  } {
    return {
      running: this.running,
      isProcessing: this.isProcessing
    };
  }
}

// Singleton instance
export const tddQueueProcessor = new TddQueueProcessor();

export default tddQueueProcessor;
