'use client';

/**
 * Task Creation Wizard Component
 * 7-step wizard for creating new agentic tasks
 */

import React, { useState, useEffect } from 'react';
import { useAgenticStore } from '@/lib/store/agenticStore';
import {
  TaskPriority,
  ExecutionStrategy,
  ErrorHandlingStrategy,
  CodeReviewPoint,
  GlobalDocument,
  AgenticTask,
} from '@/types/agentic-task';
import { cn } from '@/lib/utils/cn';

// Wizard step definitions
const steps = [
  { id: 0, title: 'BASIC INFO', description: 'Title and description' },
  { id: 1, title: 'PROJECT GROUP', description: 'Select target repositories' },
  { id: 2, title: 'EXECUTION', description: 'How the task runs' },
  { id: 3, title: 'VERIFICATION', description: 'Verification commands' },
  { id: 4, title: 'DOCUMENTS', description: 'Attach reference documents' },
  { id: 5, title: 'MCP SERVERS', description: 'Configure MCP servers' },
  { id: 6, title: 'REVIEW', description: 'Review and create' },
];

// Form data type
interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  projectGroupId: number | null;
  autoAdvance: boolean;
  errorHandling: ErrorHandlingStrategy;
  executionStrategy: ExecutionStrategy;
  codeReviewPoint: CodeReviewPoint;
  verificationCommands: string[];
  globalDocumentIds: number[];
  referenceTaskIds: number[];
  mcpServersConfig: { name: string; command: string; args: string[] }[];
}

const defaultFormData: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  projectGroupId: null,
  autoAdvance: true,
  errorHandling: 'smart_recovery',
  executionStrategy: 'subagent_per_step',
  codeReviewPoint: 'before_verification',
  verificationCommands: ['npm run type-check', 'npm run lint', 'npm run build'],
  globalDocumentIds: [],
  referenceTaskIds: [],
  mcpServersConfig: [],
};

