'use client';

import { useState, useEffect } from 'react';
import { MonacoCodeEditor } from '@/components/MonacoCodeEditor';
import { AlertCircle, ExternalLink } from 'lucide-react';

export default function CodeEditorPage() {
  const [activeProject, setActiveProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkActiveProject();
  }, []);

  const checkActiveProject = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      
      if (data.activeProjectId) {
        const projectRes = await fetch(`/api/projects/${data.activeProjectId}`);
        const project = await projectRes.json();
        setActiveProject(project);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading Code Editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Error Loading Code Editor</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-bold mb-2">No Active Project</h2>
          <p className="text-muted-foreground mb-4">
            Clone and activate a project in Settings to use the Code Editor
          </p>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Settings
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  return <MonacoCodeEditor project={activeProject} />;
}

