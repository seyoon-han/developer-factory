/**
 * TDD Agent Executor
 * Executes TDD phases using Claude Agent SDK with superpowers skills
 * Implements real RED-GREEN-REFACTOR workflow
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { SKILLS_CONFIG } from '@/lib/config/skills';
import { getTargetProjectPath } from '@/lib/config/workspace';
import { getPreferredModel } from '@/lib/utils/modelSelector';
import { statements } from '@/lib/db/postgres';

export interface TddExecutionResult {
  success: boolean;
  output: string;
  code?: string;
  testOutput?: string;
  error?: string;
  metadata?: {
    executionTime: number;
    model: string;
    phase: string;
  };
}

export interface TestRunResult {
  exitCode: number;
  output: string;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

/**
 * TDD Agent Executor using Claude Agent SDK
 */
export class TddAgentExecutor {
  private apiKey: string;

  constructor() {
    this.apiKey = SKILLS_CONFIG.anthropicApiKey;
  }

  /**
   * Execute RED phase - Generate failing tests
   */
  async executeRedPhase(
    specification: string,
    clarifications: Record<string, string>,
    tddSkillContent: string,
    targetProjectPath?: string
  ): Promise<TddExecutionResult> {
    const startTime = Date.now();
    const projectPath = targetProjectPath || getTargetProjectPath();
    const model = await getPreferredModel();

    console.log('[TDD Executor] Starting RED phase - Writing failing tests');
    console.log('[TDD Executor] Target project:', projectPath);

    const prompt = this.buildRedPhasePrompt(specification, clarifications, tddSkillContent);

    try {
      const result = await this.executeWithSdk(prompt, projectPath, model, 'red');

      return {
        success: true,
        output: result.output,
        code: result.code,
        testOutput: result.testOutput,
        metadata: {
          executionTime: Date.now() - startTime,
          model,
          phase: 'red'
        }
      };
    } catch (error: any) {
      console.error('[TDD Executor] RED phase failed:', error.message);
      return {
        success: false,
        output: '',
        error: error.message,
        metadata: {
          executionTime: Date.now() - startTime,
          model,
          phase: 'red'
        }
      };
    }
  }

  /**
   * Execute GREEN phase - Implement to pass tests
   */
  async executeGreenPhase(
    specification: string,
    testCode: string,
    tddSkillContent: string,
    targetProjectPath?: string
  ): Promise<TddExecutionResult> {
    const startTime = Date.now();
    const projectPath = targetProjectPath || getTargetProjectPath();
    const model = await getPreferredModel();

    console.log('[TDD Executor] Starting GREEN phase - Implementing to pass tests');
    console.log('[TDD Executor] Target project:', projectPath);

    const prompt = this.buildGreenPhasePrompt(specification, testCode, tddSkillContent);

    try {
      const result = await this.executeWithSdk(prompt, projectPath, model, 'green');

      return {
        success: true,
        output: result.output,
        code: result.code,
        testOutput: result.testOutput,
        metadata: {
          executionTime: Date.now() - startTime,
          model,
          phase: 'green'
        }
      };
    } catch (error: any) {
      console.error('[TDD Executor] GREEN phase failed:', error.message);
      return {
        success: false,
        output: '',
        error: error.message,
        metadata: {
          executionTime: Date.now() - startTime,
          model,
          phase: 'green'
        }
      };
    }
  }

  /**
   * Execute REFACTOR phase - Clean up while keeping tests green
   */
  async executeRefactorPhase(
    testCode: string,
    implementationCode: string,
    reviewSkillContent: string,
    targetProjectPath?: string
  ): Promise<TddExecutionResult> {
    const startTime = Date.now();
    const projectPath = targetProjectPath || getTargetProjectPath();
    const model = await getPreferredModel();

    console.log('[TDD Executor] Starting REFACTOR phase - Cleaning up code');
    console.log('[TDD Executor] Target project:', projectPath);

    const prompt = this.buildRefactorPhasePrompt(testCode, implementationCode, reviewSkillContent);

    try {
      const result = await this.executeWithSdk(prompt, projectPath, model, 'refactor');

      return {
        success: true,
        output: result.output,
        code: result.code,
        testOutput: result.testOutput,
        metadata: {
          executionTime: Date.now() - startTime,
          model,
          phase: 'refactor'
        }
      };
    } catch (error: any) {
      console.error('[TDD Executor] REFACTOR phase failed:', error.message);
      return {
        success: false,
        output: '',
        error: error.message,
        metadata: {
          executionTime: Date.now() - startTime,
          model,
          phase: 'refactor'
        }
      };
    }
  }

