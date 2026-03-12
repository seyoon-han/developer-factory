/**
 * Workspace Configuration Manager
 * Manages external project paths and ensures safe isolation from dev-automation-board code
 */

import path from 'path';
import fs from 'fs';
import { statements } from '@/lib/db/postgres';

export interface WorkspaceConfig {
  workspaceRoot: string;
  activeProjectPath: string | null;
  activeProjectId: number | null;
  activeProjectName: string | null;
}

class WorkspaceManager {
  private static instance: WorkspaceManager;
  private config: WorkspaceConfig;

  private constructor() {
    this.config = {
      // Root of all external projects
      workspaceRoot: path.join(process.cwd(), 'workspace'),
      activeProjectPath: null,
      activeProjectId: null,
      activeProjectName: null,
    };
    
    // DON'T ensure workspace or load project in constructor
    // Do it lazily to avoid file system access during Next.js build
  }

  static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager();
    }
    return WorkspaceManager.instance;
  }

  /**
   * Ensure workspace directory structure exists
   * Called lazily on first access, not during import
   */
  private ensureWorkspaceStructure() {
    // Skip during Next.js build phase
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }

    const workspaceRoot = this.config.workspaceRoot;
    
    // Create workspace directory
    if (!fs.existsSync(workspaceRoot)) {
      fs.mkdirSync(workspaceRoot, { recursive: true });
      console.log('✅ Created workspace directory at', workspaceRoot);
    }
    
    // Create .gitignore to exclude all projects
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(
        gitignorePath,
        '# Ignore all cloned projects - they have their own git repos\n' +
        '*\n' +
        '!.gitignore\n' +
        '!README.md\n'
      );
      console.log('✅ Created workspace .gitignore');
    }
    
    // Create README
    const readmePath = path.join(workspaceRoot, 'README.md');
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(
        readmePath,
        '# Workspace Directory\n\n' +
        'This directory contains cloned external projects that the Dev Automation Board manages.\n\n' +
        '## Important Notes\n\n' +
        '- Each subdirectory is a separate git repository\n' +
        '- Do not manually edit files here - let the automation handle it\n' +
        '- This directory is excluded from the dev-automation-board git repository\n' +
        '- Claude SDK executes tasks within these project directories\n\n' +
        '## Structure\n\n' +
        '```\n' +
        'workspace/\n' +
        '├── project-alpha/     ← Cloned from git\n' +
        '├── project-beta/      ← Another project\n' +
        '└── my-saas-app/       ← Your projects\n' +
        '```\n'
      );
      console.log('✅ Created workspace README');
    }
  }

  /**
   * Load active project from database
   */
  private async loadActiveProject() {
    try {
      // Check if statements is available
      if (!statements || !statements.getActiveProject) {
        console.log(`⚠️  Database not ready yet - will retry later`);
        return;
      }

      const activeProject = await statements.getActiveProject.get() as any;
      if (activeProject) {
        this.config.activeProjectPath = activeProject.local_path;
        this.config.activeProjectId = activeProject.id;
        this.config.activeProjectName = activeProject.name;
        console.log(`📂 Active project: ${activeProject.name} at ${activeProject.local_path}`);
      } else {
        console.log(`⚠️  No active project set - using demo mode (self-referential)`);
      }
    } catch (error: any) {
      // Silently fail if tables don't exist yet - this is expected on first run
      if (error.message && !error.message.includes('no such table')) {
        console.warn('Could not load active project:', error.message);
      }
    }
  }

  /**
   * Get the target directory where Claude SDK should execute
   * THIS IS THE CRITICAL FUNCTION that determines where work happens
   */
  async getTargetProjectPath(): Promise<string> {
    // Ensure workspace structure exists (lazy)
    this.ensureWorkspaceStructure();

    // Lazy load active project on first access
    if (this.config.activeProjectPath === null && this.config.activeProjectId === null) {
      await this.loadActiveProject();
    }

    if (this.config.activeProjectPath) {
      // Validate path still exists
      if (!fs.existsSync(this.config.activeProjectPath)) {
        console.error(`❌ Active project path does not exist: ${this.config.activeProjectPath}`);
        console.error(`   Falling back to demo mode`);
        return process.cwd();
      }

      // Return external project path
      console.log(`🎯 Target project: ${this.config.activeProjectName} (${this.config.activeProjectPath})`);
      return this.config.activeProjectPath;
    }

    // Fallback: Use board's own directory (demo/development mode)
    console.warn('⚠️  No active project - working on dev-automation-board itself (demo mode)');
    return process.cwd();
  }

  /**
   * Get workspace root (where all projects are cloned)
   */
  getWorkspaceRoot(): string {
    return this.config.workspaceRoot;
  }

  /**
   * Get active project ID
   */
  getActiveProjectId(): number | null {
    return this.config.activeProjectId;
  }

  /**
   * Get active project name
   */
  getActiveProjectName(): string | null {
    return this.config.activeProjectName;
  }

  /**
   * Get full workspace configuration
   */
  getConfig(): WorkspaceConfig {
    return { ...this.config };
  }

  /**
   * Set active project
   */
  async setActiveProject(projectId: number) {
    const project = await statements.getProject.get(projectId) as any;
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (project.clone_status !== 'ready') {
      throw new Error(`Project is not ready: ${project.clone_status}`);
    }

    // Deactivate all projects
    await statements.deactivateAllProjects.run();

    // Activate this project
    await statements.activateProject.run(projectId);

    // Update in-memory config
    this.config.activeProjectPath = project.local_path;
    this.config.activeProjectId = project.id;
    this.config.activeProjectName = project.name;

    console.log(`✅ Active project set to: ${project.name}`);
  }

  /**
   * Deactivate all projects (enter demo mode)
   */
  async deactivateAll() {
    await statements.deactivateAllProjects.run();

    this.config.activeProjectPath = null;
    this.config.activeProjectId = null;
    this.config.activeProjectName = null;

    console.log(`✅ All projects deactivated - entering demo mode`);
  }

  /**
   * Refresh active project from database
   */
  async refresh() {
    await this.loadActiveProject();
  }

  /**
   * Validate path is safe (within workspace, no traversal)
   */
  validatePath(targetPath: string): boolean {
    const boardPath = process.cwd();
    const workspaceRoot = this.config.workspaceRoot;
    
    // Normalize path
    const normalizedPath = path.normalize(targetPath);
    
    // Allow board path only in demo mode
    if (normalizedPath === boardPath) {
      return true; // Demo mode - will be checked elsewhere
    }
    
    // For external projects, must be within workspace
    if (!normalizedPath.startsWith(workspaceRoot)) {
      throw new Error('Project path must be within workspace directory');
    }
    
    // Prevent directory traversal
    if (normalizedPath.includes('..')) {
      throw new Error('Invalid path: directory traversal detected');
    }
    
    return true;
  }

  /**
   * Check if currently in demo mode (working on board itself)
   */
  isDemoMode(): boolean {
    return this.config.activeProjectPath === null || 
           this.config.activeProjectPath === process.cwd();
  }
}

// Singleton export
export const workspaceManager = WorkspaceManager.getInstance();

/**
 * Convenience function - USE THIS EVERYWHERE for Claude SDK execution
 * This replaces process.cwd() in all executor files
 */
export async function getTargetProjectPath(): Promise<string> {
  return workspaceManager.getTargetProjectPath();
}

/**
 * Get active project info
 */
export async function getActiveProject() {
  const projectId = workspaceManager.getActiveProjectId();
  if (!projectId) return null;

  return await statements.getProject.get(projectId) as any;
}

/**
 * Check if in demo mode
 */
export function isDemoMode(): boolean {
  return workspaceManager.isDemoMode();
}

/**
 * Initialize workspace manager (call after database is ready)
 */
export async function initializeWorkspace() {
  try {
    await workspaceManager.refresh();
    console.log('✅ Workspace manager initialized');
  } catch (error) {
    console.warn('Workspace initialization will retry on next access');
  }
}


