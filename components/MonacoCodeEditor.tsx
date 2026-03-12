'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { GitPanel } from './GitPanel';
import { WebTerminal } from './WebTerminal';
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Save, 
  RefreshCw,
  Maximize2,
  Minimize2,
  X,
  Terminal
} from 'lucide-react';

interface MonacoCodeEditorProps {
  project: {
    id: number;
    name: string;
    local_path: string;
  };
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
}

export function MonacoCodeEditor({ project }: MonacoCodeEditorProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [showTerminal, setShowTerminal] = useState(true);
  const [showGit, setShowGit] = useState(true);

  useEffect(() => {
    loadFileTree();
  }, [project.id]);

  const loadFileTree = async () => {
    try {
      const res = await fetch('/api/code-editor/files');
      const data = await res.json();
      setFiles(data.files || []);
      
      // Auto-expand root level
      const rootDirs = new Set(data.files?.filter((f: any) => f.type === 'directory').map((f: any) => f.path) || []);
      setExpandedDirs(rootDirs);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (filePath: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/code-editor/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      
      if (res.ok) {
        setFileContent(data.content);
        setOriginalContent(data.content);
        setSelectedFile(filePath);
      } else {
        alert(data.error || 'Failed to load file');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;

    try {
      setSaving(true);
      const res = await fetch('/api/code-editor/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: selectedFile,
          content: fileContent,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setOriginalContent(fileContent);
        alert('File saved successfully!');
      } else {
        alert(data.error || 'Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const toggleDirectory = (dirPath: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map(node => (
      <div key={node.path} style={{ marginLeft: `${level * 12}px` }}>
        {node.type === 'directory' ? (
          <>
            <div
              onClick={() => toggleDirectory(node.path)}
              className="flex items-center gap-1 px-2 py-1 hover:bg-accent rounded cursor-pointer text-sm"
            >
              {expandedDirs.has(node.path) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Folder className="h-3 w-3 text-yellow-500" />
              <span>{node.name}</span>
            </div>
            {expandedDirs.has(node.path) && node.children && (
              <div>
                {renderFileTree(node.children, level + 1)}
              </div>
            )}
          </>
        ) : (
          <div
            onClick={() => loadFile(node.path)}
            className={`flex items-center gap-1 px-2 py-1 hover:bg-accent rounded cursor-pointer text-sm ${
              selectedFile === node.path ? 'bg-accent font-medium' : ''
            }`}
          >
            <File className="h-3 w-3 text-blue-500" />
            <span className="truncate">{node.name}</span>
          </div>
        )}
      </div>
    ));
  };

  const getLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'md': 'markdown',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'sql': 'sql',
      'sh': 'shell',
      'yml': 'yaml',
      'yaml': 'yaml',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const hasChanges = fileContent !== originalContent;

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} flex flex-col bg-background`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Code Editor</h1>
          <span className="text-sm px-2 py-0.5 bg-accent rounded-md text-muted-foreground">
            {project.name}
          </span>
          {selectedFile && (
            <span className="text-sm text-muted-foreground">
              {selectedFile}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={loadFileTree}
            className="p-2 hover:bg-accent rounded-md"
            title="Refresh files"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          {selectedFile && (
            <button
              onClick={saveFile}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : hasChanges ? 'Save*' : 'Saved'}
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-accent rounded-md"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {selectedFile && (
            <button
              onClick={() => {
                if (!hasChanges || confirm('Discard changes?')) {
                  setSelectedFile(null);
                  setFileContent('');
                }
              }}
              className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden" style={{ height: showTerminal ? 'calc(100% - 300px)' : '100%' }}>
        {/* File Tree Sidebar */}
        <div className="w-64 border-r border-border bg-card overflow-y-auto p-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
            PROJECT FILES
          </div>
          {loading && files.length === 0 ? (
            <div className="text-sm text-muted-foreground px-2">Loading...</div>
          ) : files.length === 0 ? (
            <div className="text-sm text-muted-foreground px-2">No files found</div>
          ) : (
            renderFileTree(files)
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            <>
              <Editor
                height="100%"
                theme="vs-dark"
                language={getLanguage(selectedFile)}
                value={fileContent}
                onChange={(value) => setFileContent(value || '')}
                options={{
                  fontSize: 14,
                  minimap: { enabled: true },
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                }}
                loading={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">Loading editor...</div>
                  </div>
                }
              />
              {hasChanges && (
                <div className="px-4 py-2 text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-t border-yellow-500/20">
                  ⚠️ Unsaved changes - Click Save to persist
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a file from the sidebar to start editing</p>
                <p className="text-sm mt-1">Project: {project.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Git Panel */}
        {showGit && (
          <div className="w-72">
            <GitPanel
              projectPath={project.local_path}
              projectName={project.name}
              onRefresh={loadFileTree}
            />
          </div>
        )}
      </div>

      {/* Terminal */}
      {showTerminal && (
        <div style={{ height: '300px' }}>
          <WebTerminal
            projectPath={project.local_path}
            projectName={project.name}
          />
        </div>
      )}
    </div>
  );
}