  /**
   * Run tests in the target project
   */
  async runTests(targetProjectPath?: string): Promise<TestRunResult> {
    const projectPath = targetProjectPath || getTargetProjectPath();
    const startTime = Date.now();

    console.log('[TDD Executor] Running tests in:', projectPath);

    const prompt = `Run the tests in this project and report the results.

Execute the appropriate test command for this project (npm test, pytest, go test, etc.).

Report:
1. The exact command you ran
2. The full test output
3. Number of tests: passed, failed, skipped
4. Exit code

If tests fail, include the failure details.`;

    try {
      const model = await getPreferredModel();
      const result = await this.executeWithSdk(prompt, projectPath, model, 'test');

      // Parse test results from output
      const parsed = this.parseTestResults(result.output);

      return {
        exitCode: parsed.failed > 0 ? 1 : 0,
        output: result.testOutput || result.output,
        passed: parsed.passed,
        failed: parsed.failed,
        skipped: parsed.skipped,
        durationMs: Date.now() - startTime
      };
    } catch (error: any) {
      console.error('[TDD Executor] Test execution failed:', error.message);
      return {
        exitCode: 1,
        output: error.message,
        passed: 0,
        failed: 1,
        skipped: 0,
        durationMs: Date.now() - startTime
      };
    }
  }

  /**
   * Execute prompt with Claude Agent SDK
   */
  private async executeWithSdk(
    prompt: string,
    projectPath: string,
    model: string,
    phase: string
  ): Promise<{ output: string; code?: string; testOutput?: string }> {
    console.log(`[TDD Executor] Executing ${phase} phase with Claude Agent SDK`);
    console.log(`[TDD Executor] Model: ${model}`);
    console.log(`[TDD Executor] Project: ${projectPath}`);

    const sessionId = `tdd-${phase}-${Date.now()}`;

    const queryGenerator = query({
      prompt,
      options: {
        model,
        cwd: projectPath,
        additionalDirectories: [SKILLS_CONFIG.skillsDirectory],
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: this.apiKey,
        },
        allowDangerouslySkipPermissions: true,
        permissionMode: 'bypassPermissions',
      },
    });

    let output = '';
    let code = '';
    let testOutput = '';

