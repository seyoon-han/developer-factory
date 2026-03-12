/**
 * Workflow Detail Modal
 * Shows the full generated command and config/YAML for a workflow
 */

'use client';

import { X, FileText, Code, Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { Workflow } from '@/types/workflow';

interface Props {
  workflow: Workflow | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkflowDetailModal({ workflow, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'command' | 'config'>('command');
  const [copied, setCopied] = useState(false);
  
  if (!isOpen || !workflow) return null;
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold flex items-center gap-2 flex-wrap">
              {workflow.name}
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                workflow.framework === 'bmad'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {workflow.framework === 'bmad' ? 'BMAD v6' : 'MS Amplifier'}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {workflow.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md transition-colors ml-4"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b">
            <button
              onClick={() => setActiveTab('command')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'command'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              Claude Command
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'config'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="h-4 w-4" />
              {workflow.framework === 'bmad' ? 'BMAD v6 YAML' : 'Amplifier Config'}
            </button>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                {activeTab === 'command' 
                  ? `Command file: .claude/commands/${workflow.framework === 'amplifier' ? 'amplifier' : 'custom'}/${workflow.name}.md`
                  : workflow.framework === 'bmad'
                    ? `YAML file: workspace/.bmad/custom/workflows/${workflow.name}.yaml`
                    : `Config file: ai_context/workflows/${workflow.name}.md`
                }
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(activeTab === 'command' ? workflow.commandFile : workflow.yamlDefinition)}
                  className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload(
                    activeTab === 'command' ? workflow.commandFile : workflow.yamlDefinition,
                    activeTab === 'command' 
                      ? `${workflow.name}.md`
                      : workflow.framework === 'bmad' ? `${workflow.name}.yaml` : `${workflow.name}.md`
                  )}
                  className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto border rounded-md bg-accent/30 p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {activeTab === 'command' ? workflow.commandFile : workflow.yamlDefinition}
              </pre>
            </div>
          </div>
          
          {/* Metadata */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Workflow Information</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Framework:</span>
                <p className="font-medium">{workflow.framework === 'bmad' ? 'BMAD v6 Alpha' : 'MS Amplifier'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium capitalize">{workflow.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Version:</span>
                <p className="font-medium">v{workflow.version}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p className="font-medium capitalize">{workflow.category}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">
                  {new Date(workflow.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Claude Command:</span>
                <p className="font-mono text-xs">/{workflow.name}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

