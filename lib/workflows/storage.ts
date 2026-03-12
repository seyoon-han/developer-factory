/**
 * Workflow File Storage Service
 * Handles writing workflow files to disk for Claude Code integration
 * Compatible with BMAD v6 Alpha
 */

import fs from 'fs/promises';
import path from 'path';

export class WorkflowStorage {
  private readonly projectRoot: string;
  
  // Claude commands directory (shared by both frameworks)
  private readonly claudeCommandsDir: string;
  
  // BMAD-specific directories
  private readonly bmadWorkflowsDir: string;
  private readonly bmadBlueprintsDir: string;
  
  // Amplifier-specific directories
  private readonly amplifierCommandsDir: string;
  private readonly amplifierConfigDir: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    
    // Shared Claude commands directory
    this.claudeCommandsDir = path.join(this.projectRoot, '.claude', 'commands', 'custom');
    
    // BMAD directories (keep separated)
    this.bmadWorkflowsDir = path.join(this.projectRoot, 'workspace', '.bmad', 'custom', 'workflows');
    this.bmadBlueprintsDir = path.join(this.projectRoot, 'blueprints', 'bmad');
    
    // Amplifier directories (keep separated)
    this.amplifierCommandsDir = path.join(this.projectRoot, '.claude', 'commands', 'amplifier');
    this.amplifierConfigDir = path.join(this.projectRoot, 'ai_context', 'workflows');
  }

  /**
   * Save workflow files to disk
   * Routes to BMAD or Amplifier specific logic
   */
  async saveWorkflow(
    workflowName: string,
    commandContent: string,
    configContent: string,
    framework: 'bmad' | 'amplifier' = 'bmad'
  ): Promise<{ commandPath: string; workflowPath: string }> {
    if (framework === 'bmad') {
      return this.saveBmadWorkflow(workflowName, commandContent, configContent);
    } else {
      return this.saveAmplifierWorkflow(workflowName, commandContent, configContent);
    }
  }
  
  /**
   * Save BMAD workflow files (existing logic)
   */
  private async saveBmadWorkflow(
    workflowName: string,
    commandContent: string,
    yamlContent: string
  ): Promise<{ commandPath: string; workflowPath: string }> {
    try {
      await this.ensureDirectories();

      // Write Claude command file (in shared custom directory)
      const commandPath = path.join(this.claudeCommandsDir, `${workflowName}.md`);
      await this.writeFileAtomic(commandPath, commandContent);

      // Write BMAD workflow YAML (in BMAD-specific directory)
      const workflowPath = path.join(this.bmadWorkflowsDir, `${workflowName}.yaml`);
      await this.writeFileAtomic(workflowPath, yamlContent);

      console.log(`✅ BMAD Workflow saved:`);
      console.log(`   Command: ${commandPath}`);
      console.log(`   Workflow: ${workflowPath}`);

      return { commandPath, workflowPath };
    } catch (error) {
      console.error('❌ Error saving BMAD workflow:', error);
      throw new Error(`Failed to save BMAD workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Save Amplifier workflow files (NEW)
   */
  private async saveAmplifierWorkflow(
    workflowName: string,
    commandContent: string,
    configContent: string
  ): Promise<{ commandPath: string; workflowPath: string }> {
    try {
      await this.ensureDirectories();

      // Write Claude command file (in Amplifier-specific directory)
      const commandPath = path.join(this.amplifierCommandsDir, `${workflowName}.md`);
      await this.writeFileAtomic(commandPath, commandContent);

      // Write Amplifier config file (in ai_context/workflows)
      const workflowPath = path.join(this.amplifierConfigDir, `${workflowName}.md`);
      await this.writeFileAtomic(workflowPath, configContent);

      console.log(`✅ Amplifier Workflow saved:`);
      console.log(`   Command: ${commandPath}`);
      console.log(`   Config: ${workflowPath}`);

      return { commandPath, workflowPath };
    } catch (error) {
      console.error('❌ Error saving Amplifier workflow:', error);
      throw new Error(`Failed to save Amplifier workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save blueprint files (BMAD v6 planning phase outputs only)
   */
  async saveBlueprints(
    workflowName: string,
    blueprints: {
      taskList?: string;
      fileManifest?: string;
      acceptanceTests?: string;
      toolBudget?: string;
    }
  ): Promise<string[]> {
    try {
      await this.ensureDirectories();

      const savedPaths: string[] = [];

      if (blueprints.taskList) {
        const taskListPath = path.join(this.bmadBlueprintsDir, `${workflowName}-task-list.yaml`);
        await this.writeFileAtomic(taskListPath, blueprints.taskList);
        savedPaths.push(taskListPath);
      }

      if (blueprints.fileManifest) {
        const manifestPath = path.join(this.bmadBlueprintsDir, `${workflowName}-file-manifest.yaml`);
        await this.writeFileAtomic(manifestPath, blueprints.fileManifest);
        savedPaths.push(manifestPath);
      }

      if (blueprints.acceptanceTests) {
        const testsPath = path.join(this.bmadBlueprintsDir, `${workflowName}-acceptance-tests.yaml`);
        await this.writeFileAtomic(testsPath, blueprints.acceptanceTests);
        savedPaths.push(testsPath);
      }

      if (blueprints.toolBudget) {
        const budgetPath = path.join(this.bmadBlueprintsDir, `${workflowName}-tool-budget.yaml`);
        await this.writeFileAtomic(budgetPath, blueprints.toolBudget);
        savedPaths.push(budgetPath);
      }

      console.log(`✅ BMAD Blueprints saved: ${savedPaths.length} files`);

      return savedPaths;
    } catch (error) {
      console.error('❌ Error saving BMAD blueprints:', error);
      throw new Error(`Failed to save BMAD blueprints: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete workflow files (both BMAD and Amplifier)
   */
  async deleteWorkflow(workflowName: string, framework?: 'bmad' | 'amplifier'): Promise<void> {
    try {
      if (!framework || framework === 'bmad') {
        // Delete BMAD files
        const commandPath = path.join(this.claudeCommandsDir, `${workflowName}.md`);
        const workflowPath = path.join(this.bmadWorkflowsDir, `${workflowName}.yaml`);

        await Promise.allSettled([
          fs.unlink(commandPath),
          fs.unlink(workflowPath),
        ]);

        await this.deleteBlueprints(workflowName);
      }
      
      if (!framework || framework === 'amplifier') {
        // Delete Amplifier files
        const commandPath = path.join(this.amplifierCommandsDir, `${workflowName}.md`);
        const configPath = path.join(this.amplifierConfigDir, `${workflowName}.md`);

        await Promise.allSettled([
          fs.unlink(commandPath),
          fs.unlink(configPath),
        ]);
      }

      console.log(`✅ Workflow files deleted: ${workflowName}`);
    } catch (error) {
      console.error('❌ Error deleting workflow files:', error);
      throw new Error(`Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete blueprint files for a workflow
   */
  async deleteBlueprints(workflowName: string): Promise<void> {
    try {
      const blueprintFiles = [
        `${workflowName}-task-list.yaml`,
        `${workflowName}-file-manifest.yaml`,
        `${workflowName}-acceptance-tests.yaml`,
        `${workflowName}-tool-budget.yaml`,
      ];

      await Promise.allSettled(
        blueprintFiles.map(file =>
          fs.unlink(path.join(this.blueprintsDir, file))
        )
      );
    } catch (error) {
      // Silently fail - blueprints are optional
      console.debug('Blueprint deletion completed (some files may not exist)');
    }
  }

  /**
   * Check if workflow files exist
   */
  async workflowExists(workflowName: string): Promise<boolean> {
    try {
      const commandPath = path.join(this.claudeCommandsDir, `${workflowName}.md`);
      await fs.access(commandPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read workflow files
   */
  async readWorkflow(workflowName: string): Promise<{
    command: string;
    yaml: string;
  }> {
    try {
      const commandPath = path.join(this.claudeCommandsDir, `${workflowName}.md`);
      const workflowPath = path.join(this.bmadWorkflowsDir, `${workflowName}.yaml`);

      const [command, yaml] = await Promise.all([
        fs.readFile(commandPath, 'utf-8'),
        fs.readFile(workflowPath, 'utf-8'),
      ]);

      return { command, yaml };
    } catch (error) {
      throw new Error(`Failed to read workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all custom workflows
   */
  async listWorkflows(): Promise<string[]> {
    try {
      await this.ensureDirectories();

      const files = await fs.readdir(this.claudeCommandsDir);
      return files
        .filter(file => file.endsWith('.md'))
        .map(file => file.replace('.md', ''));
    } catch (error) {
      console.error('❌ Error listing workflows:', error);
      return [];
    }
  }

  /**
   * Ensure all required directories exist (both BMAD and Amplifier)
   */
  private async ensureDirectories(): Promise<void> {
    await Promise.all([
      // Shared
      fs.mkdir(this.claudeCommandsDir, { recursive: true }),
      
      // BMAD-specific
      fs.mkdir(this.bmadWorkflowsDir, { recursive: true }),
      fs.mkdir(this.bmadBlueprintsDir, { recursive: true }),
      
      // Amplifier-specific
      fs.mkdir(this.amplifierCommandsDir, { recursive: true }),
      fs.mkdir(this.amplifierConfigDir, { recursive: true }),
    ]);
  }

  /**
   * Write file atomically (write to temp, then rename)
   */
  private async writeFileAtomic(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;

    try {
      // Write to temporary file
      await fs.writeFile(tempPath, content, 'utf-8');

      // Atomic rename
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Validate file path (security check)
   */
  private validatePath(filePath: string): void {
    const resolved = path.resolve(filePath);

    // Ensure path is within project root
    if (!resolved.startsWith(this.projectRoot)) {
      throw new Error('Invalid file path: outside project root');
    }

    // Prevent directory traversal
    if (filePath.includes('..')) {
      throw new Error('Invalid file path: directory traversal detected');
    }
  }

  /**
   * Get storage paths for debugging
   */
  getPaths() {
    return {
      projectRoot: this.projectRoot,
      
      // Shared
      claudeCommands: this.claudeCommandsDir,
      
      // BMAD-specific
      bmad: {
        workflows: this.bmadWorkflowsDir,
        blueprints: this.bmadBlueprintsDir,
      },
      
      // Amplifier-specific
      amplifier: {
        commands: this.amplifierCommandsDir,
        config: this.amplifierConfigDir,
      },
    };
  }
}

// Export singleton instance
export const workflowStorage = new WorkflowStorage();

