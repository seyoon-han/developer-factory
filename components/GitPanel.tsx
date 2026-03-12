'use client';

import { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Upload, Download, RefreshCw } from 'lucide-react';

interface GitPanelProps {
  projectPath: string;
  projectName: string;
  onRefresh?: () => void;
}

export function GitPanel({ projectPath, projectName, onRefresh }: GitPanelProps) {
  const [status, setStatus] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBranches, setShowBranches] = useState(false);

  useEffect(() => {
    loadGitStatus();
    loadBranches();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadGitStatus, 10000);
    return () => clearInterval(interval);
  }, [projectPath]);

  const loadGitStatus = async () => {
    try {
      const res = await fetch('/api/code-editor/git/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error loading git status:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await fetch('/api/code-editor/git/branches');
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/code-editor/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage }),
      });

      if (res.ok) {
        setCommitMessage('');
        loadGitStatus();
        onRefresh?.();
        alert('Changes committed successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to commit');
      }
    } catch (error) {
      alert('Error committing changes');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (branch: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/code-editor/git/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch }),
      });

      if (res.ok) {
        loadGitStatus();
        loadBranches();
        onRefresh?.();
        setShowBranches(false);
        alert(`Switched to branch: ${branch}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to switch branch');
      }
    } catch (error) {
      alert('Error switching branch');
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading git status...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Git</h3>
          <button
            onClick={() => { loadGitStatus(); loadBranches(); }}
            className="p-1 hover:bg-accent rounded"
            title="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
        
        {/* Branch */}
        <div className="relative">
          <button
            onClick={() => setShowBranches(!showBranches)}
            className="flex items-center gap-1 text-sm hover:bg-accent px-2 py-1 rounded w-full justify-between"
          >
            <div className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              <span className="font-mono">{status.branch}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {status.ahead > 0 && `↑${status.ahead} `}
              {status.behind > 0 && `↓${status.behind}`}
            </span>
          </button>

          {/* Branch dropdown */}
          {showBranches && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded shadow-lg z-10 max-h-48 overflow-y-auto">
              {branches.map(branch => (
                <button
                  key={branch.name}
                  onClick={() => !branch.current && handleCheckout(branch.name)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                    branch.current ? 'bg-accent font-medium' : ''
                  }`}
                  disabled={branch.current}
                >
                  {branch.name}
                  {branch.current && ' (current)'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Changes */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-xs font-semibold text-muted-foreground mb-2">
          CHANGES ({status.changes.length})
        </div>
        
        {status.changes.length === 0 ? (
          <div className="text-sm text-muted-foreground">No changes</div>
        ) : (
          <div className="space-y-1">
            {status.changes.map((change: any) => (
              <div
                key={change.path}
                className="text-xs font-mono p-1 hover:bg-accent rounded"
              >
                <span className={`${
                  change.modified ? 'text-yellow-500' :
                  change.added ? 'text-green-500' :
                  change.deleted ? 'text-red-500' :
                  'text-blue-500'
                } mr-2`}>
                  {change.modified ? 'M' :
                   change.added ? 'A' :
                   change.deleted ? 'D' :
                   '?'}
                </span>
                <span className="truncate">{change.path}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commit Section */}
      {status.hasChanges && (
        <div className="p-3 border-t border-border">
          <textarea
            placeholder="Commit message..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-background border border-border rounded mb-2 resize-none"
            rows={3}
          />
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || loading}
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GitCommit className="h-3 w-3" />
            {loading ? 'Committing...' : 'Commit'}
          </button>
        </div>
      )}
    </div>
  );
}

