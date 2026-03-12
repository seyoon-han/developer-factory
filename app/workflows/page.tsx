/**
 * Workflows List Page
 * Main page for viewing and managing custom workflows
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Zap, Edit, Trash2, FileText, Layers, Filter, Eye } from 'lucide-react';
import { WorkflowBuilderModal } from '@/components/workflows/WorkflowBuilderModal';
import { WorkflowDetailModal } from '@/components/workflows/WorkflowDetailModal';
import type { Workflow, WorkflowFramework } from '@/types/workflow';
import { WORKFLOW_FRAMEWORKS } from '@/types/workflow';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [frameworkFilter, setFrameworkFilter] = useState<WorkflowFramework | 'all'>('all');
  
  // Detail modal
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Prevent hydration mismatch - only run on client
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (mounted) {
      loadWorkflows();
    }
  }, [mounted]);
  
  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/workflows');
      const data = await response.json();
      
      if (data.success) {
        setWorkflows(data.workflows || []);
      } else {
        setError(data.error || 'Failed to load workflows');
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
      setError('Failed to load workflows. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleWorkflowCreated = () => {
    loadWorkflows();
    setIsModalOpen(false);
  };
  
  const handleViewDetails = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setIsDetailModalOpen(true);
  };
  
  const handleDelete = async (workflow: Workflow) => {
    if (!confirm(`Delete workflow "${workflow.name}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        loadWorkflows();
      } else {
        alert(`Failed to delete workflow: ${data.error}`);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete workflow. Please try again.');
    }
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const filteredWorkflows = frameworkFilter === 'all'
    ? workflows
    : workflows.filter(w => w.framework === frameworkFilter);
  
  const getFrameworkBadge = (framework: WorkflowFramework) => {
    if (framework === 'bmad') {
      return {
        label: 'BMAD v6',
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        icon: Layers,
      };
    } else {
      return {
        label: 'MS Amplifier',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        icon: Zap,
      };
    }
  };
  
  // Prevent hydration mismatch
  if (!mounted || loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive">{error}</p>
          <button
            onClick={loadWorkflows}
            className="mt-2 px-3 py-1 text-sm border border-destructive rounded-md hover:bg-destructive/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-8 w-8" />
            Custom Workflows
          </h1>
          <p className="text-muted-foreground mt-1">
            Create automated workflows with BMAD v6 or MS Amplifier
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Workflow
        </button>
      </div>
      
      {/* Framework Filter */}
      {workflows.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Framework:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFrameworkFilter('all')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                frameworkFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent hover:bg-accent/80'
              }`}
            >
              All ({workflows.length})
            </button>
            <button
              onClick={() => setFrameworkFilter('bmad')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                frameworkFilter === 'bmad'
                  ? 'bg-purple-500 text-white'
                  : 'bg-accent hover:bg-accent/80'
              }`}
            >
              BMAD ({workflows.filter(w => w.framework === 'bmad').length})
            </button>
            <button
              onClick={() => setFrameworkFilter('amplifier')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                frameworkFilter === 'amplifier'
                  ? 'bg-blue-500 text-white'
                  : 'bg-accent hover:bg-accent/80'
              }`}
            >
              Amplifier ({workflows.filter(w => w.framework === 'amplifier').length})
            </button>
          </div>
        </div>
      )}
      
      {/* Workflows Grid */}
      {workflows.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first custom workflow to get started
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredWorkflows.map((workflow) => {
            const frameworkBadge = getFrameworkBadge(workflow.framework);
            const FrameworkIcon = frameworkBadge.icon;
            
            return (
            <div
              key={workflow.id}
              className="group p-6 border rounded-lg hover:border-primary hover:shadow-md transition-all bg-card"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Workflow Header */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md ${
                      workflow.framework === 'bmad' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <FrameworkIcon className={`h-5 w-5 ${
                        workflow.framework === 'bmad' ? 'text-purple-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold flex items-center gap-2 flex-wrap">
                        {workflow.name}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${frameworkBadge.color}`}>
                          {frameworkBadge.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            workflow.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : workflow.status === 'draft'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {workflow.status}
                        </span>
                      </h3>
                      <p className="text-muted-foreground mt-1">{workflow.description}</p>
                      
                      {/* Tags */}
                      {workflow.tags && workflow.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {workflow.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-accent rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${
                            workflow.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          {workflow.status}
                        </span>
                        <span>Category: {workflow.category}</span>
                        <span>Version: v{workflow.version}</span>
                        <span>Created: {formatDate(workflow.createdAt)}</span>
                      </div>
                      
                      {/* Claude Command */}
                      <div className="mt-3 p-2 bg-accent/50 rounded border">
                        <p className="text-xs text-muted-foreground">Claude Command:</p>
                        <code className="text-sm font-mono">/{workflow.name}</code>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleViewDetails(workflow)}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => alert('Test execution coming soon!')}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                    title="Test workflow"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => alert('Edit functionality coming soon!')}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                    title="Edit workflow"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(workflow)}
                    className="p-2 hover:bg-accent rounded-md text-destructive transition-colors"
                    title="Delete workflow"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
      
      {/* No Results for Filter */}
      {workflows.length > 0 && filteredWorkflows.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Filter className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No workflows found</h3>
          <p className="text-muted-foreground mb-4">
            No workflows match the selected framework filter
          </p>
          <button
            onClick={() => setFrameworkFilter('all')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Show All Workflows
          </button>
        </div>
      )}
      
      {/* Workflow Builder Modal */}
      <WorkflowBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onWorkflowCreated={handleWorkflowCreated}
      />
      
      {/* Workflow Detail Modal */}
      <WorkflowDetailModal
        workflow={selectedWorkflow}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedWorkflow(null);
        }}
      />
    </div>
  );
}

