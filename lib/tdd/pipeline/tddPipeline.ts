/**
 * TDD Pipeline Orchestrator
 * Orchestrates the TDD workflow phases with strict RED-GREEN-REFACTOR enforcement
 * Uses Claude Agent SDK for real AI-powered code generation
 */

import { statements } from '@/lib/db/postgres';
import { esmlService } from '@/lib/tdd/esml/skillsManager';
import { stateManager } from '@/lib/tdd/state/stateManager';
import { ucsService } from '@/lib/tdd/ucs/clarificationService';
import { questionGenerator } from '@/lib/tdd/ucs/questionGenerator';
import { tddAgentExecutor } from '@/lib/tdd/executor/tddAgentExecutor';
import {
  extractRedPhaseInstructions,
  extractGreenPhaseInstructions,
  extractRefactorPhaseInstructions
} from '@/lib/tdd/esml/skillParser';
import { TddTask, TddPhase, TddStatus } from '@/types/tdd-task';
import { TddAgentState } from '@/types/tdd-state';
import { ClarificationQuestion } from '@/types/clarification';
import { getTargetProjectPath } from '@/lib/config/workspace';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Pipeline exceptions
export class TddPipelineError extends Error {
  constructor(message: string, public phase: TddPhase) {
    super(message);
    this.name = 'TddPipelineError';
  }
}

export class TddViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TddViolationError';
  }
}

export class PauseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PauseException';
  }
}

// Phase result interface
export interface PhaseResult {
  success: boolean;
  phase: TddPhase;
  output?: string;
  error?: string;
  paused?: boolean;
  testResults?: {
    passed: number;
    failed: number;
    skipped: number;
    output: string;
  };
}

/**
 * TDD Pipeline Orchestrator
 */
export class TddPipelineOrchestrator {
  /**
   * Execute the spec elicitation phase
   */
  async executeSpecElicitation(tddTask: TddTask, mainTask: any): Promise<PhaseResult> {
    const phase: TddPhase = 'spec_elicitation';

    try {
      // Create execution log
      const logResult = await statements.createTddExecutionLog.run(
        tddTask.id,
        phase,
        'brainstorming',
        JSON.stringify({ title: mainTask.title, description: mainTask.description })
      );
      const logId = logResult.lastInsertRowid as number;

      // Generate clarifying questions using AI
      const questionResult = await questionGenerator.generateQuestions({
        taskId: mainTask.id,
        title: mainTask.title,
        description: mainTask.description || ''
      });

      let questions: ClarificationQuestion[];
      if (questionResult.success && questionResult.questions.length > 0) {
        questions = questionResult.questions;
      } else {
        // Use default questions as fallback
        console.warn('Using default questions - AI generation failed');
        questions = questionGenerator.getDefaultQuestions({
          taskId: mainTask.id,
          title: mainTask.title,
          description: mainTask.description || ''
        });
      }

      // Create clarifications in database
      await ucsService.createClarifications(tddTask.id, questions);

      // Create initial state and save
      const state = stateManager.createInitialState(
        mainTask.id,
        tddTask.id,
        mainTask.title,
        mainTask.description || ''
      );
      const preparedState = stateManager.prepareStateForPause(
        state,
        'Awaiting user clarification',
        questions
      );

      await stateManager.saveState({
        tddTaskId: tddTask.id,
        checkpoint: 'awaiting_clarification',
        state: preparedState
      });

      // Update task status
      await statements.updateTddTaskStatus.run('awaiting_clarification', 'awaiting_clarification', tddTask.id);

      // Complete log
      await statements.completeTddExecutionLog.run(
        JSON.stringify({ questionsGenerated: questions.length }),
        null,
        0,
        1,
        null,
        logId
      );

      return {
        success: true,
        phase,
        paused: true,
        output: `Generated ${questions.length} clarifying questions`
      };
    } catch (error: any) {
      return {
        success: false,
        phase,
        error: error.message
      };
    }
  }

