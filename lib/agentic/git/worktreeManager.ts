/**
 * Git Worktree Manager
 * Handles creation, management, and cleanup of git worktrees for isolated task execution
 */

import { execSync, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { statements } from '@/lib/db/postgres';
import { AgenticWorktree, AgenticWorktreeRow, WorktreeStatus } from '@/types/agentic-task';

export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  isActive: boolean;
}

export interface CreateWorktreeResult {
  worktreePath: string;
  branchName: string;
  baseBranch: string;
}

export class WorktreeManager {
  /**
   * Create worktree for a task in a project
   */
  async createWorktree(
    projectPath: string,
    taskId: number,
    projectId: number,
    baseBranch: string = 'main'
  ): Promise<CreateWorktreeResult> {
    const timestamp = Date.now();
    const branchName = `agentic/task-${taskId}-${timestamp}`;
    const worktreePath = path.join(projectPath, '.worktrees', `task-${taskId}`);

    // Ensure worktrees directory exists
    const worktreesDir = path.dirname(worktreePath);
    if (!fs.existsSync(worktreesDir)) {
      fs.mkdirSync(worktreesDir, { recursive: true });
    }

    // Clean up if worktree already exists
    if (fs.existsSync(worktreePath)) {
      try {
        execSync(`git worktree remove --force "${worktreePath}"`, {
          cwd: projectPath,
          stdio: 'pipe',
        });
      } catch (e) {
        // Worktree might not be registered, just remove directory
        fs.rmSync(worktreePath, { recursive: true, force: true });
      }
    }

    // Fetch latest from remote
    try {
      execSync('git fetch origin', { cwd: projectPath, stdio: 'pipe' });
    } catch (e) {
      console.warn('Failed to fetch from origin:', e);
    }

    // Create worktree with new branch
    try {
      execSync(
        `git worktree add -b "${branchName}" "${worktreePath}" "origin/${baseBranch}"`,
        { cwd: projectPath, stdio: 'pipe' }
      );
    } catch (e) {
      // If origin/baseBranch doesn't exist, try local baseBranch
      execSync(
        `git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`,
        { cwd: projectPath, stdio: 'pipe' }
      );
    }

    // Save to database
    await statements.createAgenticWorktree.run(
      taskId,
      projectId,
      worktreePath,
      branchName,
      baseBranch
    );

    return { worktreePath, branchName, baseBranch };
  }

  /**
   * Create worktrees for all projects in a group
   */
  async createWorktreesForGroup(
    taskId: number,
    projects: { projectId: number; localPath: string; gitBranch: string }[]
  ): Promise<CreateWorktreeResult[]> {
    const results: CreateWorktreeResult[] = [];

    for (const project of projects) {
      try {
        const result = await this.createWorktree(
          project.localPath,
          taskId,
          project.projectId,
          project.gitBranch
        );
        results.push(result);
      } catch (e) {
        console.error(`Failed to create worktree for project ${project.projectId}:`, e);
        throw e;
      }
    }

    return results;
  }

  /**
   * Get worktree for a task and project
   */
  async getWorktree(taskId: number, projectId: number): Promise<AgenticWorktree | null> {
    const row = await statements.getAgenticWorktreeByTaskAndProject.get(
      taskId,
      projectId
    ) as AgenticWorktreeRow | undefined;

    if (!row) return null;

    return this.rowToWorktree(row);
  }

  /**
   * Get all worktrees for a task
   */
  async getWorktreesForTask(taskId: number): Promise<AgenticWorktree[]> {
    const rows = await statements.getAgenticWorktreesByTask.all(taskId) as AgenticWorktreeRow[];
    return rows.map(this.rowToWorktree);
  }

  /**
   * List all worktrees in a project
   */
  listWorktrees(projectPath: string): WorktreeInfo[] {
    try {
      const output = execSync('git worktree list --porcelain', {
        cwd: projectPath,
        encoding: 'utf-8',
      });

      const worktrees: WorktreeInfo[] = [];
      const entries = output.split('\n\n').filter(Boolean);

      for (const entry of entries) {
        const lines = entry.split('\n');
        let wtPath = '';
        let branch = '';
        let commit = '';

        for (const line of lines) {
          if (line.startsWith('worktree ')) {
            wtPath = line.replace('worktree ', '');
          } else if (line.startsWith('HEAD ')) {
            commit = line.replace('HEAD ', '');
          } else if (line.startsWith('branch ')) {
            branch = line.replace('branch refs/heads/', '');
          }
        }

        if (wtPath) {
          worktrees.push({
            path: wtPath,
            branch,
            commit,
            isActive: !branch.includes('agentic/'),
          });
        }
      }

      return worktrees;
    } catch (e) {
      console.error('Failed to list worktrees:', e);
      return [];
    }
  }

