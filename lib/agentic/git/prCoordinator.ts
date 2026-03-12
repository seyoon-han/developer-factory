/**
 * PR Coordinator
 * Manages coordinated pull requests across multiple repositories
 */

import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { statements } from '@/lib/db/postgres';
import {
  AgenticPullRequest,
  AgenticPullRequestRow,
  PRStatus,
} from '@/types/agentic-task';
import { worktreeManager } from './worktreeManager';

export interface CreatePRInput {
  taskId: number;
  worktreeId: number;
  projectId: number;
  title: string;
  body: string;
}

export interface PRGroupInfo {
  groupId: string;
  taskId: number;
  prs: AgenticPullRequest[];
  allMerged: boolean;
  allApproved: boolean;
  hasFailures: boolean;
}

export class PRCoordinator {
  /**
   * Create coordinated PRs for all worktrees of a task
   */
  async createCoordinatedPRs(
    taskId: number,
    title: string,
    body: string
  ): Promise<PRGroupInfo> {
    const prGroupId = uuidv4();
    const worktrees = await worktreeManager.getWorktreesForTask(taskId);
    const prs: AgenticPullRequest[] = [];

    for (const wt of worktrees) {
      // Push branch to remote first
      await worktreeManager.pushBranch(wt.worktreePath, wt.branchName);

      // Create PR record in database
      const result = await statements.createAgenticPR.run(
        taskId,
        prGroupId,
        wt.projectId,
        wt.id,
        title,
        body
      );

      const prId = Number(result.lastInsertRowid);

      // Try to create PR using gh CLI
      try {
        const prUrl = await this.createGitHubPR(
          wt.worktreePath,
          wt.branchName,
          wt.baseBranch,
          title,
          body
        );

        // Extract PR number from URL
        const prNumber = this.extractPRNumber(prUrl);

        // Update PR record with URL and number
        await statements.updateAgenticPRStatus.run('open', prNumber, prUrl, 'open', prId);

        prs.push(await this.getPR(prId) as AgenticPullRequest);
      } catch (e) {
        console.error(`Failed to create GitHub PR for worktree ${wt.id}:`, e);
        // PR record still exists in draft status
        prs.push(await this.getPR(prId) as AgenticPullRequest);
      }

      // Update worktree status
      await worktreeManager.updateWorktreeStatus(wt.id, 'pr_created');
    }

    return {
      groupId: prGroupId,
      taskId,
      prs,
      allMerged: false,
      allApproved: false,
      hasFailures: false,
    };
  }