  /**
   * Execute the RED phase (test generation) using Claude Agent SDK
   */
  async executeRedPhase(tddTask: TddTask, state: TddAgentState): Promise<PhaseResult> {
    const phase: TddPhase = 'red_phase';

    try {
      // Get TDD skill from superpowers repository
      const tddSkill = await esmlService.getSkill('test-driven-development');
      if (!tddSkill) {
        throw new TddPipelineError(
          'TDD skill not found. Please sync skills from superpowers repository first: ' +
          'Click "Sync Skills" button or run /app/scripts/update_external_skills.sh',
          phase
        );
      }

      console.log('[TDD Pipeline] Starting RED phase for task #' + tddTask.id);
      console.log('[TDD Pipeline] Using Claude Agent SDK for real test generation');

      // Create execution log
      const logResult = await statements.createTddExecutionLog.run(
        tddTask.id,
        phase,
        'test-driven-development',
        JSON.stringify({
          specification: state.context.specification,
          clarifications: state.context.clarificationAnswers
        })
      );
      const logId = logResult.lastInsertRowid as number;

      // Execute RED phase with Claude Agent SDK
      const redResult = await tddAgentExecutor.executeRedPhase(
        state.context.specification,
        state.context.clarificationAnswers,
        tddSkill.skill_content,
        getTargetProjectPath()
      );

      if (!redResult.success) {
        throw new TddPipelineError(redResult.error || 'RED phase execution failed', phase);
      }

      const testCode = redResult.code || redResult.output;

      // Update state with test code
      const updatedState = stateManager.updateStateWithTestCode(state, testCode);

      // Save test code to database
      await statements.updateTddTaskTestCode.run(testCode, tddTask.id);

      // Run tests to verify they fail (RED) - use the executor's test runner
      const testResult = await tddAgentExecutor.runTests(getTargetProjectPath());

      // STRICT TDD: Tests MUST fail in RED phase
      if (testResult.passed > 0 && testResult.failed === 0) {
        throw new TddViolationError(
          `TDD VIOLATION: Tests must fail in RED phase! ${testResult.passed} tests passed with no failures.`
        );
      }

      // Record test results
      await statements.createTddTestResult.run(
        tddTask.id,
        state.cycleCount + 1,
        'red',
        'npm test',
        testResult.exitCode,
        testResult.output,
        '',
        testResult.passed,
        testResult.failed,
        testResult.skipped,
        testResult.durationMs
      );

      // Update state with test results
      const finalState = stateManager.updateStateWithTestResults(updatedState, {
        passed: testResult.passed,
        failed: testResult.failed,
        skipped: testResult.skipped,
        output: testResult.output
      });

      // Save state
      await stateManager.saveState({
        tddTaskId: tddTask.id,
        checkpoint: 'red_phase_verified_failing',
        state: finalState
      });

      // Update task status
      await statements.updateTddTaskStatus.run('test_generation', 'red_phase', tddTask.id);

      // Complete log with execution metadata
      await statements.completeTddExecutionLog.run(
        testCode,
        testResult.output,
        redResult.metadata?.executionTime || 0,
        1,
        redResult.metadata?.model || null,
        logId
      );

      console.log(`[TDD Pipeline] RED phase complete. Tests: ${testResult.failed} failing (expected)`);

      return {
        success: true,
        phase,
        output: testCode,
        testResults: {
          passed: testResult.passed,
          failed: testResult.failed,
          skipped: testResult.skipped,
          output: testResult.output
        }
      };
    } catch (error: any) {
      console.error('[TDD Pipeline] RED phase error:', error.message);
      return {
        success: false,
        phase,
        error: error.message
      };
    }
  }

