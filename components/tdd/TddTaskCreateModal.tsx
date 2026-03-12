'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface TddTaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: any) => void;
}

export default function TddTaskCreateModal({
  isOpen,
  onClose,
  onTaskCreated,
}: TddTaskCreateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/tdd/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priority,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('TDD Task created:', data);
        onTaskCreated(data.tddTask);
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating TDD task:', error);
      setError('An error occurred while creating the task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Create TDD Task
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Start a new Test-Driven Development task
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter task title..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Describe what you want to implement. Be specific about the expected behavior and acceptance criteria..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The AI will analyze this description and generate clarifying questions to refine the spec before writing tests.
            </p>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* TDD Workflow Info */}
          <div className="bg-gradient-to-r from-red-50 via-green-50 to-blue-50 dark:from-red-900/10 dark:via-green-900/10 dark:to-blue-900/10 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              TDD Workflow
            </h4>
            <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-medium">1</span>
                <span><strong>Spec Elicitation:</strong> AI generates clarifying questions</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 flex items-center justify-center font-medium">2</span>
                <span><strong>Clarification:</strong> You answer questions to refine spec</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 flex items-center justify-center font-medium">3</span>
                <span><strong>RED:</strong> AI writes failing tests first</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center justify-center font-medium">4</span>
                <span><strong>GREEN:</strong> AI implements code to pass tests</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center font-medium">5</span>
                <span><strong>REFACTOR:</strong> AI cleans up the code</span>
              </li>
            </ol>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || !description || isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 hover:from-red-600 hover:via-green-600 hover:to-blue-600 disabled:from-gray-300 disabled:via-gray-300 disabled:to-gray-300 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-600 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create TDD Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
