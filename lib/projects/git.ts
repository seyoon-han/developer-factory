/**
 * Git Operations Manager
 * Handles git operations for external projects (NOT dev-automation-board)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { statements } from '@/lib/db/postgres';

const execAsync = promisify(exec);

export class GitManager {
  /**
   * Clone a git repository to workspace
   */
  async cloneRepository(
    gitUrl: string,
    projectName: string,
    branch: string = 'main'
  ): Promise<string> {
    const workspaceRoot = path.join(process.cwd(), 'workspace');
    const targetPath = path.join(workspaceRoot, projectName);
    
    // Get GitHub token if available (for private repos)
    const authenticatedUrl = await this.getAuthenticatedGitUrl(gitUrl);
    
    // Safety: Ensure we're not cloning into board directory
    const boardPath = process.cwd();
    if (targetPath === boardPath || targetPath.startsWith(path.join(boardPath, 'app'))) {
      throw new Error(
        'CRITICAL SAFETY: Attempted to clone into dev-automation-board directory! ' +
        'Projects must be cloned to workspace/ only.'
      );
    }
    
    // Validate target path doesn't already exist
    if (fs.existsSync(targetPath)) {
      throw new Error(`Directory already exists: ${targetPath}`);
    }
    
    console.log(`📥 Cloning ${gitUrl} to ${targetPath}`);
    console.log(`   Branch: ${branch}`);
    
    try {
      // Clone with specific branch (use authenticated URL if token available)
      // Use -c to set config inline to avoid credential prompts
      const { stdout, stderr} = await execAsync(
        `git -c credential.helper= -c core.askPass= clone --branch ${branch} --depth 1 "${authenticatedUrl}" "${targetPath}"`,
        { 
          timeout: 300000, // 5 minute timeout
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0', // Prevent git from prompting for credentials
            GIT_ASKPASS: '', // Disable credential prompts
            GIT_SSH_COMMAND: 'ssh -o BatchMode=yes' // Non-interactive SSH
          }
        }
      );
      
      console.log(`✅ Repository cloned successfully`);
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
      
      return targetPath;
    } catch (error: any) {
      console.error(`❌ Clone failed:`, error);
      
      // Clean up failed clone
      if (fs.existsSync(targetPath)) {
        try {
          fs.rmSync(targetPath, { recursive: true, force: true });
          console.log('🧹 Cleaned up failed clone directory');
        } catch (cleanupError) {
          console.error('Failed to cleanup:', cleanupError);
        }
      }
      
      throw new Error(`Git clone failed: ${error.message}`);
    }
  }

  /**
   * Pull latest changes from remote
   */
  async pullLatest(projectPath: string): Promise<void> {
    await this.validateNotBoardPath(projectPath, 'pull');
    
    console.log(`🔄 Pulling latest changes for ${projectPath}`);
    
    try {
      const { stdout, stderr } = await execAsync('git -c credential.helper= -c core.askPass= pull', { 
        cwd: projectPath,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0', // Prevent git from prompting for credentials
          GIT_ASKPASS: '', // Disable credential prompts
          GIT_SSH_COMMAND: 'ssh -o BatchMode=yes' // Non-interactive SSH
        }
      });
      console.log(`✅ Pull successful`);
      if (stdout) console.log(stdout);
    } catch (error: any) {
      console.error(`❌ Pull failed:`, error);
      throw new Error(`Git pull failed: ${error.message}`);
    }
  }

  /**
   * Get current commit hash
   */
  async getCurrentCommit(projectPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: projectPath });
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`Failed to get commit hash: ${error.message}`);
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(projectPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath });
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`Failed to get branch name: ${error.message}`);
    }
  }

  /**
   * Get repository info
   */
  async getRepoInfo(projectPath: string) {
    try {
      const [branch, commit, remote] = await Promise.all([
        execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath }),
        execAsync('git rev-parse HEAD', { cwd: projectPath }),
        execAsync('git remote get-url origin', { cwd: projectPath }).catch(() => ({ stdout: 'unknown' })),
      ]);
      
      return {
        branch: branch.stdout.trim(),
        commit: commit.stdout.trim(),
        remote: remote.stdout.trim(),
      };
    } catch (error: any) {
      throw new Error(`Failed to get repo info: ${error.message}`);
    }
  }

  /**
   * Create restore point in TARGET project (not dev-automation-board)
   * CRITICAL: This must ONLY run on external projects
   */
  async createRestorePoint(projectPath: string, taskId: number): Promise<string> {
    // CRITICAL SAFETY CHECK
    await this.validateNotBoardPath(projectPath, 'create restore point');
    
    console.log(`📍 Creating restore point for task #${taskId} in ${projectPath}`);
    
    try {
      // Check if there are any changes to commit
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: projectPath });
      
      // Create restore point commit (allow empty for clean state)
      await execAsync(
        `git add -A && git commit --allow-empty -m "restorepoint-task#${taskId}"`,
        { cwd: projectPath }
      );
      
      const commit = await this.getCurrentCommit(projectPath);
      console.log(`📍 Restore point created: ${commit}`);
      
      return commit;
    } catch (error: any) {
      throw new Error(`Failed to create restore point: ${error.message}`);
    }
  }

  /**
   * Create implementation commit in TARGET project
   */
  async createImplementationCommit(
    projectPath: string,
    taskId: number,
    taskTitle: string
  ): Promise<string> {
    // CRITICAL SAFETY CHECK
    await this.validateNotBoardPath(projectPath, 'create implementation commit');
    
    console.log(`💾 Creating implementation commit for task #${taskId}`);
    
    try {
      await execAsync(
        `git add -A && git commit -m "feat: implement task #${taskId} - ${taskTitle}"`,
        { cwd: projectPath }
      );
      
      const commit = await this.getCurrentCommit(projectPath);
      console.log(`✅ Implementation committed: ${commit}`);
      
      return commit;
    } catch (error: any) {
      // It's okay if there's nothing to commit
      if (error.message.includes('nothing to commit')) {
        console.warn('⚠️  No changes to commit');
        return await this.getCurrentCommit(projectPath);
      }
      throw new Error(`Failed to create implementation commit: ${error.message}`);
    }
  }

  /**
   * Rollback to restore point
   */
  async rollbackToRestorePoint(projectPath: string, commitHash: string): Promise<void> {
    await this.validateNotBoardPath(projectPath, 'rollback');
    
    console.log(`⏮️  Rolling back to ${commitHash}`);
    
    try {
      await execAsync(`git reset --hard ${commitHash}`, { cwd: projectPath });
      console.log(`✅ Rollback successful`);
    } catch (error: any) {
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * Validate we're not operating on dev-automation-board's git repo
   * CRITICAL SAFETY FUNCTION
   */
  private async validateNotBoardPath(projectPath: string, operation: string) {
    const boardPath = process.cwd();
    const normalizedProjectPath = path.normalize(projectPath);
    const normalizedBoardPath = path.normalize(boardPath);

    // Check if paths are the same
    if (normalizedProjectPath === normalizedBoardPath) {
      const demoMode = await this.getDemoMode();

      if (!demoMode) {
        throw new Error(
          `CRITICAL SAFETY VIOLATION: Attempted to ${operation} on dev-automation-board itself! ` +
          `This operation should ONLY happen on external projects in workspace/. ` +
          `If you intended to work on the board itself, enable Demo Mode in settings.`
        );
      }

      console.warn(`⚠️  Demo mode: ${operation} on dev-automation-board itself`);
    }
  }

  /**
   * Check demo mode setting from database
   */
  private async getDemoMode(): Promise<boolean> {
    try {
      if (!statements || !statements.getAppSettings) {
        return false;
      }
      const settings = await statements.getAppSettings.get() as any;
      return Boolean(settings?.demo_mode || 0);
    } catch {
      return false;
    }
  }

  /**
   * Check if a path is a valid git repository
   */
  async isGitRepository(projectPath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: projectPath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get authenticated Git URL with GitHub token if available
   * Converts https://github.com/user/repo.git to https://token:@github.com/user/repo.git
   * Note: The colon after the token is required (token:@) to avoid password prompts
   */
  private async getAuthenticatedGitUrl(gitUrl: string): Promise<string> {
    try {
      // Only authenticate GitHub HTTPS URLs
      if (!gitUrl.startsWith('https://github.com/')) {
        return gitUrl; // SSH or other URLs unchanged
      }

      // Get GitHub token from database
      if (!statements || !statements.getAppSettings) {
        return gitUrl;
      }

      const settings = await statements.getAppSettings.get() as any;
      const token = settings?.github_token;

      if (!token) {
        return gitUrl; // No token, return original URL
      }

      // Insert token into URL with empty password: https://token:@github.com/user/repo.git
      // The colon after token is critical - without it, Git treats token as username and prompts for password
      const authenticatedUrl = gitUrl.replace(
        'https://github.com/',
        `https://${token}:@github.com/`
      );

      console.log('🔐 Using GitHub token for authentication');
      return authenticatedUrl;
    } catch (error) {
      console.warn('Failed to add GitHub token, using original URL:', error);
      return gitUrl;
    }
  }
}

// Singleton export
export const gitManager = new GitManager();


