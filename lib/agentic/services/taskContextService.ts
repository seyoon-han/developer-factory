/**
 * Task Context Service
 * Manages a living markdown context document for each task
 * that accumulates information across all workflow phases
 */

import fs from 'fs';
import path from 'path';
import { AgenticTask } from '@/types/agentic-task';

const TASK_CONTEXTS_DIR = path.join(process.cwd(), 'data', 'task-contexts');

export interface ContextSection {
  heading: string;
  content: string;
  timestamp?: string;
}

export class TaskContextService {
  constructor() {
    // Ensure contexts directory exists
    if (!fs.existsSync(TASK_CONTEXTS_DIR)) {
      fs.mkdirSync(TASK_CONTEXTS_DIR, { recursive: true });
    }
  }

  /**
   * Get path to context file for a task
   */
  getContextPath(taskId: number): string {
    return path.join(TASK_CONTEXTS_DIR, `task-${taskId}-context.md`);
  }

  /**
   * Initialize context document when task is created
   */
  initializeContext(task: AgenticTask): void {
    const contextPath = this.getContextPath(task.id);
    
    const initialContent = `# Task Context: ${task.title}

> **Task ID:** ${task.id} | **Created:** ${new Date().toISOString()} | **Priority:** ${task.priority}

---

## 1. Original Request

${task.description || '_No description provided._'}

---

## 2. Brainstorming Analysis

_Pending brainstorming phase..._

---

## 3. Clarifications

| # | Question | Answer | Status |
|---|----------|--------|--------|
| - | _Pending..._ | - | ⏳ |

---

## 4. Design Decisions

_To be determined after clarifications..._

---

## 5. Implementation Plan

_Pending planning phase..._

---

## 6. Progress Notes

_Updated during implementation..._

---

## 7. Issues & Learnings

_Problems encountered and solutions found..._

---

*Last updated: ${new Date().toISOString()}*
`;

    fs.writeFileSync(contextPath, initialContent, 'utf-8');
  }

  /**
   * Read the full context document
   */
  readContext(taskId: number): string | null {
    const contextPath = this.getContextPath(taskId);
    if (!fs.existsSync(contextPath)) {
      return null;
    }
    return fs.readFileSync(contextPath, 'utf-8');
  }

  /**
   * Update a specific section in the context document
   */
  updateSection(taskId: number, sectionNumber: number, sectionTitle: string, content: string): void {
    const contextPath = this.getContextPath(taskId);
    let doc = this.readContext(taskId);
    
    if (!doc) {
      console.warn(`[TaskContextService] No context file for task ${taskId}, creating...`);
      // Create minimal context if it doesn't exist
      doc = `# Task Context\n\n`;
    }

    const timestamp = new Date().toISOString();
    const sectionHeader = `## ${sectionNumber}. ${sectionTitle}`;
    const sectionContent = `${sectionHeader}\n\n*Updated: ${timestamp}*\n\n${content}\n\n---\n`;

    // Find and replace the section, or append if not found
    // Improved regex to handle various endings
    const sectionRegex = new RegExp(`## ${sectionNumber}\\. ${sectionTitle}[\\s\\S]*?(?=\\n## \\d|\\n\\*Last updated:|$)`, 'i');
    
    if (sectionRegex.test(doc)) {
      console.log(`[TaskContextService] Updating existing section ${sectionNumber} for task ${taskId}`);
      doc = doc.replace(sectionRegex, sectionContent);
    } else {
      console.log(`[TaskContextService] Appending new section ${sectionNumber} for task ${taskId}`);
      // Append before the last update line or at the end
      const lastUpdateRegex = /\n\*Last updated:.*\*\s*$/;
      if (lastUpdateRegex.test(doc)) {
        doc = doc.replace(lastUpdateRegex, `\n${sectionContent}\n*Last updated: ${timestamp}*\n`);
      } else {
        doc += `\n${sectionContent}`;
      }
    }

    // Update last modified timestamp
    doc = doc.replace(/\*Last updated:.*\*/, `*Last updated: ${timestamp}*`);
    if (!doc.includes('*Last updated:')) {
        doc += `\n\n*Last updated: ${timestamp}*`;
    }

    fs.writeFileSync(contextPath, doc, 'utf-8');
  }

  /**
   * Update brainstorming analysis section
   */
  updateBrainstormingAnalysis(taskId: number, analysis: string): void {
    this.updateSection(taskId, 2, 'Brainstorming Analysis', analysis);
  }

  /**
   * Update clarifications section with Q&A table
   */
  updateClarifications(
    taskId: number, 
    clarifications: Array<{
      question: string;
      answer?: string;
      answered: boolean;
    }>
  ): void {
    let tableContent = '| # | Question | Answer | Status |\n|---|----------|--------|--------|\n';
    
    clarifications.forEach((c, i) => {
      const status = c.answered ? '✅' : '⏳';
      const answer = c.answer || '_Pending..._';
      // Escape pipe characters in content
      const safeQuestion = c.question.replace(/\|/g, '\\|').substring(0, 80);
      const safeAnswer = answer.replace(/\|/g, '\\|').substring(0, 100);
      tableContent += `| ${i + 1} | ${safeQuestion} | ${safeAnswer} | ${status} |\n`;
    });

    this.updateSection(taskId, 3, 'Clarifications', tableContent);
  }

