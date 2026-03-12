/**
 * BMAD v6 Alpha Formatter
 * Converts workflow structures to BMAD v6 YAML and Claude Command formats
 */

import yaml from 'js-yaml';
import type { WorkflowGenerationResult, WorkflowStep } from '@/types/workflow';

export class BMadFormatter {
  /**
   * Convert workflow to BMAD v6 YAML format
   */
  toYaml(workflow: WorkflowGenerationResult): string {
    const bmadWorkflow = {
      // Metadata
      name: workflow.name,
      version: '1.0.0',
      description: workflow.description,
      author: 'custom-workflow-builder',
      created: new Date().toISOString().split('T')[0],
      
      // v6: Two-phase structure
      phases: {
        planning: this.formatPlanningPhase(workflow),
        build: this.formatBuildPhase(workflow),
      },
      
      // v6: Execution configuration
      execution: {
        deterministic: true,
        reproducible: true,
        captureManifest: true,
        manifestPath: 'project-manifests/',
        
        modelAdapter: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          profile: 'high-quality',
          temperature: 0.1,
        },
        
        observability: {
          logLevel: 'info',
          structuredLogs: true,
          traceTools: true,
          trackTokens: true,
          trackTime: true,
          exportFormat: 'json',
        },
        
        budgets: {
          global: {
            tokens: 200000,
            time: 7200000, // 2 hours
          },
        },
      },
      
      // v6: Policies
      policies: this.generatePolicies(workflow),
      
      // Metadata
      metadata: {
        tags: ['custom', 'auto-generated'],
        category: 'software-development',
        bmadVersion: '6.0.0-alpha',
      },
    };
    
