'use client';

import { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Check, 
  RefreshCw, 
  Trash2, 
  AlertCircle,
  Loader2,
  GitBranch,
  X,
  Plus
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description: string | null;
  git_remote_url: string;
  git_branch: string;
  local_path: string;
  is_active: boolean;
  framework: string;
  language: string;
  package_manager: string;
  clone_status: string;
  clone_error: string | null;
  created_at: string;
}

export function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCloneModal, setShowCloneModal] = useState(false);
  
  useEffect(() => {
    fetchProjects();
    // Poll for updates (to catch clone progress)
    const interval = setInterval(fetchProjects, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      
      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('API returned non-JSON response:', await res.text());
        throw new Error('API returned invalid response');
      }
      
      const data = await res.json();
      setProjects(data.projects || []);
      setActiveProjectId(data.activeProjectId);
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Set empty state on error
      setProjects([]);
      setActiveProjectId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (projectId: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/activate`, {
        method: 'POST',
      });
      
      if (res.ok) {
        await fetchProjects();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to activate project');
      }
    } catch (error: any) {
      alert('Error activating project: ' + error.message);
    }
  };

  const handleSync = async (projectId: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/sync`, {
        method: 'POST',
      });
      
      if (res.ok) {
        await fetchProjects();
        alert('Project synced successfully!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to sync project');
      }
    } catch (error: any) {
      alert('Error syncing project: ' + error.message);
    }
  };

  const handleDelete = async (projectId: number, projectName: string) => {
    if (!confirm(`Delete project "${projectName}"? This will remove the local directory.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        await fetchProjects();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete project');
      }
    } catch (error: any) {
      alert('Error deleting project: ' + error.message);
    }
  };

  const handleDemoMode = async () => {
    if (!confirm('Enter demo mode? This will deactivate all projects and work on dev-automation-board itself.')) {
      return;
    }

    try {
      const res = await fetch('/api/projects/deactivate', {
        method: 'POST',
      });
      
      if (res.ok) {
        await fetchProjects();
        alert('Demo mode activated - now working on dev-automation-board itself');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to enter demo mode');
      }
    } catch (error: any) {
      alert('Error entering demo mode: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">Ready</span>;
      case 'cloning':
        return <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Cloning...</span>;
      case 'error':
        return <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">Error</span>;
      default:
        return <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">Pending</span>;
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading projects...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Active Project Display */}
      <div className="p-4 bg-accent/50 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground mb-1">Current Work Target</div>
            {activeProjectId ? (
              <div className="text-muted-foreground">
                {projects.find(p => p.id === activeProjectId)?.name || 'Unknown'}
              </div>
            ) : (
              <div className="text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Demo Mode - Working on dev-automation-board itself
              </div>
            )}
          </div>
          {activeProjectId && (
            <button
              onClick={handleDemoMode}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent"
            >
              Enter Demo Mode
            </button>
          )}
        </div>
      </div>

      {/* Clone New Project Button */}
      <button
        onClick={() => setShowCloneModal(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Clone New Project
      </button>

      {/* Projects List */}
      <div className="space-y-2">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderGit2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No projects cloned yet</p>
            <p className="text-sm mt-1">Clone a Git repository to get started</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FolderGit2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-foreground truncate">{project.name}</div>
                    {project.is_active && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                        <Check className="h-3 w-3" />
                        Active
                      </div>
                    )}
                    {getStatusBadge(project.clone_status)}
                  </div>
                  {project.description && (
                    <div className="text-sm text-muted-foreground truncate">{project.description}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{project.framework || 'unknown'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {project.git_branch}
                    </span>
                  </div>
                  {project.clone_error && (
                    <div className="text-xs text-destructive mt-1">{project.clone_error}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {project.clone_status === 'ready' && !project.is_active && (
                  <button
                    onClick={() => handleActivate(project.id)}
                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    title="Set as active project"
                  >
                    Activate
                  </button>
                )}
                {project.clone_status === 'ready' && (
                  <button
                    onClick={() => handleSync(project.id)}
                    className="p-2 text-muted-foreground hover:text-foreground"
                    title="Sync with remote"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                {!project.is_active && (
                  <button
                    onClick={() => handleDelete(project.id, project.name)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-md"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clone Modal */}
      {showCloneModal && (
        <CloneProjectModal
          onClose={() => setShowCloneModal(false)}
          onSuccess={() => {
            setShowCloneModal(false);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}

interface CloneProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CloneProjectModal({ onClose, onSuccess }: CloneProjectModalProps) {
  const [name, setName] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [description, setDescription] = useState('');
  const [setActive, setSetActive] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCloning(true);
    setError(null);

    try {
      const res = await fetch('/api/projects/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          gitUrl,
          branch,
          description,
          setActive,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Project cloning started! Check the project list for status.');
        onSuccess();
      } else {
        setError(data.error || 'Failed to clone project');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Clone Git Project</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Project Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              required
              pattern="[a-zA-Z0-9_-]+"
              title="Only letters, numbers, hyphens, and underscores"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Alphanumeric, hyphens, and underscores only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Git Repository URL <span className="text-destructive">*</span>
            </label>
            <input
              type="url"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="https://github.com/username/repo.git"
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this project..."
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="setActive"
              checked={setActive}
              onChange={(e) => setSetActive(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="setActive" className="text-sm text-foreground">
              Set as active project after cloning
            </label>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>ℹ️ Note:</strong> Cloning happens in the background and may take a few minutes.
              The project will appear with "Cloning..." status until complete.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md text-foreground hover:bg-accent"
              disabled={isCloning}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCloning || !name || !gitUrl}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCloning ? 'Starting Clone...' : 'Clone Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


