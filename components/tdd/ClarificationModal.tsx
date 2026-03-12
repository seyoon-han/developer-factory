'use client';

import { useState, useEffect } from 'react';
import { X, MessageCircleQuestion, CheckCircle, AlertCircle, Send } from 'lucide-react';
import type { ParsedClarification, UserAnswer } from '@/types/clarification';

interface ClarificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  tddTaskId: number;
  onSubmit: (answers: Record<number, UserAnswer>) => Promise<void>;
}

export default function ClarificationModal({
  isOpen,
  onClose,
  taskId,
  tddTaskId,
  onSubmit
}: ClarificationModalProps) {
  const [clarifications, setClarifications] = useState<ParsedClarification[]>([]);
  const [answers, setAnswers] = useState<Record<number, UserAnswer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load clarifications on mount
  useEffect(() => {
    if (isOpen && tddTaskId) {
      loadClarifications();
    }
  }, [isOpen, tddTaskId]);

  const loadClarifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tdd/tasks/${tddTaskId}/clarifications`);
      if (!response.ok) {
        throw new Error('Failed to load clarifications');
      }
      const data = await response.json();
      setClarifications(data.clarifications || []);

      // Initialize answers for unanswered questions
      const initialAnswers: Record<number, UserAnswer> = {};
      for (const c of data.clarifications || []) {
        if (!c.answered_at) {
          initialAnswers[c.id] = { value: '' };
        }
      }
      setAnswers(initialAnswers);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (clarificationId: number, answer: UserAnswer) => {
    setAnswers((prev) => ({
      ...prev,
      [clarificationId]: answer
    }));
  };

  const handleSubmit = async () => {
    // Check required fields
    const unanswered = clarifications.filter(
      (c) => c.required && !c.answered_at && (!answers[c.id]?.value || answers[c.id].value.trim() === '')
    );

    if (unanswered.length > 0) {
      setError(`Please answer all required questions (${unanswered.length} remaining)`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(answers);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit answers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = clarifications.filter((c) => c.answered_at).length;
  const pendingCount = clarifications.filter((c) => !c.answered_at).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <MessageCircleQuestion className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Clarification Required
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Task #{taskId} - {pendingCount} question{pendingCount !== 1 ? 's' : ''} pending
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : clarifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No clarifications needed
            </div>
          ) : (
            <div className="space-y-6">
              {clarifications.map((clarification, index) => (
                <ClarificationQuestion
                  key={clarification.id}
                  clarification={clarification}
                  index={index + 1}
                  value={answers[clarification.id]}
                  onChange={(answer) => handleAnswerChange(clarification.id, answer)}
                  disabled={!!clarification.answered_at}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {answeredCount > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {answeredCount} answered
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || pendingCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Answers
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Question Component
interface ClarificationQuestionProps {
  clarification: ParsedClarification;
  index: number;
  value?: UserAnswer;
  onChange: (answer: UserAnswer) => void;
  disabled?: boolean;
}

function ClarificationQuestion({
  clarification,
  index,
  value,
  onChange,
  disabled
}: ClarificationQuestionProps) {
  const [customValue, setCustomValue] = useState('');

  const handleOptionSelect = (option: string) => {
    onChange({ value: option, selectedOptions: [option] });
  };

  const handleTextChange = (text: string) => {
    onChange({ value: text });
  };

  const handleBooleanChange = (val: boolean) => {
    onChange({ value: String(val) });
  };

  const handleCustomInput = (text: string) => {
    setCustomValue(text);
    onChange({ value: text, customText: text });
  };

  // Already answered
  if (clarification.answered_at) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">
              {index}. {clarification.question_text}
              {clarification.required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </p>
            <p className="mt-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded">
              {clarification.user_answer}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
      <p className="font-medium text-gray-900 dark:text-white mb-3">
        {index}. {clarification.question_text}
        {clarification.required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </p>

      {/* Choice type */}
      {clarification.question_type === 'choice' && clarification.suggested_options.length > 0 && (
        <div className="space-y-2">
          {clarification.suggested_options.map((option, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                value?.value === option
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name={`clarification-${clarification.id}`}
                checked={value?.value === option}
                onChange={() => handleOptionSelect(option)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">{option}</span>
            </label>
          ))}
          {/* Custom option */}
          <div className="mt-3">
            <input
              type="text"
              placeholder="Or type your own answer..."
              value={customValue}
              onChange={(e) => handleCustomInput(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Boolean type */}
      {clarification.question_type === 'boolean' && (
        <div className="flex gap-4">
          <label
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
              value?.value === 'true'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={`clarification-${clarification.id}`}
              checked={value?.value === 'true'}
              onChange={() => handleBooleanChange(true)}
              disabled={disabled}
              className="w-4 h-4 text-green-600"
            />
            <span className="font-medium text-gray-700 dark:text-gray-300">Yes</span>
          </label>
          <label
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
              value?.value === 'false'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={`clarification-${clarification.id}`}
              checked={value?.value === 'false'}
              onChange={() => handleBooleanChange(false)}
              disabled={disabled}
              className="w-4 h-4 text-red-600"
            />
            <span className="font-medium text-gray-700 dark:text-gray-300">No</span>
          </label>
        </div>
      )}

      {/* Text type */}
      {(clarification.question_type === 'text' || clarification.question_type === 'multi_choice') && (
        <div>
          {clarification.suggested_options.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggested answers:</p>
              <div className="flex flex-wrap gap-2">
                {clarification.suggested_options.map((option, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTextChange(option)}
                    disabled={disabled}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      value?.value === option
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            value={value?.value || ''}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter your answer..."
            disabled={disabled}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      )}
    </div>
  );
}
