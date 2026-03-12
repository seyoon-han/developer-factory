/**
 * Implementation Report Generator
 * Generates comprehensive reports after task implementation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { statements } from '@/lib/db/postgres';
import { implementationLogs } from './implementationLogs';
import { getTargetProjectPath } from '@/lib/config/workspace';

const execAsync = promisify(exec);

export interface ImplementationReportData {
  taskId: number;
  taskTitle: string;
  taskDescription: string;
  enhancedPrompt: string;
  restoreBranch: string;
  implementationCommit: string;
  elapsedSeconds: number;
  filesChanged: string[];
  implementationLogs: any[];
}

export class ReportGenerator {
  /**
   * Generate comprehensive implementation report
   */
  async generateReport(data: ImplementationReportData): Promise<string> {
    console.log(`📝 Generating implementation report for task #${data.taskId}...`);

    const {
      taskId,
      taskTitle,
      taskDescription,
      enhancedPrompt,
      restoreBranch,
      implementationCommit,
      elapsedSeconds,
      implementationLogs: logs,
    } = data;

    // Get implementation details to check for refinement
    const impl = await statements.getImplementation.get(taskId) as any;
    const refinementRound = impl?.refinement_round || 1;
    const previousReport = impl?.implementation_report || '';
    const refinementFeedback = impl?.refinement_feedback || '';

    // Get list of changed files from git
    const filesChanged = await this.getChangedFiles(restoreBranch);

    // Get git diff
    const gitDiff = await this.getGitDiff(restoreBranch);

    // Format logs
    const formattedLogs = this.formatLogs(logs);

    // If this is a refinement round, append to previous report
    if (refinementRound > 1 && previousReport) {
      console.log(`📝 Appending refinement round ${refinementRound} to existing report`);
      
      const refinementSection = `

---

## 🔄 Refinement Round ${refinementRound}

**Generated:** ${new Date().toISOString()}  
**Duration:** ${elapsedSeconds}s

### User Feedback

${refinementFeedback}

### Implementation Summary

- **Files Changed:** ${filesChanged.length}
- **Time Elapsed:** ${elapsedSeconds} seconds

### Files Affected

${filesChanged.length > 0 ? filesChanged.map(file => `- \`${file}\``).join('\n') : '_No files changed_'}

### Implementation Process Log

\`\`\`
${formattedLogs}
\`\`\`

### Code Changes (Git Diff)

\`\`\`diff
${gitDiff || '_No diff available_'}
\`\`\`

---
`;

      // Append refinement to existing report (before the final line)
      const finalLine = '\n\n**Report generated automatically by Dev Automation Board**';
      const updatedReport = previousReport.replace(finalLine, refinementSection + finalLine);
      
      console.log(`✅ Refinement round ${refinementRound} appended to report`);
      return updatedReport;
    }

    // Build the initial report (Round 1)
    const report = `# Implementation Report - Task #${taskId}

**Generated:** ${new Date().toISOString()}  
**Task:** ${taskTitle}  
**Duration:** ${elapsedSeconds}s  
**Status:** ✅ Completed  
**Implementation Round:** ${refinementRound}

---

## 📋 Original Task Description

${taskDescription || 'No description provided'}

---

## ✨ Enhanced Requirements (AI-Generated)

${enhancedPrompt}

---

## 📊 Implementation Summary

- **Restore Point:** \`${restoreBranch}\`
- **Implementation Commit:** \`${implementationCommit?.substring(0, 7) || 'N/A'}\`
- **Files Changed:** ${filesChanged.length}
- **Time Elapsed:** ${elapsedSeconds} seconds

---

## 📁 Files Affected

${filesChanged.length > 0 ? filesChanged.map(file => `- \`${file}\``).join('\n') : '_No files changed_'}

---

## 🔨 Implementation Process Log

\`\`\`
${formattedLogs}
\`\`\`

---

## 📝 Code Changes (Git Diff)

\`\`\`diff
${gitDiff || '_No diff available_'}
\`\`\`

---

## 🔄 Rollback Instructions

If you need to rollback this implementation:

\`\`\`bash
# Rollback to restore point
git reset --hard ${restoreBranch}

# Or view the restore point
git log ${restoreBranch} -1
\`\`\`

---

**Report generated automatically by Dev Automation Board**
`;

    console.log(`✅ Report generated (${report.length} characters)`);
    return report;
  }

  /**
   * Get list of files changed since restore branch
   */
  private async getChangedFiles(restoreBranch: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `git diff --name-only ${restoreBranch} HEAD`,
        { cwd: getTargetProjectPath() }  // ✅ Check target project git
      );

      const files = stdout.trim().split('\n').filter(f => f.length > 0);
      console.log(`📁 Found ${files.length} changed files`);
      return files;
    } catch (error: any) {
      console.error('⚠️  Failed to get changed files:', error.message);
      return [];
    }
  }

  /**
   * Get git diff since restore branch
   */
  private async getGitDiff(restoreBranch: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `git diff ${restoreBranch} HEAD`,
        { cwd: getTargetProjectPath(), maxBuffer: 1024 * 1024 * 5 } // 5MB max diff
      );

      // Limit diff size for report (first 50000 chars)
      const diff = stdout.substring(0, 50000);
      if (stdout.length > 50000) {
        return diff + '\n\n... (diff truncated, too large to include fully)';
      }
      return diff;
    } catch (error: any) {
      console.error('⚠️  Failed to get git diff:', error.message);
      return '_Git diff unavailable_';
    }
  }

  /**
   * Format implementation logs for report
   */
  private formatLogs(logs: any[]): string {
    if (!logs || logs.length === 0) {
      return '_No logs available_';
    }

    return logs
      .map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const type = log.type.toUpperCase().padEnd(8);
        return `[${time}] ${type} ${log.message}`;
      })
      .join('\n');
  }

  /**
   * Save report to file system
   */
  async saveReportToFile(taskId: number, report: string): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Create reports directory in dev-automation-board (not target project)
    // Reports are stored in the board, not the target project
    const reportsDir = path.join(process.cwd(), 'reports');
    try {
      await fs.mkdir(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Save report file
    const filename = `task-${taskId}-implementation-report.md`;
    const filepath = path.join(reportsDir, filename);

    await fs.writeFile(filepath, report, 'utf-8');

    console.log(`📄 Report saved to: ${filepath}`);
    return filepath;
  }
}

// Singleton instance
export const reportGenerator = new ReportGenerator();

