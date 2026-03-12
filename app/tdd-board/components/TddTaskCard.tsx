'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FlaskConical,
  MessageCircleQuestion,
  TestTube2,
  Code2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import type { TddPhase, TddStatus } from '@/types/tdd-task';

interface TddTaskCardProps {
  task: any;
  isDragging?: boolean;
  onClick?: () => void;
}

const phaseIcons: Record<TddPhase, React.ReactNode> = {
  spec_elicitation: <FlaskConical className="w-4 h-4" />,
  awaiting_clarification: <MessageCircleQuestion className="w-4 h-4" />,
  red_phase: <TestTube2 className="w-4 h-4" />,
  green_phase: <Code2 className="w-4 h-4" />,
  refactor_phase: <RefreshCw className="w-4 h-4" />,
  verification: <CheckCircle2 className="w-4 h-4" />,
  complete: <CheckCircle2 className="w-4 h-4" />,
};

const phaseBadgeColors: Record<TddPhase, string> = {
  spec_elicitation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  awaiting_clarification: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  red_phase: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  green_phase: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  refactor_phase: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  verification: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
  complete: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
};

const phaseLabels: Record<TddPhase, string> = {
  spec_elicitation: 'Spec',
  awaiting_clarification: 'Awaiting',
  red_phase: 'RED',
  green_phase: 'GREEN',
  refactor_phase: 'REFACTOR',
  verification: 'Verify',
  complete: 'Done',
};

export default function TddTaskCard({ task, isDragging, onClick }: TddTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const phase = task.current_phase as TddPhase;
  const isAwaitingClarification = task.tdd_status === 'awaiting_clarification';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600
        shadow-sm hover:shadow-md transition-all cursor-pointer
        ${isDragging || isSortableDragging ? 'opacity-50 ring-2 ring-blue-400' : ''}
        ${isAwaitingClarification ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-600">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            #{task.task_id}
          </span>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${phaseBadgeColors[phase]}`}>
            {phaseIcons[phase]}
            {phaseLabels[phase]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">
          {task.title || `Task #${task.task_id}`}
        </h4>

        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 flex items-center justify-between">
        {/* Cycle count */}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <RefreshCw className="w-3 h-3" />
          Cycle {task.tdd_cycle_count || 0}
        </div>

        {/* Status indicator */}
        {isAwaitingClarification && (
          <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 animate-pulse" />
            Answer needed
          </div>
        )}

        {(phase === 'red_phase' || phase === 'green_phase') && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <Clock className="w-3 h-3 animate-spin" />
            Processing...
          </div>
        )}

        {phase === 'complete' && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Tests passing
          </div>
        )}
      </div>

      {/* Test results preview */}
      {task.test_results && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
          <TestResultsBadge results={JSON.parse(task.test_results)} />
        </div>
      )}
    </div>
  );
}

function TestResultsBadge({ results }: { results: { passed: number; failed: number; skipped: number } }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        {results.passed}
      </span>
      {results.failed > 0 && (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <AlertCircle className="w-3 h-3" />
          {results.failed}
        </span>
      )}
      {results.skipped > 0 && (
        <span className="text-gray-400">
          {results.skipped} skipped
        </span>
      )}
    </div>
  );
}