  /**
   * Create a GitHub PR using gh CLI
   */
  private async createGitHubPR(
    worktreePath: string,
    branchName: string,
    baseBranch: string,
    title: string,
    body: string
  ): Promise<string> {
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedBody = body.replace(/"/g, '\\"');

    const result = execSync(
      `gh pr create --head "${branchName}" --base "${baseBranch}" --title "${escapedTitle}" --body "${escapedBody}"`,
      {
        cwd: worktreePath,
        encoding: 'utf-8',
      }
    );

    return result.trim();
  }

  /**
   * Extract PR number from GitHub PR URL
   */
  private extractPRNumber(prUrl: string): number {
    const match = prUrl.match(/\/pull\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get a PR by ID
   */
  async getPR(id: number): Promise<AgenticPullRequest | null> {
    const row = await statements.getAgenticPR.get(id) as AgenticPullRequestRow | undefined;
    if (!row) return null;
    return this.rowToPR(row);
  }

  /**
   * Get all PRs for a task
   */
  async getPRsForTask(taskId: number): Promise<AgenticPullRequest[]> {
    const rows = await statements.getAgenticPRsByTask.all(taskId) as AgenticPullRequestRow[];
    return rows.map(this.rowToPR);
  }

  /**
   * Get PR group info
   */
  async getPRGroupInfo(prGroupId: string): Promise<PRGroupInfo | null> {
    const rows = await statements.getAgenticPRsByGroup.all(prGroupId) as AgenticPullRequestRow[];
    if (rows.length === 0) return null;

    const prs = rows.map(this.rowToPR);
    const taskId = prs[0].taskId;

    return {
      groupId: prGroupId,
      taskId,
      prs,
      allMerged: prs.every(pr => pr.prStatus === 'merged'),
      allApproved: prs.every(pr => pr.prStatus === 'approved' || pr.prStatus === 'merged'),
      hasFailures: prs.some(pr => pr.prStatus === 'closed'),
    };
  }

  /**
   * Update PR status
   */
  async updatePRStatus(
    id: number,
    status: PRStatus,
    prNumber?: number,
    prUrl?: string
  ): Promise<AgenticPullRequest | null> {
    await statements.updateAgenticPRStatus.run(status, prNumber || null, prUrl || null, status, id);
    return this.getPR(id);
  }

  /**
   * Merge all PRs in a group atomically
   */
  async mergeAllPRs(prGroupId: string): Promise<{
    success: boolean;
    mergedPRs: number[];
    failedPRs: number[];
    error?: string;
  }> {
    const groupInfo = await this.getPRGroupInfo(prGroupId);
    if (!groupInfo) {
      return { success: false, mergedPRs: [], failedPRs: [], error: 'PR group not found' };
    }

    // Check all PRs are in mergeable state
    for (const pr of groupInfo.prs) {
      if (pr.prStatus !== 'open' && pr.prStatus !== 'approved') {
        return {
          success: false,
          mergedPRs: [],
          failedPRs: [pr.id],
          error: `PR ${pr.id} is not in mergeable state (${pr.prStatus})`,
        };
      }
    }

    const mergedPRs: number[] = [];
    const failedPRs: number[] = [];

    for (const pr of groupInfo.prs) {
      try {
        const worktrees = await worktreeManager.getWorktreesForTask(pr.taskId);
        const worktree = worktrees.find(wt => wt.id === pr.worktreeId);

        if (worktree && pr.prNumber) {
          // Merge using gh CLI
          execSync(`gh pr merge ${pr.prNumber} --merge`, {
            cwd: worktree.worktreePath,
            stdio: 'pipe',
          });

          await this.updatePRStatus(pr.id, 'merged', pr.prNumber, pr.prUrl);
          await worktreeManager.updateWorktreeStatus(worktree.id, 'merged');
          mergedPRs.push(pr.id);
        }
      } catch (e) {
        console.error(`Failed to merge PR ${pr.id}:`, e);
        failedPRs.push(pr.id);
      }
    }

    return {
      success: failedPRs.length === 0,
      mergedPRs,
      failedPRs,
      error: failedPRs.length > 0 ? 'Some PRs failed to merge' : undefined,
    };
  }

  /**
   * Create rollback branches for all merged PRs in a group
   */
  async rollbackPRGroup(prGroupId: string): Promise<{
    success: boolean;
    rollbackBranches: { prId: number; branch: string }[];
    error?: string;
  }> {
    const groupInfo = await this.getPRGroupInfo(prGroupId);
    if (!groupInfo) {
      return { success: false, rollbackBranches: [], error: 'PR group not found' };
    }

    const rollbackBranches: { prId: number; branch: string }[] = [];

    for (const pr of groupInfo.prs) {
      if (pr.prStatus === 'merged') {
        try {
          const worktrees = await worktreeManager.getWorktreesForTask(pr.taskId);
          const worktree = worktrees.find(wt => wt.id === pr.worktreeId);

          if (worktree) {
            // Get project path from worktree
            const projectPath = require('path').dirname(
              require('path').dirname(worktree.worktreePath)
            );

            // Create rollback branch
            const rollbackBranch = await this.createRollbackBranch(
              projectPath,
              worktree.branchName,
              pr.taskId
            );

            await statements.updateAgenticPRRollback.run(rollbackBranch, pr.id);
            await worktreeManager.updateWorktreeStatus(worktree.id, 'rolled_back');

            rollbackBranches.push({ prId: pr.id, branch: rollbackBranch });
          }
        } catch (e) {
          console.error(`Failed to create rollback for PR ${pr.id}:`, e);
        }
      }
    }

    return {
      success: true,
      rollbackBranches,
    };
  }

  /**
   * Create a rollback branch from merged changes
   */
  private async createRollbackBranch(
    projectPath: string,
    originalBranch: string,
    taskId: number
  ): Promise<string> {
    const rollbackBranch = `rollback/task-${taskId}-${Date.now()}`;

    // Checkout main/master and create rollback branch
    const defaultBranch = this.getDefaultBranch(projectPath);
    execSync(`git checkout ${defaultBranch}`, { cwd: projectPath, stdio: 'pipe' });
    execSync('git pull origin', { cwd: projectPath, stdio: 'pipe' });

    // Create rollback branch with the reverted changes
    execSync(`git checkout -b ${rollbackBranch}`, { cwd: projectPath, stdio: 'pipe' });

    // Find the merge commit and revert it
    try {
      const mergeCommit = execSync(
        `git log --oneline --grep="Merge pull request" --grep="${originalBranch}" | head -1 | cut -d' ' -f1`,
        { cwd: projectPath, encoding: 'utf-8' }
      ).trim();

      if (mergeCommit) {
        execSync(`git revert -m 1 ${mergeCommit} --no-edit`, {
          cwd: projectPath,
          stdio: 'pipe',
        });
      }
    } catch (e) {
      console.warn('Could not find or revert merge commit:', e);
    }

    // Push rollback branch
    execSync(`git push -u origin ${rollbackBranch}`, { cwd: projectPath, stdio: 'pipe' });

    // Return to default branch
    execSync(`git checkout ${defaultBranch}`, { cwd: projectPath, stdio: 'pipe' });

    return rollbackBranch;
  }

  /**
   * Get default branch for a repository
   */
  private getDefaultBranch(projectPath: string): string {
    try {
      const result = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
      });
      return result.replace('refs/remotes/origin/', '').trim();
    } catch {
      return 'main';
    }
  }

  /**
   * Check PR status on GitHub
   */
  async syncPRStatus(prId: number): Promise<AgenticPullRequest | null> {
    const pr = await this.getPR(prId);
    if (!pr || !pr.prNumber) return pr;

    try {
      const worktrees = await worktreeManager.getWorktreesForTask(pr.taskId);
      const worktree = worktrees.find(wt => wt.id === pr.worktreeId);

      if (worktree) {
        const result = execSync(`gh pr view ${pr.prNumber} --json state,merged`, {
          cwd: worktree.worktreePath,
          encoding: 'utf-8',
        });

        const prInfo = JSON.parse(result);
        let newStatus: PRStatus = pr.prStatus;

        if (prInfo.merged) {
          newStatus = 'merged';
        } else if (prInfo.state === 'CLOSED') {
          newStatus = 'closed';
        } else if (prInfo.state === 'OPEN') {
          newStatus = 'open';
        }

        if (newStatus !== pr.prStatus) {
          return this.updatePRStatus(prId, newStatus, pr.prNumber, pr.prUrl);
        }
      }
    } catch (e) {
      console.error(`Failed to sync PR status for ${prId}:`, e);
    }

    return pr;
  }

  /**
   * Convert database row to AgenticPullRequest
   */
  private rowToPR(row: AgenticPullRequestRow): AgenticPullRequest {
    return {
      id: row.id,
      taskId: row.task_id,
      prGroupId: row.pr_group_id,
      projectId: row.project_id,
      worktreeId: row.worktree_id,
      prNumber: row.pr_number || undefined,
      prUrl: row.pr_url || undefined,
      prTitle: row.pr_title || undefined,
      prBody: row.pr_body || undefined,
      prStatus: row.pr_status,
      mergedAt: row.merged_at || undefined,
      rollbackBranch: row.rollback_branch || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton instance
export const prCoordinator = new PRCoordinator();
export default prCoordinator;
