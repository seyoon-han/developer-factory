/**
 * Microsoft Amplifier Formatter
 * Formats workflows for Amplifier framework
 * SEPARATE from BMAD to avoid confusion
 */

import type { AmplifierWorkflowResult } from './amplifierGenerator';

export class AmplifierFormatter {
  /**
   * Convert workflow to Amplifier command markdown
   * Amplifier uses simpler format than BMAD (no complex YAML)
   */
  toCommandMarkdown(workflow: AmplifierWorkflowResult): string {
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
framework: amplifier
workflow-type: ${workflow.workflowType}
---

# ${title}

**Framework**: Microsoft Amplifier  
**Type**: ${this.getWorkflowTypeLabel(workflow.workflowType)}

${workflow.description}

## Amplifier Agents

This workflow uses the following specialized Amplifier agents:

${workflow.agents.map(agent => `- **${agent}**: ${this.getAgentDescription(agent)}`).join('\n')}

## Workflow Steps

${this.formatSteps(workflow)}

${this.formatWorkflowTypeGuidance(workflow.workflowType)}

## Success Criteria

${workflow.steps.map((step, i) => `- [ ] ${step.name} completed`).join('\n')}

## Execution

Execute this workflow in Claude Code:

\`\`\`bash
/${workflow.name}
\`\`\`

Or using Amplifier's make commands (if Amplifier is installed):

\`\`\`bash
make workflow ${workflow.name}
\`\`\`

## Documentation

This workflow follows Amplifier's best practices:
- Clear agent specialization
- ${workflow.workflowType === 'ddd' ? 'Document-driven development methodology' : 'Expert-driven approach'}
- Isolated, focused tasks
- Clean separation of concerns
`;
  }
  
  /**
   * Format workflow steps
   */
  private formatSteps(workflow: AmplifierWorkflowResult): string {
    return workflow.steps.map((step, i) => `
### Step ${i + 1}: ${step.name}

**Agent**: \`${step.agent}\`  
**Tool**: \`${step.tool}\`  
${step.documentType ? `**Document Type**: ${step.documentType}` : ''}

${step.description}

${step.command ? `\`\`\`bash\n${step.command}\n\`\`\`` : ''}
`).join('\n');
  }
  
  /**
   * Get workflow type label
   */
  private getWorkflowTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'ddd': 'Document-Driven Development',
      'agent-based': 'Specialized Agent Workflow',
      'parallel': 'Parallel Development',
      'standard': 'Standard Sequential Workflow',
    };
    return labels[type] || type;
  }
  
  /**
   * Get agent description
   */
  private getAgentDescription(agent: string): string {
    const descriptions: Record<string, string> = {
      'zen-architect': 'System design and architecture expert',
      'bug-hunter': 'Debugging and issue resolution specialist',
      'security-guardian': 'Security auditing and vulnerability analysis',
      'doc-master': 'Documentation and technical writing',
      'test-engineer': 'Test creation and quality assurance',
      'code-reviewer': 'Code quality and review expert',
      'performance-optimizer': 'Performance analysis and optimization',
      'deploy-specialist': 'Deployment and DevOps automation',
    };
    return descriptions[agent] || 'Specialized Amplifier agent';
  }
  
  /**
   * Format workflow-type specific guidance
   */
  private formatWorkflowTypeGuidance(type: string): string {
    const guidance: Record<string, string> = {
      'ddd': `
## Document-Driven Development Flow

This workflow follows Amplifier's DDD pattern:

1. **Plan**: Design the feature architecture
2. **Docs**: Create comprehensive documentation
3. **Code Plan**: Plan implementation approach
4. **Code**: Implement following the docs
5. **Finish**: Finalize and clean up

Each phase builds on the previous, ensuring documentation and code stay in sync.
`,
      'agent-based': `
## Agent-Based Workflow

This workflow leverages Amplifier's specialized agents:

- Each agent focuses on their area of expertise
- Agents work sequentially or in parallel as needed
- Clear handoffs between specialized roles
`,
      'parallel': `
## Parallel Development

This workflow enables exploring multiple approaches:

- Multiple solutions developed simultaneously
- Compare and choose the best approach
- Uses Amplifier's worktree capabilities
`,
      'standard': `
## Standard Sequential Workflow

This workflow follows a linear execution path:

- Steps execute in order
- Each step builds on previous results
- Clear dependencies and flow
`,
    };
    
    return guidance[type] || '';
  }
  
  /**
   * Generate simple config file (Amplifier uses simpler format than BMAD)
   */
  toConfigFile(workflow: AmplifierWorkflowResult): string {
    return `# Amplifier Workflow Configuration
name: ${workflow.name}
description: ${workflow.description}
framework: amplifier
type: ${workflow.workflowType}
version: 1.0.0

agents:
${workflow.agents.map(agent => `  - ${agent}`).join('\n')}

tools:
${workflow.tools.map(tool => `  - ${tool}`).join('\n')}

steps:
${workflow.steps.map(step => `  - id: ${step.id}
    name: ${step.name}
    agent: ${step.agent}
    tool: ${step.tool}${step.documentType ? `\n    documentType: ${step.documentType}` : ''}`).join('\n')}
`;
  }
}

// Export singleton
export const amplifierFormatter = new AmplifierFormatter();