  /**
   * Execute the GREEN phase (implementation) using Claude Agent SDK
   */
  async executeGreenPhase(tddTask: TddTask, state: TddAgentState): Promise<PhaseResult> {
    const phase: TddPhase = 'green_phase';

    try {
      // Get TDD skill from superpowers repository
      const tddSkill = await esmlService.getSkill('test-driven-development');
      if (!tddSkill) {
        throw new TddPipelineError(
          'TDD skill not found. Please sync skills from superpowers repository first.',
          phase
        );
      }

      console.log('[TDD Pipeline] Starting GREEN phase for task #' + tddTask.id);
      console.log('[TDD Pipeline] Using Claude Agent SDK for real implementation');

      // Create execution log
      const logResult = await statements.createTddExecutionLog.run(
        tddTask.id,
        phase,
        'test-driven-development',
        JSON.stringify({
          specification: state.context.specification,
          testCode: state.context.testCode
        })
      );
      const logId = logResult.lastInsertRowid as number;

      // Execute GREEN phase with Claude Agent SDK
      const greenResult = await tddAgentExecutor.executeGreenPhase(
        state.context.specification,
        state.context.testCode,
        tddSkill.skill_content,
        getTargetProjectPath()
      );

      if (!greenResult.success) {
        throw new TddPipelineError(greenResult.error || 'GREEN phase execution failed', phase);
      }

      const implementationCode = greenResult.code || greenResult.output;

      // Update state with implementation
      const updatedState = stateManager.updateStateWithImplementation(state, implementationCode);

      // Save implementation to database
      await statements.updateTddTaskImplementation.run(implementationCode, tddTask.id);

      // Run tests to verify they pass (GREEN) - use the executor's test runner
      const testResult = await tddAgentExecutor.runTests(getTargetProjectPath());

      // STRICT TDD: Tests MUST pass in GREEN phase
      if (testResult.failed > 0) {
        // Iterate until GREEN (or max attempts)
        return this.iterateGreenPhase(tddTask, updatedState, testResult, tddSkill.skill_content, logId);
      }

      // Record test results
      await statements.createTddTestResult.run(
        tddTask.id,
        updatedState.cycleCount,
        'green',
        'npm test',
        testResult.exitCode,
        testResult.output,
        '',
        testResult.passed,
        testResult.failed,
        testResult.skipped,
        testResult.durationMs
      );

      // Update state
      const finalState = stateManager.updateStateWithTestResults(updatedState, {
        passed: testResult.passed,
        failed: testResult.failed,
        skipped: testResult.skipped,
        output: testResult.output
      });

      // Save state
      await stateManager.saveState({
        tddTaskId: tddTask.id,
        checkpoint: 'green_phase_verified_passing',
        state: finalState
      });

      // Update task status
      await statements.updateTddTaskStatus.run('implementation_draft', 'green_phase', tddTask.id);

      // Complete log with execution metadata
      await statements.completeTddExecutionLog.run(
        implementationCode,
        testResult.output,
        greenResult.metadata?.executionTime || 0,
        1,
        greenResult.metadata?.model || null,
        logId
      );

      console.log(`[TDD Pipeline] GREEN phase complete. Tests: ${testResult.passed} passing`);

      return {
        success: true,
        phase,
        output: implementationCode,
        testResults: {
          passed: testResult.passed,
          failed: testResult.failed,
          skipped: testResult.skipped,
          output: testResult.output
        }
      };
    } catch (error: any) {
      console.error('[TDD Pipeline] GREEN phase error:', error.message);
      return {
        success: false,
        phase,
        error: error.message
      };
    }
  }

  /**
   * Iterate GREEN phase until tests pass using Claude Agent SDK
   */
  private async iterateGreenPhase(
    tddTask: TddTask,
    state: TddAgentState,
    lastTestResult: any,
    tddSkillContent: string,
    logId: number,
    maxAttempts: number = 5
  ): Promise<PhaseResult> {
    let attempt = 1;
    let currentState = state;
    let currentTestResult = lastTestResult;
    const projectPath = getTargetProjectPath();

    while (currentTestResult.failed > 0 && attempt < maxAttempts) {
      attempt++;
      console.log(`[TDD Pipeline] GREEN phase iteration ${attempt}/${maxAttempts}`);
      console.log(`[TDD Pipeline] ${currentTestResult.failed} tests still failing, attempting fix...`);

      // Use Claude Agent SDK to fix implementation based on test failures
      const fixResult = await tddAgentExecutor.executeGreenPhase(
        `${state.context.specification}\n\nPrevious implementation failed with:\n${currentTestResult.output}\n\nFix the implementation to pass all tests.`,
        state.context.testCode,
        tddSkillContent,
        projectPath
      );

      if (!fixResult.success) {
        console.error(`[TDD Pipeline] Fix attempt ${attempt} failed:`, fixResult.error);
        continue;
      }

      const fixedCode = fixResult.code || fixResult.output;

      // Update state
      currentState = stateManager.updateStateWithImplementation(currentState, fixedCode);
      await statements.updateTddTaskImplementation.run(fixedCode, tddTask.id);

      // Re-run tests using the executor
      currentTestResult = await tddAgentExecutor.runTests(projectPath);

      console.log(`[TDD Pipeline] After iteration ${attempt}: ${currentTestResult.passed} passed, ${currentTestResult.failed} failed`);

      if (currentTestResult.failed === 0) {
        break;
      }
    }

    if (currentTestResult.failed > 0) {
      // Complete log with failure
      await statements.completeTddExecutionLog.run(
        currentState.context.implementationCode,
        currentTestResult.output,
        0,
        0, // not successful
        null,
        logId
      );

      return {
        success: false,
        phase: 'green_phase',
        error: `Failed to achieve GREEN after ${maxAttempts} attempts. ${currentTestResult.failed} tests still failing.\n\nLast test output:\n${currentTestResult.output}`,
        testResults: {
          passed: currentTestResult.passed,
          failed: currentTestResult.failed,
          skipped: currentTestResult.skipped,
          output: currentTestResult.output
        }
      };
    }

    // Record successful test results
    await statements.createTddTestResult.run(
      tddTask.id,
      currentState.cycleCount,
      'green',
      'npm test',
      currentTestResult.exitCode,
      currentTestResult.output,
      '',
      currentTestResult.passed,
      currentTestResult.failed,
      currentTestResult.skipped,
      currentTestResult.durationMs
    );

    // Update final state
    const finalState = stateManager.updateStateWithTestResults(currentState, {
      passed: currentTestResult.passed,
      failed: currentTestResult.failed,
      skipped: currentTestResult.skipped,
      output: currentTestResult.output
    });

    // Save state
    await stateManager.saveState({
      tddTaskId: tddTask.id,
      checkpoint: 'green_phase_verified_passing',
      state: finalState
    });

    // Update task status
    await statements.updateTddTaskStatus.run('implementation_draft', 'green_phase', tddTask.id);

    // Complete log
    await statements.completeTddExecutionLog.run(
      currentState.context.implementationCode,
      currentTestResult.output,
      0,
      1,
      null,
      logId
    );

    console.log(`[TDD Pipeline] GREEN phase achieved after ${attempt} iterations`);

    return {
      success: true,
      phase: 'green_phase',
      output: currentState.context.implementationCode,
      testResults: {
        passed: currentTestResult.passed,
        failed: currentTestResult.failed,
        skipped: currentTestResult.skipped,
        output: currentTestResult.output
      }
    };
  }

