'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CloudUpload, FileText, Workflow, Image as ImageIcon, Trash2 } from 'lucide-react';
import DocumentUploadZone from './DocumentUploadZone';
import type { Workflow as WorkflowType } from '@/types/workflow';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  onTaskCreated: (task: any) => void;
  initialTitle?: string;
  initialDescription?: string;
  initialPriority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface PastedImage {
  id: string;
  file: File;
  preview: string;
  uploaded: boolean;
}

export default function TaskCreateModal({
  isOpen,
  onClose,
  boardId,
  onTaskCreated,
  initialTitle = '',
  initialDescription = '',
  initialPriority = 'medium',
}: TaskCreateModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(initialPriority);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);
  const [step, setStep] = useState<'create' | 'documents'>('create');
  const [uploadedDocuments, setUploadedDocuments] = useState<number>(0);
  const [referenceTickets, setReferenceTickets] = useState<string>('');
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [pastedImages, setPastedImages] = useState<PastedImage[]>([]);
  const [isEnqueueing, setIsEnqueueing] = useState(false);
  const [useContext7, setUseContext7] = useState(true); // Default: ON
  const [useConfluence, setUseConfluence] = useState(true); // Default: ON
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch workflows when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
    }
  }, [isOpen]);

  // Update state when initial values change
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setPriority(initialPriority);
    }
  }, [isOpen, initialTitle, initialDescription, initialPriority]);

  const fetchWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.workflows) {
          // Show active and draft workflows (exclude archived)
          const availableWorkflows = data.workflows.filter((w: WorkflowType) => w.status !== 'archived');
          setWorkflows(availableWorkflows);
        }
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  if (!isOpen) return null;

  // Handle paste events for images
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault(); // Prevent default paste behavior for images

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;

      // Create a preview URL
      const preview = URL.createObjectURL(file);
      
      // Add to pasted images list
      const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setPastedImages(prev => [...prev, {
        id: imageId,
        file,
        preview,
        uploaded: false,
      }]);

      console.log(`📋 Image pasted: ${file.name || 'clipboard-image'} (${(file.size / 1024).toFixed(2)} KB)`);
    }
  };

  // Upload pasted images when task is created
  const uploadPastedImages = async (taskId: number) => {
    if (pastedImages.length === 0) return;

    console.log(`📤 Uploading ${pastedImages.length} pasted image(s) to task #${taskId}...`);

    try {
      const formData = new FormData();
      pastedImages.forEach((img, index) => {
        // Create a proper filename
        const timestamp = Date.now();
        const filename = `pasted-image-${timestamp}-${index}.${img.file.type.split('/')[1] || 'png'}`;
        const renamedFile = new File([img.file], filename, { type: img.file.type });
        formData.append('files', renamedFile);
      });
      formData.append('uploadedBy', 'user');

      const response = await fetch(`/api/tasks/${taskId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Uploaded ${data.documents.length} pasted image(s)`);
        
        // Mark all images as uploaded
        setPastedImages(prev => prev.map(img => ({ ...img, uploaded: true })));
        
        // Update uploaded documents count
        setUploadedDocuments(prev => prev + data.documents.length);
      } else {
        console.error('Failed to upload pasted images');
      }
    } catch (error) {
      console.error('Error uploading pasted images:', error);
    }
  };

  // Remove a pasted image
  const removePastedImage = (imageId: string) => {
    setPastedImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image) {
        // Revoke the object URL to free memory
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const handleClose = () => {
    // Clean up object URLs
    pastedImages.forEach(img => URL.revokeObjectURL(img.preview));
    
    // Reset all state
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCreatedTaskId(null);
    setStep('create');
    setUploadedDocuments(0);
    setReferenceTickets('');
    setSelectedWorkflowIds([]);
    setPastedImages([]);
    setUseContext7(true); // Reset to default
    setUseConfluence(true); // Reset to default
    onClose();
  };

  const handleFinish = async () => {
    if (!createdTaskId) return;
    
    setIsEnqueueing(true);
    try {
      // Enqueue the task for processing
      const response = await fetch(`/api/tasks/${createdTaskId}/enqueue`, {
        method: 'POST',
      });

      if (response.ok) {
        console.log(`✅ Task #${createdTaskId} created with ${uploadedDocuments} document(s) and queued for processing`);
        handleClose();
      } else {
        const error = await response.json();
        alert(`Failed to queue task: ${error.error || 'Unknown error'}`);
        setIsEnqueueing(false);
      }
    } catch (error) {
      console.error('Error enqueueing task:', error);
      alert('Error enqueueing task. Please try again.');
      setIsEnqueueing(false);
    }
  };

  const handleDocumentUpload = () => {
    setUploadedDocuments(prev => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parse reference ticket IDs
      const referenceTaskIds = referenceTickets
        .split(',')
        .map(t => t.trim().replace('#', ''))
        .filter(t => t && !isNaN(parseInt(t)))
        .map(t => parseInt(t));

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          boardId,
          priority,
          referenceTaskIds: referenceTaskIds.length > 0 ? referenceTaskIds : null,
          workflowIds: selectedWorkflowIds.length > 0 ? selectedWorkflowIds : null,
          useContext7,
          useConfluence,
          skipQueue: true, // Don't enqueue immediately - let user upload documents first
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Task created with ID:', data.id);
        
        // Save task ID
        setCreatedTaskId(data.id);
        
        // Upload pasted images if any
        if (pastedImages.length > 0) {
          await uploadPastedImages(data.id);
        }
        
        // Move to document upload step
        setStep('documents');
        
        // Notify parent (but don't close modal yet)
        onTaskCreated(data.task);
      } else {
        console.error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {step === 'create' ? 'Create New Task' : `Task #${createdTaskId} - Upload Documents`}
            </h2>
            {step === 'documents' && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Optional: Upload context documents before prompt enhancement
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {step === 'create' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task ID
            </label>
            <input
              type="text"
              value="Auto-generated after creation"
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              An incremental ID will be assigned automatically
            </p>
          </div>

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
              Description
            </label>
            <textarea
              ref={textareaRef}
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={handlePaste}
              rows={6}
              placeholder="Describe the task in detail. You can paste screenshots here (Ctrl+V / Cmd+V)..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 The prompt-enhancer skill will analyze this description and ask clarifying questions. You can paste images directly!
            </p>
            
            {/* Display pasted images */}
            {pastedImages.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pasted Images ({pastedImages.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {pastedImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                        <img
                          src={img.preview}
                          alt="Pasted screenshot"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePastedImage(img.id)}
                        className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {img.uploaded && (
                        <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          ✓ Uploaded
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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

          <div>
            <label htmlFor="referenceTickets" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reference Tickets (Optional)
            </label>
            <input
              id="referenceTickets"
              type="text"
              value={referenceTickets}
              onChange={(e) => setReferenceTickets(e.target.value)}
              placeholder="e.g., #15, #20, #25 or 15, 20, 25"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Reference previous tickets to include their implementation reports as context
            </p>
          </div>

          {/* Confluence MCP Toggle */}
          <div>
            <label className="flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Use Confluence MCP
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {useConfluence
                    ? '✅ Confluence search will provide access to internal documentation during prompt enhancement and implementation'
                    : '⚪ Confluence search will be disabled for this task'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseConfluence(!useConfluence)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  useConfluence ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useConfluence ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 Confluence MCP allows searching internal company documentation hosted on Atlassian Confluence.
            </p>
          </div>

          {/* Context7 MCP Toggle */}
          <div>
            <label className="flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Use Context7 MCP
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {useContext7
                    ? '✅ Context7 will provide up-to-date documentation and library context during prompt enhancement and implementation'
                    : '⚪ Context7 features will be disabled for this task'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseContext7(!useContext7)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  useContext7 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useContext7 ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 Context7 MCP provides access to up-to-date framework and library documentation. Recommended for tasks involving external libraries or frameworks.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Workflow className="inline w-4 h-4 mr-1" />
              Relevant Workflows (Optional)
            </label>
            {loadingWorkflows ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading workflows...</div>
            ) : workflows.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                No workflows available. Create workflows in the Workflows page.
              </div>
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 max-h-40 overflow-y-auto">
                {workflows.map((workflow) => (
                  <label
                    key={workflow.id}
                    className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkflowIds.includes(workflow.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWorkflowIds([...selectedWorkflowIds, workflow.id]);
                        } else {
                          setSelectedWorkflowIds(selectedWorkflowIds.filter(id => id !== workflow.id));
                        }
                      }}
                      className="mt-1 w-4 h-4 text-blue-500 border-gray-300 dark:border-gray-500 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {workflow.name}
                      </div>
                      {workflow.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {workflow.description}
                        </div>
                      )}
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                          {workflow.framework || 'bmad'}
                        </span>
                        {workflow.category && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {workflow.category}
                          </span>
                        )}
                        {workflow.status === 'draft' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                            draft
                          </span>
                        )}
                        {workflow.status === 'active' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                            active
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Select workflows to guide Claude SDK on which workflows to reference for this task
            </p>
            {selectedWorkflowIds.length > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                ✓ {selectedWorkflowIds.length} workflow{selectedWorkflowIds.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
        ) : (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>✅ Task #{createdTaskId} created successfully!</strong>
                <br />
                Upload context documents now, or click "Finish" to proceed without documents.
                <br />
                Documents help the AI generate better requirements.
                <br />
                <br />
                <em className="text-xs">💡 The task will be queued for processing when you click "Finish"</em>
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-8">
              <DocumentUploadZone
                taskId={createdTaskId!}
                onUploadComplete={handleDocumentUpload}
              />
              
              {uploadedDocuments > 0 && (
                <p className="mt-4 text-sm text-green-600 dark:text-green-400">
                  ✅ {uploadedDocuments} document{uploadedDocuments > 1 ? 's' : ''} uploaded
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                💡 <strong>Tip:</strong> Documents can only be uploaded during task creation.
                Once the enhanced prompt is generated, the scope will be locked.
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isEnqueueing}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isEnqueueing}
                  className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
                >
                  {isEnqueueing ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⏳</span>
                      Queueing...
                    </>
                  ) : uploadedDocuments > 0 ? (
                    `Finish (${uploadedDocuments} docs)`
                  ) : (
                    'Skip & Finish'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
