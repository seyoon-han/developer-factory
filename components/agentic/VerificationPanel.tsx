'use client';

/**
 * VerificationPanel Component
 * Displays verification results with pass/fail status and re-run capabilities
 * Follows TDD - implemented to pass the test suite
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export interface VerificationResult {
  id?: number;
  name: string;
  command: string;
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  required: boolean;
}

interface VerificationPanelProps {
  verifications: VerificationResult[];
  onRerun: () => void;
  onRerunFailed: () => void;
  onApprove: () => void;
  isRunning?: boolean;
  className?: string;
}

export function VerificationPanel({
  verifications,
  onRerun,
  onRerunFailed,
  onApprove,
  isRunning = false,
  className,
}: VerificationPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const passedCount = verifications.filter(v => v.success).length;
  const failedCount = verifications.filter(v => !v.success).length;
  const requiredPassed = verifications.filter(v => v.required).every(v => v.success);
  const allPassed = verifications.every(v => v.success);

  const toggleExpand = (index: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (isRunning && verifications.length === 0) {
    return (
      <div
        data-testid="verification-panel"
        className={cn('space-y-4 font-mono', className)}
      >
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase">
            Running verifications...
          </span>
        </div>
      </div>
    );
  }

  if (verifications.length === 0) {
    return (
      <div
        data-testid="verification-panel"
        className={cn('space-y-4 font-mono', className)}
      >
        <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-xs uppercase">
          No verifications run yet
        </div>
        <div className="flex justify-center">
          <button
            data-testid="rerun-all-button"
            onClick={onRerun}
            disabled={isRunning}
            className="px-4 py-2 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-xs uppercase hover:opacity-90 disabled:opacity-50"
          >
            Run Verifications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="verification-panel"
      className={cn('space-y-4 font-mono', className)}
    >
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[2px]">
        <div className="flex items-center gap-4">
          <div
            data-testid="overall-status"
            className={cn(
              'flex items-center gap-2 font-bold text-xs uppercase',
              requiredPassed ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'
            )}
          >
            {requiredPassed ? '✓' : '✕'}
            {requiredPassed ? 'Passed' : 'Failed'}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            <span className="text-[hsl(var(--primary))]">{passedCount} passed</span>
            {' / '}
            <span className={failedCount > 0 ? 'text-[hsl(var(--destructive))]' : ''}>
              {failedCount} failed
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            data-testid="rerun-failed-button"
            onClick={onRerunFailed}
            disabled={isRunning || failedCount === 0}
            className={cn(
              'px-3 py-1 border rounded-[2px] text-[10px] uppercase',
              failedCount > 0 && !isRunning
                ? 'border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10'
                : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
            )}
          >
            Re-run Failed
          </button>
          <button
            data-testid="rerun-all-button"
            onClick={onRerun}
            disabled={isRunning}
            className="px-3 py-1 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] rounded-[2px] text-[10px] uppercase hover:bg-[hsl(var(--primary))]/10 disabled:opacity-50"
          >
            Re-run All
          </button>
          {failedCount > 0 && (
            <button
              data-testid="approve-anyway-button"
              onClick={onApprove}
              disabled={isRunning}
              className="px-3 py-1 bg-[hsl(var(--chart-4))] text-black font-bold rounded-[2px] text-[10px] uppercase hover:opacity-90 disabled:opacity-50"
            >
              Approve Anyway
            </button>
          )}
        </div>
      </div>

      {/* Verification List */}
      <div className="space-y-2">
        {verifications.map((verification, index) => (
          <div
            key={verification.id || index}
            className={cn(
              'border rounded-[2px] overflow-hidden',
              verification.success
                ? 'border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5'
                : 'border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5'
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-3">
              {/* Status Icon */}
              {verification.success ? (
                <span
                  data-testid="status-pass"
                  className="text-[hsl(var(--primary))] text-sm"
                >
                  ✓
                </span>
              ) : (
                <span
                  data-testid="status-fail"
                  className="text-[hsl(var(--destructive))] text-sm"
                >
                  ✕
                </span>
              )}

              {/* Name and Command */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[hsl(var(--foreground))]">
                    {verification.name}
                  </span>
                  {verification.required && (
                    <span className="px-1 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-[8px] rounded-[2px] uppercase">
                      Required
                    </span>
                  )}
                </div>
                <code className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {verification.command}
                </code>
              </div>

              {/* Execution Time */}
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {formatTime(verification.executionTime)}
              </span>

              {/* Expand Button */}
              <button
                data-testid="expand-output-button"
                onClick={() => toggleExpand(index)}
                className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-xs"
              >
                {expandedIds.has(index) ? '▼' : '▶'}
              </button>
            </div>

            {/* Expandable Output */}
            {expandedIds.has(index) && (
              <div className="border-t border-[hsl(var(--border))]/50 p-3 bg-black/30">
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase mb-2">
                  Output
                </div>
                <pre className="text-[10px] text-[hsl(var(--foreground))] whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                  {verification.output}
                </pre>
                {verification.error && (
                  <>
                    <div className="text-[10px] text-[hsl(var(--destructive))] uppercase mt-3 mb-2">
                      Error
                    </div>
                    <pre className="text-[10px] text-[hsl(var(--destructive))] whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                      {verification.error}
                    </pre>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Loading Overlay */}
      {isRunning && verifications.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase">
            Running verifications...
          </span>
        </div>
      )}
    </div>
  );
}

export default VerificationPanel;