  /**
   * Execute the REFACTOR phase using Claude Agent SDK
   */
  async executeRefactorPhase(tddTask: TddTask, state: TddAgentState): Promise<PhaseResult> {
    const phase: TddPhase = 'refactor_phase';
    const projectPath = getTargetProjectPath();

    try {
      console.log('[TDD Pipeline] Starting REFACTOR phase for task #' + tddTask.id);
      console.log('[TDD Pipeline] Using Claude Agent SDK for real refactoring');

      // Get review skill
      const reviewSkill = await esmlService.getSkill('receiving-code-review');

      // Create execution log
      const logResult = await statements.createTddExecutionLog.run(
        tddTask.id,
        phase,
        'receiving-code-review',
        JSON.stringify({
          testCode: state.context.testCode,
          implementationCode: state.context.implementationCode
        })
      );
      const logId = logResult.lastInsertRowid as number;

      // Execute REFACTOR phase with Claude Agent SDK
      const refactorResult = await tddAgentExecutor.executeRefactorPhase(
        state.context.testCode,
        state.context.implementationCode,
        reviewSkill?.skill_content || '',
        projectPath
      );

      if (!refactorResult.success) {
        throw new TddPipelineError(refactorResult.error || 'REFACTOR phase execution failed', phase);
      }

      const refactoredCode = refactorResult.code || refactorResult.output;

      // Save refactored code
      await statements.updateTddTaskImplementation.run(refactoredCode, tddTask.id);

      // Run tests to verify they still pass after refactoring
      const testResult = await tddAgentExecutor.runTests(projectPath);

      // Refactoring MUST NOT break tests
      if (testResult.failed > 0) {
        // Revert to pre-refactor code
        console.error(`[TDD Pipeline] Refactoring broke ${testResult.failed} tests! Reverting...`);
        await statements.updateTddTaskImplementation.run(state.context.implementationCode, tddTask.id);
        throw new TddViolationError(
          `Refactoring broke ${testResult.failed} tests! Reverted to previous implementation.\n\nTest output:\n${testResult.output}`
        );
      }

      // Record test results
      await statements.createTddTestResult.run(
        tddTask.id,
        state.cycleCount,
        'refactor',
        'npm test',
        testResult.exitCode,
        testResult.output,
        '',
        testResult.passed,
        testResult.failed,
        testResult.skipped,
        testResult.durationMs
      );

      // Update state
      const updatedState = {
        ...state,
        context: {
          ...state.context,
          refactoredCode
        },
        currentPhase: 'refactor_phase' as TddPhase
      };

      // Save state
      await stateManager.saveState({
        tddTaskId: tddTask.id,
        checkpoint: 'refactor_phase_complete',
        state: updatedState
      });

      // Update task status
      await statements.updateTddTaskStatus.run('code_refinement', 'refactor_phase', tddTask.id);

      // Complete log with execution metadata
      await statements.completeTddExecutionLog.run(
        refactoredCode,
        testResult.output,
        refactorResult.metadata?.executionTime || 0,
        1,
        refactorResult.metadata?.model || null,
        logId
      );

      console.log(`[TDD Pipeline] REFACTOR phase complete. Tests: ${testResult.passed} still passing`);

      return {
        success: true,
        phase,
        output: refactoredCode,
        testResults: {
          passed: testResult.passed,
          failed: testResult.failed,
          skipped: testResult.skipped,
          output: testResult.output
        }
      };
    } catch (error: any) {
      console.error('[TDD Pipeline] REFACTOR phase error:', error.message);
      return {
        success: false,
        phase,
        error: error.message
      };
    }
  }

