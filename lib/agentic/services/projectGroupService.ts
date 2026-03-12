/**
 * Project Groups Service
 * Manages project groups for multi-repo orchestration
 */

import { statements } from '@/lib/db/postgres';
import {
  ProjectGroup,
  ProjectGroupRow,
  ProjectGroupMember,
  ProjectGroupMemberRow,
  rowToProjectGroup,
} from '@/types/agentic-task';

export class ProjectGroupService {
  /**
   * Create a new project group
   */
  async createGroup(name: string, description?: string, isDefault: boolean = false): Promise<ProjectGroup> {
    const result = await statements.createProjectGroup.run(name, description || null, isDefault ? 1 : 0);
    const row = await statements.getProjectGroup.get(result.lastInsertRowid) as ProjectGroupRow;
    return rowToProjectGroup(row);
  }

  /**
   * Get a project group by ID
   */
  async getGroup(id: number): Promise<ProjectGroup | null> {
    const row = await statements.getProjectGroup.get(id) as ProjectGroupRow | undefined;
    if (!row) return null;

    const group = rowToProjectGroup(row);
    group.projects = await this.getGroupMembers(id);
    group.projectCount = group.projects?.length || 0;
    return group;
  }

  /**
   * Get a project group by name
   */
  async getGroupByName(name: string): Promise<ProjectGroup | null> {
    const row = await statements.getProjectGroupByName.get(name) as ProjectGroupRow | undefined;
    if (!row) return null;

    const group = rowToProjectGroup(row);
    group.projects = await this.getGroupMembers(row.id);
    group.projectCount = group.projects?.length || 0;
    return group;
  }

  /**
   * Get all project groups
   */
  async getAllGroups(): Promise<ProjectGroup[]> {
    const rows = await statements.getAllProjectGroups.all() as ProjectGroupRow[];
    const groups: ProjectGroup[] = [];

    for (const row of rows) {
      const group = rowToProjectGroup(row);
      group.projects = await this.getGroupMembers(row.id);
      group.projectCount = group.projects?.length || 0;
      groups.push(group);
    }

    return groups;
  }

  /**
   * Get the default project group
   */
  async getDefaultGroup(): Promise<ProjectGroup | null> {
    const row = await statements.getDefaultProjectGroup.get() as ProjectGroupRow | undefined;
    if (!row) return null;

    const group = rowToProjectGroup(row);
    group.projects = await this.getGroupMembers(row.id);
    group.projectCount = group.projects?.length || 0;
    return group;
  }

  /**
   * Update a project group
   */
  async updateGroup(id: number, name: string, description?: string): Promise<ProjectGroup | null> {
    await statements.updateProjectGroup.run(name, description || null, id);
    return this.getGroup(id);
  }

  /**
   * Set a group as default
   */
  async setDefaultGroup(id: number): Promise<void> {
    // First, unset all defaults, then set the new one
    const allGroups = await statements.getAllProjectGroups.all() as ProjectGroupRow[];
    for (const group of allGroups) {
      if (group.is_default === 1 && group.id !== id) {
        await statements.updateProjectGroup.run(group.name, group.description, group.id);
      }
    }

    const targetGroup = await statements.getProjectGroup.get(id) as ProjectGroupRow;
    if (targetGroup) {
      // Update with is_default = 1 - use raw query
      const { query } = require('@/lib/db/postgres');
      await query(`UPDATE project_groups SET is_default = false WHERE user_id = 'test0'`);
      await query(`UPDATE project_groups SET is_default = true WHERE id = $1 AND user_id = 'test0'`, [id]);
    }
  }

  /**
   * Delete a project group
   */
  async deleteGroup(id: number): Promise<boolean> {
    const result = await statements.deleteProjectGroup.run(id);
    return result.changes > 0;
  }

  /**
   * Get members of a project group
   */
  async getGroupMembers(groupId: number): Promise<ProjectGroupMember[]> {
    const rows = await statements.getProjectGroupMembers.all(groupId) as ProjectGroupMemberRow[];

    return rows.map(row => ({
      id: row.id,
      groupId: row.group_id,
      projectId: row.project_id,
      isPrimary: row.is_primary === 1,
      project: row.project_name ? {
        id: row.project_id,
        name: row.project_name,
        localPath: row.local_path || '',
        gitRemoteUrl: row.git_remote_url || '',
        gitBranch: row.git_branch || 'main',
      } : undefined,
      createdAt: row.created_at,
    }));
  }

  /**
   * Add a project to a group
   */
  async addProjectToGroup(groupId: number, projectId: number, isPrimary: boolean = false): Promise<ProjectGroupMember> {
    // If setting as primary, unset existing primary first
    if (isPrimary) {
      const { query } = require('@/lib/db/postgres');
      await query(`UPDATE project_group_members SET is_primary = false WHERE group_id = $1 AND user_id = 'test0'`, [groupId]);
    }

    const result = await statements.addProjectToGroup.run(groupId, projectId, isPrimary ? 1 : 0);
    const members = await this.getGroupMembers(groupId);
    const newMember = members.find(m => m.id === Number(result.lastInsertRowid));

    if (!newMember) {
      throw new Error('Failed to add project to group');
    }

    return newMember;
  }

  /**
   * Remove a project from a group
   */
  async removeProjectFromGroup(groupId: number, projectId: number): Promise<boolean> {
    const result = await statements.removeProjectFromGroup.run(groupId, projectId);
    return result.changes > 0;
  }

  /**
   * Set the primary project in a group
   */
  async setPrimaryProject(groupId: number, projectId: number): Promise<void> {
    const { query } = require('@/lib/db/postgres');
    await query(`UPDATE project_group_members SET is_primary = false WHERE group_id = $1 AND user_id = 'test0'`, [groupId]);
    await query(`UPDATE project_group_members SET is_primary = true WHERE group_id = $1 AND project_id = $2 AND user_id = 'test0'`, [groupId, projectId]);
  }

  /**
   * Get all project paths for a group (for worktree creation)
   */
  async getGroupProjectPaths(groupId: number): Promise<{ projectId: number; localPath: string; gitBranch: string }[]> {
    const members = await this.getGroupMembers(groupId);
    return members
      .filter(m => m.project)
      .map(m => ({
        projectId: m.projectId,
        localPath: m.project!.localPath,
        gitBranch: m.project!.gitBranch,
      }));
  }

  /**
   * Get projects in a group with full details (for pipeline orchestrator)
   */
  async getProjectsInGroup(groupId: number): Promise<{
    id: number;
    name: string;
    localPath: string;
    gitRemoteUrl: string;
    gitBranch: string;
  }[]> {
    const members = await this.getGroupMembers(groupId);
    return members
      .filter(m => m.project)
      .map(m => ({
        id: m.projectId,
        name: m.project!.name,
        localPath: m.project!.localPath,
        gitRemoteUrl: m.project!.gitRemoteUrl || '',
        gitBranch: m.project!.gitBranch,
      }));
  }
}

// Singleton instance
export const projectGroupService = new ProjectGroupService();
export default projectGroupService;
