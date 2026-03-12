'use client';

/**
 * PlanEditorPanel Component
 * Allows editing, reordering, and managing plan steps before approval
 * Follows TDD - implemented to pass the test suite
 */

import React, { useState, useCallback } from 'react';
import { AgenticPlan, AgenticPlanStep } from '@/types/agentic-task';
import { cn } from '@/lib/utils/cn';

interface PlanEditorPanelProps {
  plan: AgenticPlan | null;
  taskId: number;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onUpdate: (updatedPlan: Partial<AgenticPlan>) => void;
  className?: string;
}

interface EditingStep {
  index: number;
  title: string;
  description: string;
}

export function PlanEditorPanel({
  plan,
  taskId,
  onApprove,
  onReject,
  onUpdate,
  className,
}: PlanEditorPanelProps) {
  const [editingStep, setEditingStep] = useState<EditingStep | null>(null);
  const [localSteps, setLocalSteps] = useState<AgenticPlanStep[]>(plan?.planSteps || []);
  const [viewMode, setViewMode] = useState<'steps' | 'markdown'>('markdown'); // Default to markdown
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);

  // Sync local steps and markdown when plan changes
  React.useEffect(() => {
    if (plan?.planSteps) {
      setLocalSteps(plan.planSteps);
    }
    if (plan?.planContent) {
      // Parse the planContent JSON to get the raw markdown/overview
      try {
        const content = JSON.parse(plan.planContent);
        
        // If we have rawContent from Claude, use that directly (best option)
        if (content.rawContent && content.rawContent.length > 100) {
          setMarkdownContent(content.rawContent);
        } else {
          // Otherwise reconstruct readable markdown from the stored content
          let md = '';
          if (content.overview) {
            md += `## Overview\n\n${content.overview}\n\n`;
          }
          if (content.steps && Array.isArray(content.steps)) {
            md += `## Implementation Steps\n\n`;
            content.steps.forEach((step: any, i: number) => {
              md += `### Step ${i + 1}: ${step.title}\n\n`;
              if (step.description) {
                md += `${step.description}\n\n`;
              }
              if (step.filePaths && step.filePaths.length > 0) {
                md += `**Files:** ${step.filePaths.map((f: string) => `\`${f}\``).join(', ')}\n\n`;
              }
            });
          }
          setMarkdownContent(md || plan.planOverview || 'No plan content available');
        }
      } catch {
        // If not JSON, use planOverview or raw content
        setMarkdownContent(plan.planOverview || 'No plan content available');
      }
    }
  }, [plan?.planSteps, plan?.planContent, plan?.planOverview]);

  const handleEditStep = (index: number) => {
    const step = localSteps[index];
    setEditingStep({
      index,
      title: step.title,
      description: step.description,
    });
  };

  const handleSaveStep = (index: number) => {
    if (!editingStep) return;

    const newSteps = localSteps.map((step, i) =>
      i === index
        ? { ...step, title: editingStep.title, description: editingStep.description }
        : step
    );

    setLocalSteps(newSteps);
    onUpdate({ planSteps: newSteps, userModified: true });
    setEditingStep(null);
  };

  const handleCancelEdit = () => {
    setEditingStep(null);
  };

  const handleAddStep = () => {
    const newStep: AgenticPlanStep = {
      id: Date.now(), // Temporary ID
      planId: plan?.id || 0,
      order: localSteps.length,
      title: 'New Step',
      description: 'Describe what this step should accomplish',
      estimatedComplexity: 'medium',
      status: 'pending',
    };

    const newSteps = [...localSteps, newStep];
    setLocalSteps(newSteps);
    onUpdate({ planSteps: newSteps, userModified: true });
  };

  const handleDeleteStep = (index: number) => {
    const newSteps = localSteps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, order: i }));

    setLocalSteps(newSteps);
    onUpdate({ planSteps: newSteps, userModified: true });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newSteps = [...localSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    
    // Update order property
    newSteps.forEach((step, i) => {
      step.order = i;
    });

    setLocalSteps(newSteps);
    onUpdate({ planSteps: newSteps, userModified: true });
  };

  const handleMoveDown = (index: number) => {
    if (index === localSteps.length - 1) return;

    const newSteps = [...localSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    
    // Update order property
    newSteps.forEach((step, i) => {
      step.order = i;
    });

    setLocalSteps(newSteps);
    onUpdate({ planSteps: newSteps, userModified: true });
  };

  const handleReject = () => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason) {
      onReject(reason);
    }
  };

  if (!plan) {
    return (
      <div className={cn('text-center py-8 text-[hsl(var(--muted-foreground))] text-xs font-mono uppercase', className)}>
        No plan generated yet
      </div>
    );
  }

  const isInReview = plan.status === 'pending_review';

  return (
    <div className={cn('space-y-6 font-mono', className)}>
      {/* Review Status Banner */}
      {isInReview && (
        <div className="flex items-center gap-2 p-3 bg-[hsl(var(--chart-4))]/10 border border-[hsl(var(--chart-4))]/30 rounded-[2px]">
          <span className="text-[hsl(var(--chart-4))] text-xs font-bold uppercase">
            [!] Plan awaiting review
          </span>
          <div className="flex-1" />
          <button
            data-testid="approve-plan-button"
            onClick={onApprove}
            className="px-3 py-1 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-xs uppercase hover:opacity-90"
          >
            Approve
          </button>
          <button
            data-testid="reject-plan-button"
            onClick={handleReject}
            className="px-3 py-1 bg-[hsl(var(--destructive))] text-white font-bold rounded-[2px] text-xs uppercase hover:opacity-90"
          >
            Reject
          </button>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3">
        <button
          onClick={() => setViewMode('markdown')}
          className={cn(
            'px-3 py-1 text-xs font-bold uppercase rounded-[2px] transition-colors',
            viewMode === 'markdown'
              ? 'bg-[hsl(var(--primary))] text-black'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          )}
        >
          📝 Full Plan
        </button>
        <button
          onClick={() => setViewMode('steps')}
          className={cn(
            'px-3 py-1 text-xs font-bold uppercase rounded-[2px] transition-colors',
            viewMode === 'steps'
              ? 'bg-[hsl(var(--primary))] text-black'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          )}
        >
          📋 Steps ({localSteps.length})
        </button>
      </div>

      {/* Markdown View */}
      {viewMode === 'markdown' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[hsl(var(--primary))] uppercase">Full Implementation Plan</h3>
            {!isEditingMarkdown ? (
              <button
                onClick={() => setIsEditingMarkdown(true)}
                className="px-2 py-1 text-[10px] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 rounded-[2px] uppercase"
              >
                ✎ Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onUpdate({ planOverview: markdownContent, userModified: true });
                    setIsEditingMarkdown(false);
                  }}
                  className="px-2 py-1 text-[10px] bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] uppercase"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingMarkdown(false)}
                  className="px-2 py-1 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] uppercase"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {isEditingMarkdown ? (
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              className="w-full h-[500px] p-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[2px] text-xs font-mono text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))] resize-y"
              placeholder="Plan content..."
            />
          ) : (
            <div className="p-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px] max-h-[600px] overflow-y-auto">
              <pre className="text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap font-mono leading-relaxed">
                {markdownContent}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Steps View */}
      {viewMode === 'steps' && (
        <>
          {/* Plan Overview */}
          {plan.planOverview && (
            <div>
              <h3 className="text-xs font-bold text-[hsl(var(--primary))] mb-2 uppercase">Overview</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-wrap leading-relaxed">
                {plan.planOverview}
              </p>
            </div>
          )}

          {/* Plan Metadata */}
          {(plan.goal || plan.architecture || plan.techStack) && (
            <div className="grid grid-cols-3 gap-3">
              {plan.goal && (
                <div className="p-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Goal</div>
                  <div className="text-xs text-[hsl(var(--foreground))]">{plan.goal}</div>
                </div>
              )}
              {plan.architecture && (
                <div className="p-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Architecture</div>
                  <div className="text-xs text-[hsl(var(--foreground))]">{plan.architecture}</div>
                </div>
              )}
              {plan.techStack && (
                <div className="p-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Tech Stack</div>
                  <div className="text-xs text-[hsl(var(--foreground))]">{plan.techStack}</div>
                </div>
              )}
            </div>
          )}

          {/* Steps Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[hsl(var(--primary))] uppercase">
              Implementation Steps ({localSteps.length})
            </h3>
        <button
          data-testid="add-step-button"
          onClick={handleAddStep}
          className="px-2 py-1 text-[10px] font-mono text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 rounded-[2px] uppercase"
        >
          [+] Add Step
        </button>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {localSteps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isEditing={editingStep?.index === index}
            editingData={editingStep?.index === index ? editingStep : null}
            onEdit={() => handleEditStep(index)}
            onSave={() => handleSaveStep(index)}
            onCancel={handleCancelEdit}
            onDelete={() => handleDeleteStep(index)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            onTitleChange={(title) => setEditingStep(prev => prev ? { ...prev, title } : null)}
            onDescChange={(description) => setEditingStep(prev => prev ? { ...prev, description } : null)}
            isFirst={index === 0}
            isLast={index === localSteps.length - 1}
          />
        ))}
      </div>

          {/* User Modified Indicator */}
          {plan.userModified && (
            <div className="text-[10px] text-[hsl(var(--accent))] uppercase">
              * Plan has been modified
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Step Card Component
interface StepCardProps {
  step: AgenticPlanStep;
  index: number;
  isEditing: boolean;
  editingData: EditingStep | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onTitleChange: (title: string) => void;
  onDescChange: (desc: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

function StepCard({
  step,
  index,
  isEditing,
  editingData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
  onTitleChange,
  onDescChange,
  isFirst,
  isLast,
}: StepCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const statusColors: Record<string, string> = {
    pending: 'bg-[hsl(var(--muted-foreground))]',
    in_progress: 'bg-[hsl(var(--chart-1))]',
    completed: 'bg-[hsl(var(--primary))]',
    failed: 'bg-[hsl(var(--destructive))]',
    skipped: 'bg-[hsl(var(--muted))]',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    failed: 'Failed',
    skipped: 'Skipped',
  };

  const complexityColors: Record<string, string> = {
    low: 'text-[hsl(var(--primary))] border-[hsl(var(--primary))]/30',
    medium: 'text-[hsl(var(--accent))] border-[hsl(var(--accent))]/30',
    high: 'text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/30',
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    // Don't toggle when clicking action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    if (isEditing) return;
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border border-[hsl(var(--border))] rounded-[2px] overflow-hidden bg-[hsl(var(--card))]">
      {/* Step Header - Clickable */}
      <div 
        className={cn(
          "p-3 flex items-start gap-3",
          !isEditing && "cursor-pointer hover:bg-[hsl(var(--muted))]/30 transition-colors"
        )}
        onClick={handleToggleExpand}
      >
        {/* Drag Handle */}
        <div
          data-testid="drag-handle"
          className="cursor-grab text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mt-0.5"
          title="Drag to reorder"
        >
          ⋮⋮
        </div>

        {/* Step Number */}
        <div
          data-testid="step-number"
          className={cn(
            'w-6 h-6 rounded-[2px] flex items-center justify-center text-[10px] text-black font-bold flex-shrink-0',
            statusColors[step.status]
          )}
        >
          {index + 1}
        </div>

        {/* Step Content */}
        <div className="flex-1 min-w-0">
          {isEditing && editingData ? (
            // Editing Mode
            <div className="space-y-2">
              <input
                data-testid={`step-title-input-${index}`}
                type="text"
                value={editingData.title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="w-full px-2 py-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[2px] text-xs font-bold focus:outline-none focus:border-[hsl(var(--primary))]"
                placeholder="Step title..."
              />
              <textarea
                data-testid={`step-desc-input-${index}`}
                value={editingData.description}
                onChange={(e) => onDescChange(e.target.value)}
                className="w-full px-2 py-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[2px] text-xs focus:outline-none focus:border-[hsl(var(--primary))] resize-none"
                rows={3}
                placeholder="Step description..."
              />
              <div className="flex gap-2">
                <button
                  data-testid={`save-step-button-${index}`}
                  onClick={onSave}
                  className="px-2 py-1 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-[10px] uppercase"
                >
                  Save
                </button>
                <button
                  onClick={onCancel}
                  className="px-2 py-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-[10px] uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Display Mode - Collapsed View
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] transition-transform",
                isExpanded ? "rotate-90" : ""
              )}>▶</span>
              <h4 className="font-bold text-xs text-[hsl(var(--foreground))] uppercase">
                {step.title}
              </h4>
            </div>
          )}
        </div>

        {/* Complexity Badge */}
        {step.estimatedComplexity && !isEditing && (
          <span
            className={cn(
              'px-1.5 py-0.5 border rounded-[2px] text-[8px] uppercase',
              complexityColors[step.estimatedComplexity]
            )}
          >
            {step.estimatedComplexity}
          </span>
        )}

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              data-testid="move-up-button"
              onClick={onMoveUp}
              disabled={isFirst}
              className={cn(
                'p-1 text-[10px] rounded-[2px]',
                isFirst
                  ? 'text-[hsl(var(--muted-foreground))]/30 cursor-not-allowed'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
              )}
              title="Move up"
            >
              ↑
            </button>
            <button
              data-testid="move-down-button"
              onClick={onMoveDown}
              disabled={isLast}
              className={cn(
                'p-1 text-[10px] rounded-[2px]',
                isLast
                  ? 'text-[hsl(var(--muted-foreground))]/30 cursor-not-allowed'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
              )}
              title="Move down"
            >
              ↓
            </button>
            <button
              data-testid="edit-step-button"
              onClick={onEdit}
              className="p-1 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] rounded-[2px]"
              title="Edit step"
            >
              ✎
            </button>
            <button
              data-testid="delete-step-button"
              onClick={onDelete}
              className="p-1 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))] rounded-[2px]"
              title="Delete step"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Expanded Details Section */}
      {isExpanded && !isEditing && (
        <div className="px-3 pb-3 pt-0 border-t border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/20">
          <div className="pt-3 space-y-3">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase w-20">Status:</span>
              <span className={cn(
                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-[2px]",
                statusColors[step.status],
                step.status === 'pending' ? 'text-white' : 'text-black'
              )}>
                {statusLabels[step.status] || step.status}
              </span>
            </div>

            {/* Description */}
            {step.description && (
              <div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Description:</div>
                <p className="text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed pl-2 border-l-2 border-[hsl(var(--primary))]/30">
                  {step.description}
                </p>
              </div>
            )}

            {/* File Paths */}
            {step.filePaths && step.filePaths.length > 0 && (
              <div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">
                  Target Files ({step.filePaths.length}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {step.filePaths.map((fp, i) => (
                    <code
                      key={i}
                      className="px-2 py-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[10px] rounded-[2px] text-[hsl(var(--chart-1))]"
                    >
                      {fp}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Complexity Info */}
            {step.estimatedComplexity && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase w-20">Complexity:</span>
                <span className={cn(
                  "text-[10px] font-bold uppercase",
                  step.estimatedComplexity === 'low' && 'text-[hsl(var(--primary))]',
                  step.estimatedComplexity === 'medium' && 'text-[hsl(var(--accent))]',
                  step.estimatedComplexity === 'high' && 'text-[hsl(var(--destructive))]'
                )}>
                  {step.estimatedComplexity}
                </span>
              </div>
            )}

            {/* Step Output (if any) */}
            {step.output && (
              <div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">Output:</div>
                <pre className="text-[10px] text-[hsl(var(--foreground))] whitespace-pre-wrap bg-[hsl(var(--background))] p-2 rounded-[2px] border border-[hsl(var(--border))] overflow-x-auto max-h-40">
                  {step.output}
                </pre>
              </div>
            )}

            {/* Error Info (if any) */}
            {step.error && (
              <div>
                <div className="text-[10px] text-[hsl(var(--destructive))] uppercase mb-1">Error:</div>
                <pre className="text-[10px] text-[hsl(var(--destructive))] whitespace-pre-wrap bg-[hsl(var(--destructive))]/10 p-2 rounded-[2px] border border-[hsl(var(--destructive))]/30 overflow-x-auto max-h-40">
                  {step.error}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanEditorPanel;

