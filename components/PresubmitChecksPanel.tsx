'use client';

import { useState, useEffect } from 'react';
import { Play, Check, X, Loader2, Eye, Download, AlertCircle, RotateCw } from 'lucide-react';
import { EXPERT_SKILLS, getExpertColorClass } from '@/lib/config/expertSkills';

interface PresubmitChecksPanelProps {
  taskId: number;
}

interface Evaluation {
  id: number;
  task_id: number;
  expert_role: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  elapsed_seconds: number;
  evaluation_report?: string;
  action_points?: string;
  overall_opinion?: string;
  severity?: string;
  error?: string;
}

export default function PresubmitChecksPanel({ taskId }: PresubmitChecksPanelProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [runningChecks, setRunningChecks] = useState<Set<string>>(new Set());
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadEvaluations();

    // Poll for updates while any check is running
    const interval = setInterval(() => {
      if (runningChecks.size > 0) {
        loadEvaluations();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [taskId, runningChecks.size]);

  const loadEvaluations = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/presubmit`);
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data.evaluations || []);
        
        // Update running checks
        const running = new Set<string>(
          (data.evaluations || [])
            .filter((e: Evaluation) => e.status === 'running')
            .map((e: Evaluation) => e.expert_role)
        );
        setRunningChecks(running);
      }
    } catch (error) {
      console.error('Error loading presubmit evaluations:', error);
    }
  };

  const runCheck = async (expertRole: string) => {
    try {
      setRunningChecks(prev => new Set(prev).add(expertRole));

      const response = await fetch(`/api/tasks/${taskId}/presubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertRole }),
      });

      if (response.ok) {
        console.log(`✅ Started ${expertRole} evaluation`);
        loadEvaluations();
      } else {
        const error = await response.json();
        alert(`Failed to start evaluation: ${error.error}`);
        setRunningChecks(prev => {
          const next = new Set(prev);
          next.delete(expertRole);
          return next;
        });
      }
    } catch (error) {
      console.error('Error starting evaluation:', error);
      setRunningChecks(prev => {
        const next = new Set(prev);
        next.delete(expertRole);
        return next;
      });
    }
  };

  const getEvaluationForExpert = (expertRole: string): Evaluation | undefined => {
    return evaluations.find(e => e.expert_role === expertRole);
  };

  const viewEvaluation = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setIsModalOpen(true);
  };

  const downloadEvaluation = (evaluation: Evaluation, expertName: string) => {
    if (!evaluation.evaluation_report) return;

    const blob = new Blob([evaluation.evaluation_report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-${taskId}-${evaluation.expert_role}-evaluation.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`📥 Downloaded ${expertName} evaluation for task #${taskId}`);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-600 dark:text-red-400';
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400';
      case 'MEDIUM':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'LOW':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>💡 Presubmit Evaluation:</strong> Run expert reviews on your implementation.
          Each expert provides read-only analysis with actionable recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPERT_SKILLS.map((expert) => {
          const evaluation = getEvaluationForExpert(expert.role);
          const isRunning = evaluation?.status === 'running';
          const isCompleted = evaluation?.status === 'completed';
          const hasError = evaluation?.status === 'error';

          return (
            <div
              key={expert.role}
              className={`border rounded-lg p-4 transition-all ${
                isCompleted
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : hasError
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                  : isRunning
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl p-2 rounded-lg ${getExpertColorClass(expert.color, 'bg')}`}>
                    {expert.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {expert.displayName}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {expert.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {isRunning && (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Running...</span>
                    </div>
                  )}
                  {isCompleted && evaluation && (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className={`text-xs font-medium ${getSeverityColor(evaluation.severity)}`}>
                        {evaluation.severity?.toUpperCase() || 'COMPLETED'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({evaluation.elapsed_seconds}s)
                      </span>
                    </div>
                  )}
                  {hasError && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <X className="w-4 h-4" />
                      <span className="text-xs">Failed</span>
                    </div>
                  )}
                  {!evaluation && (
                    <span className="text-xs text-gray-400">Not run</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isCompleted && evaluation?.evaluation_report && (
                    <>
                      <button
                        onClick={() => viewEvaluation(evaluation)}
                        className="p-1.5 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                        title="View evaluation"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadEvaluation(evaluation, expert.displayName)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Download evaluation"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => runCheck(expert.role)}
                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                        title="Re-run evaluation"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {hasError && (
                    <button
                      onClick={() => runCheck(expert.role)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
                      title="Retry evaluation"
                    >
                      <RotateCw className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                  {!isCompleted && !isRunning && !hasError && (
                    <button
                      onClick={() => runCheck(expert.role)}
                      disabled={isRunning}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Run Check
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Evaluation Modal */}
      {isModalOpen && selectedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {EXPERT_SKILLS.find(e => e.role === selectedEvaluation.expert_role)?.displayName} Evaluation
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Task #{taskId} - {selectedEvaluation.severity?.toUpperCase()} severity
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const expert = EXPERT_SKILLS.find(e => e.role === selectedEvaluation.expert_role);
                    if (expert) downloadEvaluation(selectedEvaluation, expert.displayName);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                  {selectedEvaluation.evaluation_report}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

