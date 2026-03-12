'use client';

/**
 * Task Detail Panel Component
 * Shows detailed view of a task including clarifications, plan, logs, verification, and PRs
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AgenticTask, AgenticPhase, AgenticLog, AgenticClarification, AgenticPlan, AgenticPlanStep, AgenticPullRequest } from '@/types/agentic-task';
import { useAgenticStore } from '@/lib/store/agenticStore';
import { cn } from '@/lib/utils/cn';
import { PlanEditorPanel } from './PlanEditorPanel';
import { VerificationPanel, VerificationResult } from './VerificationPanel';
import { PRManagementPanel } from './PRManagementPanel';

interface TaskDetailPanelProps {
  task: AgenticTask;
  onClose: () => void;
  className?: string;
}

type TabId = 'overview' | 'clarifications' | 'plan' | 'verification' | 'prs' | 'logs' | 'history';

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'clarifications', label: 'Clarifications' },
  { id: 'plan', label: 'Plan' },
  { id: 'verification', label: 'Verify' },
  { id: 'prs', label: 'PRs' },
  { id: 'logs', label: 'Logs' },
  { id: 'history', label: 'History' },
];

export function TaskDetailPanel({ task, onClose, className }: TaskDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Get entire state slices and derive task-specific data with useMemo
  const taskLogs = useAgenticStore((s) => s.taskLogs);
  const taskClarifications = useAgenticStore((s) => s.taskClarifications);
  const taskPlans = useAgenticStore((s) => s.taskPlans);
  
  const logs = useMemo(() => taskLogs[task.id] || [], [taskLogs, task.id]);
  const clarifications = useMemo(() => taskClarifications[task.id] || [], [taskClarifications, task.id]);
  const plan = useMemo(() => taskPlans[task.id] || null, [taskPlans, task.id]);

  const fetchTaskLogs = useAgenticStore((s) => s.fetchTaskLogs);
  const fetchClarifications = useAgenticStore((s) => s.fetchClarifications);
  const fetchPlan = useAgenticStore((s) => s.fetchPlan);
  const updatePlanContent = useAgenticStore((s) => s.updatePlanContent);
  const startTask = useAgenticStore((s) => s.startTask);
  const deleteTask = useAgenticStore((s) => s.deleteTask);
  const approvePlan = useAgenticStore((s) => s.approvePlan);
  const rejectPlan = useAgenticStore((s) => s.rejectPlan);

  // Fetch data on mount
  useEffect(() => {
    fetchTaskLogs(task.id);
    fetchClarifications(task.id);
    fetchPlan(task.id);
  }, [task.id, fetchTaskLogs, fetchClarifications, fetchPlan]);

  // Auto-switch to clarifications tab if there are pending ones
  useEffect(() => {
    const pendingCount = clarifications.filter((c) => !c.userAnswer).length;
    if (pendingCount > 0 && task.currentPhase === 'clarifying') {
      setActiveTab('clarifications');
    }
  }, [clarifications, task.currentPhase]);

  // Auto-switch to plan tab for plan review
  useEffect(() => {
    if (task.currentPhase === 'plan_review') {
      setActiveTab('plan');
    }
  }, [task.currentPhase]);

  const pendingClarifications = clarifications.filter((c) => !c.userAnswer);

  const handleDeleteTask = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 w-full max-w-2xl bg-[hsl(var(--background))] border-l border-[hsl(var(--border))] shadow-xl flex flex-col z-40',
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">#{task.id}</span>
              <PhaseTag phase={task.currentPhase} />
            </div>
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mt-1">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-md transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4">
          {task.currentPhase === 'todo' && (
            <button
              onClick={() => startTask(task.id)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
            >
              ▶ Start Task
            </button>
          )}
          {task.currentPhase === 'plan_review' && plan && (
            <>
              <button
                onClick={() => approvePlan(task.id)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
              >
                ✓ Approve Plan
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Enter rejection reason:');
                  if (reason) rejectPlan(task.id, reason);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
              >
                ✕ Reject Plan
              </button>
            </>
          )}
          <button
            onClick={handleDeleteTask}
            className="px-3 py-1.5 text-red-500 hover:bg-red-500/10 rounded-md text-sm transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-[hsl(var(--border))]">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-sm transition-colors relative',
                activeTab === tab.id
                  ? 'text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              {tab.label}
              {tab.id === 'clarifications' && pendingClarifications.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                  {pendingClarifications.length}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--primary))]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && <OverviewTab task={task} />}
        {activeTab === 'clarifications' && (
          <ClarificationsTab taskId={task.id} clarifications={clarifications} taskStatus={task.status} />
        )}
        {activeTab === 'plan' && (
          <PlanEditorPanel
            plan={plan}
            taskId={task.id}
            onApprove={() => approvePlan(task.id)}
            onReject={(reason) => rejectPlan(task.id, reason)}
            onUpdate={(updates) => updatePlanContent(task.id, updates)}
          />
        )}
        {activeTab === 'verification' && (
          <VerificationTab taskId={task.id} task={task} />
        )}
        {activeTab === 'prs' && (
          <PRsTab taskId={task.id} task={task} />
        )}
        {activeTab === 'logs' && <LogsTab logs={logs} />}
        {activeTab === 'history' && <HistoryTab task={task} />}
      </div>
    </div>
  );
}

// Phase tag component - includes both UI and DB phase values
function PhaseTag({ phase }: { phase: AgenticPhase }) {
  const config: Record<AgenticPhase, { label: string; color: string }> = {
    idle: { label: 'READY', color: 'bg-[hsl(var(--muted))]' },
    todo: { label: 'TODO', color: 'bg-[hsl(var(--muted))]' },
    brainstorming: { label: 'BRAINSTORM', color: 'bg-[hsl(var(--chart-3))]' },
    clarifying: { label: 'CLARIFY', color: 'bg-[hsl(var(--chart-4))]' },
    awaiting_clarification: { label: 'CLARIFY', color: 'bg-[hsl(var(--chart-4))]' },
    planning: { label: 'PLANNING', color: 'bg-[hsl(var(--chart-2))]' },
    plan_review: { label: 'REVIEW', color: 'bg-[hsl(var(--chart-5))]' },
    awaiting_plan_review: { label: 'REVIEW', color: 'bg-[hsl(var(--chart-5))]' },
    in_progress: { label: 'IN PROGRESS', color: 'bg-[hsl(var(--chart-1))]' },
    executing: { label: 'EXECUTING', color: 'bg-[hsl(var(--chart-1))]' },
    reviewing: { label: 'REVIEWING', color: 'bg-[hsl(var(--chart-5))]' },
    verifying: { label: 'VERIFYING', color: 'bg-[hsl(var(--chart-2))]' },
    creating_pr: { label: 'PR', color: 'bg-[hsl(var(--chart-5))]' },
    awaiting_pr_review: { label: 'PR REVIEW', color: 'bg-[hsl(var(--chart-3))]' },
    merging: { label: 'MERGING', color: 'bg-[hsl(var(--chart-4))]' },
    done: { label: 'DONE', color: 'bg-[hsl(var(--primary))]' },
    complete: { label: 'DONE', color: 'bg-[hsl(var(--primary))]' },
    failed: { label: 'FAILED', color: 'bg-[hsl(var(--destructive))]' },
    paused: { label: 'PAUSED', color: 'bg-[hsl(var(--accent))]' },
  };

  const c = config[phase] || config.idle;

  return (
    <span className={cn('px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold text-black whitespace-nowrap uppercase', c.color)}>
      {c.label}
    </span>
  );
}

// Overview Tab
function OverviewTab({ task }: { task: AgenticTask }) {
  return (
    <div className="space-y-6 font-mono">
      {task.description && (
        <div>
          <h3 className="text-xs font-bold text-[hsl(var(--primary))] mb-2 uppercase">Description</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Priority" value={task.priority} />
        <InfoCard label="Project Group" value={`#${task.projectGroupId}`} />
        <InfoCard label="Execution Strategy" value={task.executionStrategy?.replace(/_/g, ' ')} />
        <InfoCard label="Error Handling" value={task.errorHandling?.replace(/_/g, ' ')} />
        <InfoCard label="Auto Advance" value={task.autoAdvance ? 'YES' : 'NO'} />
        <InfoCard label="Code Review" value={task.codeReviewPoint?.replace(/_/g, ' ')} />
      </div>

      {(task.currentStepIndex !== undefined && task.totalSteps) && (
        <div>
          <h3 className="text-xs font-bold text-[hsl(var(--primary))] mb-2 uppercase">Progress</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-[hsl(var(--muted))] overflow-hidden border border-[hsl(var(--border))]">
              <div
                className="h-full bg-[hsl(var(--primary))] transition-all"
                style={{ width: `${((task.currentStepIndex + 1) / task.totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {task.currentStepIndex + 1} / {task.totalSteps}
            </span>
          </div>
        </div>
      )}

      {task.tokenUsage && (
        <div>
          <h3 className="text-xs font-bold text-[hsl(var(--primary))] mb-2 uppercase">Token Usage</h3>
          <div className="grid grid-cols-3 gap-4">
            <InfoCard label="Input" value={formatNumber(task.tokenUsage.inputTokens)} />
            <InfoCard label="Output" value={formatNumber(task.tokenUsage.outputTokens)} />
            <InfoCard label="Est. Cost" value={`$${task.tokenUsage.estimatedCost?.toFixed(4) || '0'}`} />
          </div>
        </div>
      )}

      {task.verificationCommands && task.verificationCommands.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[hsl(var(--primary))] mb-2 uppercase">Verification Commands</h3>
          <div className="space-y-1 font-mono text-xs">
            {task.verificationCommands.map((cmd, i) => (
              <div key={i} className="px-3 py-1 bg-black/50 border border-[hsl(var(--border))] text-[hsl(var(--primary))] rounded-[2px]">
                $ {cmd}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-4 mt-4 opacity-70">
        Created: {new Date(task.createdAt).toLocaleString()}
        <br />
        Updated: {new Date(task.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
      <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-1">{label}</div>
      <div className="text-xs text-[hsl(var(--foreground))] uppercase font-bold">{value || '-'}</div>
    </div>
  );
}

// Clarifications Tab
function ClarificationsTab({
  taskId,
  clarifications,
  taskStatus,
}: {
  taskId: number;
  clarifications: AgenticClarification[];
  taskStatus?: string;
}) {
  const submitAnswer = useAgenticStore((s) => s.submitClarificationAnswer);
  const fetchClarifications = useAgenticStore((s) => s.fetchClarifications);
  const resumePipeline = useAgenticStore((s) => s.resumePipeline);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [submittingAll, setSubmittingAll] = useState(false);
  const [resuming, setResuming] = useState(false);

  const handleSubmit = async (clarificationId: number) => {
    const answer = answers[clarificationId];
    if (answer?.trim()) {
      setSubmitting((prev) => ({ ...prev, [clarificationId]: true }));
      try {
        await submitAnswer(clarificationId, answer);
        setAnswers((prev) => ({ ...prev, [clarificationId]: '' }));
        await fetchClarifications(taskId);
      } finally {
        setSubmitting((prev) => ({ ...prev, [clarificationId]: false }));
      }
    }
  };

  const handleSelectOption = (clarificationId: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [clarificationId]: option }));
  };

  const handleSubmitAll = async () => {
    const pendingWithAnswers = pending.filter((c) => answers[c.id]?.trim());
    if (pendingWithAnswers.length === 0) return;
    
    setSubmittingAll(true);
    try {
      for (const c of pendingWithAnswers) {
        await submitAnswer(c.id, answers[c.id]);
      }
      setAnswers({});
      await fetchClarifications(taskId);
    } finally {
      setSubmittingAll(false);
    }
  };

  const handleProceedToPlanning = async () => {
    console.log(`[UI] handleProceedToPlanning clicked for task ${taskId}`);
    setResuming(true);
    try {
      console.log(`[UI] Calling resumePipeline...`);
      await resumePipeline(taskId);
      console.log(`[UI] resumePipeline completed`);
    } catch (error) {
      console.error(`[UI] resumePipeline error:`, error);
    } finally {
      setResuming(false);
      console.log(`[UI] handleProceedToPlanning finished`);
    }
  };

  const pending = clarifications.filter((c) => !c.userAnswer);
  const answered = clarifications.filter((c) => c.userAnswer);
  const totalRequired = clarifications.filter((c) => c.required).length;
  const answeredRequired = answered.filter((c) => c.required).length;
  const answeredCount = Object.values(answers).filter((a) => a?.trim()).length;

  return (
    <div className="space-y-6 font-mono">
      {/* Progress indicator */}
      {clarifications.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
          <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Progress</span>
          <div className="flex items-center gap-3">
            <div className="flex-1 w-32 h-2 bg-[hsl(var(--muted))] overflow-hidden border border-[hsl(var(--border))]">
              <div
                className="h-full bg-[hsl(var(--primary))] transition-all"
                style={{ width: `${clarifications.length > 0 ? (answered.length / clarifications.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-[hsl(var(--foreground))]">
              {answered.length}/{clarifications.length}
            </span>
            {totalRequired > 0 && (
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                ({answeredRequired}/{totalRequired} required)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Proceed to Planning button - shows when all required clarifications are answered */}
      {pending.length === 0 && answeredRequired >= totalRequired && taskStatus === 'clarifying' && (
        <div className="p-4 bg-[hsl(var(--card))] border-2 border-[hsl(var(--primary))] rounded-[2px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--primary))] uppercase">✓ All Clarifications Complete</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Ready to proceed to planning phase
              </p>
            </div>
            <button
              onClick={handleProceedToPlanning}
              disabled={resuming}
              className="px-6 py-3 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-sm uppercase hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {resuming ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Proceeding...
                </span>
              ) : (
                '→ Proceed to Planning'
              )}
            </button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-2 uppercase">
              <span className="w-2 h-2 bg-[hsl(var(--accent))] rounded-full animate-pulse" />
              Pending Clarifications
            </h3>
            {answeredCount > 0 && (
              <button
                onClick={handleSubmitAll}
                disabled={submittingAll}
                className="px-4 py-2 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-xs uppercase hover:opacity-90 disabled:opacity-50"
              >
                {submittingAll ? 'Submitting...' : `Submit All (${answeredCount}) & Continue`}
              </button>
            )}
          </div>
          <div className="space-y-4">
            {pending.map((c, index) => (
              <div key={c.id} className="p-4 border border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5 rounded-[2px]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Q{index + 1}</span>
                    {c.required && (
                      <span className="px-1.5 py-0.5 bg-[hsl(var(--destructive))]/20 text-[hsl(var(--destructive))] text-[9px] rounded-[2px] uppercase">Required</span>
                    )}
                    {answers[c.id]?.trim() && (
                      <span className="px-1.5 py-0.5 bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] text-[9px] rounded-[2px] uppercase">✓ Ready</span>
                    )}
                  </div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase">{c.questionType}</span>
                </div>
                <div className="text-xs text-[hsl(var(--foreground))] mb-4">{c.questionText || c.question}</div>
                
                {/* Suggested options grid */}
                {c.suggestedOptions && c.suggestedOptions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2 uppercase">Click to select or type below</div>
                    <div className="grid grid-cols-2 gap-2">
                      {c.suggestedOptions.map((option, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectOption(c.id, option)}
                          className={cn(
                            'p-2 text-left text-xs border rounded-[2px] transition-all',
                            'hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10',
                            answers[c.id] === option
                              ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]'
                          )}
                        >
                          <span className="text-[hsl(var(--muted-foreground))] mr-1">[{i + 1}]</span>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Always show text input for custom answer */}
                <div className="border-t border-[hsl(var(--border))] pt-3 mt-3">
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2 uppercase">Your Answer</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={answers[c.id] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="Type your answer or select above..."
                      className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[2px] text-xs focus:outline-none focus:border-[hsl(var(--primary))]"
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmit(c.id)}
                    />
                    <button
                      onClick={() => handleSubmit(c.id)}
                      disabled={!answers[c.id]?.trim() || submitting[c.id]}
                      className="px-4 py-2 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-xs uppercase hover:opacity-90 disabled:opacity-50"
                    >
                      {submitting[c.id] ? '...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Submit All button at bottom */}
          {answeredCount > 0 && (
            <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
              <button
                onClick={handleSubmitAll}
                disabled={submittingAll}
                className="w-full py-3 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-sm uppercase hover:opacity-90 disabled:opacity-50"
              >
                {submittingAll ? 'Submitting All Answers...' : `Submit All ${answeredCount} Answers & Continue Pipeline`}
              </button>
            </div>
          )}
        </div>
      )}

      {answered.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[hsl(var(--muted-foreground))] mb-3 uppercase">
            Answered ({answered.length})
          </h3>
          <div className="space-y-3">
            {answered.map((c, index) => (
              <div key={c.id} className="p-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-[2px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Q{index + 1}</span>
                  {c.required && (
                    <span className="px-1 py-0.5 bg-[hsl(var(--muted-foreground))]/20 text-[hsl(var(--muted-foreground))] text-[8px] rounded-[2px] uppercase">Required</span>
                  )}
                </div>
                <div className="text-xs text-[hsl(var(--foreground))] opacity-80">{c.questionText || c.question}</div>
                <div className="text-xs text-[hsl(var(--primary))] mt-2 font-bold flex items-center gap-1">
                  <span className="text-[hsl(var(--primary))]">✓</span> {c.userAnswer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clarifications.length === 0 && (
        <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-xs uppercase">
          No clarifications yet
        </div>
      )}
    </div>
  );
}


// Logs Tab
function LogsTab({ logs }: { logs: AgenticLog[] }) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const levelColors: Record<string, string> = {
    info: 'text-[hsl(var(--text-primary))]',
    warning: 'text-[hsl(var(--accent))]',
    error: 'text-[hsl(var(--destructive))]',
    debug: 'text-[hsl(var(--muted-foreground))]',
    success: 'text-[hsl(var(--primary))]',
  };

  return (
    <div className="h-full flex flex-col font-mono">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase">{logs.length} ENTRIES</span>
        <label className="flex items-center gap-2 text-[10px] uppercase cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3 h-3 accent-[hsl(var(--primary))] bg-transparent border-[hsl(var(--primary))]"
          />
          <span className="text-[hsl(var(--muted-foreground))]">AUTO-SCROLL</span>
        </label>
      </div>

      <div className="flex-1 bg-black border border-[hsl(var(--border))] rounded-[2px] overflow-y-auto text-[10px] custom-scrollbar shadow-inner">
        {logs.length === 0 ? (
          <div className="p-4 text-[hsl(var(--muted-foreground))] opacity-50">NO LOGS AVAILABLE...</div>
        ) : (
          <div className="p-2">
            {logs.map((log, i) => {
              const level = log.level || 'info';
              return (
                <div key={log.id || i} className="py-0.5 flex gap-2 hover:bg-[hsl(var(--muted))]/20">
                  <span className="text-[hsl(var(--muted-foreground))] select-none min-w-[60px] opacity-60">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <span className={cn('uppercase min-w-[40px]', levelColors[level] || levelColors.info)}>
                    [{level.slice(0, 4)}]
                  </span>
                  {log.phase && (
                    <span className="text-[hsl(var(--chart-3))] min-w-[80px] uppercase">[{log.phase}]</span>
                  )}
                  <span className="text-[hsl(var(--foreground))] break-all opacity-90">{log.message}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

// Verification Tab
function VerificationTab({ taskId, task }: { taskId: number; task: AgenticTask }) {
  const [verifications, setVerifications] = useState<VerificationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchVerifications();
  }, [taskId]);

  const fetchVerifications = async () => {
    try {
      const res = await fetch(`/api/agentic/tasks/${taskId}/verifications`);
      const data = await res.json();
      if (data.success) {
        setVerifications(data.verifications || []);
      }
    } catch (e) {
      console.error('Failed to fetch verifications:', e);
    }
  };

  const handleRerun = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(`/api/agentic/tasks/${taskId}/verify`, {
        method: 'POST',
      });
      await res.json();
      // Fetch updated results
      await fetchVerifications();
    } catch (e) {
      console.error('Failed to run verification:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRerunFailed = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(`/api/agentic/tasks/${taskId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failedOnly: true }),
      });
      await res.json();
      await fetchVerifications();
    } catch (e) {
      console.error('Failed to run verification:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApprove = async () => {
    // Approve verification and continue workflow
    try {
      await fetch(`/api/agentic/tasks/${taskId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: true }),
      });
    } catch (e) {
      console.error('Failed to approve verification:', e);
    }
  };

  return (
    <VerificationPanel
      verifications={verifications}
      onRerun={handleRerun}
      onRerunFailed={handleRerunFailed}
      onApprove={handleApprove}
      isRunning={isRunning}
    />
  );
}

// PRs Tab
function PRsTab({ taskId, task }: { taskId: number; task: AgenticTask }) {
  const [prs, setPrs] = useState<AgenticPullRequest[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [projects, setProjects] = useState<Record<number, { name: string; repoUrl: string }>>({});

  useEffect(() => {
    fetchPRs();
  }, [taskId]);

  const fetchPRs = async () => {
    try {
      const res = await fetch(`/api/agentic/tasks/${taskId}/prs`);
      const data = await res.json();
      if (data.success) {
        setPrs(data.prs || []);
        setProjects(data.projects || {});
      }
    } catch (e) {
      console.error('Failed to fetch PRs:', e);
    }
  };

  const handleMergeAll = async (prGroupId: string) => {
    setIsMerging(true);
    try {
      await fetch(`/api/agentic/prs/${prGroupId}/merge`, {
        method: 'POST',
      });
      await fetchPRs();
    } catch (e) {
      console.error('Failed to merge PRs:', e);
    } finally {
      setIsMerging(false);
    }
  };

  const handleRollback = async (prGroupId: string) => {
    try {
      await fetch(`/api/agentic/prs/${prGroupId}/rollback`, {
        method: 'POST',
      });
      await fetchPRs();
    } catch (e) {
      console.error('Failed to create rollback:', e);
    }
  };

  const handleSync = async () => {
    try {
      await fetch(`/api/agentic/tasks/${taskId}/prs/sync`, {
        method: 'POST',
      });
      await fetchPRs();
    } catch (e) {
      console.error('Failed to sync PR status:', e);
    }
  };

  return (
    <PRManagementPanel
      prs={prs}
      projects={projects}
      onMergeAll={handleMergeAll}
      onRollback={handleRollback}
      onSync={handleSync}
      isMerging={isMerging}
    />
  );
}

// History Tab
function HistoryTab({ task }: { task: AgenticTask }) {
  // Placeholder - would fetch from history API
  return (
    <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-xs font-mono uppercase">
      Task history will be available after completion
    </div>
  );
}

// Helper
function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default TaskDetailPanel;
