/**
 * Workflow Builder Modal
 * UI for creating custom workflows from natural language
 * BMAD v6 Alpha compatible
 */

'use client';

import { useState } from 'react';
import { X, Loader2, Sparkles, Check, AlertCircle, Layers, Zap } from 'lucide-react';
import type { WorkflowGenerationResult, WorkflowFramework } from '@/types/workflow';
import { WORKFLOW_FRAMEWORKS } from '@/types/workflow';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowCreated: () => void;
}

export function WorkflowBuilderModal({ isOpen, onClose, onWorkflowCreated }: Props) {
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState<WorkflowFramework>('bmad');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'yaml' | 'command'>('yaml');
  
  // Workflow name editing
  const [workflowName, setWorkflowName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  
  if (!isOpen) return null;
  
  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please enter a workflow description');
      return;
    }
    
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, framework }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGenerated(data.workflow);
        setWorkflowName(data.workflow.name); // Set initial name
        setError(null);
        setNameError(null);
      } else {
        setError(data.error || 'Failed to generate workflow');
      }
    } catch (err) {
      console.error('Generation failed:', err);
      setError('Failed to generate workflow. Please try again.');
    } finally {
      setGenerating(false);
    }
  };
  
  /**
   * Validate workflow name
   */
  const validateWorkflowName = async (name: string): Promise<string | null> => {
    // Check empty
    if (!name || name.trim().length === 0) {
      return 'Workflow name is required';
    }
    
    // Check length
    if (name.length < 3) {
      return 'Name must be at least 3 characters';
    }
    
    if (name.length > 50) {
      return 'Name must be less than 50 characters';
    }
    
    // Check format (kebab-case only: lowercase letters, numbers, hyphens)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      return 'Name must be kebab-case (lowercase letters, numbers, hyphens only). Example: my-workflow-name';
    }
    
    // Check for consecutive hyphens
    if (name.includes('--')) {
      return 'No consecutive hyphens allowed';
    }
    
    // Check start/end
    if (name.startsWith('-') || name.endsWith('-')) {
      return 'Name cannot start or end with a hyphen';
    }
    
    // Check for duplicates (async)
    try {
      setCheckingDuplicate(true);
      const response = await fetch('/api/workflows');
      const data = await response.json();
      
      if (data.success && data.workflows) {
        const exists = data.workflows.some((w: any) => w.name === name);
        if (exists) {
          return 'A workflow with this name already exists';
        }
      }
    } catch (err) {
      console.error('Error checking duplicate:', err);
      // Don't block on duplicate check error
    } finally {
      setCheckingDuplicate(false);
    }
    
    return null; // Valid
  };
  
  /**
   * Handle workflow name change
   */
  const handleNameChange = async (name: string) => {
    setWorkflowName(name);
    
    // Clear error immediately if user is typing
    if (nameError) {
      setNameError(null);
    }
    
    // Debounced validation
    const error = await validateWorkflowName(name);
    setNameError(error);
  };
  
  const handleSave = async () => {
    if (!generated) return;
    
    // Final validation before save
    const validationError = await validateWorkflowName(workflowName);
    if (validationError) {
      setNameError(validationError);
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName, // Use edited name
          description: generated.description,
          framework: framework,
          nlInput: description,
          yamlDefinition: generated.yamlDefinition,
          commandFile: generated.commandFile,
          category: 'custom',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        onWorkflowCreated();
        handleClose();
      } else {
        setError(data.error || 'Failed to save workflow');
      }
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save workflow. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleClose = () => {
    setDescription('');
    setGenerated(null);
    setError(null);
    setActiveTab('yaml');
    setWorkflowName('');
    setNameError(null);
    onClose();
  };
  
  const handleStartOver = () => {
    setGenerated(null);
    setError(null);
    setActiveTab('yaml');
    setWorkflowName('');
    setNameError(null);
    // Keep framework selection
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold">Create Custom Workflow</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Describe your workflow in natural language and let AI generate it
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/90 mt-1">{error}</p>
              </div>
            </div>
          )}
          
          {/* Framework Selector */}
          {!generated && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Choose Framework:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {WORKFLOW_FRAMEWORKS.map((fw) => (
                  <button
                    key={fw.value}
                    onClick={() => setFramework(fw.value)}
                    disabled={generating}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      framework === fw.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {fw.value === 'bmad' ? (
                        <Layers className="h-5 w-5 text-primary" />
                      ) : (
                        <Zap className="h-5 w-5 text-blue-500" />
                      )}
                      <span className="font-semibold">{fw.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{fw.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Description Input */}
          {!generated && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Describe your workflow in natural language:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  framework === 'bmad'
                    ? "Example: Run tests, check coverage, and deploy if coverage is above 80%"
                    : "Example: Design and implement authentication with document-driven development"
                }
                className="w-full h-32 p-3 border rounded-md resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={generating}
              />
              <p className="text-xs text-muted-foreground">
                {framework === 'bmad' 
                  ? '📋 BMAD: Multi-agent Agile workflow with planning + build phases'
                  : '📝 Amplifier: Document-driven development with specialized agents (Microsoft)'
                }
              </p>
            </div>
          )}
          
          {/* Generate Button */}
          {!generated && (
            <button
              onClick={handleGenerate}
              disabled={!description.trim() || generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating workflow with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Workflow
                </>
              )}
            </button>
          )}
          
          {/* Generated Workflow Preview */}
          {generated && (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="flex items-start gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Workflow generated successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Review the generated workflow below and save when ready.
                  </p>
                </div>
              </div>
              
              {/* Workflow Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Workflow Name *
                  </label>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="my-workflow-name"
                    className={`w-full mt-1 px-3 py-2 border rounded-md font-mono bg-background focus:outline-none focus:ring-2 ${
                      nameError 
                        ? 'border-destructive focus:ring-destructive' 
                        : 'border-border focus:ring-primary'
                    }`}
                  />
                  {nameError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {nameError}
                    </p>
                  )}
                  {checkingDuplicate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Checking for duplicates...
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Use kebab-case (e.g., my-workflow-name). This will be your Claude command: <code className="text-xs">/{workflowName || 'workflow-name'}</code>
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1">{generated.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Agents</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generated.agents.map((agent: string) => (
                        <span
                          key={agent}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                        >
                          {agent}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tools</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generated.tools.map((tool: string) => (
                        <span
                          key={tool}
                          className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Steps */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Workflow Steps</label>
                <div className="mt-2 space-y-2">
                  {generated.steps.map((step: any, idx: number) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-3 p-3 bg-accent/50 rounded-md"
                    >
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-full">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{step.name}</p>
                          <span className="px-1.5 py-0.5 text-xs bg-background rounded">
                            {step.phase}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Agent: {step.agent} • Tool: {step.tool}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Generated Files Tabs */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Generated Files</label>
                <div className="mt-2 border rounded-md overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b bg-muted/50">
                    <button
                      onClick={() => setActiveTab('yaml')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'yaml'
                          ? 'bg-background border-b-2 border-primary'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {framework === 'bmad' ? 'BMAD v6 YAML' : 'Amplifier Config'}
                    </button>
                    <button
                      onClick={() => setActiveTab('command')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'command'
                          ? 'bg-background border-b-2 border-primary'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Claude Command
                    </button>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 bg-accent/30 max-h-64 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                      {activeTab === 'yaml' ? generated.yamlDefinition : generated.commandFile}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {generated && (
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
            <button
              onClick={handleStartOver}
              className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !!nameError || checkingDuplicate || !workflowName}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={nameError || !workflowName ? 'Fix workflow name first' : 'Save workflow'}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Workflow
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