    return yaml.dump(bmadWorkflow, {
      indent: 2,
      lineWidth: 100,
      noRefs: true,
    });
  }
  
  /**
   * Format planning phase (v6)
   */
  private formatPlanningPhase(workflow: WorkflowGenerationResult) {
    const planningSteps = workflow.steps.filter(s => s.phase === 'planning');
    
    return {
      required: true,
      description: 'Create deterministic blueprint',
      
      agents: workflow.phases.planning.agents.map(agent => ({
        name: agent.name,
        role: agent.role,
        tools: agent.tools,
        outputContract: agent.outputContract || {
          type: `${agent.role}-output`,
          format: 'markdown',
        },
      })),
      
      outputs: workflow.phases.planning.outputs || {
        taskList: 'blueprints/task-list.yaml',
        fileManifest: 'blueprints/file-manifest.yaml',
        acceptanceTests: 'blueprints/acceptance-tests.yaml',
      },
      
      validation: this.generateValidationCriteria(planningSteps),
    };
  }
  
  /**
   * Format build phase (v6)
   */
  private formatBuildPhase(workflow: WorkflowGenerationResult) {
    const buildSteps = workflow.steps.filter(s => s.phase === 'build');
    
    return {
      required: true,
      dependsOn: 'planning',
      description: 'Implement based on blueprint',
      
      inputs: {
        taskList: '$planning.outputs.taskList',
        fileManifest: '$planning.outputs.fileManifest',
        acceptanceTests: '$planning.outputs.acceptanceTests',
      },
      
      agents: workflow.phases.build.agents.map(agent => ({
        name: agent.name,
        role: agent.role,
        inputContract: {
          type: 'planning-outputs',
          format: 'yaml',
        },
        tools: agent.tools,
        budget: agent.budget || {
          tokens: 100000,
          time: 3600000, // 1 hour
        },
      })),
      
      verification: {
        runTests: true,
        validateOutputs: true,
        checkCoverage: false,
      },
      
      validation: this.generateValidationCriteria(buildSteps),
    };
  }
  
  /**
   * Generate validation criteria from steps
   */
  private generateValidationCriteria(steps: WorkflowStep[]): string[] {
    return steps.map(step => 
      `${step.name} completed successfully`
    );
  }
  
  /**
   * Generate policies based on workflow tools
   */
  private generatePolicies(workflow: WorkflowGenerationResult) {
    const hasBash = workflow.tools.includes('bash');
    const hasWrite = workflow.tools.includes('write');
    const hasEdit = workflow.tools.includes('edit');
    
    return {
      // File write restrictions
      fileWrite: {
        mode: 'allowlist',
        allowed: [
          'src/**',
          'tests/**',
          'docs/**',
          'blueprints/**',
        ],
        denied: [
          '.git/**',
          'node_modules/**',
          '.env*',
          '*.key',
          '*.pem',
        ],
      },
      
      // Network access
      network: {
        mode: 'allowlist',
        allowedDomains: [
          'api.anthropic.com',
          'api.openai.com',
        ],
        deniedDomains: ['*.internal'],
      },
      
      // Data boundaries
      dataBoundaries: {
        canAccessPII: false,
        canAccessSecrets: false,
        canAccessCredentials: false,
      },
      
      // Tool restrictions
      tools: {
        allowed: workflow.tools,
        denied: ['delete', 'system_call'],
      },
    };
  }
  
  /**
   * Convert workflow to Claude Command markdown
   */
  toCommandMarkdown(workflow: WorkflowGenerationResult): string {
    const tools = workflow.tools.map(t => 
      t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')
    ).join(', ');
    
    const title = workflow.name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return `---
allowed-tools: ${tools}
description: ${workflow.description}
model: sonnet
bmad-version: 6.0.0-alpha
---

# ${title}

${workflow.description}

## Prerequisites

- BMAD v6 Alpha installed
- Project initialized
- Claude API key configured

## Phase 1: Planning (Deterministic Blueprint)

${this.formatPlanningStepsMarkdown(workflow)}

### Planning Outputs

After Phase 1, the following artifacts will be generated:

- \`blueprints/task-list.yaml\` - Complete task breakdown
- \`blueprints/file-manifest.yaml\` - Files to create/modify
- \`blueprints/acceptance-tests.yaml\` - Success criteria

## Phase 2: Build & Verify

${this.formatBuildStepsMarkdown(workflow)}

### Verification

${this.formatVerificationMarkdown(workflow)}

## Execution Manifest

After execution, a manifest will be saved to:

\`project-manifests/manifest-{timestamp}.json\`

This manifest enables:
- Reproducible executions
- Output comparison
- Performance analysis

## Rerun Execution

To rerun with the same inputs:

\`\`\`bash
bmad rerun --manifest project-manifests/manifest-{timestamp}.json
\`\`\`

## Success Criteria

${workflow.steps.map((step, i) => `- [ ] ${step.name}`).join('\n')}

## Troubleshooting

If execution fails:

1. Check logs: \`bmad logs --level debug\`
2. Verify prerequisites are met
3. Review error messages in manifest
4. Check policy compliance

## Next Steps

After successful execution:

1. Review generated artifacts
2. Verify all acceptance tests pass
3. Check execution metrics
4. Archive manifest for future reference
`;
  }
  
  /**
   * Format planning steps for markdown
   */
  private formatPlanningStepsMarkdown(workflow: WorkflowGenerationResult): string {
    const planningSteps = workflow.steps.filter(s => s.phase === 'planning');
    
    return planningSteps.map((step, i) => `
### Step ${i + 1}: ${step.name}

**Agent**: ${step.agent}
**Tool**: ${step.tool}

${step.description}

${step.command ? `\`\`\`bash\n${step.command}\n\`\`\`` : ''}
`).join('\n');
  }
  
  /**
   * Format build steps for markdown
   */
  private formatBuildStepsMarkdown(workflow: WorkflowGenerationResult): string {
    const buildSteps = workflow.steps.filter(s => s.phase === 'build');
    
    return buildSteps.map((step, i) => `
### Step ${i + 1}: ${step.name}

**Agent**: ${step.agent}
**Tool**: ${step.tool}
${step.dependsOn ? `**Depends On**: ${step.dependsOn}` : ''}

${step.description}

${step.command ? `\`\`\`bash\n${step.command}\n\`\`\`` : ''}

**Input**: Uses outputs from planning phase

${step.dependsOn ? `**Note**: This step waits for "${step.dependsOn}" to complete first.` : ''}
`).join('\n');
  }
  
  /**
   * Format verification section
   */
  private formatVerificationMarkdown(workflow: WorkflowGenerationResult): string {
    const hasTests = workflow.steps.some(s => 
      s.name.toLowerCase().includes('test') || 
      s.command?.includes('test')
    );
    
    return `
All build phase steps will be validated against the acceptance tests from Phase 1.

**Validation checks**:
${hasTests ? '- All tests pass' : '- Implementation matches blueprint'}
- Outputs match file manifest
- No policy violations
- Budget limits not exceeded

**On success**: Workflow completes and manifest is saved
**On failure**: Execution stops and detailed error report is generated
`;
  }
  
  /**
   * Generate blueprints (v6 planning outputs)
   */
  generateBlueprints(workflow: WorkflowGenerationResult): {
    taskList: string;
    fileManifest: string;
    acceptanceTests: string;
  } {
    return {
      taskList: yaml.dump({
        workflow: workflow.name,
        tasks: workflow.steps.map(step => ({
          id: step.id,
          name: step.name,
          description: step.description,
          agent: step.agent,
          phase: step.phase,
          status: 'pending',
        })),
      }),
      
      fileManifest: yaml.dump({
        workflow: workflow.name,
        files: {
          toCreate: [],  // Will be populated during planning phase
          toModify: [],
          toDelete: [],
        },
        note: 'This manifest will be populated during the planning phase execution',
      }),
      
      acceptanceTests: yaml.dump({
        workflow: workflow.name,
        tests: workflow.steps.map(step => ({
          step: step.id,
          criteria: `${step.name} completed successfully`,
          validation: 'manual', // Can be automated in future
        })),
      }),
    };
  }
}

// Export singleton instance
export const bmadFormatter = new BMadFormatter();