export function TaskCreationWizard() {
  const isOpen = useAgenticStore((s) => s.isTaskCreationWizardOpen);
  const currentStep = useAgenticStore((s) => s.wizardStep);
  const setWizardStep = useAgenticStore((s) => s.setWizardStep);
  const closeWizard = useAgenticStore((s) => s.closeTaskCreationWizard);
  const createTask = useAgenticStore((s) => s.createTask);
  const isLoading = useAgenticStore((s) => s.isLoading);

  const projectGroups = useAgenticStore((s) => s.projectGroups);
  const globalDocuments = useAgenticStore((s) => s.globalDocuments);
  const tasks = useAgenticStore((s) => s.tasks);
  const fetchProjectGroups = useAgenticStore((s) => s.fetchProjectGroups);
  const fetchGlobalDocuments = useAgenticStore((s) => s.fetchGlobalDocuments);

  const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch data on mount
  useEffect(() => {
    if (isOpen) {
      fetchProjectGroups();
      fetchGlobalDocuments();
    }
  }, [isOpen, fetchProjectGroups, fetchGlobalDocuments]);

  // Reset form when wizard opens
  useEffect(() => {
    if (isOpen) {
      setFormData(defaultFormData);
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateField = <K extends keyof TaskFormData>(field: K, value: TaskFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Info
        if (!formData.title.trim()) {
          newErrors.title = 'Title is required';
        }
        break;
      case 1: // Project Group
        if (!formData.projectGroupId) {
          newErrors.projectGroupId = 'Please select a project group';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setWizardStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setWizardStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (validateStep(currentStep)) {
      await createTask({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        projectGroupId: formData.projectGroupId!,
        autoAdvance: formData.autoAdvance,
        errorHandling: formData.errorHandling,
        executionStrategy: formData.executionStrategy,
        codeReviewPoint: formData.codeReviewPoint,
        verificationCommands: formData.verificationCommands,
        globalDocumentIds: formData.globalDocumentIds,
        referenceTaskIds: formData.referenceTaskIds,
        mcpServersConfig: formData.mcpServersConfig,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[hsl(var(--card))] border border-[hsl(var(--primary))] rounded-[3px] shadow-[0_0_20px_rgba(0,255,65,0.2)] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[hsl(var(--primary))] uppercase tracking-wider font-mono">Create Agentic Task</h2>
            <button
              onClick={closeWizard}
              className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
            >
              [X]
            </button>
          </div>

          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-2">
            {steps.map((step, i) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => i < currentStep && setWizardStep(i)}
                  disabled={i > currentStep}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-[10px] font-mono transition-colors whitespace-nowrap',
                    i === currentStep
                      ? 'bg-[hsl(var(--primary))] text-black font-bold'
                      : i < currentStep
                      ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] border border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 cursor-pointer'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed border border-transparent'
                  )}
                >
                  <span className="w-4 h-4 flex items-center justify-center rounded-full bg-black/20 text-[9px]">
                    {i < currentStep ? '✓' : i + 1}
                  </span>
                  <span className="hidden md:inline uppercase">{step.title}</span>
                </button>
                {i < steps.length - 1 && (
                  <div className={cn('w-4 h-px', i < currentStep ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]')} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[hsl(var(--background))] custom-scrollbar">
          {currentStep === 0 && (
            <StepBasicInfo formData={formData} updateField={updateField} errors={errors} />
          )}
          {currentStep === 1 && (
            <StepProjectGroup
              formData={formData}
              updateField={updateField}
              errors={errors}
              projectGroups={projectGroups}
            />
          )}
          {currentStep === 2 && (
            <StepExecutionConfig formData={formData} updateField={updateField} />
          )}
          {currentStep === 3 && (
            <StepVerification formData={formData} updateField={updateField} />
          )}
          {currentStep === 4 && (
            <StepDocuments
              formData={formData}
              updateField={updateField}
              globalDocuments={globalDocuments}
              referenceTasks={tasks}
            />
          )}
          {currentStep === 5 && (
            <StepMCPServers formData={formData} updateField={updateField} />
          )}
          {currentStep === 6 && (
            <StepReview formData={formData} projectGroups={projectGroups} />
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))] flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={cn(
              'px-4 py-2 rounded-[2px] text-xs font-mono uppercase transition-colors border',
              currentStep === 0
                ? 'text-[hsl(var(--muted-foreground))] border-transparent cursor-not-allowed'
                : 'text-[hsl(var(--primary))] border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black'
            )}
          >
            &lt; Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-[hsl(var(--primary))] hover:bg-[var(--text-secondary)] text-black font-bold rounded-[2px] text-xs font-mono uppercase transition-colors shadow-[0_0_10px_rgba(0,255,65,0.3)]"
            >
              Next &gt;
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={cn(
                'px-6 py-2 bg-[hsl(var(--primary))] hover:bg-[var(--text-secondary)] text-black font-bold rounded-[2px] text-xs font-mono uppercase transition-colors shadow-[0_0_15px_rgba(0,255,65,0.5)]',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLoading ? 'INITIATING...' : 'EXECUTE TASK'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 0: Basic Info
interface StepProps {
  formData: TaskFormData;
  updateField: <K extends keyof TaskFormData>(field: K, value: TaskFormData[K]) => void;
  errors?: Record<string, string>;
}

function StepBasicInfo({ formData, updateField, errors }: StepProps) {
  return (
    <div className="space-y-4 font-mono">
      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          Task Title <span className="text-[hsl(var(--destructive))]">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g., IMPLEMENT USER AUTHENTICATION FLOW"
          className={cn(
            'w-full px-3 py-2 bg-[hsl(var(--card))] border rounded-[2px] text-[hsl(var(--foreground))] text-xs',
            'focus:outline-none focus:border-[hsl(var(--primary))] focus:shadow-[0_0_10px_rgba(0,255,65,0.2)] transition-all',
            errors?.title ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
          )}
        />
        {errors?.title && <p className="mt-1 text-[10px] text-[hsl(var(--destructive))]">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="DETAILED DESCRIPTION OF THE OBJECTIVE..."
          rows={8}
          className="w-full px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] text-[hsl(var(--foreground))] text-xs focus:outline-none focus:border-[hsl(var(--primary))] focus:shadow-[0_0_10px_rgba(0,255,65,0.2)] transition-all resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">Priority</label>
        <div className="grid grid-cols-4 gap-2">
          {['low', 'medium', 'high', 'urgent'].map((p) => (
             <button
              key={p}
              onClick={() => updateField('priority', p as TaskPriority)}
              className={cn(
                'px-2 py-2 border rounded-[2px] text-xs font-mono uppercase transition-all',
                formData.priority === p
                  ? p === 'urgent' ? 'bg-[hsl(var(--destructive))] text-black border-[hsl(var(--destructive))] font-bold'
                  : p === 'high' ? 'bg-[hsl(var(--accent))] text-black border-[hsl(var(--accent))] font-bold'
                  : 'bg-[hsl(var(--primary))] text-black border-[hsl(var(--primary))] font-bold'
                  : 'bg-transparent border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))]'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 1: Project Group
interface StepProjectGroupProps extends StepProps {
  projectGroups: any[];
}

function StepProjectGroup({ formData, updateField, errors, projectGroups }: StepProjectGroupProps) {
  return (
    <div className="space-y-4 font-mono">
      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          Project Group <span className="text-[hsl(var(--destructive))]">*</span>
        </label>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-3">
          SELECT TARGET PROJECTS FOR MODIFICATION.
        </p>

        {projectGroups.length === 0 ? (
          <div className="p-4 border border-dashed border-[hsl(var(--border))] rounded-[2px] text-center">
            <p className="text-[hsl(var(--muted-foreground))] text-xs">NO PROJECT GROUPS CONFIGURED.</p>
            <a href="/agentic/settings" className="text-[hsl(var(--primary))] hover:underline text-xs mt-2 inline-block">
              CREATE PROJECT GROUP
            </a>
          </div>
        ) : (
          <div className="grid gap-2">
            {projectGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => updateField('projectGroupId', group.id)}
                className={cn(
                  'p-4 text-left border rounded-[2px] transition-all group',
                  formData.projectGroupId === group.id
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 shadow-[0_0_10px_rgba(0,255,65,0.1)]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--card))]'
                )}
              >
                <div className={cn(
                  "font-bold text-xs uppercase",
                  formData.projectGroupId === group.id ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--foreground))]"
                )}>{group.name}</div>
                {group.description && (
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">{group.description}</div>
                )}
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-2 font-bold">
                  [{group.projectCount || 0} PROJECT{group.projectCount !== 1 ? 'S' : ''}]
                </div>
              </button>
            ))}
          </div>
        )}
        {errors?.projectGroupId && (
          <p className="mt-1 text-[10px] text-[hsl(var(--destructive))]">{errors.projectGroupId}</p>
        )}
      </div>
    </div>
  );
}

// Step 2: Execution Config
function StepExecutionConfig({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-6 font-mono">
      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          Execution Strategy
        </label>
        <div className="grid gap-2">
          {[
            { value: 'subagent_per_step', label: 'SUBAGENT PER STEP', desc: 'New agent context for each plan step (Recommended)' },
            { value: 'single_agent', label: 'SINGLE AGENT', desc: 'Same agent handles all steps' },
            { value: 'parallel_steps', label: 'PARALLEL STEPS', desc: 'Run independent steps concurrently' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateField('executionStrategy', opt.value as ExecutionStrategy)}
              className={cn(
                'p-3 text-left border rounded-[2px] transition-all',
                formData.executionStrategy === opt.value
                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10'
                  : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50'
              )}
            >
              <div className={cn(
                "font-bold text-xs",
                formData.executionStrategy === opt.value ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--foreground))]"
              )}>{opt.label}</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          Error Handling
        </label>
        <select
          value={formData.errorHandling}
          onChange={(e) => updateField('errorHandling', e.target.value as ErrorHandlingStrategy)}
          className="w-full px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] text-[hsl(var(--foreground))] text-xs focus:outline-none focus:border-[hsl(var(--primary))]"
        >
          <option value="smart_recovery">SMART RECOVERY (AI DECIDES)</option>
          <option value="stop_on_error">STOP ON ERROR</option>
          <option value="continue_on_error">CONTINUE ON ERROR</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          Code Review Point
        </label>
        <select
          value={formData.codeReviewPoint}
          onChange={(e) => updateField('codeReviewPoint', e.target.value as CodeReviewPoint)}
          className="w-full px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] text-[hsl(var(--foreground))] text-xs focus:outline-none focus:border-[hsl(var(--primary))]"
        >
          <option value="before_verification">BEFORE VERIFICATION (RECOMMENDED)</option>
          <option value="after_step">AFTER EACH STEP</option>
          <option value="after_batch">AFTER BATCH OF STEPS</option>
          <option value="never">NEVER (FULLY AUTOMATED)</option>
        </select>
      </div>

      <div className="flex items-center gap-3 p-3 border border-[hsl(var(--border))] rounded-[2px] bg-[hsl(var(--card))]">
        <input
          type="checkbox"
          id="autoAdvance"
          checked={formData.autoAdvance}
          onChange={(e) => updateField('autoAdvance', e.target.checked)}
          className="w-4 h-4 accent-[hsl(var(--primary))] bg-transparent border-[hsl(var(--primary))]"
        />
        <label htmlFor="autoAdvance" className="text-xs text-[hsl(var(--foreground))] cursor-pointer">
          AUTO-ADVANCE PHASES (SKIP MANUAL APPROVALS)
        </label>
      </div>
    </div>
  );
}

// Step 3: Verification
function StepVerification({ formData, updateField }: StepProps) {
  const [newCommand, setNewCommand] = useState('');

  const addCommand = () => {
    if (newCommand.trim()) {
      updateField('verificationCommands', [...formData.verificationCommands, newCommand.trim()]);
      setNewCommand('');
    }
  };

  const removeCommand = (index: number) => {
    updateField(
      'verificationCommands',
      formData.verificationCommands.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-4 font-mono">
      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          Verification Commands
        </label>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-3">
          COMMANDS TO EXECUTE FOR VALIDATION.
        </p>

        <div className="space-y-2 mb-4">
          {formData.verificationCommands.map((cmd, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <code className="flex-1 px-3 py-2 bg-black/50 border border-[hsl(var(--border))] text-[hsl(var(--primary))] rounded-[2px] text-xs">
                $ {cmd}
              </code>
              <button
                onClick={() => removeCommand(i)}
                className="p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 rounded-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                [RM]
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCommand()}
            placeholder="e.g., npm run test"
            className="flex-1 px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] text-[hsl(var(--foreground))] text-xs focus:outline-none focus:border-[hsl(var(--primary))]"
          />
          <button
            onClick={addCommand}
            className="px-4 py-2 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-xs uppercase hover:bg-[var(--text-secondary)]"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 4: Documents
interface StepDocumentsProps extends StepProps {
  globalDocuments: GlobalDocument[];
  referenceTasks: AgenticTask[];
}

function StepDocuments({ formData, updateField, globalDocuments, referenceTasks }: StepDocumentsProps) {
  const toggleDocument = (docId: number) => {
    const current = formData.globalDocumentIds;
    if (current.includes(docId)) {
      updateField('globalDocumentIds', current.filter((id) => id !== docId));
    } else {
      updateField('globalDocumentIds', [...current, docId]);
    }
  };

  const toggleTask = (taskId: number) => {
    const current = formData.referenceTaskIds;
    if (current.includes(taskId)) {
      updateField('referenceTaskIds', current.filter((id) => id !== taskId));
    } else {
      updateField('referenceTaskIds', [...current, taskId]);
    }
  };

  const completedTasks = referenceTasks.filter((t) => t.currentPhase === 'done');

  return (
    <div className="space-y-6 font-mono">
      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          Global Documents
        </label>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-3">
          ATTACH CONTEXT FROM LIBRARY.
        </p>

        {globalDocuments.length === 0 ? (
          <div className="p-4 border border-dashed border-[hsl(var(--border))] rounded-[2px] text-center">
            <p className="text-[hsl(var(--muted-foreground))] text-xs">NO DOCUMENTS IN LIBRARY.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
            {globalDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDocument(doc.id)}
                className={cn(
                  'p-2 text-left border rounded-[2px] transition-all text-xs',
                  formData.globalDocumentIds.includes(doc.id)
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 text-[hsl(var(--foreground))]'
                )}
              >
                <div className="font-bold truncate">{doc.originalFilename}</div>
                <div className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase">{doc.category}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          Reference Tasks
        </label>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-3">
          REFERENCE COMPLETED TASKS FOR CONTEXT.
        </p>

        {completedTasks.length === 0 ? (
          <div className="p-4 border border-dashed border-[hsl(var(--border))] rounded-[2px] text-center">
            <p className="text-[hsl(var(--muted-foreground))] text-xs">NO COMPLETED TASKS AVAILABLE.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
            {completedTasks.slice(0, 10).map((task) => (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={cn(
                  'w-full p-2 text-left border rounded-[2px] transition-all text-xs',
                  formData.referenceTaskIds.includes(task.id)
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 text-[hsl(var(--foreground))]'
                )}
              >
                <div className="font-bold truncate">{task.title}</div>
                <div className="text-[9px] text-[hsl(var(--muted-foreground))]">ID: #{task.id}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Step 5: MCP Servers
function StepMCPServers({ formData, updateField }: StepProps) {
  const [serverName, setServerName] = useState('');
  const [serverCommand, setServerCommand] = useState('');
  const [serverArgs, setServerArgs] = useState('');

  const addServer = () => {
    if (serverName && serverCommand) {
      const newServer = {
        name: serverName,
        command: serverCommand,
        args: serverArgs.split(' ').filter(Boolean),
      };
      updateField('mcpServersConfig', [...formData.mcpServersConfig, newServer]);
      setServerName('');
      setServerCommand('');
      setServerArgs('');
    }
  };

  const removeServer = (index: number) => {
    updateField(
      'mcpServersConfig',
      formData.mcpServersConfig.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-4 font-mono">
      <div>
        <label className="block text-xs font-bold text-[hsl(var(--primary))] mb-1 uppercase">
          MCP Servers
        </label>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-3">
          CONFIGURE ADDITIONAL MODEL CONTEXT PROTOCOL SERVERS.
        </p>

        <div className="p-3 bg-[var(--chart-4)]/10 border border-[var(--chart-4)]/30 rounded-[2px] text-xs text-[var(--chart-4)] mb-4">
          [INFO] DEFAULT SERVERS: CONTEXT7, CONFLUENCE (IF ACTIVE)
        </div>

        <div className="space-y-2 mb-4">
          {formData.mcpServersConfig.map((server, i) => (
            <div key={i} className="flex items-center gap-2 p-2 border border-[hsl(var(--border))] rounded-[2px] bg-[hsl(var(--card))]">
              <div className="flex-1">
                <div className="font-bold text-xs text-[hsl(var(--foreground))] uppercase">{server.name}</div>
                <code className="text-[10px] text-[hsl(var(--muted-foreground))] block mt-0.5">
                  $ {server.command} {server.args.join(' ')}
                </code>
              </div>
              <button
                onClick={() => removeServer(i)}
                className="p-1 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 rounded-[2px]"
              >
                [RM]
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2">
          <input
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="SERVER NAME"
            className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] text-[hsl(var(--foreground))] text-xs focus:outline-none focus:border-[hsl(var(--primary))]"
          />
          <input
            type="text"
            value={serverCommand}
            onChange={(e) => setServerCommand(e.target.value)}
            placeholder="COMMAND (e.g., npx)"
            className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] text-[hsl(var(--foreground))] text-xs focus:outline-none focus:border-[hsl(var(--primary))]"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={serverArgs}
              onChange={(e) => setServerArgs(e.target.value)}
              placeholder="ARGS (SPACE SEPARATED)"
              className="flex-1 px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] text-[hsl(var(--foreground))] text-xs focus:outline-none focus:border-[hsl(var(--primary))]"
            />
            <button
              onClick={addServer}
              disabled={!serverName || !serverCommand}
              className="px-3 py-2 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-xs uppercase disabled:opacity-50 hover:bg-[var(--text-secondary)]"
            >
              ADD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 6: Review
interface StepReviewProps {
  formData: TaskFormData;
  projectGroups: any[];
}

function StepReview({ formData, projectGroups }: StepReviewProps) {
  const selectedGroup = projectGroups.find((g) => g.id === formData.projectGroupId);

  return (
    <div className="space-y-4 font-mono">
      <h3 className="text-xs font-bold text-[hsl(var(--primary))] uppercase border-b border-[hsl(var(--border))] pb-2">
        Configuration Review
      </h3>

      <div className="grid gap-3 text-xs">
        <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
          <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Title</div>
          <div className="font-bold text-[hsl(var(--foreground))]">{formData.title}</div>
        </div>

        {formData.description && (
          <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Description</div>
            <div className="text-[hsl(var(--foreground))] whitespace-pre-wrap">{formData.description}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Priority</div>
            <div className={cn(
              "font-bold uppercase",
              formData.priority === 'urgent' ? "text-[hsl(var(--destructive))]" :
              formData.priority === 'high' ? "text-[hsl(var(--accent))]" :
              "text-[hsl(var(--primary))]"
            )}>{formData.priority}</div>
          </div>

          <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Project Group</div>
            <div className="text-[hsl(var(--foreground))] font-bold">{selectedGroup?.name || 'NOT SELECTED'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Execution Strategy</div>
            <div className="text-[hsl(var(--foreground))]">{formData.executionStrategy.replace(/_/g, ' ')}</div>
          </div>

          <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Error Handling</div>
            <div className="text-[hsl(var(--foreground))]">{formData.errorHandling.replace(/_/g, ' ')}</div>
          </div>
        </div>

        <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
          <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Verification Commands</div>
          <div className="space-y-1 mt-1">
            {formData.verificationCommands.length > 0 ? (
              formData.verificationCommands.map((cmd, i) => (
                <code key={i} className="block text-xs text-[hsl(var(--primary))]">$ {cmd}</code>
              ))
            ) : (
              <span className="text-[hsl(var(--muted-foreground))] italic">None configured</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Documents</div>
            <div className="text-[hsl(var(--foreground))]">{formData.globalDocumentIds.length} attached</div>
          </div>

          <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">MCP Servers</div>
            <div className="text-[hsl(var(--foreground))]">
              {formData.mcpServersConfig.length} custom + defaults
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCreationWizard;