  /**
   * Update design decisions section
   */
  updateDesignDecisions(taskId: number, decisions: string): void {
    this.updateSection(taskId, 4, 'Design Decisions', decisions);
  }

  /**
   * Update implementation plan section
   */
  updateImplementationPlan(taskId: number, planOverview: string, steps: Array<{ title: string; description: string }>): void {
    let content = `### Overview\n\n${planOverview}\n\n### Steps\n\n`;
    
    steps.forEach((step, i) => {
      content += `${i + 1}. **${step.title}**\n   ${step.description}\n\n`;
    });

    this.updateSection(taskId, 5, 'Implementation Plan', content);
  }

  /**
   * Add progress note for a step
   */
  addProgressNote(taskId: number, stepTitle: string, status: 'pending' | 'in_progress' | 'completed' | 'failed', notes?: string): void {
    const contextPath = this.getContextPath(taskId);
    let doc = this.readContext(taskId);
    if (!doc) return;

    const statusEmoji = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      failed: '❌'
    }[status];

    const timestamp = new Date().toISOString();
    const noteEntry = `\n### ${stepTitle}\n- **Status:** ${statusEmoji} ${status}\n- **Time:** ${timestamp}\n${notes ? `- **Notes:** ${notes}\n` : ''}`;

    // Find the Progress Notes section and append
    const progressSectionRegex = /(## 6\. Progress Notes[\s\S]*?)(\n---\n|\n## 7\.)/;
    const match = doc.match(progressSectionRegex);
    
    if (match) {
      const existingSection = match[1];
      const nextSection = match[2];
      
      // Remove placeholder text if present
      const cleanedSection = existingSection.replace(/_Updated during implementation\.\.\._/i, '');
      
      doc = doc.replace(progressSectionRegex, `${cleanedSection}${noteEntry}${nextSection}`);
      
      // Update timestamp
      doc = doc.replace(/\*Last updated:.*\*/, `*Last updated: ${timestamp}*`);
      
      fs.writeFileSync(contextPath, doc, 'utf-8');
    }
  }

  /**
   * Add issue or learning
   */
  addIssueOrLearning(taskId: number, type: 'issue' | 'learning' | 'solution', content: string): void {
    const contextPath = this.getContextPath(taskId);
    let doc = this.readContext(taskId);
    if (!doc) return;

    const timestamp = new Date().toISOString();
    const emoji = type === 'issue' ? '⚠️' : type === 'solution' ? '💡' : '📝';
    const entry = `\n- ${emoji} **${type.charAt(0).toUpperCase() + type.slice(1)}** (${timestamp.split('T')[0]}): ${content}`;

    // Find Issues & Learnings section and append
    const issuesSectionRegex = /(## 7\. Issues & Learnings[\s\S]*?)(\n\*Last updated:|\n---\n|$)/;
    const match = doc.match(issuesSectionRegex);
    
    if (match) {
      const existingSection = match[1];
      const ending = match[2] || '';
      
      // Remove placeholder text
      const cleanedSection = existingSection.replace(/_Problems encountered and solutions found\.\.\._/i, '');
      
      doc = doc.replace(issuesSectionRegex, `${cleanedSection}${entry}${ending}`);
      
      // Update timestamp
      const newTimestamp = new Date().toISOString();
      doc = doc.replace(/\*Last updated:.*\*/, `*Last updated: ${newTimestamp}*`);
      
      fs.writeFileSync(contextPath, doc, 'utf-8');
    }
  }

  /**
   * Get context formatted for use in prompts (condensed version)
   */
  getContextForPrompt(taskId: number): string {
    const fullContext = this.readContext(taskId);
    if (!fullContext) return '';

    // Return the full context - the LLM can extract what's relevant
    // Could add summarization here if context gets too large
    return `## Task Context Document\n\nThe following is the accumulated context for this task:\n\n${fullContext}`;
  }

  /**
   * Check if context file exists
   */
  hasContext(taskId: number): boolean {
    return fs.existsSync(this.getContextPath(taskId));
  }

  /**
   * Delete context file (when task is archived)
   */
  deleteContext(taskId: number): void {
    const contextPath = this.getContextPath(taskId);
    if (fs.existsSync(contextPath)) {
      fs.unlinkSync(contextPath);
    }
  }

  /**
   * Copy context to worktree (so it travels with the code)
   */
  copyToWorktree(taskId: number, worktreePath: string): void {
    const sourcePath = this.getContextPath(taskId);
    if (!fs.existsSync(sourcePath)) return;

    const docsDir = path.join(worktreePath, 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const destPath = path.join(docsDir, 'TASK_CONTEXT.md');
    fs.copyFileSync(sourcePath, destPath);
  }
}

// Singleton instance
export const taskContextService = new TaskContextService();
export default taskContextService;

