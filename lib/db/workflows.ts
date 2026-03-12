/**
 * Workflows Database Service (PostgreSQL)
 * Server-side persistent storage for BMAD workflows
 */

import { pool, statements } from './postgres';
import type { Workflow, WorkflowExecution, ExecutionManifest } from '@/types/workflow';

/**
 * Workflow CRUD operations
 */
export const workflowsDb = {
  /**
   * Create a new workflow
   */
  async create(workflow: Omit<Workflow, 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const tagsJson = workflow.tags ? JSON.stringify(workflow.tags) : null;

    try {
      // PostgreSQL always has the framework column
      await pool.query(`
        INSERT INTO workflows (id, name, description, framework, nl_input, yaml_definition, command_file, category, status, version, tags, icon)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        workflow.id,
        workflow.name,
        workflow.description,
        workflow.framework || 'bmad',
        workflow.nlInput,
        workflow.yamlDefinition,
        workflow.commandFile,
        workflow.category,
        workflow.status,
        workflow.version,
        tagsJson,
        workflow.icon || 'Workflow'
      ]);
    } catch (error: any) {
      console.error('Error creating workflow:', error);
      throw error;
    }

    return (await this.getById(workflow.id))!;
  },

  /**
   * Get all workflows
   */
  async getAll(): Promise<Workflow[]> {
    try {
      const rows = await statements.getAllWorkflows.all() as any[];
      return rows.map(this.mapRow);
    } catch (error: any) {
      // If table doesn't exist yet, return empty array
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.warn('⚠️  Workflows table not ready yet, returning empty array');
        return [];
      }
      throw error;
    }
  },

  /**
   * Get workflow by ID
   */
  async getById(id: string): Promise<Workflow | null> {
    try {
      const row = await statements.getWorkflow.get(id) as any;
      return row ? this.mapRow(row) : null;
    } catch (error: any) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.warn('⚠️  Workflows table not ready yet');
        return null;
      }
      throw error;
    }
  },

  /**
   * Get workflow by name
   */
  async getByName(name: string): Promise<Workflow | null> {
    try {
      const row = await statements.getWorkflowByName.get(name) as any;
      return row ? this.mapRow(row) : null;
    } catch (error: any) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.warn('⚠️  Workflows table not ready yet');
        return null;
      }
      throw error;
    }
  },

  /**
   * Update workflow
   */
  async update(id: string, updates: Partial<Omit<Workflow, 'id' | 'name' | 'createdAt' | 'updatedAt'>>): Promise<Workflow | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const tagsJson = updates.tags ? JSON.stringify(updates.tags) : existing.tags ? JSON.stringify(existing.tags) : null;

    await statements.updateWorkflow.run(
      updates.description || existing.description,
      updates.yamlDefinition || existing.yamlDefinition,
      updates.commandFile || existing.commandFile,
      updates.category || existing.category,
      updates.status || existing.status,
      tagsJson,
      id
    );

    return this.getById(id);
  },

  /**
   * Delete workflow
   */
  async delete(id: string): Promise<boolean> {
    const result = await statements.deleteWorkflow.run(id);
    return (result as any).rowCount > 0;
  },

  /**
   * Check if workflow exists by name
   */
  async existsByName(name: string): Promise<boolean> {
    return (await this.getByName(name)) !== null;
  },

  /**
   * Map database row to Workflow object
   */
  mapRow(row: any): Workflow {
    // Determine framework from multiple sources
    let framework: 'bmad' | 'amplifier' = 'bmad';

    if (row.framework) {
      // Explicit framework column
      framework = row.framework;
    } else if (row.command_file && row.command_file.includes('framework: amplifier')) {
      // Check command file content for framework marker
      framework = 'amplifier';
    } else if (row.yaml_definition && row.yaml_definition.includes('amplifier')) {
      // Check YAML/config content
      framework = 'amplifier';
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      framework: framework,
      nlInput: row.nl_input,
      yamlDefinition: row.yaml_definition,
      commandFile: row.command_file,
      category: row.category,
      status: row.status,
      version: row.version,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      icon: row.icon,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    };
  },
};

/**
 * Workflow execution operations
 */
export const executionsDb = {
  /**
   * Create execution record
   */
  async create(execution: Omit<WorkflowExecution, 'endTime' | 'duration'>): Promise<string> {
    await statements.createExecution.run(
      execution.id,
      execution.workflowId,
      execution.status,
    );
    return execution.id;
  },

  /**
   * Update execution
   */
  async update(id: string, updates: {
    status?: string;
    result?: string;
    logs?: any[];
    error?: string;
    duration?: number;
  }): Promise<void> {
    const logsJson = updates.logs ? JSON.stringify(updates.logs) : null;

    await statements.updateExecution.run(
      updates.status || 'running',
      updates.result || null,
      logsJson,
      updates.error || null,
      updates.duration || null,
      id
    );
  },

  /**
   * Get executions for a workflow
   */
  async getByWorkflowId(workflowId: string): Promise<WorkflowExecution[]> {
    const rows = await statements.getExecutionsByWorkflow.all(workflowId) as any[];
    return rows.map(this.mapRow);
  },

  /**
   * Map database row to WorkflowExecution
   */
  mapRow(row: any): WorkflowExecution {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      status: row.status,
      result: row.result,
      logs: row.logs ? JSON.parse(row.logs) : undefined,
      error: row.error,
      startTime: new Date(row.start_time).getTime(),
      endTime: row.end_time ? new Date(row.end_time).getTime() : undefined,
      duration: row.duration,
      manifestId: row.manifest_id,
    };
  },
};
