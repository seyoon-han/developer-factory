'use client';

/**
 * Project Group Settings Component
 * Manage project groups, their projects, and Slack configuration
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAgenticStore } from '@/lib/store/agenticStore';
import { ProjectGroup } from '@/types/agentic-task';
import { Project } from '@/types/project';
import { cn } from '@/lib/utils/cn';

interface ProjectGroupSettingsProps {
  className?: string;
}

export function ProjectGroupSettings({ className }: ProjectGroupSettingsProps) {
  const projectGroups = useAgenticStore((s) => s.projectGroups);
  const fetchProjectGroups = useAgenticStore((s) => s.fetchProjectGroups);
  const createProjectGroup = useAgenticStore((s) => s.createProjectGroup);
  const updateProjectGroup = useAgenticStore((s) => s.updateProjectGroup);
  const deleteProjectGroup = useAgenticStore((s) => s.deleteProjectGroup);
  const isLoading = useAgenticStore((s) => s.isLoading);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    baseBranch: 'main',
  });

  useEffect(() => {
    fetchProjectGroups();
  }, [fetchProjectGroups]);

  const resetForm = () => {
    setFormData({ name: '', description: '', baseBranch: 'main' });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (formData.name.trim()) {
      await createProjectGroup({
        name: formData.name,
        description: formData.description,
        baseBranch: formData.baseBranch,
      } as Partial<ProjectGroup>);
      resetForm();
    }
  };

  const handleUpdate = async () => {
    if (editingId && formData.name.trim()) {
      await updateProjectGroup(editingId, {
        name: formData.name,
        description: formData.description,
        baseBranch: formData.baseBranch,
      });
      resetForm();
    }
  };

  const handleEdit = (group: ProjectGroup) => {
    setEditingId(group.id);
    setFormData({
      name: group.name,
      description: group.description || '',
      baseBranch: group.baseBranch || 'main',
    });
    setIsCreating(false);
  };

  const handleDelete = async (groupId: number) => {
    if (confirm('Are you sure you want to delete this project group?')) {
      await deleteProjectGroup(groupId);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Project Groups</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage groups of projects for multi-repo orchestration
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-md text-sm transition-colors"
          >
            + New Group
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--muted)]">
          <h3 className="text-sm font-medium text-[var(--foreground)] mb-4">
            {editingId ? 'Edit Project Group' : 'Create Project Group'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Full Stack App"
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What repositories are in this group..."
                rows={2}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">Base Branch</label>
              <input
                type="text"
                value={formData.baseBranch}
                onChange={(e) => setFormData((prev) => ({ ...prev, baseBranch: e.target.value }))}
                placeholder="main"
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={isLoading}
                className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-md text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Groups List */}
      <div className="space-y-4">
        {projectGroups.length === 0 ? (
          <div className="p-8 border border-dashed border-[var(--border)] rounded-lg text-center">
            <p className="text-[var(--muted-foreground)]">No project groups configured yet.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 text-[var(--primary)] hover:underline text-sm"
            >
              Create your first group
            </button>
          </div>
        ) : (
          projectGroups.map((group) => (
            <ProjectGroupCard
              key={group.id}
              group={group}
              onEdit={() => handleEdit(group)}
              onDelete={() => handleDelete(group.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Project Group Card
interface ProjectGroupCardProps {
  group: ProjectGroup;
  onEdit: () => void;
  onDelete: () => void;
}

function ProjectGroupCard({ group, onEdit, onDelete }: ProjectGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSlackConfig, setShowSlackConfig] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProjectAdded = () => {
    setShowProjectSelector(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--muted)] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="font-medium text-[var(--foreground)]">{group.name}</div>
          {group.description && (
            <div className="text-sm text-[var(--muted-foreground)] mt-0.5">{group.description}</div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--muted-foreground)]">
            Branch: {group.baseBranch || 'main'}
          </span>
          <span className="text-[var(--muted-foreground)]">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] p-4 space-y-4">
          {/* Projects section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--foreground)]">Projects</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProjectSelector(true);
                }}
                className="text-xs text-[var(--primary)] hover:underline border border-[var(--border)] px-2 py-1 rounded"
              >
                + Add Project
              </button>
            </div>
            <ProjectList groupId={group.id} refreshKey={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />
          </div>

          {/* Project Selector Modal */}
          {showProjectSelector && (
            <ProjectSelectorModal
              groupId={group.id}
              onClose={() => setShowProjectSelector(false)}
              onProjectAdded={handleProjectAdded}
            />
          )}

          {/* Slack config section */}
          <div>
            <button
              onClick={() => setShowSlackConfig(!showSlackConfig)}
              className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <span>{showSlackConfig ? '▼' : '▶'}</span>
              Slack Notifications
            </button>
            {showSlackConfig && <SlackConfigForm groupId={group.id} />}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] rounded-md transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Project List Component
interface ProjectListProps {
  groupId: number;
  refreshKey?: number;
  onRefresh?: () => void;
}

function ProjectList({ groupId, refreshKey = 0, onRefresh }: ProjectListProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/agentic/project-groups/${groupId}/projects`);
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, refreshKey]);

  const handleRemove = async (projectId: number) => {
    setRemovingId(projectId);
    try {
      const res = await fetch(`/api/agentic/project-groups/${groupId}/projects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.success) {
        setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
        onRefresh?.();
      }
    } catch {
      // Ignore
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-[var(--muted-foreground)]">Loading...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="p-4 border border-dashed border-[var(--border)] rounded-md text-center text-sm text-[var(--muted-foreground)]">
        No projects added yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div
          key={project.id}
          className="p-3 bg-[var(--muted)] rounded-md flex items-center justify-between group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-[var(--foreground)]">
                {project.project?.name || project.project_name || 'Unknown'}
              </div>
              {project.isPrimary && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[var(--primary)] text-white rounded">
                  Primary
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] font-mono truncate">
              {project.project?.localPath || project.local_path}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--muted-foreground)]">
              {project.project?.gitBranch || project.git_branch}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(project.projectId || project.project_id);
              }}
              disabled={removingId === (project.projectId || project.project_id)}
              className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-400 transition-opacity disabled:opacity-50"
            >
              {removingId === (project.projectId || project.project_id) ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Project Selector Modal - Select from synced projects in global settings
interface ProjectSelectorModalProps {
  groupId: number;
  onClose: () => void;
  onProjectAdded: () => void;
}

function ProjectSelectorModal({ groupId, onClose, onProjectAdded }: ProjectSelectorModalProps) {
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [existingProjectIds, setExistingProjectIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all synced projects from global settings
        const projectsRes = await fetch('/api/projects');
        const projectsData = await projectsRes.json();
        
        // Fetch projects already in this group
        const groupProjectsRes = await fetch(`/api/agentic/project-groups/${groupId}/projects`);
        const groupProjectsData = await groupProjectsRes.json();
        
        const allProjects = projectsData.projects || [];
        const groupProjects = groupProjectsData.projects || [];
        
        // Get IDs of projects already in the group
        const existingIds = groupProjects.map((p: any) => p.projectId || p.project_id);
        
        setAvailableProjects(allProjects);
        setExistingProjectIds(existingIds);
      } catch (err) {
        setError('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [groupId]);

  const handleAddProject = async (projectId: number) => {
    setAddingId(projectId);
    setError(null);
    try {
      const res = await fetch(`/api/agentic/project-groups/${groupId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, isPrimary: false }),
      });
      const data = await res.json();
      if (data.success) {
        setExistingProjectIds((prev) => [...prev, projectId]);
        onProjectAdded();
      } else {
        setError(data.error || 'Failed to add project');
      }
    } catch {
      setError('Failed to add project');
    } finally {
      setAddingId(null);
    }
  };

  // Filter to only show projects not already in the group
  const projectsToShow = availableProjects.filter((p) => !existingProjectIds.includes(p.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--background)] border border-[var(--border)] rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Add Project to Group</h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Select from projects synced in your global settings
          </p>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center text-[var(--muted-foreground)] py-8">Loading projects...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : availableProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--muted-foreground)] mb-2">No projects synced yet</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Add projects in the <span className="text-[var(--primary)]">Project Settings</span> from the sidebar first
              </p>
            </div>
          ) : projectsToShow.length === 0 ? (
            <div className="text-center text-[var(--muted-foreground)] py-8">
              All synced projects have already been added to this group
            </div>
          ) : (
            <div className="space-y-2">
              {projectsToShow.map((project) => (
                <div
                  key={project.id}
                  className="p-3 border border-[var(--border)] rounded-md hover:bg-[var(--muted)] transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{project.name}</span>
                      {project.clone_status === 'ready' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded">
                          Ready
                        </span>
                      )}
                      {project.clone_status === 'cloning' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">
                          Cloning
                        </span>
                      )}
                      {project.clone_status === 'error' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded">
                          Error
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] font-mono truncate mt-0.5">
                      {project.local_path}
                    </div>
                    {project.git_branch && (
                      <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Branch: {project.git_branch}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddProject(project.id)}
                    disabled={addingId === project.id || project.clone_status !== 'ready'}
                    className="ml-3 px-3 py-1.5 text-xs bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingId === project.id ? 'Adding...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Slack Config Form
function SlackConfigForm({ groupId }: { groupId: number }) {
  const [config, setConfig] = useState({
    webhookUrl: '',
    notifyPhaseChanges: true,
    notifyUserAction: true,
    notifyCompletion: true,
    notifyErrors: true,
    includeTokenUsage: true,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/agentic/slack?projectGroupId=${groupId}`);
        const data = await res.json();
        if (data.success && data.config) {
          setConfig(data.config);
        }
      } catch {
        // Ignore
      }
    }
    fetchConfig();
  }, [groupId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/agentic/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectGroupId: groupId, ...config }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/agentic/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: config.webhookUrl }),
      });
      const data = await res.json();
      setTestResult(data);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="mt-3 p-4 bg-[var(--muted)] rounded-md space-y-4">
      <div>
        <label className="block text-sm text-[var(--muted-foreground)] mb-1">Webhook URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={config.webhookUrl}
            onChange={(e) => setConfig((prev) => ({ ...prev, webhookUrl: e.target.value }))}
            placeholder="https://hooks.slack.com/services/..."
            className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm"
          />
          <button
            onClick={handleTest}
            disabled={!config.webhookUrl || isTesting}
            className="px-3 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-[var(--background)] disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test'}
          </button>
        </div>
        {testResult && (
          <div
            className={cn(
              'mt-2 text-xs',
              testResult.success ? 'text-green-500' : 'text-red-500'
            )}
          >
            {testResult.success ? '✓ Webhook test successful' : `✕ ${testResult.error}`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'notifyPhaseChanges', label: 'Phase Changes' },
          { key: 'notifyUserAction', label: 'User Action Required' },
          { key: 'notifyCompletion', label: 'Task Completion' },
          { key: 'notifyErrors', label: 'Errors' },
          { key: 'includeTokenUsage', label: 'Include Token Usage' },
          { key: 'isActive', label: 'Enable Notifications' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(config as any)[key]}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, [key]: e.target.checked }))
              }
              className="w-4 h-4"
            />
            <span className="text-[var(--foreground)]">{label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-md text-sm transition-colors disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
}

export default ProjectGroupSettings;
