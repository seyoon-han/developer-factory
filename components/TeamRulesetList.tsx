'use client';

import { useState, useEffect } from 'react';
import { TeamRuleset } from '@/app/team-rulesets/page';
import { 
  BookOpen, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  X,
  Save,
  Copy
} from 'lucide-react';

interface TeamRulesetListProps {
  rulesets: TeamRuleset[];
  onRefresh: () => void;
  showCreateModal: boolean;
  onCloseCreateModal: () => void;
}

const TEMPLATE = `## Metadata
Ruleset Name: 
Description: 
Version: 1.0.0

## Overview
[Describe the purpose and scope of this ruleset]

## When to Apply
[Describe when and where this ruleset should be applied]

## Resources
- [Resource 1]
- [Resource 2]`;

export function TeamRulesetList({ 
  rulesets, 
  onRefresh, 
  showCreateModal,
  onCloseCreateModal 
}: TeamRulesetListProps) {
  const [editingRuleset, setEditingRuleset] = useState<TeamRuleset | null>(null);
  const [viewingRuleset, setViewingRuleset] = useState<TeamRuleset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '1.0.0',
    body: TEMPLATE,
    whenApply: '',
    resources: [] as string[],
    dependencies: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showCreateModal) {
      setIsCreating(true);
      setFormData({
        name: '',
        description: '',
        version: '1.0.0',
        body: TEMPLATE,
        whenApply: '',
        resources: [],
        dependencies: [],
      });
      setError(null);
    }
  }, [showCreateModal]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.body.trim()) {
      setError('Name and body are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/team-rulesets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          version: formData.version,
          body: formData.body,
          whenApply: formData.whenApply,
          resources: formData.resources,
          dependencies: formData.dependencies,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ruleset');
      }

      onRefresh();
      setIsCreating(false);
      onCloseCreateModal();
      setFormData({
        name: '',
        description: '',
        version: '1.0.0',
        body: TEMPLATE,
        whenApply: '',
        resources: [],
        dependencies: [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingRuleset || !formData.name.trim() || !formData.body.trim()) {
      setError('Name and body are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/team-rulesets/${editingRuleset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          version: formData.version,
          body: formData.body,
          whenApply: formData.whenApply,
          resources: formData.resources,
          dependencies: formData.dependencies,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update ruleset');
      }

      onRefresh();
      setEditingRuleset(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this ruleset?')) {
      return;
    }

    try {
      const response = await fetch(`/api/team-rulesets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete ruleset');
      }

      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const response = await fetch(`/api/team-rulesets/${id}/toggle`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle ruleset');
      }

      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEdit = (ruleset: TeamRuleset) => {
    setEditingRuleset(ruleset);
    setFormData({
      name: ruleset.name,
      description: ruleset.description || '',
      version: ruleset.version,
      body: ruleset.body,
      whenApply: ruleset.when_apply || '',
      resources: ruleset.resources || [],
      dependencies: ruleset.dependencies || [],
    });
    setError(null);
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(TEMPLATE);
    alert('Template copied to clipboard!');
  };

  // Modal for creating/editing
  const renderModal = () => {
    if (!isCreating && !editingRuleset) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground">
              {isCreating ? 'Create New Ruleset' : 'Edit Ruleset'}
            </h2>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingRuleset(null);
                onCloseCreateModal();
                setError(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Ruleset Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Code Review Guidelines"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this ruleset"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0.0"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-foreground">
                    Body <span className="text-destructive">*</span>
                  </label>
                  {isCreating && (
                    <button
                      onClick={copyTemplate}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Template
                    </button>
                  )}
                </div>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Ruleset content using the provided template..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  rows={15}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use markdown formatting. Template structure: Metadata, Overview, When to Apply, Resources
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingRuleset(null);
                onCloseCreateModal();
                setError(null);
              }}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={isCreating ? handleCreate : handleUpdate}
              disabled={saving || !formData.name.trim() || !formData.body.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : isCreating ? 'Create' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal for viewing
  const renderViewModal = () => {
    if (!viewingRuleset) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{viewingRuleset.name}</h2>
              {viewingRuleset.description && (
                <p className="text-sm text-muted-foreground mt-1">{viewingRuleset.description}</p>
              )}
            </div>
            <button
              onClick={() => setViewingRuleset(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Version: {viewingRuleset.version}</span>
              <span>•</span>
              <span>
                Status: {viewingRuleset.enabled ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-yellow-600">Disabled</span>
                )}
              </span>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm">
                {viewingRuleset.body}
              </pre>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={() => {
                setViewingRuleset(null);
                startEdit(viewingRuleset);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {rulesets.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No Rulesets Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first team ruleset to define workflow best practices
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rulesets.map((ruleset) => (
            <div
              key={ruleset.id}
              className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{ruleset.name}</h3>
                  {ruleset.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {ruleset.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(ruleset.id)}
                  className={`ml-2 ${
                    ruleset.enabled ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                  title={ruleset.enabled ? 'Enabled' : 'Disabled'}
                >
                  {ruleset.enabled ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <span>v{ruleset.version}</span>
                <span>•</span>
                <span>{new Date(ruleset.updated_at).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingRuleset(ruleset)}
                  className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md hover:bg-accent transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => startEdit(ruleset)}
                  className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 border border-border rounded-md transition-colors"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(ruleset.id)}
                  className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 border border-border rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {renderModal()}
      {renderViewModal()}
    </>
  );
}

