'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Edit2, Check, Save, ChevronDown, ChevronRight, Terminal, FileText, FileBarChart, Link, Trash2 } from 'lucide-react';
import DocumentUploadZone from './DocumentUploadZone';
import DocumentList from './DocumentList';
import PresubmitChecksPanel from './PresubmitChecksPanel';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  taskId,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<any>(null);
  const [prompt, setPrompt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [implementationLogs, setImplementationLogs] = useState<any[]>([]);
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDocumentsCollapsed, setIsDocumentsCollapsed] = useState(false);
  const [implementation, setImplementation] = useState<any>(null);
  const [isReportCollapsed, setIsReportCollapsed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [implementationFeedback, setImplementationFeedback] = useState('');
  const [isRefiningImplementation, setIsRefiningImplementation] = useState(false);
  const [isCancellingImplementation, setIsCancellingImplementation] = useState(false);

  // Track previous status to handle transitions
  const [prevStatus, setPrevStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen && taskId) {
      // Initial load
      loadTaskDetails(true);
      loadImplementationLogs();
      loadDocuments();

      // Poll for updates while task is in verifying or in-progress status
      const pollInterval = setInterval(() => {
        loadTaskDetails(false);
        loadImplementationLogs();
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [isOpen, taskId]);

  // Auto-collapse prompt when implementation starts, auto-expand when awaiting approval
  useEffect(() => {
    if (!task?.status || !prompt) return;
    
    const collapsibleStatuses = ['in-progress', 'writing-tests', 'finish'];
    const shouldCollapse = collapsibleStatuses.includes(task.status);
    const wasCollapsible = collapsibleStatuses.includes(prevStatus);

    // Only collapse if we are transitioning INTO a collapsible status from a non-collapsible one
    if (shouldCollapse && !wasCollapsible && prevStatus) {
      setIsPromptCollapsed(true);
    }

    // Auto-expand if prompt is ready for approval (verifying status, prompt completed but not approved)
    if (task.status === 'verifying' && prompt.status === 'completed' && !prompt.approved) {
      setIsPromptCollapsed(false);
    }

    setPrevStatus(task.status);
  }, [task?.status, prompt?.status, prompt?.approved]);

  const loadTaskDetails = async (showLoading = false) => {
    if (!taskId) return;

    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data.task);
        setPrompt(data.prompt);
        setImplementation(data.implementation);

        // Check if prompt is being generated
        const taskStatus = data.task?.status;
        const hasPrompt = data.prompt?.enhanced_prompt;

        setIsGeneratingPrompt(taskStatus === 'verifying' && !hasPrompt);
      }
    } catch (error) {
      console.error('Error loading task details:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const loadImplementationLogs = async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/logs`);
      if (response.ok) {
        const data = await response.json();
        console.log(`📜 Loaded ${data.logs?.length || 0} implementation logs for task #${taskId}`);
        setImplementationLogs(data.logs || []);
      } else {
        console.warn(`Failed to load logs for task #${taskId}:`, response.status);
      }
    } catch (error) {
      console.error('Error loading implementation logs:', error);
    }
  };

  const loadDocuments = async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleDocumentDeleted = (documentId: number) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const handleDocumentUpdated = (updatedDocument: any) => {
    setDocuments(prev =>
      prev.map(doc => doc.id === updatedDocument.id ? updatedDocument : doc)
    );
  };

  const handleEditPrompt = () => {
    setEditedPrompt(prompt?.enhanced_prompt || '');
    setIsEditingPrompt(true);
  };

  const handleSavePrompt = async () => {
    if (!editedPrompt.trim()) {
      alert('Enhanced prompt cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enhancedPrompt: editedPrompt }),
      });

      if (response.ok) {
        setIsEditingPrompt(false);
        await loadTaskDetails();
      } else {
        alert('Failed to save prompt');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Error saving prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprovePrompt = async () => {
    if (!confirm('Approve this prompt and start implementation?')) {
      return;
    }

    setIsApproving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Prompt approved:', data);
        await loadTaskDetails();
        // Close modal after approval
        setTimeout(() => onClose(), 500);
      } else {
        const error = await response.json();
        alert(`Failed to approve: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error approving prompt:', error);
      alert('Error approving prompt');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm(`Are you sure you want to delete task #${taskId}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log(`✅ Task #${taskId} deleted`);
        onClose();
        // Refresh the page to update the board
        window.location.reload();
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to delete task: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefinePrompt = async () => {
    if (!refinementFeedback.trim()) {
      alert('Please provide feedback for refinement');
      return;
    }

    setIsRefining(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/refine-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: refinementFeedback }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Prompt refined successfully');
        
        // Clear feedback input
        setRefinementFeedback('');
        
        // Reload task details to show new prompt
        await loadTaskDetails();
        
        alert('Enhanced requirements updated! Please review the changes.');
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to refine prompt: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error refining prompt:', error);
      alert('Error refining prompt');
    } finally {
      setIsRefining(false);
    }
  };

  const handleCancelImplementation = async () => {
    if (!confirm('Are you sure you want to cancel the implementation? Changes will be rolled back to the restore point.')) {
      return;
    }

    setIsCancellingImplementation(true);
    try {
      const response = await fetch(`/api/implementation/${taskId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        console.log(`✅ Implementation cancelled for task #${taskId}`);
        await loadTaskDetails();
        alert('Implementation cancelled. Task moved back to Enhancing Requirement.');
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to cancel implementation: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error cancelling implementation:', error);
      alert('Error cancelling implementation');
    } finally {
      setIsCancellingImplementation(false);
    }
  };

  const handleRefineImplementation = async () => {
    if (!implementationFeedback.trim()) {
      alert('Please provide feedback for refinement');
      return;
    }

    setIsRefiningImplementation(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/refine-implementation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: implementationFeedback }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Implementation refinement queued (Round ${data.refinementRound})`);
        
        // Clear feedback input
        setImplementationFeedback('');
        
        // Reload task details
        await loadTaskDetails();
        
        alert(`Refinement round ${data.refinementRound} queued! The task will be implemented again.`);
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to refine implementation: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error refining implementation:', error);
      alert('Error refining implementation');
    } finally {
      setIsRefiningImplementation(false);
    }
  };

  if (!isOpen || !taskId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Task #{task?.id}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {task?.status}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {taskId && (
              <DocumentUploadZone
                taskId={taskId}
                onUploadComplete={loadDocuments}
                disabled={
                  (task?.status !== 'todo' && task?.status !== 'verifying') || 
                  prompt?.approved === true
                }
                disabledReason="Documents can only be uploaded before approval (Todo or Enhancing Requirement stages)"
              />
            )}
            {/* Delete button - show for todo or verifying status */}
            {task && (task.status === 'todo' || task.status === 'verifying') && !implementation?.status && (
              <button
                onClick={handleDeleteTask}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                title="Delete this task"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Task
                  </>
                )}
              </button>
            )}
            {/* Cancel implementation button - show when task is in implementation lane */}
            {task?.status === 'in-progress' && (
              <button
                onClick={handleCancelImplementation}
                disabled={isCancellingImplementation}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                title="Cancel implementation and rollback changes"
              >
                {isCancellingImplementation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Cancel Implementation
                  </>
                )}
              </button>
            )}
            {/* Restart implementation button - show when implementation was cancelled */}
            {task && task.status === 'verifying' && implementation?.status === 'cancelled' && prompt?.approved && (
              <button
                onClick={handleApprovePrompt}
                disabled={isApproving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                title="Restart implementation"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Restart Implementation
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isLoading && !task ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  {task?.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {task?.description || 'No description'}
                </p>
                
                {/* Referenced Tickets */}
                {task?.reference_task_ids && (() => {
                  try {
                    const refIds = JSON.parse(task.reference_task_ids);
                    if (refIds && refIds.length > 0) {
                      return (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Link className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-600 dark:text-gray-400">
                            References:
                          </span>
                          {refIds.map((refId: number, idx: number) => (
                            <span key={refId}>
                              <a
                                href={`#`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Could open referenced task in modal
                                  console.log(`Navigate to task #${refId}`);
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                #{refId}
                              </a>
                              {idx < refIds.length - 1 && <span className="text-gray-400">, </span>}
                            </span>
                          ))}
                        </div>
                      );
                    }
                  } catch (e) {
                    return null;
                  }
                  return null;
                })()}
              </div>

              {isGeneratingPrompt && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    Generating enhanced requirements with AI...
                  </span>
                </div>
              )}

              {/* Implementation Logs - Always show if implementation exists */}
              {(task?.impl_status === 'waiting' || task?.impl_status === 'running' || task?.impl_status === 'completed' || task?.impl_status === 'error' || implementationLogs.length > 0) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Terminal className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Implementation {task?.impl_status === 'completed' ? 'Log' : 'Progress'}
                    </h3>
                    {task?.impl_status === 'running' && (
                      <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Running... ({task?.impl_elapsed || 0}s elapsed)
                      </span>
                    )}
                    {task?.impl_status === 'completed' && (
                      <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        Completed in {task?.impl_elapsed || 0}s
                      </span>
                    )}
                    {task?.impl_status === 'error' && (
                      <span className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <X className="w-4 h-4" />
                        Failed
                      </span>
                    )}
                  </div>
                  <div className="bg-[#1e1e1e] rounded-lg border border-gray-800 overflow-hidden shadow-inner font-mono text-sm">
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                        </div>
                        <span className="ml-2 text-xs text-gray-400">Claude SDK Output</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {implementationLogs.length} lines
                      </div>
                    </div>

                    {/* Logs Content */}
                    <div className="p-4 max-h-96 overflow-y-auto leading-relaxed custom-scrollbar">
                      {implementationLogs.length > 0 ? (
                        implementationLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`py-0.5 flex gap-3 ${
                              log.type === 'error'
                                ? 'text-[#ff6b6b]'
                                : log.type === 'success'
                                ? 'text-[#51cf66]'
                                : log.type === 'tool'
                                ? 'text-[#339af0]'
                                : log.type === 'progress'
                                ? 'text-[#fcc419]'
                                : 'text-[#ced4da]'
                            }`}
                          >
                            <span className="text-gray-600 shrink-0 w-[70px] select-none text-xs font-mono opacity-50">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                            </span>
                            <span className="whitespace-pre-wrap break-words flex-1">{log.message}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 text-center py-8">
                          {task?.impl_status === 'waiting' ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                              <span>Waiting for implementation to start...</span>
                            </div>
                          ) : task?.impl_status === 'running' ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-[#339af0]" />
                              <span className="text-[#339af0]">Initializing implementation...</span>
                            </div>
                          ) : task?.impl_status === 'completed' ? (
                            <div className="space-y-2">
                              <div className="text-[#ced4da]">
                                ℹ️ Implementation logs are not available
                              </div>
                              <div className="text-xs text-gray-600">
                                (Logs are stored in memory and cleared on server restart)
                              </div>
                              <div className="text-xs text-gray-500 mt-3">
                                💡 Check the Implementation Report below for complete details
                              </div>
                            </div>
                          ) : (
                            <span>No logs available</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {prompt?.enhanced_prompt && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setIsPromptCollapsed(!isPromptCollapsed)}
                      className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1 transition-colors"
                    >
                      {isPromptCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Enhanced Requirements
                      </h3>
                    </button>
                    {!isEditingPrompt && !isPromptCollapsed && (
                      <button
                        onClick={handleEditPrompt}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                  {!isPromptCollapsed && (isEditingPrompt ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSavePrompt}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setIsEditingPrompt(false)}
                          disabled={isSaving}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                          {prompt.enhanced_prompt}
                        </pre>
                      </div>
                      
                      {/* Refinement feedback - only show if prompt is ready and not approved */}
                      {prompt.status === 'completed' && !prompt.approved && task?.status === 'verifying' && (
                        <div className="mt-4 space-y-4">
                          {/* Feedback for refinement */}
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                              💡 Need Changes?
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                              Provide feedback to refine the requirements before approval.
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={refinementFeedback}
                                onChange={(e) => setRefinementFeedback(e.target.value)}
                                placeholder="e.g., Add error handling details, Include mobile responsiveness..."
                                className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                onClick={handleRefinePrompt}
                                disabled={isRefining || !refinementFeedback.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors whitespace-nowrap"
                              >
                                {isRefining ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Refining...
                                  </>
                                ) : (
                                  <>Apply</>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Approval section */}
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                                  Ready for Implementation
                                </h4>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                  Approve this prompt to create a git restore point and start implementation.
                                </p>
                              </div>
                              <button
                                onClick={handleApprovePrompt}
                                disabled={isApproving}
                                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors font-semibold whitespace-nowrap ml-4"
                              >
                                {isApproving ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-5 h-5" />
                                    Approve & Start
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show approved status */}
                      {prompt.approved && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                            <Check className="w-5 h-5" />
                            <span className="font-semibold">Approved and queued for implementation</span>
                          </div>
                        </div>
                      )}
                    </>
                  ))}
                </div>
              )}

              {/* Presubmit Evaluation Section - Show when task is in writing-tests status */}
              {task?.status === 'writing-tests' && implementation?.implementation_report && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  {/* Refinement Feedback Section */}
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Refine Implementation
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Provide feedback to refine the implementation. The AI will address your concerns in a new implementation round.
                    </p>
                    <textarea
                      value={implementationFeedback}
                      onChange={(e) => setImplementationFeedback(e.target.value)}
                      className="w-full h-24 px-3 py-2 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                      placeholder="Example: Add error handling for edge cases, improve mobile responsiveness, add loading states..."
                    />
                    <button
                      onClick={handleRefineImplementation}
                      disabled={isRefiningImplementation || !implementationFeedback.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded transition-colors"
                    >
                      {isRefiningImplementation ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Queueing Refinement...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Refine Implementation
                        </>
                      )}
                    </button>
                    {implementation?.refinement_round && implementation.refinement_round > 1 && (
                      <div className="mt-3 text-sm text-blue-700 dark:text-blue-300">
                        Current Round: {implementation.refinement_round}
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-500" />
                    Presubmit Evaluation Checks
                  </h3>
                  <PresubmitChecksPanel taskId={taskId!} />
                </div>
              )}

              {/* Implementation Report Section */}
              {implementation?.implementation_report && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setIsReportCollapsed(!isReportCollapsed)}
                      className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1 transition-colors"
                    >
                      {isReportCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                      <FileBarChart className="w-5 h-5 text-purple-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Implementation Report
                      </h3>
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                        ✅ Generated
                      </span>
                    </button>
                  </div>
                  {!isReportCollapsed && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono max-h-96 overflow-y-auto">
                        {implementation.implementation_report}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Report Generation Status */}
              {implementation?.report_status === 'generating' && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                    <span className="text-purple-700 dark:text-purple-300 font-medium">
                      Generating implementation report...
                    </span>
                  </div>
                </div>
              )}

              {/* Documents Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setIsDocumentsCollapsed(!isDocumentsCollapsed)}
                    className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1 transition-colors"
                  >
                    {isDocumentsCollapsed ? (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Documents
                    </h3>
                    {documents.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        {documents.length}
                      </span>
                    )}
                    {((task?.status !== 'todo' && task?.status !== 'verifying') || prompt?.approved === true) && documents.length > 0 && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 italic">
                        🔒 Read-only (scope locked)
                      </span>
                    )}
                  </button>
                </div>
                {!isDocumentsCollapsed && (
                  <DocumentList
                    documents={documents}
                    onDocumentDeleted={handleDocumentDeleted}
                    onDocumentUpdated={handleDocumentUpdated}
                    readonly={
                      (task?.status !== 'todo' && task?.status !== 'verifying') || 
                      prompt?.approved === true
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