  /**
   * Update worktree status
   */
  async updateWorktreeStatus(id: number, status: WorktreeStatus): Promise<void> {
    await statements.updateAgenticWorktreeStatus.run(status, status, status, id);
  }

  /**
   * Remove a worktree
   */
  async removeWorktree(
    projectPath: string,
    worktreePath: string,
    worktreeId: number,
    force: boolean = false
  ): Promise<void> {
    try {
      const forceFlag = force ? '--force' : '';
      execSync(`git worktree remove ${forceFlag} "${worktreePath}"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    } catch (e) {
      // If worktree removal fails, try to clean up manually
      if (fs.existsSync(worktreePath)) {
        fs.rmSync(worktreePath, { recursive: true, force: true });
      }
      // Prune worktrees
      try {
        execSync('git worktree prune', { cwd: projectPath, stdio: 'pipe' });
      } catch (pruneError) {
        console.warn('Failed to prune worktrees:', pruneError);
      }
    }

    // Update database
    await this.updateWorktreeStatus(worktreeId, 'deleted');
  }

  /**
   * Remove all worktrees for a task
   */
  async removeWorktreesForTask(taskId: number): Promise<void> {
    const worktrees = await this.getWorktreesForTask(taskId);

    for (const wt of worktrees) {
      try {
        // Get project path from worktree path
        const projectPath = path.dirname(path.dirname(wt.worktreePath));
        await this.removeWorktree(projectPath, wt.worktreePath, wt.id, true);
      } catch (e) {
        console.error(`Failed to remove worktree ${wt.id}:`, e);
      }
    }
  }

  /**
   * Commit changes in a worktree
   */
  async commitChanges(
    worktreePath: string,
    message: string,
    taskId: number
  ): Promise<string> {
    // Add all changes
    execSync('git add -A', { cwd: worktreePath, stdio: 'pipe' });

    // Check if there are changes to commit
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf-8',
    });

    if (!status.trim()) {
      return ''; // No changes to commit
    }

    // Commit with message
    const fullMessage = `[Agentic Task #${taskId}] ${message}`;
    execSync(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`, {
      cwd: worktreePath,
      stdio: 'pipe',
    });

    // Get commit hash
    const commitHash = execSync('git rev-parse HEAD', {
      cwd: worktreePath,
      encoding: 'utf-8',
    }).trim();

    return commitHash;
  }

  /**
   * Push worktree branch to remote
   */
  async pushBranch(worktreePath: string, branchName: string): Promise<void> {
    execSync(`git push -u origin "${branchName}"`, {
      cwd: worktreePath,
      stdio: 'pipe',
    });
  }

  /**
   * Create rollback branch from current state
   */
  async createRollbackBranch(
    worktreePath: string,
    taskId: number
  ): Promise<string> {
    const rollbackBranch = `rollback/task-${taskId}-${Date.now()}`;

    // Create and push rollback branch
    execSync(`git checkout -b "${rollbackBranch}"`, {
      cwd: worktreePath,
      stdio: 'pipe',
    });

    execSync(`git push -u origin "${rollbackBranch}"`, {
      cwd: worktreePath,
      stdio: 'pipe',
    });

    return rollbackBranch;
  }

  /**
   * Get diff between worktree and base branch
   */
  getDiff(worktreePath: string, baseBranch: string): string {
    try {
      return execSync(`git diff origin/${baseBranch}...HEAD`, {
        cwd: worktreePath,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });
    } catch (e) {
      return execSync(`git diff ${baseBranch}...HEAD`, {
        cwd: worktreePath,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });
    }
  }

  /**
   * Get list of changed files in worktree
   */
  getChangedFiles(worktreePath: string, baseBranch: string): string[] {
    try {
      const output = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, {
        cwd: worktreePath,
        encoding: 'utf-8',
      });
      return output.split('\n').filter(Boolean);
    } catch (e) {
      const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, {
        cwd: worktreePath,
        encoding: 'utf-8',
      });
      return output.split('\n').filter(Boolean);
    }
  }

  /**
   * Check if worktree has uncommitted changes
   */
  hasUncommittedChanges(worktreePath: string): boolean {
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf-8',
    });
    return status.trim().length > 0;
  }

  /**
   * Convert database row to AgenticWorktree
   */
  private rowToWorktree(row: AgenticWorktreeRow): AgenticWorktree {
    return {
      id: row.id,
      taskId: row.task_id,
      projectId: row.project_id,
      worktreePath: row.worktree_path,
      branchName: row.branch_name,
      baseBranch: row.base_branch,
      status: row.status,
      createdAt: row.created_at,
      mergedAt: row.merged_at || undefined,
      deletedAt: row.deleted_at || undefined,
    };
  }
}

// Singleton instance
export const worktreeManager = new WorktreeManager();
export default worktreeManager;