  /**
   * Execute verification phase following superpowers verification skill
   */
  async executeVerification(tddTask: TddTask, state: TddAgentState): Promise<PhaseResult> {
    const phase: TddPhase = 'verification';
    const projectPath = getTargetProjectPath();

    try {
      console.log('[TDD Pipeline] Starting VERIFICATION phase for task #' + tddTask.id);

      // Get verification skill for proper verification steps
      const verifySkill = await esmlService.getSkill('verification-before-completion');
      if (verifySkill) {
        console.log('[TDD Pipeline] Using verification-before-completion skill');
      }

      // Create execution log
      const logResult = await statements.createTddExecutionLog.run(
        tddTask.id,
        phase,
        'verification-before-completion',
        JSON.stringify({
          testCode: state.context.testCode,
          implementationCode: state.context.implementationCode
        })
      );
      const logId = logResult.lastInsertRowid as number;

      // Final test run using the executor
      const testResult = await tddAgentExecutor.runTests(projectPath);

      console.log(`[TDD Pipeline] Verification test results: ${testResult.passed} passed, ${testResult.failed} failed`);

      if (testResult.failed > 0) {
        // Log the failure
        await statements.completeTddExecutionLog.run(
          null,
          testResult.output,
          testResult.durationMs,
          0, // not successful
          null,
          logId
        );

        return {
          success: false,
          phase,
          error: `Verification failed: ${testResult.failed} tests failing.\n\nTest output:\n${testResult.output}`,
          testResults: {
            passed: testResult.passed,
            failed: testResult.failed,
            skipped: testResult.skipped,
            output: testResult.output
          }
        };
      }

      // Increment cycle count
      await statements.incrementTddCycleCount.run(tddTask.id);

      // Update status to done
      await statements.updateTddTaskStatus.run('done', 'complete', tddTask.id);

      // Store final test results
      await statements.updateTddTaskTestResults.run(
        JSON.stringify({
          passed: testResult.passed,
          failed: testResult.failed,
          skipped: testResult.skipped,
          output: testResult.output
        }),
        tddTask.id
      );

      // Record verification test run
      await statements.createTddTestResult.run(
        tddTask.id,
        state.cycleCount + 1,
        'verification',
        'npm test',
        testResult.exitCode,
        testResult.output,
        '',
        testResult.passed,
        testResult.failed,
        testResult.skipped,
        testResult.durationMs
      );

      // Complete log
      await statements.completeTddExecutionLog.run(
        null,
        testResult.output,
        testResult.durationMs,
        1,
        null,
        logId
      );

      console.log(`[TDD Pipeline] VERIFICATION complete. TDD cycle finished successfully!`);
      console.log(`[TDD Pipeline] Final: ${testResult.passed} tests passing, 0 failing`);

      return {
        success: true,
        phase,
        output: `TDD cycle complete! All ${testResult.passed} tests passing.`,
        testResults: {
          passed: testResult.passed,
          failed: testResult.failed,
          skipped: testResult.skipped,
          output: testResult.output
        }
      };
    } catch (error: any) {
      console.error('[TDD Pipeline] VERIFICATION error:', error.message);
      return {
        success: false,
        phase,
        error: error.message
      };
    }
  }

}

// Singleton instance
export const tddPipeline = new TddPipelineOrchestrator();

export default tddPipeline;
