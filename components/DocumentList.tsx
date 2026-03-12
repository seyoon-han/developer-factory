'use client';

import React, { useState } from 'react';
import { FileText, File, Link, Download, Trash2, Edit2, Save, X, ExternalLink, Eye, Calendar, User, HardDrive } from 'lucide-react';
import { format } from 'date-fns';

interface Document {
  id: number;
  taskId: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  url?: string;
  uploadedBy?: string;
  uploadedAt: string;
  description?: string;
}

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted: (documentId: number) => void;
  onDocumentUpdated: (document: Document) => void;
  readonly?: boolean;
}

export default function DocumentList({ documents, onDocumentDeleted, onDocumentUpdated, readonly = false }: DocumentListProps) {
  const [editingDescription, setEditingDescription] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  const getFileIcon = (document: Document) => {
    if (document.url) {
      return <Link className="w-4 h-4 text-purple-500" />;
    }

    const ext = document.originalFilename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <File className="w-4 h-4 text-red-500" />;
      case 'txt':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'csv':
      case 'tsv':
        return <File className="w-4 h-4 text-green-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = async (document: Document) => {
    if (document.url) {
      try {
        // For URLs, try to open in new tab
        window.open(document.url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error('Failed to open URL:', error);
        alert('Failed to open URL. Please check if the URL is valid.');
      }
      return;
    }

    try {
      const response = await fetch(`/api/documents/${document.id}`);
      if (response.ok) {
        const blob = await response.blob();

        // Check if blob is empty
        if (blob.size === 0) {
          alert('File appears to be empty or corrupted');
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.originalFilename;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } else if (response.status === 404) {
        alert('File not found. It may have been deleted from storage.');
      } else {
        const error = await response.json().catch(() => ({}));
        alert(error.error || 'Failed to download file');
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please check your network connection.');
    }
  };

  const handleDelete = async (document: Document) => {
    const confirmMessage = document.url
      ? `Remove URL "${document.originalFilename}" from this task?`
      : `Permanently delete "${document.originalFilename}"? This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDocumentDeleted(document.id);
      } else if (response.status === 404) {
        // Document already deleted, remove from list
        onDocumentDeleted(document.id);
      } else {
        const error = await response.json().catch(() => ({}));
        alert(error.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete document. Please check your network connection.');
    }
  };

  const handleEditDescription = (document: Document) => {
    setEditingDescription(document.id);
    setEditedDescription(document.description || '');
  };

  const handleSaveDescription = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editedDescription.trim() }),
      });

      if (response.ok) {
        const { document: updatedDoc } = await response.json();
        onDocumentUpdated(updatedDoc);
        setEditingDescription(null);
        setEditedDescription('');
      } else if (response.status === 404) {
        alert('Document not found. It may have been deleted.');
        onDocumentDeleted(document.id);
      } else {
        const error = await response.json().catch(() => ({}));
        alert(error.error || 'Failed to update description');
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update description. Please check your network connection.');
    }
  };

  const handlePreview = (document: Document) => {
    // Only preview text files
    const ext = document.originalFilename.split('.').pop()?.toLowerCase();
    if (['txt', 'csv', 'tsv'].includes(ext || '')) {
      setPreviewDocument(document);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map((document) => (
          <div
            key={document.id}
            className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            {/* File Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getFileIcon(document)}
            </div>

            {/* Document Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {document.originalFilename}
                  </h4>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatFileSize(document.fileSize)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(document.uploadedAt), 'MMM d, yyyy')}
                    </span>
                    {document.uploadedBy && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {document.uploadedBy}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-3">
                  {/* Preview button for text files */}
                  {['txt', 'csv', 'tsv'].includes(document.originalFilename.split('.').pop()?.toLowerCase() || '') && (
                    <button
                      onClick={() => handlePreview(document)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                  )}

                  {/* Download/Open button */}
                  <button
                    onClick={() => handleDownload(document)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors"
                    title={document.url ? 'Open URL' : 'Download'}
                  >
                    {document.url ? (
                      <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    ) : (
                      <Download className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </button>

                  {/* Edit description button */}
                  {!readonly && (
                    <button
                      onClick={() => handleEditDescription(document)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors"
                      title="Edit description"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                  )}

                  {/* Delete button */}
                  {!readonly && (
                    <button
                      onClick={() => handleDelete(document)}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                  
                  {/* Show lock icon if readonly */}
                  {readonly && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                      🔒 Locked (scope finalized)
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {editingDescription === document.id ? (
                <div className="mt-3">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSaveDescription(document)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescription(null);
                        setEditedDescription('');
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : document.description ? (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {document.description}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewDocument && (
        <DocumentPreview
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </>
  );
}

// Simple document preview component
function DocumentPreview({ document, onClose }: { document: Document; onClose: () => void }) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch(`/api/documents/${document.id}`);
        if (response.ok) {
          const text = await response.text();
          setContent(text);
        } else {
          setError('Failed to load document content');
        }
      } catch (err) {
        setError('Failed to load document content');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [document.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {document.originalFilename}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}