    for await (const messageAny of queryGenerator) {
      const message = messageAny as any;

      if (message.type === 'assistant') {
        const textContent = message.message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');

        if (textContent) {
          output += textContent + '\n';

          // Extract code blocks
          const codeMatches = textContent.match(/```(?:typescript|javascript|python|go)?\n([\s\S]*?)```/g);
          if (codeMatches) {
            code += codeMatches.map((m: string) => m.replace(/```\w*\n?/g, '').replace(/```$/g, '')).join('\n\n');
          }
        }

        // Check for tool use (test execution)
        const toolUse = message.message.content.filter((block: any) => block.type === 'tool_use');
        for (const tool of toolUse) {
          console.log(`[TDD Executor] Tool called: ${tool.name}`);
        }
      } else if (message.type === 'tool_result') {
        // Capture test output from bash tool results
        if (message.content) {
          const resultStr = typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);

          if (resultStr.includes('PASS') || resultStr.includes('FAIL') ||
              resultStr.includes('passed') || resultStr.includes('failed')) {
            testOutput += resultStr + '\n';
          }
        }
      } else if (message.type === 'result') {
        if (message.subtype !== 'success') {
          throw new Error(`Execution failed: ${message.subtype}`);
        }
      }
    }

    return { output: output.trim(), code: code.trim(), testOutput: testOutput.trim() };
  }

  /**
   * Build RED phase prompt following superpowers TDD skill
   */
  private buildRedPhasePrompt(
    specification: string,
    clarifications: Record<string, string>,
    tddSkillContent: string
  ): string {
    const clarificationText = Object.entries(clarifications)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n');

    return `You are following the Test-Driven Development (TDD) methodology. You are in the RED phase.

## TDD Skill Instructions
${tddSkillContent}

## The Iron Law
"NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" — write tests before implementation.

## Your Task: RED Phase - Write Failing Tests

### Specification
${specification}

### Clarifications from User
${clarificationText}

### Instructions

1. **Analyze the specification** and identify all behaviors that need to be tested
2. **Write comprehensive test cases** that:
   - Cover the main functionality
   - Cover edge cases
   - Cover error conditions
   - Use descriptive test names
3. **Create the test file(s)** in the appropriate location for this project
4. **Run the tests** to verify they FAIL (this is expected and required!)
5. **Report the test results** showing the failures

The tests MUST fail at this point because no implementation exists yet. This proves the tests are actually testing something.

Write the tests now and run them to confirm they fail.`;
  }

  /**
   * Build GREEN phase prompt following superpowers TDD skill
   */
  private buildGreenPhasePrompt(
    specification: string,
    testCode: string,
    tddSkillContent: string
  ): string {
    return `You are following the Test-Driven Development (TDD) methodology. You are in the GREEN phase.

## TDD Skill Instructions
${tddSkillContent}

## Your Task: GREEN Phase - Make Tests Pass

### Specification
${specification}

### Failing Tests to Make Pass
\`\`\`
${testCode}
\`\`\`

### Instructions

1. **Review the failing tests** to understand exactly what behavior is expected
2. **Write the MINIMAL implementation** to make all tests pass:
   - Don't add features not covered by tests
   - Don't optimize prematurely
   - Don't refactor yet
   - Just make the tests pass with the simplest code possible
3. **Create/modify implementation file(s)** as needed
4. **Run the tests** to verify they ALL PASS
5. **Report the test results** showing all tests passing

Remember: Write the SIMPLEST code that makes the tests pass. Nothing more.

Implement now and run tests to verify they pass.`;
  }

  /**
   * Build REFACTOR phase prompt
   */
  private buildRefactorPhasePrompt(
    testCode: string,
    implementationCode: string,
    reviewSkillContent: string
  ): string {
    return `You are following the Test-Driven Development (TDD) methodology. You are in the REFACTOR phase.

## Code Review Skill Instructions
${reviewSkillContent || 'Apply clean code principles and best practices.'}

## Your Task: REFACTOR Phase - Clean Up While Keeping Tests Green

### Current Test Code
\`\`\`
${testCode}
\`\`\`

### Current Implementation Code
\`\`\`
${implementationCode}
\`\`\`

### Instructions

1. **Review the code** for:
   - Duplication (DRY violations)
   - Poor naming
   - Complex logic that could be simplified
   - Missing error handling
   - Code style issues

2. **Refactor carefully**:
   - Make ONE change at a time
   - Run tests after EACH change
   - If tests fail, REVERT immediately
   - Keep improving while tests stay green

3. **Do NOT**:
   - Add new features
   - Change test behavior
   - Break any tests

4. **Run tests** after all refactoring to confirm everything still passes

5. **Report** what was refactored and confirm tests pass

Refactor now, running tests after each change.`;
  }

  /**
   * Parse test results from output
   */
  private parseTestResults(output: string): { passed: number; failed: number; skipped: number } {
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // Try to parse common test output formats

    // Jest/Vitest format: "Tests: X passed, Y failed"
    const jestMatch = output.match(/Tests?:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?(?:,\s*(\d+)\s*skipped)?/i);
    if (jestMatch) {
      passed = parseInt(jestMatch[1]) || 0;
      failed = parseInt(jestMatch[2]) || 0;
      skipped = parseInt(jestMatch[3]) || 0;
      return { passed, failed, skipped };
    }

    // Pytest format: "X passed, Y failed"
    const pytestMatch = output.match(/(\d+)\s*passed(?:,\s*(\d+)\s*failed)?(?:,\s*(\d+)\s*skipped)?/i);
    if (pytestMatch) {
      passed = parseInt(pytestMatch[1]) || 0;
      failed = parseInt(pytestMatch[2]) || 0;
      skipped = parseInt(pytestMatch[3]) || 0;
      return { passed, failed, skipped };
    }

    // Go format: "ok" or "FAIL"
    const goPassMatch = output.match(/ok\s+\S+\s+[\d.]+s/g);
    const goFailMatch = output.match(/FAIL\s+\S+/g);
    if (goPassMatch || goFailMatch) {
      passed = goPassMatch?.length || 0;
      failed = goFailMatch?.length || 0;
      return { passed, failed, skipped };
    }

    // Count ✓ and ✗ symbols
    const checkMarks = (output.match(/[✓✔]/g) || []).length;
    const crossMarks = (output.match(/[✗✘×]/g) || []).length;
    if (checkMarks || crossMarks) {
      passed = checkMarks;
      failed = crossMarks;
      return { passed, failed, skipped };
    }

    // Default: assume failure if we can't parse
    console.warn('[TDD Executor] Could not parse test results from output');
    return { passed: 0, failed: 1, skipped: 0 };
  }
}

// Singleton instance
export const tddAgentExecutor = new TddAgentExecutor();
