'use client';

/**
 * Agentic Workflow User Guide
 * Documentation for the agentic dev workflow system
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils/cn';

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: `
# Agentic Dev Workflow

The Agentic Dev Workflow is an AI-powered development system that guides tasks through a structured pipeline from brainstorming to completion.

## Workflow Phases

1. **TODO** - Task backlog, ready to start
2. **Brainstorming** - AI analyzes requirements and generates clarification questions
3. **Clarifying** - User answers questions to refine understanding
4. **Planning** - AI creates detailed implementation plan
5. **Plan Review** - User reviews and edits the plan before execution
6. **In Progress** - AI executes the plan step-by-step
7. **Verifying** - Running tests and verification checks
8. **Done** - Task completed and archived

## Key Features

- **Multi-repo orchestration** via Project Groups
- **Git worktree isolation** for each task
- **Coordinated PRs** across repositories
- **Configurable execution strategies**
- **Real-time progress streaming**
- **Slack notifications** per project group
    `
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: `
# Getting Started

## 1. Create a Project Group

Before creating tasks, set up a Project Group to organize your repositories.

1. Go to **Settings > Project Groups**
2. Click **Create Group**
3. Add projects (repos) to the group
4. Mark one as the primary project

## 2. Upload Global Documents

Add reference documents that can be attached to any task.

1. Go to **Settings > Global Documents**
2. Upload PDFs, markdown files, or text documents
3. Documents can be categorized and tagged

## 3. Create Your First Task

1. Click **NEW TASK** in the header
2. Follow the wizard:
   - Enter title and description
   - Select a Project Group
   - Attach relevant documents
   - Configure options (optional)
3. Submit to start the workflow

## 4. Answer Clarifications

When the AI has questions:
1. Click on the task card
2. Go to the **Clarifications** tab
3. Select suggested answers or type custom responses
4. Submit each answer

## 5. Review the Plan

After clarifications:
1. Open the task detail panel
2. Go to the **Plan** tab
3. Review each step
4. Click **Approve** to proceed or **Reject** to regenerate
    `
  },
  {
    id: 'configuration',
    title: 'Configuration',
    content: `
# Configuration Options

## Task Options

When creating a task, you can configure:

### Error Handling
- **Auto Retry** - Automatically retry on transient failures (up to 3 times)
- **Immediate Pause** - Stop on any error for manual review
- **Smart Recovery** - AI attempts to diagnose and fix issues (default)

### Execution Strategy
- **Single Agent** - One agent executes all steps sequentially
- **Subagent Per Step** - Fresh agent for each step (default, better isolation)
- **Batched Checkpoint** - Execute in batches with user checkpoints

### Code Review Points
- **Never** - No AI code review
- **After Each Step** - Review after every step
- **After Each Batch** - Review after batches
- **Before Verification** - Single review before final checks (default)

### Auto Advance
- **Enabled** (default) - Automatically proceed through phases
- **Disabled** - Manual confirmation at each phase transition

## Queue Settings

Configure in **Settings > Queue Settings**:
- Max concurrent tasks (1-5)
- Auto-start queue
- Pause on error
- Retry attempts and delay

## MCP Servers

Add custom MCP servers per task for additional context:
- Confluence integration
- Context7 documentation
- Custom servers
    `
  },
  {
    id: 'project-groups',
    title: 'Project Groups',
    content: `
# Project Groups

Project Groups enable multi-repository orchestration.

## Creating a Group

1. Navigate to **Settings > Project Groups**
2. Click **Create Group**
3. Enter a name and description
4. Add projects from the registered list

## Managing Projects in Groups

Each group can contain multiple repositories:
- One project can be marked as **primary**
- The primary project is the main target for changes
- Other projects provide context and may receive coordinated updates

## Git Worktree Strategy

For each task:
1. A git worktree is created in each project of the group
2. Branch naming: \`agentic/task-{id}-{slug}\`
3. All work happens in isolated worktrees
4. Worktrees are cleaned up after PR merge

## Coordinated PRs

When a task completes:
1. PRs are created in each project with changes
2. PRs are linked in a "PR Group"
3. Merge all together for atomic updates
4. Rollback branches are preserved for safety
    `
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: `
# Troubleshooting

## Common Issues

### Task Stuck in Phase

1. Check the **Logs** tab for errors
2. Try pausing and resuming the queue
3. Check if user input is required (clarifications, plan review)

### Pipeline Errors

If you see "Pipeline error":
1. Open the task detail panel
2. Check the error message in logs
3. Common causes:
   - Missing API keys
   - Git permission issues
   - Network timeouts

### Verification Failures

If checks fail:
1. Review the stdout/stderr in the Verification tab
2. Options:
   - **Re-run Checks** - Try again
   - **Fix Issues** - Go back to implementation
   - **Approve Anyway** - Skip failures (use carefully)

### Queue Not Starting

1. Check queue status in the header
2. Verify queue is enabled in settings
3. Ensure max concurrent > 0
4. Check for blocked tasks requiring input

## Rollback Procedure

If something goes wrong after merge:
1. Go to **Task History**
2. Find the task
3. Note the rollback branch names
4. Use git to reset:
   \`\`\`bash
   git checkout rollback/task-{id}
   git checkout -b fix/rollback-{id}
   \`\`\`

## Getting Help

- Check server logs at **/logs**
- Review the Agentic board settings
- Ensure all required API keys are configured
    `
  },
];

export default function UserGuidePage() {
  const [activeSection, setActiveSection] = useState('overview');

  const currentSection = sections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/agentic"
              className="text-xs font-mono text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors uppercase"
            >
              ← Back to Board
            </a>
            <h1 className="text-xl font-bold text-[hsl(var(--primary))] uppercase tracking-wider font-mono">
              User Guide
            </h1>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Sidebar Navigation */}
        <nav className="w-64 border-r border-[hsl(var(--border))] p-4 overflow-y-auto bg-[hsl(var(--card))]">
          <div className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-[2px] text-sm font-mono transition-colors',
                  activeSection === section.id
                    ? 'bg-[hsl(var(--primary))] text-black font-bold'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                )}
              >
                {section.title}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            <article className="prose prose-invert prose-sm max-w-none">
              <div 
                className="markdown-content"
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdown(currentSection?.content || '') 
                }}
              />
            </article>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .markdown-content h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: hsl(var(--primary));
          margin-bottom: 1rem;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .markdown-content h2 {
          font-size: 1.125rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          font-family: var(--font-mono);
        }
        .markdown-content h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-family: var(--font-mono);
        }
        .markdown-content p {
          font-size: 0.75rem;
          line-height: 1.6;
          color: hsl(var(--muted-foreground));
          margin-bottom: 0.75rem;
        }
        .markdown-content ul, .markdown-content ol {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          margin-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .markdown-content li {
          margin-bottom: 0.25rem;
        }
        .markdown-content code {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          background: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 2px;
          color: hsl(var(--primary));
        }
        .markdown-content pre {
          background: black;
          border: 1px solid hsl(var(--border));
          padding: 1rem;
          border-radius: 3px;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .markdown-content pre code {
          background: transparent;
          padding: 0;
        }
        .markdown-content strong {
          color: hsl(var(--foreground));
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

// Simple markdown renderer
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
    // Wrap consecutive li in ul
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Paragraphs (simple approach)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, function(match) {
      if (match.startsWith('<')) return match;
      return `<p>${match}</p>`;
    })
    // Clean up
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[123]>)/g, '$1')
    .replace(/(<\/h[123]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<pre>)/g, '$1')
    .replace(/(<\/pre>)<\/p>/g, '$1');
}

